#!make
include .env
export $(shell sed 's/=.*//' .env)

COMPOSE_PROJECT_NAME=hasura-peredoz

up-dev:
	docker-compose -f infrastructure/docker-compose.hasura.yaml \
	up -d

down-dev:
	docker-compose -f infrastructure/docker-compose.hasura.yaml \
	down

prod-build:
	-f infrastructure/docker-compose.hasura.yaml \
	-f infrastructure/docker-compose.hasura.prod.yaml \
	build

metadata-export:
	hasura metadata export --project hasura

metadata-apply:
	hasura metadata apply --project hasura

metadata-reload:
	hasura metadata reload --project hasura

metadata-diff:
	hasura metadata inconsistency list --project hasura
