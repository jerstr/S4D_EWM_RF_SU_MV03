<#
.SYNOPSIS
Lokalny deploy aplikacji Fiori do S4D (klient i transport z ui5-deploy.yaml).
Hasło SAP jest pytane przy uruchomieniu i trzymane tylko w pamięci tego procesu -
nie zapisujemy go w .env ani w żadnym pliku.

.EXAMPLE
.\deploy-local.ps1                       # użytkownik z FIORI_TOOLS_USER albo pytanie, hasło z klawiatury
.\deploy-local.ps1 -User JSTRYJA -Transport S4DK929808
.\deploy-local.ps1 -TestMode             # próbny deploy bez zapisu w systemie (fiori deploy --testMode)
.\deploy-local.ps1 -IgnoreCert           # gdy Node nie ufa certyfikatowi serwera (ostatnia deska ratunku)

Uruchamiać we własnym terminalu (skrypt czyta hasło z klawiatury).
#>
param(
    [string]$User = $env:FIORI_TOOLS_USER,
    [string]$Transport,
    [switch]$TestMode,
    [switch]$IgnoreCert
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Parametry celu z ui5-deploy.yaml (jedno źródło prawdy, to samo co w BAS)
$cfg = Get-Content ui5-deploy.yaml -Raw
function Get-YamlValue([string]$pattern) {
    if ($cfg -match $pattern) { return $Matches[1].Trim() }
    return $null
}
$app    = Get-YamlValue '(?m)^\s+name:\s*"?(Z\w+)"?'
$client = Get-YamlValue '(?m)^\s+client:\s*"?(\d{3})"?'
$url    = Get-YamlValue '(?m)^\s+url:\s*"?(\S+?)"?\s*$'
$tr     = if ($Transport) { $Transport } else { Get-YamlValue '(?m)^\s+transport:\s*"?(\w+)"?' }
if (-not $app -or -not $client -or -not $url -or -not $tr) {
    throw "Nie udało się odczytać app/client/url/transport z ui5-deploy.yaml"
}

$branch = git rev-parse --abbrev-ref HEAD
$commit = git log -1 --format='%h %s'
Write-Host ""
Write-Host "Aplikacja: $app   System: $url   Mandant: $client   Transport: $tr" -ForegroundColor Cyan
Write-Host "Git: $branch  $commit"
if (git status --porcelain) {
    Write-Warning "Są niezacommitowane zmiany - deploy wgra stan z dysku, nie z Git."
}
if ($TestMode) { Write-Host "Tryb próbny (--testMode): nic nie zostanie zapisane w S4D." -ForegroundColor Yellow }

if (-not $User) {
    $User = Read-Host "Użytkownik SAP [JSTRYJA]"
    if (-not $User) { $User = 'JSTRYJA' }
}
$secure = Read-Host "Hasło SAP dla $User" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
if (-not $password) { throw "Brak hasła - przerwano." }

$answer = Read-Host "Wdrożyć $app do $url klient $client, transport $tr? [t/N]"
if ($answer -notin @('t', 'T', 'tak', 'TAK')) { Write-Host "Przerwano."; return }

$env:FIORI_TOOLS_USER     = $User
$env:FIORI_TOOLS_PASSWORD = $password
# Node ma ufać certyfikatom z magazynu Windows (jak przeglądarka i curl)
$env:NODE_OPTIONS = '--use-system-ca'
if ($IgnoreCert) { $env:NODE_TLS_REJECT_UNAUTHORIZED = '0' }

try {
    npm run build
    if ($LASTEXITCODE) { throw "Build zakończony błędem ($LASTEXITCODE)." }

    $deployArgs = @('fiori', 'deploy', '--config', 'ui5-deploy.yaml',
                    '--url', $url, '--client', $client, '--transport', $tr, '--yes')
    if ($TestMode) { $deployArgs += @('--testMode', 'true') }
    npx @deployArgs
    if ($LASTEXITCODE) { throw "Deploy zakończony błędem ($LASTEXITCODE)." }

    Remove-Item archive.zip -ErrorAction SilentlyContinue
    Write-Host "Gotowe: $app w $url klient $client, transport $tr." -ForegroundColor Green
}
finally {
    # hasło znika razem ze zmiennymi procesu
    Remove-Item Env:FIORI_TOOLS_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
    $password = $null
}
