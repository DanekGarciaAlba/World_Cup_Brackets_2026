$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $ProjectDir ".env.local"

function ConvertFrom-SecureInput {
  param([System.Security.SecureString]$Secure)

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim()
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Read-EnvFile {
  param([string]$Path)

  $envMap = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $envMap
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    if ($_ -match '^(?<key>[^#=][^=]*)=(?<value>.*)$') {
      $envMap[$matches.key.Trim()] = $matches.value.Trim()
    }
  }
  return $envMap
}

function Set-LocalEnvValue {
  param(
    [string]$Path,
    [string]$Name,
    [string]$Value
  )

  $lines = if (Test-Path -LiteralPath $Path) {
    [System.Collections.Generic.List[string]](Get-Content -LiteralPath $Path)
  } else {
    [System.Collections.Generic.List[string]]::new()
  }

  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^$([regex]::Escape($Name))=") {
      $lines[$i] = "$Name=$Value"
      $found = $true
      break
    }
  }

  if (-not $found) {
    $lines.Add("$Name=$Value")
  }

  [System.IO.File]::WriteAllText($Path, (($lines -join [Environment]::NewLine) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
}

function Set-VercelEnvValue {
  param(
    [string]$Name,
    [string]$Value,
    [string]$Target
  )

  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = "cmd.exe"
  $psi.Arguments = "/d /s /c ""vercel.cmd env add $Name $Target --scope danek-garcia-s-projects --yes --force"""
  $psi.WorkingDirectory = $ProjectDir
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false

  $process = [System.Diagnostics.Process]::Start($psi)
  $process.StandardInput.Write($Value)
  $process.StandardInput.Close()
  $output = $process.StandardOutput.ReadToEnd()
  $errorOutput = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  $cleanOutput = (($output + $errorOutput) -replace [regex]::Escape($Value), "[REDACTED]")
  if ($process.ExitCode -ne 0) {
    throw "Failed to set Vercel $Target env var. $cleanOutput"
  }

  Write-Host "PASS Vercel $Target env var set"
}

function Test-SupabaseBackendKey {
  param(
    [hashtable]$EnvMap,
    [string]$Key
  )

  $url = $EnvMap["NEXT_PUBLIC_SUPABASE_URL"]
  if ([string]::IsNullOrWhiteSpace($url)) {
    throw "NEXT_PUBLIC_SUPABASE_URL is missing from .env.local"
  }

  $headers = @{
    apikey = $Key
    "User-Agent" = "world-cup-server-check"
  }

  if ($Key -match '^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
    $headers["Authorization"] = "Bearer $Key"
  }

  try {
    $response = Invoke-WebRequest -Uri "$url/rest/v1/sync_logs?select=id&limit=1" -Headers $headers -UseBasicParsing
    Write-Host "PASS Supabase backend REST probe HTTP $($response.StatusCode)"
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if (-not $status) {
      throw "Supabase backend REST probe failed"
    }
    throw "Supabase backend REST probe failed with HTTP $status"
  }
}

Clear-Host
Write-Host "Supabase backend key setup for World Cup Brackets 2026"
Write-Host ""
Write-Host "In the Supabase dashboard, copy either:"
Write-Host "- the new Secret key for world_cup_server/default, or"
Write-Host "- the legacy service_role key"
Write-Host ""
Write-Host "Paste it here. The input is hidden and will not be printed."
Write-Host ""

$secureKey = Read-Host "Paste Supabase backend key" -AsSecureString
$key = ConvertFrom-SecureInput $secureKey

$isSecret = $key -match '^sb_secret_[A-Za-z0-9_\-.]+$'
$isLegacyServiceRole = $key -match '^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'

if (-not ($isSecret -or $isLegacyServiceRole)) {
  throw "That does not look like a Supabase Secret key or legacy service_role key."
}

if ($isSecret -and $key.Length -lt 40) {
  throw "That looks like only the masked visible prefix, not the full Supabase Secret key. Use the Copy button, not the visible text."
}

if ($isLegacyServiceRole -and $key.Length -lt 100) {
  throw "That looks too short to be the full legacy service_role key. Use the Copy button, not the visible text."
}

$envMap = Read-EnvFile $EnvPath
Test-SupabaseBackendKey -EnvMap $envMap -Key $key

Set-LocalEnvValue -Path $EnvPath -Name "SUPABASE_SERVICE_ROLE_KEY" -Value $key
Write-Host "PASS .env.local updated"

Set-VercelEnvValue -Name "SUPABASE_SERVICE_ROLE_KEY" -Value $key -Target "production"
Set-VercelEnvValue -Name "SUPABASE_SERVICE_ROLE_KEY" -Value $key -Target "development"

Write-Host ""
Write-Host "DONE. Come back to Codex and say: done"
Read-Host "Press Enter to close"
