package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// FourDogsHealthResponse is the aggregated health payload returned to the SPA.
type FourDogsHealthResponse struct {
	CentralUI            ServiceHealthResult `json:"centralUi"`
	CentralAPI           ServiceHealthResult `json:"centralApi"`
	Emailfetcher         ServiceHealthResult `json:"emailfetcher"`
	EtailpetTrigger      ServiceHealthResult `json:"etailpetTrigger"`
	EtailpetSalesTrigger ServiceHealthResult `json:"etailpetSalesTrigger"`
}

// ServiceHealthResult describes a single service's health probe outcome.
type ServiceHealthResult struct {
	Status       string `json:"status"`        // "up", "down", "no-signal"
	HTTPStatus   int    `json:"httpStatus"`    // 0 when no HTTP round-trip was made
	Signal       string `json:"signal"`        // human-readable label for the SPA
	RestartCount int32  `json:"restartCount"`  // pod restart count (0 for HTTP-based probes)
	LastFetchAge string `json:"lastFetchAge"`  // e.g. "3h ago" — triggers only, empty for HTTP probes
}

const (
	fourDogsCentralDefaultURL = "http://fourdogs-central.fourdogs-central.svc.cluster.local:8080"
	fourDogsCentralURLEnv     = "FOURDOGS_CENTRAL_URL"
)

