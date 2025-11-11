default:
  just --list

dev:
  npm rum db:migrate && npm run dev -- --open

format:
  npm run format