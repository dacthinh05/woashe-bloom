@echo off
title Web Hoa Tuoi - Woashe Bloom
echo ===================================================
echo   Dang khoi dong Website Hoa Tuoi - Woashe Bloom
echo   Cua hang: http://localhost:9090
echo   Quan tri: http://localhost:9090/admin
echo   Tai khoan admin: admin / woashe2026@
echo ===================================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9090 ^| findstr LISTENING') do (
  if not "%%a"=="%~1" taskkill /f /pid %%a >nul 2>&1
)
start http://localhost:9090
node server.js
pause
