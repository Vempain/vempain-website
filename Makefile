ENV_FILE ?= .env

ifneq ($(wildcard $(ENV_FILE)),)
include $(ENV_FILE)
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' $(ENV_FILE))
else
$(warning ENV file '$(ENV_FILE)' not found. Override via ENV_FILE=path/to/.env)
endif

.PHONY: help install build up down logs clean test

help: ## Show this help message
	@echo "Available commands (use ENV_FILE=path make <target> to load env, current: $(ENV_FILE)):"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies for both frontend and backend
	cd backend && composer install
	cd frontend && yarn install

build: ## Build Docker images
	docker compose build

build-prod: ## Build production images (uses docker-compose.prod.yml)
	[ -n "$(ENV_FILE)" ] && export ENV_FILE=$(ENV_FILE); docker compose --env-file $${ENV_FILE:-.env} -f docker-compose.prod.yml build

up: ## Start all services
	[ -n "$(ENV_FILE)" ] && export ENV_FILE=$(ENV_FILE); docker compose --env-file $${ENV_FILE:-.env} up -d --build

down: ## Stop all services
	[ -n "$(ENV_FILE)" ] && export ENV_FILE=$(ENV_FILE); docker compose --env-file $${ENV_FILE:-.env} down

logs: ## Show logs from all services
	[ -n "$(ENV_FILE)" ] && export ENV_FILE=$(ENV_FILE); docker compose --env-file $${ENV_FILE:-.env} logs -f

clean: ## Clean up containers, volumes, and build artifacts
	docker compose down -v
	rm -rf backend/vendor
	rm -rf frontend/node_modules frontend/dist

compose: ## Run arbitrary docker compose command (set CMD="exec backend php -v")
	[ -n "$(ENV_FILE)" ] && export ENV_FILE=$(ENV_FILE); docker compose --env-file $${ENV_FILE:-.env} $(CMD)

backend-shell: ## Open shell in backend container
	[ -n "$(ENV_FILE)" ] && export ENV_FILE=$(ENV_FILE); docker compose --env-file $${ENV_FILE:-.env} exec backend sh

frontend-shell: ## Open shell in frontend container
	[ -n "$(ENV_FILE)" ] && export ENV_FILE=$(ENV_FILE); docker compose --env-file $${ENV_FILE:-.env} exec frontend sh

db-shell: ## Open PostgreSQL shell
	[ -n "$(ENV_FILE)" ] && export ENV_FILE=$(ENV_FILE); docker compose --env-file $${ENV_FILE:-.env} exec postgres psql -U vempain -d vempain

backend-dev: ## Run backend dev server locally
	cd backend && php -S 127.0.0.1:8000 -t public

frontend-dev: ## Run frontend dev server locally
	cd frontend && yarn dev
