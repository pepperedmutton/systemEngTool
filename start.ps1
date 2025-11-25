# PowerShell bootstrapper that launches the Node backend and the Vite dev server
# for instant hot reload. Usage: powershell -ExecutionPolicy Bypass -File .\start.ps1 [-NoWait]

param(
    [switch]$NoWait,
    [int]$Port = 8001,
    [string]$BindHost = '127.0.0.1',
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodeExe = $nodeCommand.Source
} else {
    $nodeExe = $null
}
if (-not $nodeExe) {
    throw "node executable not found in PATH."
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($npmCommand) {
    $npmExe = $npmCommand.Source
} else {
    $npmCommandFallback = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCommandFallback) {
        $npmExe = $npmCommandFallback.Source
    } else {
        $npmExe = $null
    }
}
if (-not $npmExe) {
    throw "npm (Node.js) executable not found in PATH."
}

function Ensure-BackendDependencies {
    $nodeModules = Join-Path $backendDir 'node_modules'
    if (-not (Test-Path $nodeModules)) {
        Write-Host "Installing backend dependencies (npm install)..."
        Push-Location $backendDir
        & $npmExe install
        Pop-Location
    }
}

function Start-ManagedProcess {
    param (
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    Write-Host "Starting $Name..."
    $process = Start-Process -FilePath $FilePath `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -PassThru

    if (-not $process) {
        throw "Failed to start $Name"
    }

    Write-Host "$Name PID: $($process.Id)"
    return $process
}

$env:HOST = $BindHost
$env:PORT = $Port
$env:VITE_API_BASE_URL = "http://$BindHost`:$Port"

Ensure-BackendDependencies

$backendArgs = @(
    (Join-Path $backendDir 'server.js')
)

$frontendArgs = @(
    'run', 'dev',
    '--',
    '--host', '127.0.0.1',
    '--port', $FrontendPort.ToString()
)

$backendProcess = Start-ManagedProcess -Name 'Backend (Node)' -FilePath $nodeExe -Arguments $backendArgs -WorkingDirectory $backendDir
$frontendProcess = Start-ManagedProcess -Name 'Frontend (Vite dev server)' -FilePath $npmExe -Arguments $frontendArgs -WorkingDirectory $frontendDir

$primaryApiUrl = "http://$BindHost`:$Port/"
$frontendUrl = "http://127.0.0.1`:$FrontendPort/"
Write-Host "`nBackend running at $primaryApiUrl"
if ($BindHost -eq '0.0.0.0') {
    Write-Host "提示：在浏览器中请使用 http://localhost:$Port/ 或 http://<你的IP>:$Port/ 访问 API。"
}
Write-Host "Frontend dev server (hot reload): $frontendUrl"

if ($NoWait) {
    Write-Host "NoWait flag detected. Backend PID: $($backendProcess.Id); Frontend PID: $($frontendProcess.Id)"
    return
}

try {
    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id
}
finally {
    Write-Warning "Stopping services..."
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force
    }
}
