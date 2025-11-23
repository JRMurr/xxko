# xxko

## Structure

- `site/` – SvelteKit web application
- repo root – shared infra (nix, Fly, etc.) for multiple services

## Dev

```shell
cd site
npm install
npm run dev -- --open
```

or use `just dev` from the repo root, which runs the same commands inside `site/`.

## Assets

- tweet with dropbox link to assets https://x.com/draggles/status/1983675855105880495
  - https://www.dropbox.com/scl/fo/ywe5l74w13lyweafs2e5h/ALQS6XsnQKoVAHGf_LL4_L0?rlkey=5acg4ic8bzrt4ncpxheba36x0&e=1&st=d5ad4065&dl=0

## Notes

- https://sekun.net/blog/deploying-nix-builds-on-fly-io/
