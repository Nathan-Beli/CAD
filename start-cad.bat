@echo off
cd /d "%~dp0.."
set CAD_START_BOT=false
set CAD_PORT=4175
"C:\Program Files\nodejs\node.exe" cad\server.mjs
pause
