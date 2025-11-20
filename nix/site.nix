{
  lib,
  buildNpmPackage,
  importNpmLock,
  nodejs,
  coreutils,
  litestream,
  writeText,
  writeShellApplication,
  runCommand,
  dockerTools,
  nix2container,
}:
let
  fs = lib.fileset;

  baseSrc = fs.gitTracked ../.;

  nixFiles = fs.fileFilter (file: lib.hasSuffix ".nix" file.name) ../.;

  ignoreFiles = fs.unions [
    (fs.maybeMissing ../.env)
    ../.vscode
    ../.env.example
    ../.envrc
    ../.prettierignore
    ../.prettierrc
    ../flake.lock
    ../nix
    ../tests
    ../slumber.yml
    ../README.md
    ../justfile
    nixFiles
  ];

  filtered = fs.difference baseSrc ignoreFiles;

  src = fs.toSource {
    root = ../.;
    fileset = filtered;
  };

  npmDeps = importNpmLock {
    package = lib.importJSON ../package.json;
    packageLock = lib.importJSON ../package-lock.json;
  };

  dataDir = "/data";
  dbFilePath = "${dataDir}/xxko.db";

  node_modules_only_build = buildNpmPackage ({
    inherit nodejs;
    src = fs.toSource {
      root = ../.;
      fileset = fs.unions [
        ../package.json
        ../package-lock.json
      ];
    };
    pname = "xxko";
    version = "0.1.0";

    npmDeps = npmDeps;

    npmConfigHook = importNpmLock.npmConfigHook;

    dontNpmBuild = true;

    dontNpmInstall = true;

    installPhase = ''
      runHook preInstall

      mkdir -p $out/node_modules

      cp -r node_modules/ $out
      cp package.json package-lock.json $out

      runHook postInstall
    '';
  });

  builtSite =
    runCommand "builtSite"
      {
        nativeBuildInputs = [
          nodejs
          nodejs.python
        ];
      }
      ''
        cd $(mktemp -d)
        cp -r ${src}/* .

        ln -s ${node_modules_only_build}/node_modules ./node_modules

        npm run build

        mkdir -p $out
        ln -s ${node_modules_only_build}/node_modules $out/node_modules
        cp -r build $out
        cp package.json package-lock.json $out
      '';

  run_site = writeShellApplication {
    name = "run-site";
    runtimeInputs = [ nodejs ];
    text = ''
      cd ${builtSite}
      node build
    '';
  };

  litestreamConfig = writeText "litestream.yml" (
    lib.generators.toYAML { } {
      access-key-id = "\${AWS_ACCESS_KEY_ID}";
      secret-access-key = "\${AWS_SECRET_ACCESS_KEY}";
      dbs = [
        {
          path = dbFilePath;
          replicas = [
            {
              # url = "s3://$LITESTREAM_BUCKET/$LITESTREAM_REPLICA_PATH";
              type = "s3";
              bucket = "\${LITESTREAM_BUCKET}";
              path = "\${LITESTREAM_REPLICA_PATH}";
              endpoint = "\${AWS_ENDPOINT_URL_S3}";
            }
          ];
        }
      ];
    }
  );

  entrypoint = writeShellApplication {
    name = "entrypoint";
    runtimeInputs = [
      coreutils
      litestream
    ];
    text = ''
      set -euo pipefail

      mkdir -p ${dataDir}

      export DATABASE_URL="''${DATABASE_URL:-file:${dbFilePath}}"

      if [ -n "''${SKIP_LITESTREAM:-}" ]; then
        echo "SKIP_LITESTREAM set, starting app without Litestream"
        exec ${lib.getExe run_site}
      fi

      if [ ! -f ${dbFilePath} ]; then
        echo "Restoring database from replica (if available)…"
        litestream restore -if-replica-exists -config ${litestreamConfig} ${dbFilePath}
      fi

      exec litestream replicate -config ${litestreamConfig} -exec "${lib.getExe run_site}"
    '';
  };

  docker =
    let
      # https://blog.eigenvalue.net/2023-nix2container-everything-once/
      foldImageLayers =
        let
          mergeToLayer =
            priorLayers: component:
            assert builtins.isList priorLayers;
            assert builtins.isAttrs component;
            let
              layer = nix2container.buildLayer (
                component
                // {
                  layers = priorLayers;
                }
              );
            in
            priorLayers ++ [ layer ];
        in
        layers: lib.foldl mergeToLayer [ ] layers;

    in
    nix2container.buildImage {
      name = "xxko";
      tag = "latest";

      # https://nixos.org/manual/nixpkgs/stable/#ssec-pkgs-dockerTools-helpers
      copyToRoot = [
        dockerTools.caCertificates
        dockerTools.binSh
      ];

      layers =
        let
          layerDefs = [
            { deps = [ node_modules_only_build ]; }
            { deps = [ builtSite ]; }
          ];
        in
        foldImageLayers layerDefs;

      config = {
        ExposedPorts = {
          "3000" = { };
        };
        Cmd = [ "${lib.getExe entrypoint}" ];
      };
    };

in
{
  inherit
    entrypoint
    run_site
    builtSite
    node_modules_only_build
    docker
    ;
}
