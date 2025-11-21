default:
  just --list

dev:
  npm rum db:migrate && npm run dev -- --open

format:
  npm run format

lint: 
  npm run lint

test:
  npm run test:unit -- --run

ci: lint test

load_docker:
  $(nix build .#docker.copyToDockerDaemon --no-link --print-out-paths)/bin/copy-to-docker-daemon

run_docker_local: load_docker
  docker run --rm -it -p 3000:3000 -e SKIP_LITESTREAM=true xxko:latest

push_docker: load_docker
  docker image tag xxko:latest registry.fly.io/xxko:latest
  flyctl auth docker
  docker push registry.fly.io/xxko:latest

deploy: push_docker
  flyctl deploy