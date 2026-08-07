@echo off
echo ============================================
echo Fixing Expo Mobile App for iOS
echo ============================================
echo.

echo [1/7] Stopping any running Metro bundler...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/7] Clearing Metro bundler cache...
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo [3/7] Clearing watchman cache...
call watchman watch-del-all 2>nul || echo Watchman not installed, skipping...

echo [4/7] Creating .env file if missing...
if not exist .env (
    echo EXPO_PUBLIC_API_URL=http://localhost:3000/api > .env
    echo Created .env file with default API URL
)

echo [5/7] Reinstalling node modules...
cd ..\..
call npm install
cd apps\mobile
call npm install

echo [6/7] Building shared packages...
cd ..\..\packages\shared
call npm run build
cd ..\types
call npm run build
cd ..\design-system
call npm install
cd ..\..\apps\mobile

echo [7/7] Starting Expo with clear cache...
echo.
echo ============================================
echo Starting app... Scan QR code with Expo Go
echo ============================================
echo.

call npx expo start -c --tunnel

pause
