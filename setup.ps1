# ============================================================
#  SETUP AUTOMATIZADO — EXTRAÇÃO INTELIGENTE PREMIUM v1.4
#  Execute este script na máquina DESTINO para preparar tudo.
# ============================================================

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "Setup - Extração Inteligente Premium"

# Cores para output bonito
function Write-Step   { param($msg) Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan; Write-Host "  $msg" -ForegroundColor Cyan; Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan }
function Write-Ok     { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn   { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err    { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Info   { param($msg) Write-Host "  ℹ️  $msg" -ForegroundColor Gray }

$projectRoot = $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║   EXTRAÇÃO INTELIGENTE PREMIUM — Setup v1.4     ║" -ForegroundColor Magenta
Write-Host "  ║   Preparação automatizada para nova máquina     ║" -ForegroundColor Magenta
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

$errors = @()

# ============================================================
#  ETAPA 1 — Verificar Node.js
# ============================================================
Write-Step "ETAPA 1/5 — Verificando Node.js"

$nodeVersion = $null
try {
    $nodeVersion = (node --version 2>$null)
} catch {}

if ($nodeVersion) {
    $major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($major -ge 18) {
        Write-Ok "Node.js $nodeVersion encontrado (requerido: v18+)"
    } else {
        Write-Err "Node.js $nodeVersion é muito antigo! Requerido: v18+"
        Write-Info "Baixe em: https://nodejs.org"
        $errors += "Node.js desatualizado"
    }
} else {
    Write-Err "Node.js NÃO está instalado!"
    Write-Info "Baixe em: https://nodejs.org (versão LTS recomendada)"
    $errors += "Node.js não encontrado"
}

# Verificar npm
$npmVersion = $null
try {
    $npmVersion = (npm --version 2>$null)
} catch {}

if ($npmVersion) {
    Write-Ok "npm v$npmVersion encontrado"
} else {
    Write-Err "npm NÃO encontrado"
    $errors += "npm não encontrado"
}

# ============================================================
#  ETAPA 2 — Verificar Microsoft Edge
# ============================================================
Write-Step "ETAPA 2/5 — Verificando Microsoft Edge"

$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$edgePath2 = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"

if ((Test-Path $edgePath) -or (Test-Path $edgePath2)) {
    $edgeVer = $null
    try {
        if (Test-Path $edgePath) {
            $edgeVer = (Get-Item $edgePath).VersionInfo.ProductVersion
        } else {
            $edgeVer = (Get-Item $edgePath2).VersionInfo.ProductVersion
        }
    } catch {}
    if ($edgeVer) {
        Write-Ok "Microsoft Edge v$edgeVer encontrado"
    } else {
        Write-Ok "Microsoft Edge encontrado"
    }
} else {
    Write-Err "Microsoft Edge NÃO encontrado!"
    Write-Info "O sistema utiliza o Edge para automação (Playwright)."
    Write-Info "Instale o Edge ou ele já deve vir com o Windows 10/11."
    $errors += "Microsoft Edge não encontrado"
}

# ============================================================
#  ETAPA 3 — Instalar dependências (npm install)
# ============================================================
Write-Step "ETAPA 3/5 — Instalando dependências do projeto"

if ($nodeVersion -and $npmVersion) {
    if (Test-Path (Join-Path $projectRoot "node_modules")) {
        Write-Info "Pasta node_modules já existe. Reinstalando para garantir..."
    }

    Write-Info "Executando: npm install (isso pode levar 1-3 minutos)..."
    Write-Host ""

    $installResult = & npm install --prefer-offline 2>&1
    $installExitCode = $LASTEXITCODE

    if ($installExitCode -eq 0) {
        Write-Ok "Dependências instaladas com sucesso!"
    } else {
        Write-Err "Erro ao instalar dependências. Verifique os logs acima."
        $errors += "npm install falhou"
    }
} else {
    Write-Warn "Pulando npm install (Node.js/npm não disponível)"
}

# ============================================================
#  ETAPA 4 — Instalar binários do Playwright
# ============================================================
Write-Step "ETAPA 4/5 — Instalando binários do Playwright"

if ($nodeVersion) {
    Write-Info "Executando: npx playwright install (pode levar 2-5 minutos no primeiro uso)..."
    Write-Host ""

    $pwResult = & npx playwright install 2>&1
    $pwExitCode = $LASTEXITCODE

    if ($pwExitCode -eq 0) {
        Write-Ok "Playwright instalado com sucesso!"
    } else {
        Write-Warn "Playwright pode ter encontrado problemas. Verifique os logs acima."
        Write-Info "Você pode tentar manualmente depois: npx playwright install"
    }
} else {
    Write-Warn "Pulando instalação do Playwright (Node.js não disponível)"
}

# ============================================================
#  ETAPA 5 — Configurar arquivo .env
# ============================================================
Write-Step "ETAPA 5/5 — Configurando arquivo .env"

$envPath = Join-Path $projectRoot ".env"

if (Test-Path $envPath) {
    Write-Ok "Arquivo .env já existe. O banco de dados SQLite é configurado automaticamente."
    Write-Info "O arquivo do banco será criado em: extracao_sistema.db (na pasta do projeto)"
} else {
    Write-Info "Criando arquivo .env com configurações padrão..."

    $jwtSecret = "extracao_inteligente_jwt_" + [guid]::NewGuid().ToString("N").Substring(0, 16)

    $envContent = @"
# Configuração do Banco de Dados SQLite
DB_PATH=./extracao_sistema.db

# Autenticação JWT
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=24h
"@

    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Ok "Arquivo .env criado com sucesso!"
}

# Limpar settings.json (credenciais do ambiente anterior)
$settingsPath = Join-Path $projectRoot "settings.json"
if (Test-Path $settingsPath) {
    $settingsContent = Get-Content $settingsPath -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($settingsContent) {
        $hasEncrypted = ($settingsContent | Get-Member -MemberType NoteProperty | ForEach-Object {
            $settingsContent.($_.Name)
        }) -match "^ENC:"
        if ($hasEncrypted) {
            Write-Warn "settings.json contém credenciais criptografadas de outro ambiente."
            $resetSettings = Read-Host "  Deseja limpar o settings.json? O operador vai reconfigurar pela interface. (S/N)"
            if ($resetSettings -eq "S" -or $resetSettings -eq "s") {
                $cleanSettings = @{
                    vtmeUser = ""
                    vtmePass = ""
                    timUser  = ""
                    timPass  = ""
                    dialerUser = ""
                    dialerPass = ""
                } | ConvertTo-Json -Depth 1
                Set-Content -Path $settingsPath -Value $cleanSettings -Encoding UTF8
                Write-Ok "settings.json limpo. Reconfigure pela tela de Configurações do sistema."
            }
        }
    }
}

# ============================================================
#  RESULTADO FINAL
# ============================================================
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║             RESULTADO DO SETUP                  ║" -ForegroundColor Magenta
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

if ($errors.Count -eq 0) {
    Write-Host "  🎉 TUDO PRONTO! O sistema está configurado para esta máquina." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Banco de dados: SQLite (arquivo local, sem instalação necessária)" -ForegroundColor White
    Write-Host "  Arquivo do banco: extracao_sistema.db (criado automaticamente)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Para iniciar o sistema, execute:" -ForegroundColor White
    Write-Host "    .\EXECUTAR_SISTEMA.bat" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Credenciais do primeiro acesso:" -ForegroundColor White
    Write-Host "    Email: admin@sistema.com" -ForegroundColor Yellow
    Write-Host "    Senha: admin123" -ForegroundColor Yellow
    Write-Host "    (o sistema pedirá troca de senha no primeiro login)" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  Setup concluído com $($errors.Count) problema(s):" -ForegroundColor Yellow
    Write-Host ""
    foreach ($err in $errors) {
        Write-Host "    • $err" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  Resolva os problemas acima e execute este setup novamente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Read-Host "  Pressione ENTER para fechar"
