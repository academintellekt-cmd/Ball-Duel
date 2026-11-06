@echo off
cd /d "%~dp0.."
call npm run design
if errorlevel 1 pause
