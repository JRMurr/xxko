default:
  just --list


dev:
  just site/dev

format:
  just site/format

check:
  just site/check

lint: 
  just site/lint

test:
  just site/test

ci: check lint test

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
