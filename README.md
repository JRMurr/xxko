# xxko

## Dev

```shell
just dev # run dev webserver for site
```

## Assets

- tweet with dropbox link to assets https://x.com/draggles/status/1983675855105880495
  - https://www.dropbox.com/scl/fo/ywe5l74w13lyweafs2e5h/ALQS6XsnQKoVAHGf_LL4_L0?rlkey=5acg4ic8bzrt4ncpxheba36x0&e=1&st=d5ad4065&dl=0

## Notes

- https://sekun.net/blog/deploying-nix-builds-on-fly-io/

## Deploying to Fly.io with Litestream

- The Docker image includes Litestream and an entrypoint that restores `/data/xxko.db` before starting the app and streams it to S3. Set `DATABASE_URL=file:/data/xxko.db` in Fly secrets.
- Configure object storage credentials as secrets: `LITESTREAM_BUCKET`, `LITESTREAM_ENDPOINT`, `LITESTREAM_REGION`, `LITESTREAM_ACCESS_KEY_ID`, `LITESTREAM_SECRET_ACCESS_KEY`, and optionally `LITESTREAM_REPLICA_PATH` (defaults to `xxko`).
- Create and mount a Fly volume at `/data` so SQLite has persistent disk, e.g. `flyctl volumes create data --region <rgn> --size <size>` and add a mount in `fly.toml`:
  ```
  [[mounts]]
    source = "data"
    destination = "/data"
  ```
- Build and load the image: `nix build .#docker --no-link --print-out-paths | docker image load`, or push the result to Fly with `flyctl deploy --image $(nix build .#docker --no-link --print-out-paths)`.
