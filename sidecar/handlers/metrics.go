package handlers

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"time"
)

const (
	defaultPrometheusURL = "https://prometheus.trantor.internal"
	prometheusCAPath     = "/etc/ssl/certs/internal-ca.crt"
)

// buildPrometheusClient constructs an HTTP client that trusts the internal CA cert.
// If the CA cert file is missing, a warning is logged and the returned client will
// fail TLS connections to internal endpoints (InsecureSkipVerify is always false).
func buildPrometheusClient(logger *slog.Logger) *http.Client {
	tlsCfg := &tls.Config{InsecureSkipVerify: false} //nolint:gosec // always false — we use CA cert pool

	caCert, err := os.ReadFile(prometheusCAPath)
	if err != nil {
		logger.Warn("Prometheus CA cert not found; TLS will fail for internal endpoints", "path", prometheusCAPath)
	} else {
		pool := x509.NewCertPool()
		pool.AppendCertsFromPEM(caCert)
		tlsCfg.RootCAs = pool
	}

	return &http.Client{
		Transport: &http.Transport{TLSClientConfig: tlsCfg},
		Timeout:   15 * time.Second,
	}
}

// MetricsQueryHandler handles GET /api/metrics/query
// It proxies PromQL queries to Prometheus using an internal-CA-trusted TLS client.
// Query params forwarded: query (required), start, end, step.
// If start/end/step are absent the instant query endpoint (/api/v1/query) is used;
// otherwise the range query endpoint (/api/v1/query_range) is used.
func MetricsQueryHandler(logger *slog.Logger) http.HandlerFunc {
	client := buildPrometheusClient(logger)

	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("query")
		if query == "" {
			writeJSONError(w, http.StatusBadRequest, "query parameter required")
			return
		}

		promBase := os.Getenv("PROMETHEUS_URL")
		if promBase == "" {
			promBase = defaultPrometheusURL
		}

		// Choose instant or range endpoint based on presence of time-range params
		start := r.URL.Query().Get("start")
		end := r.URL.Query().Get("end")
		step := r.URL.Query().Get("step")

		var endpoint string
		params := url.Values{"query": []string{query}}

		if start != "" && end != "" {
			endpoint = promBase + "/api/v1/query_range"
			params.Set("start", start)
			params.Set("end", end)
			if step != "" {
				params.Set("step", step)
			}
		} else {
			endpoint = promBase + "/api/v1/query"
		}

		upstreamURL := fmt.Sprintf("%s?%s", endpoint, params.Encode())
		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, upstreamURL, nil)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to build upstream request")
			return
		}
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			logger.Error("prometheus upstream error", "err", err.Error())
			writeJSONError(w, http.StatusBadGateway, "prometheus upstream error")
			return
		}
		defer resp.Body.Close()

		// Forward status code and Content-Type; do NOT log response body (may contain sensitive labels)
		w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
		w.WriteHeader(resp.StatusCode)
		_, _ = io.Copy(w, resp.Body)
	}
}