// FourDogsHealthHandler handles GET /api/fourdogs/health
// It probes fourdogs-central for Central UI, Central API, and Emailfetcher health,
// and checks etailpet trigger pod status directly via the k8s API.
// All probes run concurrently — a failed probe does not prevent the others.
func FourDogsHealthHandler(logger *slog.Logger) http.HandlerFunc {
	client := &http.Client{Timeout: 5 * time.Second}

	return func(w http.ResponseWriter, r *http.Request) {
		base := os.Getenv(fourDogsCentralURLEnv)
		if base == "" {
			base = fourDogsCentralDefaultURL
		}

		type namedResult struct {
			key    string
			result ServiceHealthResult
		}
		ch := make(chan namedResult, 5)

		// HTTP probes against fourdogs-central
		httpProbes := []struct {
			key  string
			path string
		}{
			{key: "centralUi", path: "/health"},
			{key: "centralApi", path: "/v1/health"},
			{key: "emailfetcher", path: "/v1/health/emailfetcher"},
		}
		for _, p := range httpProbes {
			p := p
			go func() {
				ch <- namedResult{key: p.key, result: probeService(client, base, p.path, logger)}
			}()
		}

		// K8s pod probes for etailpet trigger namespaces
		podProbes := []struct {
			key       string
			namespace string
		}{
			{key: "etailpetTrigger", namespace: "fourdogs-etailpet-trigger"},
			{key: "etailpetSalesTrigger", namespace: "fourdogs-etailpet-sales-trigger"},
		}
		for _, p := range podProbes {
			p := p
			go func() {
				ch <- namedResult{key: p.key, result: probePodNamespace(p.namespace, logger)}
			}()
		}

		results := make(map[string]ServiceHealthResult, 5)
		for i := 0; i < 5; i++ {
			nr := <-ch
			results[nr.key] = nr.result
		}

		resp := FourDogsHealthResponse{
			CentralUI:            results["centralUi"],
			CentralAPI:           results["centralApi"],
			Emailfetcher:         results["emailfetcher"],
			EtailpetTrigger:      results["etailpetTrigger"],
			EtailpetSalesTrigger: results["etailpetSalesTrigger"],
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

// probePodNamespace checks pod health in a specific namespace via the k8s API
// and reads the last successful trigger timestamp from pod logs.
func probePodNamespace(namespace string, logger *slog.Logger) ServiceHealthResult {
	cs, err := buildK8sClient()
	if err != nil {
		logger.Warn("k8s client unavailable for pod probe", "namespace", namespace, "err", err.Error())
		return ServiceHealthResult{Status: "no-signal", Signal: "k8s unavailable"}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	podList, err := cs.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Warn("pod list failed", "namespace", namespace, "err", err.Error())
		return ServiceHealthResult{Status: "no-signal", Signal: "list error"}
	}

	// Only count non-terminating pods
	var activePods []corev1.Pod
	for _, p := range podList.Items {
		if p.DeletionTimestamp == nil {
			activePods = append(activePods, p)
		}
	}

	if len(activePods) == 0 {
		return ServiceHealthResult{Status: "no-signal", Signal: "no pods"}
	}

	var readyPod *corev1.Pod
	var totalRestarts int32
	for i := range activePods {
		p := &activePods[i]
		for _, cst := range p.Status.ContainerStatuses {
			totalRestarts += cst.RestartCount
		}
		if p.Status.Phase == corev1.PodRunning && isPodContainerReady(p) && readyPod == nil {
			readyPod = p
		}
	}

	status := "down"
	if readyPod != nil {
		status = "up"
	}

	// Read last successful fetch time from logs of the ready pod
	lastFetchAge := ""
	if readyPod != nil {
		lastFetchAge = readLastFetchAge(ctx, namespace, readyPod.Name, logger)
	}

	return ServiceHealthResult{
		Status:       status,
		Signal:       "UP",
		RestartCount: totalRestarts,
		LastFetchAge: lastFetchAge,
	}
}

// readLastFetchAge reads the last few hundred log lines from a pod and returns
// the relative age of the most recent trigger_success or fetch_cycle_complete line.
// Log lines have the format: "2006/01/02 15:04:05 INFO trigger_success ..."
func readLastFetchAge(ctx context.Context, namespace, podName string, logger *slog.Logger) string {
	cs, err := buildK8sClient()
	if err != nil {
		return ""
	}
	tailLines := int64(200)
	logOpts := &corev1.PodLogOptions{TailLines: &tailLines}
	req := cs.CoreV1().Pods(namespace).GetLogs(podName, logOpts)
	stream, err := req.Stream(ctx)
	if err != nil {
		logger.Warn("pod log stream failed", "namespace", namespace, "pod", podName, "err", err.Error())
		return ""
	}
	defer stream.Close()

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, stream); err != nil {
		return ""
	}

	// Scan lines in reverse to find the most recent success marker
	lines := strings.Split(buf.String(), "\n")
	successMarkers := []string{"trigger_success", "fetch_cycle_complete", "rows_upserted"}
	for i := len(lines) - 1; i >= 0; i-- {
		line := lines[i]
		for _, marker := range successMarkers {
			if strings.Contains(line, marker) {
				if t := parseLogTimestamp(line); !t.IsZero() {
					return relativeAge(t)
				}
			}
		}
	}
	return ""
}

// parseLogTimestamp extracts the timestamp from a log line with the format:
// "2006/01/02 15:04:05 INFO ..."
func parseLogTimestamp(line string) time.Time {
	parts := strings.Fields(line)
	if len(parts) < 2 {
		return time.Time{}
	}
	ts := parts[0] + " " + parts[1]
	t, err := time.Parse("2006/01/02 15:04:05", ts)
	if err != nil {
		return time.Time{}
	}
	return t
}

// isPodContainerReady returns true when the pod's Ready condition is True.
func isPodContainerReady(p *corev1.Pod) bool {
	for _, c := range p.Status.Conditions {
		if c.Type == corev1.PodReady {
			return c.Status == corev1.ConditionTrue
		}
	}
	return false
}

func probeService(client *http.Client, base, path string, logger *slog.Logger) ServiceHealthResult {
	url := fmt.Sprintf("%s%s", base, path)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return ServiceHealthResult{Status: "down", Signal: "request-build-error"}
	}

	resp, err := client.Do(req)
	if err != nil {
		logger.Warn("fourdogs health probe failed", "url", url, "err", err.Error())
		return ServiceHealthResult{Status: "down", Signal: "unreachable"}
	}
	defer resp.Body.Close()

	// 404 on emailfetcher → no-signal (endpoint absent; not an error state)
	if resp.StatusCode == http.StatusNotFound && path == "/v1/health/emailfetcher" {
		return ServiceHealthResult{Status: "no-signal", HTTPStatus: 404, Signal: "no signal"}
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return ServiceHealthResult{Status: "up", HTTPStatus: resp.StatusCode, Signal: "UP"}
	}
	return ServiceHealthResult{Status: "down", HTTPStatus: resp.StatusCode, Signal: fmt.Sprintf("HTTP %d", resp.StatusCode)}
}
