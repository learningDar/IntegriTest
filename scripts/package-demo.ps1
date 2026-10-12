param([string]$ServiceOrigin = 'http://127.0.0.1:8787')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$uri = [Uri]$ServiceOrigin
if ($uri.Scheme -notin @('http','https') -or $uri.AbsolutePath -ne '/') { throw 'Use a service origin such as https://example.workers.dev' }
if ($uri.Scheme -eq 'http' -and $uri.Host -notin @('127.0.0.1','localhost')) { throw 'Only loopback may use HTTP.' }
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version
$bundle = Join-Path $root "dist\exam-monitor-v$version"
$extension = Join-Path $bundle 'extension'
$companion = Join-Path $bundle 'native-host'
if (Test-Path -LiteralPath $bundle) { Remove-Item -LiteralPath $bundle -Recurse -Force }
New-Item -ItemType Directory -Path $extension,$companion -Force | Out-Null
@('manifest.json','background.js','content.js','desktop.js','rules.js','popup.html','popup.js','popup.css','report.js') | ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $root $_) -Destination $extension
}
@('ExamForegroundHost.cs','install.ps1') | ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $root "native-host\$_") -Destination $companion
}
$background = Join-Path $extension 'background.js'
$text = [System.IO.File]::ReadAllText($background)
$text = $text.Replace('http://127.0.0.1:8787', $ServiceOrigin.TrimEnd('/'))
[System.IO.File]::WriteAllText($background,$text,(New-Object System.Text.UTF8Encoding($false)))
$bundleManifest = Join-Path $extension 'manifest.json'
$manifest.host_permissions = @($ServiceOrigin.TrimEnd('/') + '/*')
[System.IO.File]::WriteAllText($bundleManifest,($manifest | ConvertTo-Json -Depth 8),(New-Object System.Text.UTF8Encoding($false)))
$instructions = @"
Exam Integrity Monitor v$version

1. Extract this folder. In Chrome, open chrome://extensions, enable Developer mode,
   click Load unpacked, and choose the extension folder INSIDE exam-monitor-v$version.
   That extension folder must contain manifest.json. If Chrome says the manifest
   is missing, you selected the outer exam-monitor-v$version folder.
2. Verify the extension ID is amlfomdhhaklmifkneplnngkbaabibgp.
3. In PowerShell run:
   powershell -NoProfile -ExecutionPolicy Bypass -File native-host\install.ps1 -ExtensionId amlfomdhhaklmifkneplnngkbaabibgp
4. Reload the extension and open its popup. Pair with the code given by the professor.

Teacher service: $ServiceOrigin
The Windows companion sends only foreground app categories and timestamps.
The extension sends incident categories, timestamps, and needed hostnames.
"@
[System.IO.File]::WriteAllText((Join-Path $bundle 'README.txt'),$instructions,(New-Object System.Text.UTF8Encoding($false)))
$downloadDir = Join-Path $root 'public\downloads'
New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
$zip = Join-Path $downloadDir "exam-monitor-v$version.zip"
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $bundle '*') -DestinationPath $zip -CompressionLevel Optimal
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = Join-Path $downloadDir "exam-monitor-v$version.sha256"
[System.IO.File]::WriteAllText($checksumPath,"$hash  exam-monitor-v$version.zip`n",(New-Object System.Text.UTF8Encoding($false)))
$indexPath = Join-Path $root 'public\index.html'
$html = [System.IO.File]::ReadAllText($indexPath)
$html = [regex]::Replace($html,'<p id="checksum"[^>]*>.*?</p>',"<p id=`"checksum`" class=`"checksum`">SHA-256 <code>$hash</code> <a href=`"/downloads/exam-monitor-v$version.sha256`">Checksum file</a></p>")
[System.IO.File]::WriteAllText($indexPath,$html,(New-Object System.Text.UTF8Encoding($false)))
Write-Output "Package: $zip"
Write-Output "SHA-256: $hash"
