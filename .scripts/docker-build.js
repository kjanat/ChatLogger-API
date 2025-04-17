#!/usr/bin/env node
/**
 * Docker Build Helper Script for ChatLogger
 *
 * This script builds a Docker image with the current version from version.js
 * Usage: node docker-build.js [options]
 */
import { execSync } from 'child_process';
import { join } from 'path';
import { logger } from '../src/utils/logger.js'; // Adjust the import path as needed

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

const currentVersion = versionModule.version;
logger.debug(`Building Docker image for ChatLogger v${currentVersion}`);
logger.debug('---------------------------------------------------');

try {
    // Build Docker image with current version
    logger.debug('Building Docker image...');
    execSync(
        `docker build --build-arg VERSION=${currentVersion} -t chatlogger:${currentVersion} .`,
        {
            stdio: 'inherit',
            cwd: join(__dirname, '..'),
        },
    );
    logger.debug(`\n✓ Docker image built successfully: chatlogger:${currentVersion}`);

    // Tag as 'latest' as well
    logger.log('\nTagging as latest...');
    execSync(`docker tag chatlogger:${currentVersion} chatlogger:latest`, {
        stdio: 'inherit',
        cwd: join(__dirname, '..'),
    });
    logger.debug(`\n✓ Docker image tagged as latest`);

    // Print usage info
    logger.debug('\nYou can now use the Docker image with:');
    logger.debug(`  docker run -p 3000:3000 chatlogger:${currentVersion}`);
    logger.debug('  docker run -p 3000:3000 chatlogger:latest');
    logger.debug('\nOr with Docker Compose:');
    logger.debug(`  VERSION=${currentVersion} docker-compose up -d`);
} catch (err) {
    logger.error(`\nError building Docker image:`, err.message);
    process.exit(1);
}
