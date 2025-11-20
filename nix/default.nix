{ pkgs, nix2container }:
let
  site = pkgs.callPackage ./site.nix { inherit nix2container; };
in
{
  inherit site;
}
