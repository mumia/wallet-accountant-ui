up:
	docker compose up -d --build --remove-orphans

down:
	docker compose down

shell:
	docker compose exec dev sh

run:
	yarn start --verbose

bash:
	docker compose run dev sh
