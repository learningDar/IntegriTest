param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-p]{32}$')]
    [string]$ExtensionId
)

$ErrorActionPreference = 'Stop'
$hostName = 'com.learningdar.exam_monitor'
$compiler = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'The .NET Framework C# compiler was not found.' }

$outputDirectory = Join-Path $PSScriptRoot 'bin'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$binary = Join-Path $outputDirectory 'ExamForegroundHost.exe'
$source = Join-Path $PSScriptRoot 'ExamForegroundHost.cs'
& $compiler /nologo /target:exe "/out:$binary" /reference:System.Web.Extensions.dll $source
if ($LASTEXITCODE -ne 0) { throw 'Native host compilation failed.' }

$manifestPath = Join-Path $PSScriptRoot 'host-manifest.json'
$manifest = @{
    name = $hostName
    description = 'Google Forms exam foreground category monitor'
    path = $binary
    type = 'stdio'
    allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($manifestPath, $manifest, (New-Object System.Text.UTF8Encoding($false)))

$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestPath
Write-Output "Registered $hostName for chrome-extension://$ExtensionId/"
Write-Output "Host: $binary"
