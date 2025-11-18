{
  lib,
  buildNpmPackage,
  importNpmLock,
  nodejs,
  writeShellApplication,
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

  npmDeps = importNpmLock.buildNodeModules {
    inherit nodejs;
    package = lib.importJSON ../package.json;
    packageLock = lib.importJSON ../package-lock.json;
    # npmRoot = fs.toSource {
    #   root = ../.;
    #   fileset = fs.unions [
    #     ../package.json
    #     ../package-lock.json
    #   ];
    # };
  };

  builtSite = buildNpmPackage ({
    inherit src nodejs;
    pname = "xxko";
    version = "0.1.0";

    # TODO: how can i pull this logic into a separate drv
    npmDeps = importNpmLock {
      package = lib.importJSON ../package.json;
      packageLock = lib.importJSON ../package-lock.json;
    };

    # npmDeps = npmDeps;

    npmConfigHook = importNpmLock.npmConfigHook;

    installPhase = ''
      runHook preInstall

      mkdir -p $out/build $out/node_modules
      cp -r build/* $out/build
      cp -r node_modules/* $out/node_modules
      cp package.json package-lock.json $out

      runHook postInstall
    '';
  });
in
writeShellApplication {
  name = "run-site";
  runtimeInputs = [ nodejs ];
  text = ''
    cd ${builtSite}
    node build
  '';
}
