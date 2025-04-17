#!/usr/bin/env node
/**
 * Version Bump Script for ChatLogger
 *
 * This script updates the version number across the project.
 * Usage: node version-bump.js [patch|minor|major|prepatch|preminor|premajor|prerelease]
 * Optional: Add a prerelease identifier with --preid=<identifier>
 * Example: node version-bump.js prerelease --preid=beta
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import { inc } from 'semver';
import { logger } from '../src/utils/logger.js'; // Adjust the import path as needed

// Process arguments
const bumpType = process.argv[2] || 'patch';
let preId = null;

// Check for --preid argument
process.argv.forEach(arg => {
    if (arg.startsWith('--preid=')) {
        preId = arg.split('=')[1];
    }
});

// Get version info from central version file
const versionPath = join(__dirname, '../src/config/version.js');
let versionModule;

try {
    // Use dynamic import with require to avoid caching issues
    delete require.cache[require.resolve(versionPath)];
    versionModule = require(versionPath);
} catch (err) {
    logger.error('Error loading version file:', err);
    process.exit(1);
}

// Get current version
const currentVersion = versionModule.version;

// Validate the bump type
const validBumpTypes = [
    'patch',
    'minor',
    'major',
    'prepatch',
    'preminor',
    'premajor',
    'prerelease',
];
if (!validBumpTypes.includes(bumpType)) {
    logger.error(`Error: Bump type must be one of: ${validBumpTypes.join(', ')}`);
    process.exit(1);
}

// Calculate new version using semver
let newVersion;
if (preId && bumpType.startsWith('pre')) {
    newVersion = inc(currentVersion, bumpType, preId);
} else {
    newVersion = versionModule.bump(bumpType);
}

if (!newVersion) {
    logger.error('Error: Failed to calculate new version');
    process.exit(1);
}

const newVersionWithV = `v${newVersion}`;

logger.debug(
    `Bumping version from ${currentVersion} to ${newVersion} (${bumpType}${preId ? ` with preid '${preId}'` : ''})`,
);
logger.debug('-----------------------------------');

/**
 * Updates the content of a file by replacing a specific pattern
 */
function updateFile(filePath, pattern, replacement) {
    try {
        if (!existsSync(filePath)) {
            logger.warn(`Warning: File not found - ${filePath}`);
            return false;
        }

        const content = readFileSync(filePath, 'utf8');
        const updatedContent = content.replace(pattern, replacement);

        if (content === updatedContent) {
            logger.warn(`Warning: No changes made to ${filePath}`);
            return false;
        }

        writeFileSync(filePath, updatedContent);
        logger.debug(`✓ Updated ${basename(filePath)}`);
        return true;
    } catch (err) {
        logger.error(`Error updating ${filePath}:`, err);
        return false;
    }
}

// Update version.js - now with more semver-friendly regex pattern
updateFile(
    versionPath,
    /const currentVersion = ['"]([0-9a-zA-Z.-]+)['"]/,
    `const currentVersion = '${newVersion}'`,
);

// Update package.json with semver-friendly regex
const packagePath = join(__dirname, '../package.json');
updateFile(packagePath, /"version": "([0-9a-zA-Z.-]+)"/, `"version": "${newVersion}"`);

// List of other files that might need updating
// (these are now taken care of centrally but might be missed in certain edge cases)
const additionalFiles = [
    // Add any additional files that might have hard-coded versions
    // that aren't using the central version file
];

additionalFiles.forEach(file => {
    const filePath = join(__dirname, '..', file);
    updateFile(filePath, /(['"])([0-9a-zA-Z.-]+)(['"])/g, `$1${newVersion}$3`);
});

// Git operations - commit changes and create tag
try {
    logger.debug('\nCommitting changes to git...');
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "Bump version to ${newVersion}"`, { stdio: 'inherit' });
    execSync(`git tag ${newVersionWithV} -m "Version ${newVersion}"`, { stdio: 'inherit' });

    logger.debug('\n✓ Changes committed and tagged successfully!');
    logger.debug(`\nTo push changes and tag to remote repository:`);
    logger.debug(`  git push origin master`);
    logger.debug(`  git push origin ${newVersionWithV}`);

    logger.debug(`\nTo build Docker image with new version:`);
    logger.debug(`  docker build --build-arg VERSION=${newVersion} -t chatlogger:${newVersion} .`);
} catch (err) {
    logger.error('\nError performing Git operations:', err.message);
    logger.debug('You may need to commit and tag the changes manually.');
}
