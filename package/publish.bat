@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  ottocontrol — Build & Publish helper
::  Uso:
::    publish.bat build          — só builda
::    publish.bat local          — pack + npm install global (teste local)
::    publish.bat publish        — npm publish (requer npm login)
::    publish.bat publish --tag  — publish com tag (ex: --tag beta)
:: ============================================================

set ACTION=%1
set EXTRA=%2

if "%ACTION%"=="" (
    echo.
    echo  Uso: publish.bat [build ^| local ^| publish] [--tag ^<tag^>]
    echo.
    echo    build    Gera o dist/ via build.mjs
    echo    local    Build + npm install globalmente para teste
    echo    publish  Build + npm publish ^(requer npm login^)
    echo.
    exit /b 0
)

:: ── Build ────────────────────────────────────────────────────────────────────
echo.
echo [1/3] Buildando pacote...
call npm run build
if errorlevel 1 (
    echo ERRO: build falhou.
    exit /b 1
)
echo       OK

if "%ACTION%"=="build" (
    echo.
    echo Build concluido. Arquivos em dist\
    exit /b 0
)

:: ── LOCAL: install global a partir do diretorio local ───────────────────────
if "%ACTION%"=="local" (
    echo.
    echo [2/3] Instalando globalmente a partir do diretorio local...
    call npm install -g .
    if errorlevel 1 (
        echo ERRO: instalacao global falhou.
        exit /b 1
    )

    echo.
    echo Instalado! Teste com:
    echo   ottocontrol --help
    echo   ottocontrol up
    exit /b 0
)

:: ── PUBLISH ─────────────────────────────────────────────────────────────────
if "%ACTION%"=="publish" (
    echo.
    echo [2/3] Verificando login no npm...
    call npm whoami >nul 2>&1
    if errorlevel 1 (
        echo Voce nao esta logado. Execute: npm login
        exit /b 1
    )
    for /f "tokens=*" %%u in ('npm whoami') do set NPMUSER=%%u
    echo       Logado como: !NPMUSER!

    echo.
    echo [3/3] Publicando...
    if not "%EXTRA%"=="" (
        call npm publish --access public !EXTRA!
    ) else (
        call npm publish --access public
    )
    if errorlevel 1 (
        echo ERRO: publish falhou.
        exit /b 1
    )

    echo.
    for /f "tokens=*" %%v in ('node -p "require('./package.json').version"') do set PKG_VERSION=%%v
    echo Publicado: ottocontrol@!PKG_VERSION!
    echo https://www.npmjs.com/package/ottocontrol
    exit /b 0
)

echo Acao desconhecida: %ACTION%
echo Use: build, local ou publish
exit /b 1
