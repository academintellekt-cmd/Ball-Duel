@echo off
setlocal
cd /d "%~dp0.."
call npm install --include=dev
if errorlevel 1 pause&exit /b 1
call npm run check
if errorlevel 1 pause&exit /b 1
call npm run build
if errorlevel 1 pause&exit /b 1
pause
