{
  lib,
  buildNpmPackage,
  importNpmLock,
  nodejs,
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
    ../Notes.md
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

  docker = dockerTools.streamLayeredImage {
    name = "xxko";
    tag = "latest";

    contents = [ run_site ];

    config.Cmd = [ "/bin/run-site" ];
  };

in
{
  inherit
    run_site
    builtSite
    node_modules_only_build
    docker
    ;
}
