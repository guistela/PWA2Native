@echo off
:: PWA2Native - Windows Setup Script
echo 🚀 Starting PWA2Native Setup for Windows...

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit
)

:: Install dependencies
echo 📦 Installing project dependencies...
call npm install

:: Check for Android Studio (Common for APK builds)
if exist "%LOCALAPPDATA%\Android\Sdk" (
    echo ✅ Android SDK detected.
) else (
    echo ⚠️ Warning: Android SDK not found in default location. APK builds might fail.
)

:: Check for Java (JDK 17+)
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Warning: Java is not in your PATH. APK builds might fail.
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        echo ✅ Found Android Studio's bundled JRE. You can use it by setting JAVA_HOME.
    ) else (
        echo ❌ Java not found. Please install a JDK (version 17 or higher).
    )
) else (
    echo ✅ Java detected.
)

:: Start the app and open browser
echo 🌐 Starting the Dashboard...
start http://localhost:3001
npm run dev
