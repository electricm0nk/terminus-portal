package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"
)

// FourDogsHealthResponse is the aggregated health payload returned to the SPA.
type FourDogsHealthResponse struct {
	CentralUI   ServiceHealthResult `json:"centralUi"`
	CentralAPI  ServiceHealthResult `json:"centralApi"`
	Emailfetcher ServiceHealthResult `json:"emailfetcher"`
}

// ServiceHealthResult describes a single service's health probe outcome.
type ServiceHealthResult struct {
	Status     string `json:"status"`     // "up", "down", "no-signal"
	HTTPStatus int    `json:"httpStatus"` // 0 when no HTTP round-trip was made
	Signal     string `json:"signal"`     // human-readable label for the SPA
}

const (
	fourDogsCentralDefaultURL = "http://fourdogs-central.fourdogs-central.svc.cluster.local"
	fourDogsCentralURLEnv     = "FOURDOGS_CENTRAL_URL"
)

// FourDogsHealthHandler handles GET /api/fourdogs/health
// It probes fourdogs-central for Central UI, Central API, and Emailfetcher health.
// Each probe is independent — a failed probe does not prevent the others from running.
func FourDogsHealthHandler(logger *slog.Logger) http.HandlerFunc {
	client := &http.Client{Timeout: 5 * time.Second}

	return func(w http.ResponseWriter, r *http.Request) {
		base := os.Getenv(fourDogsCentralURLEnv)
		if base == "" {
			base = fourDogsCentralDefaultURL
		}

		// Probes run concurrently via goroutines + channels
		type namedResult struct {
			key    string
			result ServiceHealthResult
		}
		ch := make(chan namedResult, 3)

		probes := []struct {
			key  string
			path string
		}{
			{key: "centralUi", path: "/health"},
			{key: "centralApi", path: "/v1/health"},
			{key: "emailfetcher", path: "/v1/health/emailfetcher"},
		}

		for _, p := range probes {
			p := p
			go func() {
				ch <- namedResult{key: p.key, result: probeService(client, base, p.path, logger)}
			}()
		}

		results := make(map[string]ServiceHealthResult, 3)
		for range probes {
			nr := <-ch
			results[nr.key] = nr.result
		}

		resp := FourDogsHealthResponse{
			CentralUI:    results["centralUi"],
			CentralAPI:   results["centralApi"],
			Emailfetcher: results["emailfetcher"],
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func probeService(client *http.Client, base, path string, logger *slog.Logger) ServiceHealthResult {
	url := fmt.Sprintf("%s%s", base, path)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return ServiceHealthResult{Status: "down", HTTPStatus: 0, Signal: "request-build-error"}
	}

	resp, err := client.Do(req)
	if err != nil {
		logger.Warn("fourdogs health probe failed", "url", url, "err", err.Error())
		return ServiceHealthResult{Status: "down", HTTPStatus: 0, Signal: "unreachable"}
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
