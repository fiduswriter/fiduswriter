# Read version from the main project's version.txt (one level up, in fiduswriter/)
VERSION := $(shell cat ../fiduswriter/version.txt | tr -d '[:space:]')

.PHONY: help build up down logs shell superuser

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker image (version read from version.txt automatically)
	docker compose build --build-arg FIDUSWRITER_VERSION=$(VERSION)

up: ## Start the container in the background
	mkdir -p volumes/data
	chown -R 999:999 volumes
	FIDUSWRITER_VERSION=$(VERSION) docker compose up -d

down: ## Stop and remove the container
	docker compose down

logs: ## Follow container logs
	docker compose logs -f

shell: ## Open a shell inside the running container
	docker compose exec fiduswriter /bin/sh

superuser: ## Create a Django superuser inside the container
	docker compose exec fiduswriter venv/bin/fiduswriter createsuperuser
