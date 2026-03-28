$ErrorActionPreference = "Stop"

$Publisher = "felipezarco"
$Name = "monokai-deuteranopia-colorblind"
$Version = "3.0.0"
$Repo = "felipezarco/monokai-deuteranopia-colorblind"
$VsixFile = "$Name-$Version.vsix"
$DownloadUrl = "https://github.com/$Repo/releases/download/v$Version/$VsixFile"
$DestDir = "$env:USERPROFILE\.cursor\extensions\$Publisher.$Name-$Version"

Write-Host "Installing $Name v$Version for Cursor..." -ForegroundColor Cyan

if (-not (Test-Path $VsixFile)) {
    Write-Host "Downloading $VsixFile..."
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $VsixFile
}

if (Test-Path $DestDir) {
    Write-Host "Removing previous installation..."
    Remove-Item -Recurse -Force $DestDir
}

New-Item -ItemType Directory -Path $DestDir -Force | Out-Null

Write-Host "Extracting..."
$TempDir = "$DestDir`_tmp"
Expand-Archive -Path $VsixFile -DestinationPath $TempDir -Force
Copy-Item -Path "$TempDir\extension\*" -Destination $DestDir -Recurse -Force
Remove-Item -Recurse -Force $TempDir

Write-Host ""
Write-Host "Done! Theme installed at:" -ForegroundColor Green
Write-Host "  $DestDir"
Write-Host ""
Write-Host "Restart Cursor and select 'Monokai Deuteranopia Colorblind' via:"
Write-Host "  Ctrl+K Ctrl+T" -ForegroundColor Yellow
