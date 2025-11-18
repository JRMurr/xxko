{ pkgs }:
let
  site = pkgs.callPackage ./site.nix { };
in
{
  inherit site;
}
