{ pkgs }:

{
  site = pkgs.callPackage ./site.nix { };
}
