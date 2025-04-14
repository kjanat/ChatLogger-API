#!/usr/bin/env node
/**
 * Docker Build Helper Script for ChatLogger
 * 
 * This script builds a Docker image with the current version from version.js
 * Usage: node docker-build.js [options]
 */
const { execSync } = require('child_process');
const path = require('path');

// Get version info from central version file
const versionPath = path.join(__dirname, '../src/config/version.js');
let versionModule;

try {
  // Use dynamic import with require to avoid caching issues
  delete require.cache[require.resolve(versionPath)];
  versionModule = require(versionPath);
} catch (err) {
  console.error('Error loading version file:', err);
  process.exit(1);
}

const currentVersion = versionModule.version;
console.log(`Building Docker image for ChatLogger v${currentVersion}`);
console.log('---------------------------------------------------');

try {
  // Build Docker image with current version
  console.log('Building Docker image...');
  execSync(`docker build --build-arg VERSION=${currentVersion} -t chatlogger:${currentVersion} .`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log(`\n✓ Docker image built successfully: chatlogger:${currentVersion}`);
  
  // Tag as 'latest' as well
  console.log('\nTagging as latest...');
  execSync(`docker tag chatlogger:${currentVersion} chatlogger:latest`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log(`\n✓ Docker image tagged as latest`);
  
  // Print usage info
  console.log('\nYou can now use the Docker image with:');
  console.log(`  docker run -p 3000:3000 chatlogger:${currentVersion}`);
  console.log('  docker run -p 3000:3000 chatlogger:latest');
  console.log('\nOr with Docker Compose:');
  console.log(`  VERSION=${currentVersion} docker-compose up -d`);
} catch (err) {
  console.error(`\nError building Docker image:`, err.message);
  process.exit(1);
}
