#!/usr/bin/env node

/**
 * Script to convert a JavaScript project to TypeScript
 * - Renames .js files to .ts
 * - Excludes node_modules and other specified directories
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);
const renameAsync = promisify(fs.rename);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Directories to skip
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cache',
];

// File extensions to convert
const JS_EXTENSIONS = ['.js'];
const TARGET_EXTENSION = '.ts';

// Files to ignore by name (exact match)
const EXCLUDED_FILES = [
  'jest.config.js',
  '.eslintrc.js',
  'eslint.config.js',
];

/**
 * Recursively processes a directory to find and convert JS files
 * @param {string} dir - The directory to process
 */
async function processDirectory(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(entry.name)) {
          await processDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const baseName = path.basename(entry.name);

        if (JS_EXTENSIONS.includes(ext) && !EXCLUDED_FILES.includes(baseName)) {
          const newPath = path.join(dir, path.basename(entry.name, ext) + TARGET_EXTENSION);
          
          console.log(`Converting ${fullPath} to ${newPath}`);
          await renameAsync(fullPath, newPath);
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}:`, err);
  }
}

// Main function
async function main() {
  console.log('Starting conversion of JavaScript files to TypeScript...');
  
  try {
    // Create src/types directory if it doesn't exist
    if (!fs.existsSync('src/types')) {
      fs.mkdirSync('src/types', { recursive: true });
      console.log('Created src/types directory');
    }
    
    // Process the source directory
    await processDirectory('src');
    
    console.log('Conversion complete!');
    console.log('\nRemember to:');
    console.log('1. Run `npm install` to install TypeScript dependencies');
    console.log('2. Run `npm run build` to compile the TypeScript code');
    console.log('3. Fix any TypeScript errors that may occur');
  } catch (err) {
    console.error('Conversion failed:', err);
    process.exit(1);
  }
}

// Run the script
main(); 
