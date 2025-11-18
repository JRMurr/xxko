{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodeVersion = pkgs.nodejs;

        myBuilds = pkgs.callPackage ./nix { };
      in
      {
        devShells = {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodeVersion
              # common
              just

              sqlitebrowser
            ];
          };
        };

        packages = {
          default = pkgs.hello;
          site = myBuilds.site.run_site;
          site_node_modules = myBuilds.site.node_modules_only_build;
        };
      }
    );
}
