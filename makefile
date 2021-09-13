docker-dev:
	docker-compose -f dev-docker-compose.yml -p dev-auto-yt down && \
	docker-compose -f dev-docker-compose.yml -p dev-auto-yt up --build -d

docker-dev-clean:
	docker-compose -f dev-docker-compose.yml -p dev-auto-yt down --rmi all && \
	docker-compose -f dev-docker-compose.yml -p dev-auto-yt build --no-cache && \
	docker-compose -f dev-docker-compose.yml -p dev-auto-yt up -d --always-recreate-deps

docker-prod:
	docker-compose -f docker-compose.yml -p auto-yt up --build -d