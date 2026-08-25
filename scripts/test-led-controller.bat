@echo off
cd /d "%~dp0.."
echo Close Ball Duel and Arduino Serial Monitor before testing.
set /p SIDE=Enter side blue or orange: 
node scripts\test-led-controller.js %SIDE%
pause
