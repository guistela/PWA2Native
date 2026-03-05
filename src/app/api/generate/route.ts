import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    let { path: pwaPath, platform } = await request.json();

    if (!pwaPath || !fs.existsSync(pwaPath)) {
      return NextResponse.json({ error: 'Invalid directory path' }, { status: 400 });
    }

    // Try to extract app name from manifest.json if it exists
    let appName = "PWA2NativeApp";
    let appId = "com.pwa2native.app";

    const manifestPath = path.join(pwaPath, 'manifest.json');
    const webManifestPath = path.join(pwaPath, 'site.webmanifest');
    const actualManifestPath = fs.existsSync(manifestPath) ? manifestPath : (fs.existsSync(webManifestPath) ? webManifestPath : null);

    if (actualManifestPath) {
      try {
        const manifest = JSON.parse(fs.readFileSync(actualManifestPath, 'utf-8'));
        if (manifest.short_name || manifest.name) {
          appName = manifest.short_name || manifest.name;
          // Generate a safe appId based on the name
          const safeName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
          appId = `com.${safeName}.app`;
        }
      } catch (e) {
        console.error('Failed to parse manifest for app name:', e);
      }
    }

    const publicDownloads = path.join(process.cwd(), 'public', 'downloads');
    
    if (!fs.existsSync(publicDownloads)) {
      fs.mkdirSync(publicDownloads, { recursive: true });
    }

    // 0. Basic validation: check if index.html exists in the target directory
    const indexHtmlPath = path.join(pwaPath, 'index.html');
    let webDir = "";
    
    if (fs.existsSync(indexHtmlPath)) {
      // If index.html is in the root, we'll use 'www' as webDir to satisfy Capacitor
      webDir = "www";
    } else {
      // Look in common subdirectories like 'dist', 'build', 'out', 'public'
      const commonDirs = ['dist', 'build', 'out', 'public'];
      let found = false;
      for (const dir of commonDirs) {
        if (fs.existsSync(path.join(pwaPath, dir, 'index.html'))) {
          webDir = dir;
          found = true;
          break;
        }
      }
      if (!found) {
        return NextResponse.json({ 
          error: 'No index.html found in the selected directory.',
          details: 'Please select a directory that contains your built PWA files (like index.html).'
        }, { status: 400 });
      }
    }

    // ... (keep the rest of the env setup)

    // Define environment variables for Android build
    const androidHome = process.env.ANDROID_HOME || path.join(process.env.HOME || '', 'Library/Android/sdk');
    
    // Try to find Java (JAVA_HOME)
    let javaHome = process.env.JAVA_HOME;
    if (!javaHome) {
      // Common macOS path for Android Studio's bundled JRE
      const macOSStudioJava = '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
      if (process.platform === 'darwin' && fs.existsSync(macOSStudioJava)) {
        javaHome = macOSStudioJava;
      }
    }

    const env: any = {
      ...process.env,
      ANDROID_HOME: androidHome,
    };

    if (javaHome) {
      env.JAVA_HOME = javaHome;
      env.PATH = `${process.env.PATH}:${androidHome}/tools:${androidHome}/platform-tools:${javaHome}/bin`;
    } else {
      env.PATH = `${process.env.PATH}:${androidHome}/tools:${androidHome}/platform-tools`;
    }

    let commands = [];

    // 1. Ensure package.json exists and has Capacitor dependencies
    const pkgPath = path.join(pwaPath, 'package.json');
    let modified = false;
    let pkg: any;

    if (!fs.existsSync(pkgPath)) {
      pkg = {
        name: appName.toLowerCase().replace(/\s+/g, '-'),
        version: "1.0.0",
        private: true,
        dependencies: {
          "@capacitor/core": "latest"
        },
        devDependencies: {
          "@capacitor/cli": "latest"
        }
      };
      if (platform === 'android') pkg.dependencies["@capacitor/android"] = "latest";
      if (platform === 'ios') pkg.dependencies["@capacitor/ios"] = "latest";
      
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log('Created package.json in', pwaPath);
      modified = true;
    } else {
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (!pkg.dependencies) { pkg.dependencies = {}; modified = true; }
        if (!pkg.devDependencies) { pkg.devDependencies = {}; modified = true; }
        
        if (!pkg.dependencies["@capacitor/core"]) { pkg.dependencies["@capacitor/core"] = "latest"; modified = true; }
        if (!pkg.devDependencies["@capacitor/cli"]) { pkg.devDependencies["@capacitor/cli"] = "latest"; modified = true; }
        
        if (platform === 'android' && (!pkg.dependencies["@capacitor/android"] && !pkg.devDependencies["@capacitor/android"])) { 
          pkg.dependencies["@capacitor/android"] = "latest"; 
          modified = true; 
        }
        if (platform === 'ios' && (!pkg.dependencies["@capacitor/ios"] && !pkg.devDependencies["@capacitor/ios"])) { 
          pkg.dependencies["@capacitor/ios"] = "latest"; 
          modified = true; 
        }
        
        if (modified) {
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
          console.log('Updated existing package.json with Capacitor dependencies');
        }
      } catch (e) {
        console.error('Failed to parse package.json, might be corrupt:', e);
      }
    }
    
    // 2. Ensure node_modules exists (run npm install if needed)
    if (!fs.existsSync(path.join(pwaPath, 'node_modules')) || modified) {
      console.log('Running npm install in', pwaPath);
      commands.push(`npm install`);
    }

    // 2.5 Run build script if it exists
    if (pkg && pkg.scripts && pkg.scripts.build) {
      console.log('Detected build script, adding to commands...');
      commands.push(`npm run build`);
    }
    
    // 3. Force Initialize or Update Capacitor configuration
    const capConfigPathTs = path.join(pwaPath, 'capacitor.config.ts');
    const capConfigPathJson = path.join(pwaPath, 'capacitor.config.json');
    
    // Always prefer .json and ensure webDir is NEVER '.'
    if (fs.existsSync(capConfigPathTs)) {
      console.log('Removing existing capacitor.config.ts to avoid configuration conflicts');
      fs.unlinkSync(capConfigPathTs);
    }

    const finalConfig = {
      appId: appId,
      appName: appName,
      webDir: webDir,
      bundledWebRuntime: false
    };

    console.log(`Writing Capacitor config to ${capConfigPathJson} with webDir: ${webDir}`);
    fs.writeFileSync(capConfigPathJson, JSON.stringify(finalConfig, null, 2));
    
    if (platform === 'android') {
      // Ensure webDir exists before running any Capacitor commands
      const fullWebDirPath = path.join(pwaPath, webDir);
      if (!fs.existsSync(fullWebDirPath)) {
        fs.mkdirSync(fullWebDirPath, { recursive: true });
      }

      // 4. Add Android platform if missing
      const androidPath = path.join(pwaPath, 'android');
      if (!fs.existsSync(androidPath)) {
        commands.push(`npx cap add android`);
      }
      
      // Update the app name and id in Android project files
      const stringsXmlPath = path.join(androidPath, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
      if (fs.existsSync(stringsXmlPath)) {
        let stringsXml = fs.readFileSync(stringsXmlPath, 'utf-8');
        stringsXml = stringsXml.replace(/<string name="app_name">.*?<\/string>/, `<string name="app_name">${appName}<\/string>`);
        stringsXml = stringsXml.replace(/<string name="title_activity_main">.*?<\/string>/, `<string name="title_activity_main">${appName}<\/string>`);
        fs.writeFileSync(stringsXmlPath, stringsXml);
      }

      const buildGradlePath = path.join(androidPath, 'app', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');
        buildGradle = buildGradle.replace(/namespace ".*?"/, `namespace "${appId}"`);
        buildGradle = buildGradle.replace(/applicationId ".*?"/, `applicationId "${appId}"`);
        fs.writeFileSync(buildGradlePath, buildGradle);
      }

      // Before sync, ensure we have assets in webDir if it's 'www'
      if (webDir === "www") {
        commands.push(`rsync -av --exclude="www" --exclude="android" --exclude="ios" --exclude="node_modules" . www/ || (cp index.html www/ && cp *.js www/ 2>/dev/null || true)`);
      }

      // 5. Sync and copy web files
      commands.push(`npx cap sync android`);
      
      // 6. Build the actual APK using Gradle
      commands.push(`cd android && chmod +x gradlew && ./gradlew assembleDebug`);
    }

    const fullCommand = commands.join(' && ');
    console.log(`Building APK at ${pwaPath}...`);
    console.log(`Full Command: ${fullCommand}`);

    try {
      const { stdout, stderr } = await execAsync(fullCommand, { cwd: pwaPath, env });
      console.log('Build Output:', stdout);

      if (platform === 'android') {
        // The APK is usually generated at: android/app/build/outputs/apk/debug/app-debug.apk
        const apkSourcePath = path.join(pwaPath, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
        
        if (fs.existsSync(apkSourcePath)) {
          const timestamp = Date.now();
          const apkName = `app-debug-${timestamp}.apk`;
          const apkDestPath = path.join(publicDownloads, apkName);
          
          fs.copyFileSync(apkSourcePath, apkDestPath);

          return NextResponse.json({ 
            message: `APK generated successfully!`,
            download_url: `/downloads/${apkName}`, 
            instructions: `Your APK is ready. You can install it on your Android device for testing.`
          });
        }
      }

      return NextResponse.json({ 
        message: `${platform.toUpperCase()} project prepared, but APK was not found.`,
        details: "Build completed but could not locate the output binary.",
        instructions: `Check the ${platform} folder for the build output.`
      });

    } catch (cmdError: any) {
      console.error('Build failed:', cmdError);
      
      // Extract as much info as possible from the error
      const errorDetails = cmdError.stderr || cmdError.stdout || cmdError.message;
      
      return NextResponse.json({ 
        error: 'Failed to build the APK. Check the details below for the specific error.',
        details: errorDetails 
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
