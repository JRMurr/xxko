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
              url = "s3://$LITESTREAM_BUCKET/$LITESTREAM_REPLICA_PATH";
              # type = "s3";
              # bucket = "\${LITESTREAM_BUCKET}";
              # path = "\${LITESTREAM_REPLICA_PATH:-xxko}";
              # endpoint = "\${LITESTREAM_ENDPOINT}";
              # region = "\${LITESTREAM_REGION:-auto}";
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

      if [ ! -f ${dbFilePath} ]; then
        echo "Restoring database from replica (if available)…"
        litestream restore -if-replica-exists -config ${litestreamConfig} ${dbFilePath}
      fi

      exec litestream replicate -config ${litestreamConfig} -exec "${lib.getExe run_site}"
    '';
  };

  docker = dockerTools.streamLayeredImage {
    name = "xxko";
    tag = "latest";

    contents = [ entrypoint ];

    config = {
      ExposedPorts = {
        "3000" = { };
      };
      Cmd = [ "/bin/entrypoint" ];
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
