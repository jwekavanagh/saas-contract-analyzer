#!/usr/bin/env node
// Cross-platform build script that resolves vite path correctly
const { spawn } = require('child_process');
const path = require('path');

// Resolve vite binary path cross-platform
const vitePath = require.resolve('vite/bin/vite.js');

// Spawn vite build process
const vite = spawn('node', [vitePath, 'build'], {
  stdio: 'inherit',
  shell: false
});

vite.on('close', (code) => {
  process.exit(code || 0);
});

vite.on('error', (err) => {
  console.error('Failed to start vite:', err);
  process.exit(1);
});
