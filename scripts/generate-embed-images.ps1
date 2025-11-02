# PowerShell script to generate properly-sized embed images using ImageMagick (magick).
#
# Run this from the repository root in PowerShell (Windows):
# Ensure ImageMagick is installed and `magick` is in PATH.
# .\scripts\generate-embed-images.ps1

Set-StrictMode -Version Latest
$public = Join-Path $PSScriptRoot '..\public'
Write-Host "Public dir: $public"

function Run-Magick($args) {
  $cmd = "magick $args"
  Write-Host "> $cmd"
  & magick $args
  if ($LASTEXITCODE -ne 0) { throw "magick failed with exit code $LASTEXITCODE" }
}

# 1) Icon: 1024x1024 PNG, no alpha
$srcIcon = Join-Path $public 'icon.png'
$outIcon = Join-Path $public 'icon-1024.png'
Run-Magick "`"$srcIcon`" -background white -alpha remove -alpha off -resize 1024x1024! `"$outIcon`""

# 2) Splash: 200x200 PNG (no alpha)
$srcSplash = Join-Path $public 'R11.png'
$outSplash = Join-Path $public 'splash-200.png'
Run-Magick "`"$srcSplash`" -background white -alpha remove -alpha off -resize 200x200! `"$outSplash`""

# 3) OG image: 1200x630 PNG
$srcOg = Join-Path $public 'ogimage.png'
$outOg = Join-Path $public 'og-image-1200x630.png'
Run-Magick "`"$srcOg`" -resize 1200x630! `"$outOg`""

# 4) Hero fallback (also ensure a 1200x630 hero image exists)
$srcHome = Join-Path $public 'home.png'
$outHero = Join-Path $public 'hero-1200x630.png'
Run-Magick "`"$srcHome`" -resize 1200x630! `"$outHero`""

# 5) Generate portrait screenshots (1284x2778) from existing screenshots
$screens = @('Screenshot1.png','Screenshot2.png','Screenshot3.png')
foreach ($s in $screens) {
  $src = Join-Path $public $s
  if (Test-Path $src) {
    $out = Join-Path $public ([io.path]::GetFileNameWithoutExtension($s) + '-1284x2778.png')
    # Resize with crop (resize ^ to fill, then center crop)
    Run-Magick "`"$src`" -auto-orient -resize 1284x2778^ -gravity center -extent 1284x2778 `"$out`""
  }
}

Write-Host "Done. Generated images in public/. Update manifest if needed."

# Example: after running this script, update your manifest to reference:
# https://triviacast.xyz/icon-1024.png
# https://triviacast.xyz/splash-200.png
# https://triviacast.xyz/og-image-1200x630.png
# https://triviacast.xyz/Screenshot1-1284x2778.png (etc)
