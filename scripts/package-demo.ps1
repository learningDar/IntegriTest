param([string]$ServiceOrigin = 'http://127.0.0.1:8787')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$uri = [Uri]$ServiceOrigin
if ($uri.Scheme -notin @('http','https') -or $uri.AbsolutePath -ne '/') { throw 'Use a service origin such as https://example.workers.dev' }
if ($uri.Scheme -eq 'http' -and $uri.Host -notin @('127.0.0.1','localhost')) { throw 'Only loopback may use HTTP.' }
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version
$bundle = Join-Path $root "dist\integritest-v$version"
$resolvedRoot = [IO.Path]::GetFullPath($root)
$resolvedBundle = [IO.Path]::GetFullPath($bundle)
if (-not $resolvedBundle.StartsWith($resolvedRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe package output path.' }
$extension = Join-Path $bundle 'extension'
$companion = Join-Path $bundle 'native-host'
if (Test-Path -LiteralPath $bundle) { Remove-Item -LiteralPath $bundle -Recurse -Force }
New-Item -ItemType Directory -Path $extension,$companion -Force | Out-Null
@('manifest.json','background.js','content.js','desktop.js','rules.js','popup.html','popup.js','popup.css','report.js') | ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $root $_) -Destination $extension
}
New-Item -ItemType Directory -Path (Join-Path $extension 'icons') -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $root 'icons') -Filter '*.png' | Copy-Item -Destination (Join-Path $extension 'icons')
Copy-Item -LiteralPath (Join-Path $root 'LICENSE') -Destination $bundle
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
IntegriTest v$version

1. In Downloads, right-click the ZIP and choose Extract All. Open the extracted
   folder showing both extension and native-host. Keep this folder in place.
2. In Chrome, open chrome://extensions, turn on Developer mode, and click
   Load unpacked. Open the extracted extension folder, then click Select Folder.
   Chrome's folder picker hides files, so only icons may be visible inside it.
   Do not select icons or the outer integritest-v$version folder.
3. Verify the extension ID is amlfomdhhaklmifkneplnngkbaabibgp.
4. In ordinary File Explorer, return to the extracted folder showing extension
   and native-host. Click the address bar, type powershell, and press Enter.
   In the PowerShell window run:
   powershell -NoProfile -ExecutionPolicy Bypass -File native-host\install.ps1 -ExtensionId amlfomdhhaklmifkneplnngkbaabibgp
   Look for the Registered message, then reload the extension.
5. Open the popup, pair with your own code, and open the registered Form.

Teacher service: $ServiceOrigin
The Windows companion sends only foreground app categories and timestamps.
The extension sends incident categories, timestamps, and needed hostnames.
"@
[System.IO.File]::WriteAllText((Join-Path $bundle 'README.txt'),$instructions,(New-Object System.Text.UTF8Encoding($false)))
$downloadDir = Join-Path $root 'public\downloads'
New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
$zip = Join-Path $downloadDir "integritest-v$version.zip"
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $bundle '*') -DestinationPath $zip -CompressionLevel Optimal
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = Join-Path $downloadDir "integritest-v$version.sha256"
[System.IO.File]::WriteAllText($checksumPath,"$hash  integritest-v$version.zip`n",(New-Object System.Text.UTF8Encoding($false)))
$indexPath = Join-Path $root 'public\index.html'
$html = [System.IO.File]::ReadAllText($indexPath)
$html = [regex]::Replace($html,'<p id="checksum"[^>]*>.*?</p>',"<p id=`"checksum`" class=`"checksum`">SHA-256 <code>$hash</code> <a href=`"/downloads/integritest-v$version.sha256`">Checksum file</a></p>")
[System.IO.File]::WriteAllText($indexPath,$html,(New-Object System.Text.UTF8Encoding($false)))
Write-Output "Package: $zip"
Write-Output "SHA-256: $hash"
