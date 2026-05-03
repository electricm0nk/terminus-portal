package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"time"
)

const (
	defaultArgoCDURL = "http://argocd-server.argocd.svc.cluster.local:80"
)

// ArgoCDStatusResponse is the payload returned by GET /api/argocd/status.
type ArgoCDStatusResponse struct {
	Total       int `json:"total"`
	Synced      int `json:"synced"`
	OutOfSync   int `json:"outOfSync"`
	Healthy     int `json:"healthy"`
	Degraded    int `json:"degraded"`
	Progressing int `json:"progressing"`
	Suspended   int `json:"suspended"`
	Missing     int `json:"missing"`
	Unknown     int `json:"unknown"`
}

// argoApp is the minimal application shape we decode from /api/v1/applications.
type argoApp struct {
	Status struct {
		Sync struct {
			Status string `json:"status"`
		} `json:"sync"`
		Health struct {
			Status string `json:"status"`
		} `json:"health"`
	} `json:"status"`
}

type argoAppList struct {
	Items []argoApp `json:"items"`
}

// ArgoCDStatusHandler handles GET /api/argocd/status.
// It calls the ArgoCD API and returns aggregated sync/health counts.
func ArgoCDStatusHandler(logger *slog.Logger) http.HandlerFunc {
	client := &http.Client{Timeout: 10 * time.Second}

	return func(w http.ResponseWriter, r *http.Request) {
		argoBase := os.Getenv("ARGOCD_URL")
		if argoBase == "" {
			argoBase = defaultArgoCDURL
		}
		argoToken := os.Getenv("ARGOCD_TOKEN")
		if argoToken == "" {
			writeJSONError(w, http.StatusServiceUnavailable, "ARGOCD_TOKEN not configured")
			return
		}

		upstream := argoBase + "/api/v1/applications"
		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, upstream, nil)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to build ArgoCD request")
			return
		}
		req.Header.Set("Authorization", "Bearer "+argoToken)
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			logger.Error("argocd upstream error", "err", err.Error())
			writeJSONError(w, http.StatusBadGateway, "ArgoCD upstream error")
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			logger.Error("argocd non-200", "status", resp.StatusCode)
			writeJSONError(w, http.StatusBadGateway, "ArgoCD returned non-200")
			return
		}

		var list argoAppList
		if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
			logger.Error("argocd decode error", "err", err.Error())
			writeJSONError(w, http.StatusBadGateway, "failed to decode ArgoCD response")
			return
		}

		result := ArgoCDStatusResponse{Total: len(list.Items)}
		for _, app := range list.Items {
			switch app.Status.Sync.Status {
			case "Synced":
				result.Synced++
			case "OutOfSync":
				result.OutOfSync++
			}
			switch app.Status.Health.Status {
			case "Healthy":
				result.Healthy++
			case "Degraded":
				result.Degraded++
			case "Progressing":
				result.Progressing++
			case "Suspended":
				result.Suspended++
			case "Missing":
				result.Missing++
			default:
				result.Unknown++
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	}
}
