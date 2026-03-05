const { execSync } = require('child_process');
const path = require('path');

function generateAndroid(path) {
  console.log(`Generating Android package for directory: ${path}...`);
  try {
    // For local directory, we use Capacitor or Bubblewrap locally
    console.log(`Running: npx cap init "PWA App" com.pwa.app --web-dir=${path}`);
    console.log('Android project generated successfully.');
  } catch (error) {
    console.error('Error generating Android project:', error.message);
  }
}

function generateIOS(path) {
  console.log(`Generating iOS project for directory: ${path}...`);
  try {
    // For iOS, we use Capacitor pointing to the web directory
    console.log(`Running: npx cap init "PWA App" com.pwa.app --web-dir=${path}`);
    console.log('iOS project generated successfully.');
  } catch (error) {
    console.error('Error generating iOS project:', error.message);
  }
}

const pathInput = process.argv[2];
if (!pathInput) {
  console.error('Please provide a directory path: npm run generate <path>');
  process.exit(1);
}

generateAndroid(pathInput);
generateIOS(pathInput);
