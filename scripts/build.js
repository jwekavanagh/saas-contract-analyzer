#!/usr/bin/env node
// Cross-platform build script that uses npx to avoid permission issues
const { spawn } = require('child_process');

// Use npx which handles binary execution correctly across platforms
const vite = spawn('npx', ['--yes', 'vite', 'build'], {
  stdio: 'inherit',
  shell: false,
  cwd: process.cwd()
});

vite.on('close', (code) => {
  process.exit(code || 0);
});

vite.on('error', (err) => {
  console.error('Failed to start vite:', err);
  process.exit(1);
});
