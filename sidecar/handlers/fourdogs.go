package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
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
	Status       string `json:"status"`       // "up", "down", "no-signal"
	HTTPStatus   int    `json:"httpStatus"`   // 0 when no HTTP round-trip was made
	Signal       string `json:"signal"`       // human-readable label for the SPA
	RestartCount int32  `json:"restartCount"` // pod restart count (0 for HTTP-based probes)
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

// probePodNamespace checks pod health in a specific namespace via the k8s API.
func probePodNamespace(namespace string, logger *slog.Logger) ServiceHealthResult {
	cs, err := buildK8sClient()
	if err != nil {
		logger.Warn("k8s client unavailable for pod probe", "namespace", namespace, "err", err.Error())
		return ServiceHealthResult{Status: "no-signal", Signal: "k8s unavailable"}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	podList, err := cs.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Warn("pod list failed", "namespace", namespace, "err", err.Error())
		return ServiceHealthResult{Status: "no-signal", Signal: "list error"}
	}

	if len(podList.Items) == 0 {
		return ServiceHealthResult{Status: "no-signal", Signal: "no pods"}
	}

	total := len(podList.Items)
	running := 0
	var totalRestarts int32
	for _, p := range podList.Items {
		if p.Status.Phase == corev1.PodRunning && isPodContainerReady(&p) {
			running++
		}
		for _, cst := range p.Status.ContainerStatuses {
			totalRestarts += cst.RestartCount
		}
	}

	status := "down"
	if running > 0 {
		status = "up"
	}
	return ServiceHealthResult{
		Status:       status,
		Signal:       fmt.Sprintf("%d/%d running", running, total),
		RestartCount: totalRestarts,
	}
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
