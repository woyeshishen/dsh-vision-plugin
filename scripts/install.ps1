# =============================================================================
# dsh-vision-plugin one-liner installer (Windows PowerShell 5.1+ / pwsh)
#
# Installs via the official DSH CLI and auto-mounts:
#   dsh plugin --profile web add @woyeshishen/dsh-vision-plugin@<version>
#
# The package declares dsh.bundle.patch (cordis.patch.yml), so the CLI's bundle
# reconciliation adds it to dsh.profile.bundles automatically — no manual
# cordis.patch.yml row needed.
#
# Usage:
#   # default (latest)
#   irm https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.ps1 | iex
#   # pinned version / restart after install
#   & ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.ps1'))) 1.0.1 --restart
#   # dry-run
#   & ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/woyeshishen/dsh-vision-plugin/main/scripts/install.ps1'))) --dry-run
#
# Args (positional version + flags):
#   <version>   npm version/range, default latest
#   --restart   try `pm2 restart dsh-web` after install
#   --dry-run   print planned actions, write nothing
#   -h|--help   print help
#
# Env (all optional): DSH_HOME (default %USERPROFILE%\.dsh), REGISTRY (npm), DSH_CMD (dsh command)
#
# Notes:
# - pnpm 11's minimumReleaseAge rejects releases <24h. This script pre-writes
#   minimumReleaseAgeExclude (idempotent) to allow this package.
# - Idempotently removes any old manual mount row (id: vision-plugin) to avoid
#   double-mounting.
# - Rollback: dsh plugin --profile web remove @woyeshishen/dsh-vision-plugin
# =============================================================================

$PKG = '@woyeshishen/dsh-vision-plugin'
$REGISTRY = if ($env:REGISTRY) { $env:REGISTRY } else { 'https://registry.npmjs.org' }

# ---- parse args (positional + flags; no param() so `irm | iex` works) ----
$Version = ''
$Restart = $false
$DryRun = $false
foreach ($a in $args) {
  switch ($a) {
    '--restart' { $Restart = $true }
    '--dry-run' { $DryRun = $true }
    '-h' { Write-Host 'Usage: irm .../install.ps1 | iex   (or with args: ... 1.0.1 --restart --dry-run)'; exit 0 }
    '--help' { Write-Host 'Usage: irm .../install.ps1 | iex   (or with args: ... 1.0.1 --restart --dry-run)'; exit 0 }
    default {
      if ($a -like '-*') { Write-Error "unknown option: $a"; exit 2 }
      $Version = $a
    }
  }
}

# DSH_HOME: env > %USERPROFILE% > $HOME
if ($env:DSH_HOME) {
  $DSH_HOME = $env:DSH_HOME
} elseif ($env:USERPROFILE) {
  $DSH_HOME = Join-Path $env:USERPROFILE '.dsh'
} else {
  $DSH_HOME = Join-Path $HOME '.dsh'
}
$PROFILE_DIR = Join-Path $DSH_HOME 'profiles\web'
$WS_YML = Join-Path $PROFILE_DIR 'pnpm-workspace.yaml'
$PATCH_YML = Join-Path $PROFILE_DIR 'cordis.patch.yml'

function Say([string]$m)  { Write-Host "[install] $m" -ForegroundColor Green }
function Warn([string]$m) { Write-Host "[warn] $m" -ForegroundColor Yellow }
function Die([string]$m)  { Write-Host "[error] $m" -ForegroundColor Red; exit 1 }

# Resolve version -> npm spec ("x.y.z" / "^x.y.z" / latest)
function Resolve-Spec {
  param([string]$Given)
  if ([string]::IsNullOrWhiteSpace($Given) -or $Given -eq 'latest') {
    $v = $null
    foreach ($tool in @('npm', 'pnpm')) {
      if (Get-Command $tool -ErrorAction SilentlyContinue) {
        $v = (& $tool view $PKG version "--registry=$REGISTRY" 2>$null | Select-Object -Last 1)
        if ($v) { break }
      }
    }
    if ($v) { return ([string]$v).Trim() }
    Warn 'Could not resolve latest version (npm/pnpm query failed), falling back to latest.'
    return 'latest'
  }
  return $Given
}

# Assemble dsh CLI: prefer dsh on PATH, else npx
function Get-DshCli {
  if ($env:DSH_CMD) { return $env:DSH_CMD }
  if (Get-Command dsh -ErrorAction SilentlyContinue) { return 'dsh' }
  if (Get-Command npx -ErrorAction SilentlyContinue) { return 'npx' }
  return $null
}

# Preflight
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Die 'node not found (DSH needs Node.js >= 20).'
}
if (-not (Test-Path $PROFILE_DIR)) {
  Die "profile dir not found: $PROFILE_DIR (install and run dsh web once first)"
}
if (-not (Test-Path $WS_YML)) {
  Die "missing $WS_YML (initialize the web profile first)"
}

$SPEC = Resolve-Spec $Version
$CLI = Get-DshCli
if (-not $CLI) {
  Die 'dsh or npx not found. Install DSH, or set DSH_CMD.'
}
Say "Target: $CLI plugin --profile web add $PKG@$SPEC (profile: $PROFILE_DIR)"

if ($DryRun) {
  Say "[dry-run] step 1: ensure $WS_YML has minimumReleaseAgeExclude ($PKG)"
  Say "[dry-run] step 2: run $CLI plugin --profile web add $PKG@$SPEC"
  Say "[dry-run] step 3: verify dsh.profile.bundles contains $PKG"
  Say "[dry-run] step 4: remove any old manual vision-plugin mount row"
  if ($Restart) { Say '[dry-run] step 5: pm2 restart dsh-web' } else { Say '[dry-run] step 5: prompt user to restart DSH' }
  exit 0
}

