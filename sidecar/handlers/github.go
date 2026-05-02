package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"
)

// BranchResponse is the JSON shape returned to the SPA for a branch status query.
type BranchResponse struct {
	Branch   string `json:"branch"`
	SHA      string `json:"sha"`
	Message  string `json:"message"`
	Age      string `json:"age"`
	Tag      string `json:"tag"`
	CIStatus string `json:"ciStatus"`
	CIRunURL string `json:"ciRunUrl"`
}

// cache entry
type cacheEntry struct {
	data      BranchResponse
	expiresAt time.Time
}

var (
	branchCache   = make(map[string]cacheEntry)
	branchCacheMu sync.Mutex
	cacheTTL      = 60 * time.Second
)

// GitHubBranchHandler handles GET /api/github/repos/{owner}/{repo}/branches/{branch}
// It proxies GitHub API calls using GITHUB_PAT from the environment.
// The PAT value is NEVER logged.
func GitHubBranchHandler(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner := r.PathValue("owner")
		repo := r.PathValue("repo")
		branch := r.PathValue("branch")

		if owner == "" || repo == "" || branch == "" {
			writeJSONError(w, http.StatusBadRequest, "missing path parameter")
			return
		}

		cacheKey := fmt.Sprintf("%s/%s/%s", owner, repo, branch)

		// Check in-memory cache first
		branchCacheMu.Lock()
		if entry, ok := branchCache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
			branchCacheMu.Unlock()
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(entry.data)
			return
		}
		branchCacheMu.Unlock()

		pat := os.Getenv("GITHUB_PAT")
		client := &http.Client{Timeout: 10 * time.Second}

		// 1. Fetch branch info (SHA + commit message + age)
		branchData, status, err := fetchBranch(client, pat, owner, repo, branch)
		if err != nil || status != http.StatusOK {
			if status == http.StatusNotFound {
				writeJSONError(w, http.StatusNotFound, "branch not found")
				return
			}
			if status == http.StatusForbidden || status == http.StatusTooManyRequests {
				writeJSONError(w, http.StatusTooManyRequests, "rate limited")
				return
			}
			logger.Error("fetchBranch failed", "owner", owner, "repo", repo, "branch", branch, "status", status)
			writeJSONError(w, http.StatusBadGateway, "upstream error")
			return
		}

		// 2. Fetch latest tag for the repo
		tag := fetchLatestTag(client, pat, owner, repo)

		// 3. Fetch CI status for the commit SHA
		ciStatus, ciRunURL := fetchCIStatus(client, pat, owner, repo, branchData.SHA)

		resp := BranchResponse{
			Branch:   branch,
			SHA:      branchData.SHA,
			Message:  branchData.Message,
			Age:      relativeAge(branchData.CommitterDate),
			Tag:      tag,
			CIStatus: ciStatus,
			CIRunURL: ciRunURL,
		}

		// Store in cache
		branchCacheMu.Lock()
		branchCache[cacheKey] = cacheEntry{data: resp, expiresAt: time.Now().Add(cacheTTL)}
		branchCacheMu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

// branchInfo is an intermediate struct for GitHub branch API data
type branchInfo struct {
	SHA           string
	Message       string
	CommitterDate time.Time
}

func fetchBranch(client *http.Client, pat, owner, repo, branch string) (*branchInfo, int, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/branches/%s", owner, repo, branch)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	setGitHubHeaders(req, pat)

	resp, err := client.Do(req)
	if err != nil {
		return nil, http.StatusBadGateway, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, resp.StatusCode, nil
	}

	var payload struct {
		Commit struct {
			SHA    string `json:"sha"`
			Commit struct {
				Message   string `json:"message"`
				Committer struct {
					Date string `json:"date"`
				} `json:"committer"`
			} `json:"commit"`
		} `json:"commit"`
	}
	if err := decodeJSON(resp.Body, &payload); err != nil {
		return nil, http.StatusInternalServerError, err
	}

	// Truncate multi-line commit messages to first line
	msg := payload.Commit.Commit.Message
	for i, c := range msg {
		if c == '\n' {
			msg = msg[:i]
			break
		}
	}

	date, _ := time.Parse(time.RFC3339, payload.Commit.Commit.Committer.Date)
	return &branchInfo{
		SHA:           payload.Commit.SHA,
		Message:       msg,
		CommitterDate: date,
	}, http.StatusOK, nil
}

func fetchLatestTag(client *http.Client, pat, owner, repo string) string {
	// Try GitHub Releases API first
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "no tag"
	}
	setGitHubHeaders(req, pat)

	resp, err := client.Do(req)
	if err != nil {
		return "no tag"
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var release struct {
			TagName string `json:"tag_name"`
		}
		if err := decodeJSON(resp.Body, &release); err == nil && release.TagName != "" {
			return release.TagName
		}
	}

	// Fallback: list tags
	tagsURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/tags?per_page=1", owner, repo)
	req2, err := http.NewRequest(http.MethodGet, tagsURL, nil)
	if err != nil {
		return "no tag"
	}
	setGitHubHeaders(req2, pat)

	resp2, err := client.Do(req2)
	if err != nil || resp2.StatusCode != http.StatusOK {
		return "no tag"
	}
	defer resp2.Body.Close()

	var tags []struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(resp2.Body, &tags); err == nil && len(tags) > 0 {
		return tags[0].Name
	}
	return "no tag"
}

func fetchCIStatus(client *http.Client, pat, owner, repo, sha string) (string, string) {
	if sha == "" {
		return "unknown", ""
	}
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits/%s/check-runs?per_page=25", owner, repo, sha)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "unknown", ""
	}
	setGitHubHeaders(req, pat)

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return "unknown", ""
	}
	defer resp.Body.Close()

	var payload struct {
		CheckRuns []struct {
			Status     string `json:"status"`
			Conclusion string `json:"conclusion"`
			HTMLURL    string `json:"html_url"`
		} `json:"check_runs"`
	}
	if err := decodeJSON(resp.Body, &payload); err != nil || len(payload.CheckRuns) == 0 {
		return "unknown", ""
	}

	// Summarise: any failure → failure; any in_progress → pending; all success → success
	latestURL := payload.CheckRuns[0].HTMLURL
	for _, run := range payload.CheckRuns {
		if run.Status == "in_progress" || run.Status == "queued" {
			return "pending", run.HTMLURL
		}
		if run.Conclusion == "failure" || run.Conclusion == "timed_out" {
			return "failure", run.HTMLURL
		}
	}
	if payload.CheckRuns[0].Conclusion == "success" {
		return "success", latestURL
	}
	return "unknown", latestURL
}

// setGitHubHeaders adds the Authorization header and Accept header.
// The PAT value is set programmatically and is never logged.
func setGitHubHeaders(req *http.Request, pat string) {
	if pat != "" {
		req.Header.Set("Authorization", "Bearer "+pat)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
}

func writeJSONError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func decodeJSON(r io.Reader, v any) error {
	return json.NewDecoder(r).Decode(v)
}

func relativeAge(t time.Time) string {
	if t.IsZero() {
		return "unknown"
	}
	delta := time.Since(t)
	if delta < time.Minute {
		return fmt.Sprintf("%ds ago", int(delta.Seconds()))
	}
	if delta < time.Hour {
		return fmt.Sprintf("%dm ago", int(delta.Minutes()))
	}
	if delta < 24*time.Hour {
		return fmt.Sprintf("%dh ago", int(delta.Hours()))
	}
	return fmt.Sprintf("%dd ago", int(delta.Hours()/24))
}
