default:
  just --list

dev:
  npm rum db:migrate && npm run dev -- --open

format:
  npm run format


load_docker:
  $(nix build .#docker --no-link --print-out-paths) | docker image load

push_docker: load_docker
  docker image tag xxko:latest registry.fly.io/xxko:latest
  flyctl auth docker
  docker push registry.fly.io/xxko:latest


deploy: push_docker
  flyctl deploy