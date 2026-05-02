package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/electricm0nk/terminus-portal/sidecar/handlers"
)

func main() {
	// Structured JSON logger — explicit fields only; env vars are never logged.
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	mux := http.NewServeMux()
	mux.Handle("GET /api/healthz", handlers.HealthHandler(logger))
	mux.Handle("GET /api/github/repos/{owner}/{repo}/branches/{branch}", handlers.GitHubBranchHandler(logger))
	mux.Handle("GET /api/k8s/pods", handlers.K8sPodsHandler(logger))
	mux.Handle("GET /api/k8s/pods/all", handlers.K8sPodsHandler(logger))
	mux.Handle("GET /api/metrics/query", handlers.MetricsQueryHandler(logger))

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown on SIGTERM / SIGINT.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		logger.Info("portal-sidecar starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-quit
	logger.Info("portal-sidecar shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("shutdown error", "err", err)
	}
}
