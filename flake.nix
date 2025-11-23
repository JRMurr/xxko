{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    nix2container.url = "github:nlewo/nix2container";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      nix2container,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodeVersion = pkgs.nodejs;

        nix2containerPkgs = nix2container.packages.x86_64-linux;

        site = pkgs.callPackage ./site { nix2container = nix2containerPkgs.nix2container; };
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
          site = site.run_site;
          docker = site.docker; # https://sekun.net/blog/deploying-nix-builds-on-fly-io/

          # debugging mostly
          site_node_modules = site.node_modules_only_build;
        };
      }
    );
}