# Step 1: pre-write minimumReleaseAgeExclude (idempotent)
$wsScript = @'
const fs = require("fs");
const p = process.argv[2];
const pkg = process.argv[3];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let t = fs.readFileSync(p, "utf8");
const before = t;
const lineRe = new RegExp("^\\s*-\\s*\"?" + esc(pkg) + "\"?\\s*$", "m");
if (!lineRe.test(t)) {
  if (/^\s*minimumReleaseAgeExclude:\s*$/m.test(t)) {
    t = t.replace(/^(\s*minimumReleaseAgeExclude:\s*)$/m, '$1\n  - "' + pkg + '"');
  } else {
    t += '\nminimumReleaseAgeExclude:\n  - "' + pkg + '"\n';
  }
}
if (t !== before) fs.writeFileSync(p, t);
console.log(t === before ? "unchanged" : "updated");
'@
$wsJs = Join-Path $env:TEMP ("dshv-ws-" + [guid]::NewGuid().ToString("N") + ".js")
Set-Content -LiteralPath $wsJs -Value $wsScript -Encoding UTF8
$wsOut = node $wsJs "$WS_YML" "$PKG" 2>&1
$wsCode = $LASTEXITCODE
Remove-Item -LiteralPath $wsJs -Force -ErrorAction SilentlyContinue
$wsResult = (($wsOut | Out-String)).Trim()
if ($wsCode -ne 0) { Die "failed to patch $WS_YML (node exit $wsCode): $wsResult" }
if ($wsResult -eq 'updated') { Say "Ensured ${WS_YML}: minimumReleaseAgeExclude ($PKG)" }
else { Say 'workspace settings already ready, skipped' }

# Step 2: official CLI install + bundle auto-registration
if ($CLI -eq 'dsh') {
  $cliArgs = @('plugin', '--profile', 'web', 'add', "$PKG@$SPEC")
} else {
  $cliArgs = @('-y', '--package', '@deepseek-ai/dsh', 'dsh', 'plugin', '--profile', 'web', 'add', "$PKG@$SPEC")
}
Say "Running $CLI plugin --profile web add $PKG@$SPEC ..."
$addOut = & $CLI @cliArgs 2>&1
$addCode = $LASTEXITCODE
$addOut | ForEach-Object { $_ }
if ($addCode -ne 0) {
  Warn 'dsh plugin add failed. Possible causes: network/login, or dependency conflict.'
  Warn "  retry manually: cd $PROFILE_DIR; pnpm install"
  exit 1
}

# Step 3: verify bundle registered
$pkgJson = Get-Content -Raw (Join-Path $PROFILE_DIR 'package.json') | ConvertFrom-Json
$bundles = $pkgJson.dsh.profile.bundles
if ($bundles -notcontains $PKG) {
  Warn 'dsh-vision-plugin not in dsh.profile.bundles — mount not registered.'
  exit 1
}
Say "bundle registered: dsh.profile.bundles contains $PKG"

# Step 4: idempotently remove old manual mount row (avoid double mount)
$mountScript = @'
const fs = require("fs");
const p = process.argv[2];
const lines = fs.readFileSync(p, "utf8").split("\n");
const out = [];
let i = 0;
let removed = false;
while (i < lines.length) {
  const line = lines[i];
  if (/^[ \t]*- insert:\s*$/.test(line)) {
    const block = [line];
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== "" && !/^-\s/.test(lines[j])) {
      block.push(lines[j]);
      j++;
    }
    if (block.some((l) => /id:\s*vision-plugin\b/.test(l))) {
      while (out.length && /^[ \t]*#/.test(out[out.length - 1])) out.pop();
      i = j;
      removed = true;
      continue;
    }
  }
  out.push(line);
  i++;
}
if (!removed) { console.log("none"); }
else {
  const t = out.join("\n").replace(/\n{3,}/g, "\n\n");
  fs.writeFileSync(p, t);
  console.log("removed");
}
'@
$mountJs = Join-Path $env:TEMP ("dshv-mount-" + [guid]::NewGuid().ToString("N") + ".js")
Set-Content -LiteralPath $mountJs -Value $mountScript -Encoding UTF8
$mountOut = node $mountJs "$PATCH_YML" 2>&1
$mountCode = $LASTEXITCODE
Remove-Item -LiteralPath $mountJs -Force -ErrorAction SilentlyContinue
$mountResult = (($mountOut | Out-String)).Trim()
if ($mountCode -ne 0) { Die "failed to patch $PATCH_YML (node exit $mountCode): $mountResult" }
if ($mountResult -eq 'removed') { Say "removed old vision-plugin manual mount row from $PATCH_YML" }
else { Say 'no old manual mount row, skipped' }

Say "install complete: $PKG@$SPEC"

# Step 5: restart hint
if ($Restart) {
  if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Say 'restarting dsh-web (pm2)...'
    pm2 restart dsh-web
    if ($LASTEXITCODE -ne 0) { Warn 'pm2 restart failed, restart DSH manually' }
  } else {
    Warn 'pm2 not found, restart DSH manually (pm2 restart dsh-web or dsh web)'
  }
} else {
  Say 'next: restart DSH and hard-refresh (Ctrl+Shift+R).'
  if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Say 'pm2 available: pm2 restart dsh-web (briefly disconnects the page)'
  }
}
