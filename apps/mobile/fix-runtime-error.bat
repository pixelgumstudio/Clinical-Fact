@echo off
echo ============================================
echo Clinical Fact Mobile - Runtime Error Fix Script
echo ============================================
echo.

echo Step 1: Stopping any running Metro bundler...
taskkill /F /IM node.exe >nul 2>&1

echo Step 2: Cleaning Metro bundler cache...
cd /d "%~dp0"
rmdir /s /q node_modules\.cache 2>nul
del /f /q .expo\* 2>nul

echo Step 3: Clearing Expo cache...
npx expo start --clear

echo.
echo ============================================
echo Fix completed! Try running the app again.
echo ============================================
pause
