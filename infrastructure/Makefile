#!make
include .env
export $(shell sed 's/=.*//' .env)


up:
	docker-compose -f docker-compose.supabase.yaml \
	up -d

down:
	docker-compose -f docker-compose.supabase.yaml \
	down
