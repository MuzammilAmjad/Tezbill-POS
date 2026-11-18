@echo off
title Tezbill POS - End-to-End Browser Test
cd /d "%~dp0"
echo.
echo  Tezbill POS end-to-end test
echo  Make sure "npm run dev" is running first (Django on 8000, Vite on 5173).
echo  A Chrome window will open and walk through every feature one by one.
echo.
call npx playwright test
echo.
pause
