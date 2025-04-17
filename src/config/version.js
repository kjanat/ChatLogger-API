/**
 * Central version configuration for ChatLogger
 * This file serves as the single source of truth for version information
 */
const semver = require('semver');

// Current version information
const currentVersion = '0.2.3';

module.exports = {
    // Current version without v prefix
    version: currentVersion,

    // Version with v prefix (for git tags)
    versionWithV: `v${currentVersion}`,

    // Helper function to bump version using semver
    bump: function (type = 'patch') {
        if (
            !['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'].includes(
                type.toLowerCase(),
            )
        ) {
            throw new Error(
                'Invalid version bump type. Must be one of: patch, minor, major, prepatch, preminor, premajor, prerelease',
            );
        }

        return semver.inc(this.version, type.toLowerCase());
    },

    // Parse version components
    parse: function () {
        return semver.parse(this.version);
    },

    // Compare versions
    isGreaterThan: function (otherVersion) {
        return semver.gt(this.version, otherVersion);
    },

    // Validate if string is valid semver
    isValid: function (versionStr) {
        return semver.valid(versionStr) !== null;
    },
};
