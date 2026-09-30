@echo off
title Absenta Development Launcher
cls
echo ================================================================
echo           ABSENTA DEVELOPMENT RUNNER - BACKEND and FRONTEND
echo ================================================================
echo.
echo Lokasi Proyek: %~dp0
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
echo  Sukses: Backend dan Frontend berjalan di jendela terpisah!
echo ================================================================
echo.
echo Menutup launcher dalam 3 detik...
ping 127.0.0.1 -n 4 >nul
exit /b 0
