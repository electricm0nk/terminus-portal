package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// infraTagEntry holds the deployed image tags for one service.
type infraTagEntry struct {
	Dev  string `json:"dev"`  // tag from values-dev.yaml, empty if not tracked
	Prod string `json:"prod"` // tag from values.yaml, empty if not tracked
}

// InfraDeployedTagsResponse is the payload returned by GET /api/infra/deployed-tags.
type InfraDeployedTagsResponse struct {
	Tags map[string]infraTagEntry `json:"tags"`
}

// infraValuesPath maps a service key to its terminus.infra values file path prefix.
// The key matches the `repo` field in the SPA's REPOS config.
var infraValuesPath = map[string]string{
	"terminus-portal":           "platforms/k3s/helm/terminus-portal",
	"terminus-inference-gateway": "platforms/k3s/helm/terminus-inference-gateway",
}

const (
	infraOwner    = "electricm0nk"
	infraRepo     = "terminus.infra"
	infraTagsCTL  = 120 * time.Second
)

var (
	infraTagsCache   *InfraDeployedTagsResponse
	infraTagsCacheAt time.Time
	infraTagsCacheMu sync.Mutex
)

// InfraDeployedTagsHandler handles GET /api/infra/deployed-tags.
// It reads values.yaml and values-dev.yaml from terminus.infra via GitHub API
// and returns the deployed image tags per tracked service.
func InfraDeployedTagsHandler(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		infraTagsCacheMu.Lock()
		if infraTagsCache != nil && time.Now().Before(infraTagsCacheAt.Add(infraTagsCTL)) {
			cached := infraTagsCache
			infraTagsCacheMu.Unlock()
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(cached)
			return
		}
		infraTagsCacheMu.Unlock()

		pat := os.Getenv("GITHUB_PAT")
		client := &http.Client{Timeout: 10 * time.Second}

		type serviceResult struct {
			key   string
			entry infraTagEntry
		}
		ch := make(chan serviceResult, len(infraValuesPath))

		for svc, pathPrefix := range infraValuesPath {
			svc, pathPrefix := svc, pathPrefix
			go func() {
				devTag := fetchInfraTag(client, pat, pathPrefix+"/values-dev.yaml", logger)
				prodTag := fetchInfraTag(client, pat, pathPrefix+"/values.yaml", logger)
				ch <- serviceResult{key: svc, entry: infraTagEntry{Dev: devTag, Prod: prodTag}}
			}()
		}

		tags := make(map[string]infraTagEntry, len(infraValuesPath))
		for i := 0; i < len(infraValuesPath); i++ {
			r := <-ch
			tags[r.key] = r.entry
		}

		resp := &InfraDeployedTagsResponse{Tags: tags}

		infraTagsCacheMu.Lock()
		infraTagsCache = resp
		infraTagsCacheAt = time.Now()
		infraTagsCacheMu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

// fetchInfraTag retrieves a values file from terminus.infra via GitHub API and
// extracts the `tag:` line value. Returns empty string on any failure.
func fetchInfraTag(client *http.Client, pat, filePath string, logger *slog.Logger) string {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s?ref=main",
		infraOwner, infraRepo, filePath)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return ""
	}
	setGitHubHeaders(req, pat)

	resp, err := client.Do(req)
	if err != nil {
		logger.Warn("infra values fetch failed", "path", filePath, "err", err.Error())
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.Warn("infra values fetch non-200", "path", filePath, "status", resp.StatusCode)
		return ""
	}

	var payload struct {
		Content  string `json:"content"`
		Encoding string `json:"encoding"`
	}
	if err := decodeJSON(resp.Body, &payload); err != nil {
		return ""
	}

	// GitHub returns base64-encoded content (with newlines)
	content := payload.Content
	if payload.Encoding == "base64" {
		decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(content, "\n", ""))
		if err != nil {
			return ""
		}
		content = string(decoded)
	}

	return extractTagLine(content)
}

// extractTagLine finds the first `tag:` line in a YAML values file and returns its value.
func extractTagLine(content string) string {
	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "tag:") {
			val := strings.TrimPrefix(trimmed, "tag:")
			val = strings.TrimSpace(val)
			return val
		}
	}
	return ""
}
