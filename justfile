default:
  just --list

dev:
  npm rum db:migrate && npm run dev -- --open

format:
  npm run format


load_docker:
  $(nix build .#docker --no-link --print-out-paths) | docker image load