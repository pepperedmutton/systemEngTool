# One-click deploy script for this Systems Engineering workspace.
# 本地构建 → 打包 → 上传到 SSH 服务器 /www/wwwroot/SysEng → npm 安装 → pm2 以 3003 端口运行 Node 后端。
# 支持 sshpass（填入 $SshPass 时自动使用），否则走密钥或手输密码。

param(
  # 默认使用 SSH 配置中的别名“syseng”，可按需覆盖
  [string]$ServerHost = "syseng",
  [string]$ServerUser = "root",
  [int]$ServerPort = 22,
  # 前端调用后端的真实可解析地址（不要用 SSH 别名）
  [string]$ApiHost    = "123.56.97.173",
  [string]$RemoteDir  = "/www/wwwroot/SysEng",
  [string]$Pm2Name    = "SysEng",
  [string]$ApiPort    = "3002",
  [string]$SshPass    = ""        # 如需密码自动化，填入密码并确保已安装 sshpass
)

$ErrorActionPreference = 'Stop'

# === 路径 ===
$RepoRoot = Resolve-Path (Get-Location)
$RepoName = Split-Path $RepoRoot -Leaf
$RepoParent = Split-Path $RepoRoot -Parent
$Archive  = Join-Path $env:TEMP "syseng.tgz"
$RemoteArchive = "/tmp/syseng.tgz"

Write-Host "[local] Repo: $RepoRoot"
Write-Host "[local] Remote dir: $RemoteDir"

# === 1) 前端构建（产出 frontend/dist） ===
Write-Host "[local] npm install & build (frontend)"
Push-Location (Join-Path $RepoRoot "frontend")
$env:VITE_API_BASE_URL = "http://$ApiHost`:$ApiPort"
npm install
npm run build
Pop-Location

# === 2) 打包（排除 node_modules/.git/.cache/.venv） ===
Write-Host "[local] Create archive $Archive"
tar -czf "$Archive" `
  --exclude=node_modules `
  --exclude=.git `
  --exclude=.cache `
  --exclude=.venv `
  -C "$RepoParent" "$RepoName"

# === 3) 上传 ===
Write-Host "[upload] -> ${ServerUser}@${ServerHost}:${RemoteArchive}"
$sshDir = Join-Path $env:USERPROFILE ".ssh"
if (-not (Test-Path $sshDir)) {
  New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
}
$knownHosts = Join-Path $sshDir "known_hosts"
$sshOpts = @("-P", $ServerPort, "-o", "StrictHostKeyChecking=accept-new", "-o", "UserKnownHostsFile=$knownHosts")
if ($SshPass) {
  sshpass -p "$SshPass" scp @sshOpts "$Archive" "${ServerUser}@${ServerHost}:${RemoteArchive}"
} else {
  scp @sshOpts "$Archive" "${ServerUser}@${ServerHost}:${RemoteArchive}"
}

# === 4) 远端安装/构建/启动 ===
$remoteCmdLines = @(
  "set -e",
  "ARCHIVE='$RemoteArchive'",
  "REMOTE_DIR='$RemoteDir'",
  "PM2_NAME='$Pm2Name'",
  "API_PORT='$ApiPort'",
  "echo '[remote] prepare dir $RemoteDir'",
  "rm -rf `"$RemoteDir`"",
  "mkdir -p `"$RemoteDir`"",
  "echo '[remote] extract'",
  "tar -xzf `"$RemoteArchive`" -C `"$RemoteDir`" --strip-components=1",
  "cd `"$RemoteDir`"",
  "if ! command -v pm2 >/dev/null 2>&1; then npm install -g pm2; fi",
  "npm install --prefix backend --production",
  "pm2 delete `"$Pm2Name`" >/dev/null 2>&1 || true",
  "PORT=`"$ApiPort`" HOST=0.0.0.0 pm2 start node --name `"$Pm2Name`" -- `"$RemoteDir`"/backend/server.js",
  "pm2 save"
)
$remoteCmd = $remoteCmdLines -join "; "

Write-Host "[remote] Deploy & restart with pm2"
if ($SshPass) {
  sshpass -p "$SshPass" ssh -p $ServerPort -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$knownHosts" "$ServerUser@$ServerHost" "$remoteCmd"
} else {
  ssh -p $ServerPort -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$knownHosts" "$ServerUser@$ServerHost" "$remoteCmd"
}

Write-Host "[done] Deployed to ${ServerHost}:${ApiPort} (pm2: ${Pm2Name})"
