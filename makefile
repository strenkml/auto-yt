docker-dev:
	docker-compose -f docker-compose.yml -p dev-auto-yt down && \
	docker-compose -f docker-compose.yml -p dev-auto-yt up --build -d

docker-prod:
	docker-compose -f docker-compose.yml -p auto-yt up --build -d