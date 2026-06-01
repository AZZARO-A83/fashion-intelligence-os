@echo off
title Fashion Intelligence OS
echo Starting Fashion Intelligence OS...
cd /d "%~dp0"
start "" "http://localhost:3001"
npx next dev --port 3001
pause
