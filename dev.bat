@echo off
chcp 65001 >nul
title Absenta Development Launcher
cls
echo ================================================================
echo           🚀 ABSENTA DEVELOPMENT RUNNER (BACKEND & FRONTEND)
echo ================================================================
echo.
echo Lokasi Proyek : %~dp0
echo.

set "BACKEND_DIR=%~dp0absenta_backend"
set "FRONTEND_DIR=%~dp0absenta_frontend"

if not exist "%BACKEND_DIR%" (
    echo [ERROR] Folder backend tidak ditemukan: "%BACKEND_DIR%"
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] Folder frontend tidak ditemukan: "%FRONTEND_DIR%"
    pause
    exit /b 1
)

echo [1/2] Menjalankan Backend (npm run dev)...
start "Absenta Backend" cmd /k "cd /d "%BACKEND_DIR%" && npm run dev"

echo [2/2] Menjalankan Frontend (npm run dev)...
start "Absenta Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ================================================================
echo  ✅ Backend dan Frontend sedang dijalankan di jendela terpisah!
echo ================================================================
echo.
echo Menutup launcher ini dalam 5 detik (jendela server tetap berjalan)...
timeout /t 5 >nul
exit /b 0
