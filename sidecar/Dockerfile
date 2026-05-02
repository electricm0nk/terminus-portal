# syntax=docker/dockerfile:1
# Stage 1 — build
FROM golang:1.26-alpine AS builder

WORKDIR /build

# Copy module files first for layer-cached dependency download
COPY go.mod ./
RUN go mod download

# Build the binary — statically linked, no cgo
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o portal-sidecar .

# Stage 2 — minimal runtime (no shell, no package manager)
FROM gcr.io/distroless/static-debian12

COPY --from=builder /build/portal-sidecar /portal-sidecar

EXPOSE 8080

ENTRYPOINT ["/portal-sidecar"]
