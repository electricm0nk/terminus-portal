# terminus-portal

Static dashboard portal for the Trantor + Fourdogs home lab — served via nginx on k3s.

Accessible at: `https://portal.trantor.internal`

## Stack

- nginx 1.27 (alpine)
- Deployed via Helm + ArgoCD on k3s

## Development

```bash
make build      # build Docker image
make run        # run locally on port 8080
make push       # push to GHCR (requires docker login)
```

## Deployment

The Helm chart is at `deploy/helm/`. ArgoCD syncs from the `main` branch.

Namespace: `terminus-portal`
Ingress: `portal.trantor.internal`
