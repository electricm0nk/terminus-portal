package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// PodSummary is the sanitised pod shape returned to the SPA.
type PodSummary struct {
	Name         string `json:"name"`
	Namespace    string `json:"namespace"`
	Phase        string `json:"phase"`
	Ready        bool   `json:"ready"`
	RestartCount int32  `json:"restartCount"`
	Age          string `json:"age"`
	NodeName     string `json:"nodeName"`
}

// buildK8sClient creates a client from the in-cluster service-account token.
// Returns nil and an error string when running outside a cluster.
func buildK8sClient() (*kubernetes.Clientset, error) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		return nil, fmt.Errorf("InClusterConfig: %w", err)
	}
	cs, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("kubernetes.NewForConfig: %w", err)
	}
	return cs, nil
}

// K8sPodsHandler handles both:
//
//	GET /api/k8s/pods      — pods in the `terminus-portal` namespace
//	GET /api/k8s/pods/all  — pods across all namespaces
func K8sPodsHandler(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Determine namespace scope from the URL
		namespace := "terminus-portal"
		if r.URL.Path == "/api/k8s/pods/all" {
			namespace = "" // empty string → all namespaces
		}

		cs, err := buildK8sClient()
		if err != nil {
			logger.Error("k8s client build failed", "err", err.Error())
			writeJSONError(w, http.StatusServiceUnavailable, "k8s client unavailable")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		podList, err := cs.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
		if err != nil {
			logger.Error("pods list failed", "namespace", namespace, "err", err.Error())
			writeJSONError(w, http.StatusBadGateway, "pods list error")
			return
		}

		summaries := make([]PodSummary, 0, len(podList.Items))
		for _, p := range podList.Items {
			summaries = append(summaries, summarisePod(&p))
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(summaries)
	}
}

func summarisePod(p *corev1.Pod) PodSummary {
	return PodSummary{
		Name:         p.Name,
		Namespace:    p.Namespace,
		Phase:        string(p.Status.Phase),
		Ready:        podReady(p),
		RestartCount: totalRestarts(p),
		Age:          relativeAge(p.CreationTimestamp.Time),
		NodeName:     p.Spec.NodeName,
	}
}

// podReady returns true when every container in the pod reports ready.
func podReady(p *corev1.Pod) bool {
	for _, c := range p.Status.ContainerStatuses {
		if !c.Ready {
			return false
		}
	}
	return len(p.Status.ContainerStatuses) > 0
}

// totalRestarts sums restart counts across all containers.
func totalRestarts(p *corev1.Pod) int32 {
	var total int32
	for _, c := range p.Status.ContainerStatuses {
		total += c.RestartCount
	}
	return total
}
