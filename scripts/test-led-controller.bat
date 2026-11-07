@echo off
cd /d "%~dp0.."
echo Close Ball Duel and Arduino Serial Monitor before testing.
set /p SIDE=Enter side blue or orange: 
set /p "LED_PORT=Enter COM port (for example COM7): "
node scripts\test-led-controller.js "%SIDE%" "%LED_PORT%"
pause
