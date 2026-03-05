#!/bin/bash

# PWA2Native - macOS Setup Script
echo "🚀 Starting PWA2Native Setup for macOS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit
fi

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Check for Xcode (required for iOS)
if ! xcode-select -p &> /dev/null
then
    echo "⚠️ Warning: Xcode is not installed. iOS builds will not be possible."
else
    echo "✅ Xcode detected."
fi

# Check if Java is installed
if ! command -v java &> /dev/null
then
    echo "⚠️ Warning: Java is not in your PATH. APK builds might fail."
    echo "Checking for Android Studio's bundled JRE..."
    if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
        echo "✅ Found Android Studio's bundled JRE. You can use it by setting JAVA_HOME."
        echo "Example: export JAVA_HOME=\"/Applications/Android Studio.app/Contents/jbr/Contents/Home\""
    else
        echo "❌ Java not found. Please install a JDK (version 17 or higher)."
    fi
else
    echo "✅ Java detected."
fi

# Run the development server
echo "🌐 Starting the Dashboard..."
open http://localhost:3001
npm run dev
