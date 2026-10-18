param()

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content -LiteralPath (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version
$export = Join-Path $root "dist\public-export-v$version"
$files = @(
    @{ Source = 'scripts\public-release\README.md'; Name = 'README.md' },
    @{ Source = 'scripts\public-release\index.html'; Name = 'index.html' },
    @{ Source = 'LICENSE'; Name = 'LICENSE' },
    @{ Source = 'public\brand\integritest-mark.svg'; Name = 'integritest-mark.svg' },
    @{ Source = 'public\brand\eye.svg'; Name = 'eye.svg' },
    @{ Source = "public\downloads\integritest-v$version.zip"; Name = "integritest-v$version.zip" },
    @{ Source = "public\downloads\integritest-v$version.sha256"; Name = "integritest-v$version.sha256" }
)

New-Item -ItemType Directory -Path $export -Force | Out-Null
$expected = @('.gitignore') + @($files | ForEach-Object { $_.Name })
$unexpected = @(Get-ChildItem -LiteralPath $export -Force | Where-Object { $expected -notcontains $_.Name })
if ($unexpected.Count) {
    throw "Export folder contains unexpected files: $($unexpected.Name -join ', '). Remove them manually before publishing."
}

foreach ($file in $files) {
    $source = Join-Path $root $file.Source
    $destination = Join-Path $export $file.Name
    if ($file.Name -in @('README.md', 'index.html')) {
        $content = [System.IO.File]::ReadAllText($source).Replace('{{VERSION}}', $version)
        [System.IO.File]::WriteAllText($destination, $content, (New-Object System.Text.UTF8Encoding($false)))
    } else {
        Copy-Item -LiteralPath $source -Destination $destination -Force
    }
}

$ignore = @"
# Public distribution allowlist. Development, guide, agent, skill, test,
# service, build, and secret files stay in the private project workspace.
*
!.gitignore
!README.md
!index.html
!LICENSE
!integritest-mark.svg
!eye.svg
!integritest-v$version.zip
!integritest-v$version.sha256
"@
[System.IO.File]::WriteAllText((Join-Path $export '.gitignore'), $ignore, (New-Object System.Text.UTF8Encoding($false)))

$zip = Join-Path $export "integritest-v$version.zip"
$actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
$listed = ((Get-Content -LiteralPath (Join-Path $export "integritest-v$version.sha256") -Raw).Trim() -split '\s+')[0]
if ($actual -ne $listed) { throw 'The setup ZIP does not match its published checksum.' }

Write-Output "Public export: $export"
Write-Output "Files: $($expected -join ', ')"
Write-Output "SHA-256: $actual"
