# Launch the rc.3 Desktop development build against the isolated Adaptive Reasoning
# fixture profile. Every path is a synthetic directory under the given checkout;
# the installed Desktop, its profile and the Direct Chat fixture are not touched.
#
# Usage: Start-ArFixtureDesktop.ps1 -DesktopSource <.package-check-dsh> -Run <label> [-Port 51809]
param(
  [Parameter(Mandatory)] [string]$DesktopSource,
  [Parameter(Mandatory)] [string]$Run,
  [int]$Port = 51809
)
$ErrorActionPreference = 'Stop'
$profileRoot = Join-Path $DesktopSource '.ar-fixture-harness-home'
$electronData = Join-Path $DesktopSource '.ar-fixture-electron-userdata'
if (-not (Test-Path (Join-Path $profileRoot 'profiles\desktop\cordis.patch.yml'))) { throw "Missing AR fixture profile at $profileRoot" }
Get-ChildItem Env: | Where-Object Name -Match '^(DSH_|ELECTRON_|DEEPSEEK_|.*_(API_KEY|TOKEN|SECRET|PASSWORD)$)' | ForEach-Object { Remove-Item -LiteralPath ('Env:' + $_.Name) }
$env:DSH_HOME = $profileRoot
$env:DSH_DESKTOP_PRIMARY_RUNTIME_DIR = Join-Path $DesktopSource '.fixture-runtime'
$env:DSH_DESKTOP_OPEN_DEVTOOLS = '0'
$env:DSH_TELEMETRY_DISABLED = '1'
$env:DSH_DESKTOP_DIAGNOSTIC_FILE = Join-Path $DesktopSource ("ar-fixture-$Run-fatal.log")
$env:ELECTRON_ENABLE_LOGGING = '1'
$env:DEEPSEEK_API_KEY = 'fixture-local-credential'
$env:DEEPSEEK_BASE_URL = "http://127.0.0.1:$Port"
$env:NO_PROXY = '127.0.0.1,localhost'
$desktopApp = Join-Path $DesktopSource 'apps/desktop'
$desktopExe = Join-Path $DesktopSource '.fixture-electron/electron.exe'
$launch = Start-Process -FilePath $desktopExe -ArgumentList @('--enable-logging', ('--user-data-dir="' + $electronData + '"'), ('"' + $desktopApp + '"')) `
  -WorkingDirectory $desktopApp -WindowStyle Normal `
  -RedirectStandardOutput (Join-Path $DesktopSource "ar-fixture-$Run.out") -RedirectStandardError (Join-Path $DesktopSource "ar-fixture-$Run.err") -PassThru
Write-Output "AR fixture Desktop PID $($launch.Id)"
$launch.WaitForExit()
Write-Output "AR fixture Desktop exit $($launch.ExitCode)"
exit $launch.ExitCode
