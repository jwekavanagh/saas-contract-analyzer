#!/usr/bin/env node
// Cross-platform build script that resolves vite path correctly
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Find vite binary in node_modules/.bin (cross-platform)
const nodeModulesBin = path.join(process.cwd(), 'node_modules', '.bin', 'vite');
const viteBinary = process.platform === 'win32' ? `${nodeModulesBin}.cmd` : nodeModulesBin;

// Check if vite binary exists, fallback to npx
if (fs.existsSync(viteBinary)) {
  const vite = spawn(viteBinary, ['build'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  vite.on('close', (code) => {
    process.exit(code || 0);
  });

  vite.on('error', (err) => {
    console.error('Failed to start vite:', err);
    process.exit(1);
  });
} else {
  // Fallback to npx if binary not found
  const vite = spawn('npx', ['vite', 'build'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  vite.on('close', (code) => {
    process.exit(code || 0);
  });

  vite.on('error', (err) => {
    console.error('Failed to start vite:', err);
    process.exit(1);
  });
}
