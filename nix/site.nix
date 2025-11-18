{
  lib,
  buildNpmPackage,
  importNpmLock,
  nodejs,
  writeShellApplication,
  runCommand,
}:
let
  fs = lib.fileset;

  baseSrc = fs.gitTracked ../.;

  nixFiles = fs.fileFilter (file: lib.hasSuffix ".nix" file.name) ../.;

  ignoreFiles = fs.unions [
    ../.env.example
    ../.envrc
    ../.vscode
    ../nix
    ../tests
    ../slumber.yml
    nixFiles
  ];

  filtered = fs.difference baseSrc ignoreFiles;

  src = fs.toSource {
    root = ../.;
    fileset = filtered;
  };

  # npmDeps = importNpmLock.buildNodeModules {
  #   inherit nodejs;
  #   package = lib.importJSON ../package.json;
  #   packageLock = lib.importJSON ../package-lock.json;
  #   # npmRoot = fs.toSource {
  #   #   root = ../.;
  #   #   fileset = fs.unions [
  #   #     ../package.json
  #   #     ../package-lock.json
  #   #   ];
  #   # };
  # };

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

        mkdir ./node_modules
        ls -la

        cp -r ${src}/* .
        cp -r ${node_modules_only_build}/node_modules .

        npm run build

        mkdir -p $out/build $out/node_modules
        cp -r build/* $out/build
        cp -r node_modules/* $out/node_modules
        cp package.json package-lock.json $out
      '';

  # builtSite = buildNpmPackage ({
  #   inherit src nodejs;
  #   pname = "xxko";
  #   version = "0.1.0";

  #   # TODO: how can i pull this logic into a separate drv
  #   npmDeps = importNpmLock {
  #     package = lib.importJSON ../package.json;
  #     packageLock = lib.importJSON ../package-lock.json;
  #   };

  #   # npmDeps = npmDeps;

  #   npmConfigHook = importNpmLock.npmConfigHook;

  #   installPhase = ''
  #     runHook preInstall

  #     mkdir -p $out/build $out/node_modules
  #     cp -r build/* $out/build
  #     cp -r node_modules/* $out/node_modules
  #     cp package.json package-lock.json $out

  #     runHook postInstall
  #   '';
  # });

  run_site = writeShellApplication {
    name = "run-site";
    runtimeInputs = [ nodejs ];
    text = ''
      cd ${builtSite}
      node build
    '';
  };
in
{
  inherit
    run_site
    builtSite
    node_modules_only_build
    ;
}
