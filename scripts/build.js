#!/usr/bin/env node
// Cross-platform build script that runs vite programmatically
const path = require('path');

let buildProcess = null;
let exitCode = 1; // Default to failure

// Handle process signals for clean shutdown
const handleSignal = (signal) => {
  if (buildProcess) {
    buildProcess.then(() => {
      process.exit(exitCode);
    }).catch(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on('SIGTERM', handleSignal);
process.on('SIGINT', handleSignal);

(async () => {
  try {
    // Use dynamic import to load vite as ESM
    const vite = await import('vite');
    const configPath = path.resolve(process.cwd(), 'vite.config.ts');
    
    // Use vite's built-in config loader for proper TypeScript/ESM handling
    const configResult = await vite.loadConfigFromFile(
      { command: 'build', mode: 'production' },
      configPath
    );
    
    const userConfig = configResult?.config || {};
    
    // Run the build and store the promise
    buildProcess = vite.build(userConfig);
    await buildProcess;
    
    exitCode = 0; // Success
    process.exit(0);
  } catch (error) {
    console.error('Build failed:', error);
    exitCode = 1;
    process.exit(1);
  }
})();
