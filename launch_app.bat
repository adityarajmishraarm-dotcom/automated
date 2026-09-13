@echo off
title Antigravity AI-Native Chromium Browser (React App Launcher)

echo =================================================================
echo   ANTIGRAVITY AI-NATIVE BROWSER - REACT 18 DESKTOP APP
echo =================================================================
echo.

REM Verify whether backend server is listening on port 4892
netstat -ano | findstr 4892 >nul
if %errorlevel% neq 0 (
    echo [*] Starting In-Process C++ Backend Server on http://localhost:4892...
    start "" /b web_server.exe
    ping 127.0.0.1 -n 3 >nul
) else (
    echo [*] Backend Server is already active on http://localhost:4892
)

REM Detect active application target (Next.js port 3000 or C++ backend port 4892)
netstat -ano | findstr 3000 >nul
if %errorlevel% equ 0 (
    set TARGET_URL=http://localhost:3000
    echo [*] Detected Next.js App Router active on port 3000
) else (
    set TARGET_URL=http://localhost:4892
    echo [*] Detected C++ In-Process Backend active on port 4892
)

REM Launch native standalone app window in Chrome or Edge
echo [*] Launching Desktop Application Window (%TARGET_URL%)...
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1440,920 --window-position=60,40
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1440,920 --window-position=60,40
) else (
    start %TARGET_URL%
)

echo [OK] Antigravity React Application Launched Successfully!
