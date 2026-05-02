package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// HealthHandler returns {"status":"ok"} for readiness/liveness probes.
// This handler has no auth requirements and does not read any env vars.
func HealthHandler(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]string{"status": "ok"}); err != nil {
			logger.Error("health encode error", "err", err)
		}
	}
}
