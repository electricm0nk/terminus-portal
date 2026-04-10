IMAGE = ghcr.io/electricm0nk/terminus-portal
TAG   ?= latest

.PHONY: build run push

build:
	docker build -t $(IMAGE):$(TAG) .

run:
	docker run --rm -p 8080:80 $(IMAGE):$(TAG)

push:
	docker push $(IMAGE):$(TAG)
