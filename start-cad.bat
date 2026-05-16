@echo off
cd /d "%~dp0.."
set CAD_START_BOT=false
"C:\Program Files\nodejs\node.exe" cad\server.mjs
pause
