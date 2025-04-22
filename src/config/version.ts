/**
 * Central version configuration for ChatLogger
 * This file serves as the single source of truth for version information
 */
import semver from 'semver';

// Current version information
const currentVersion = '0.2.3';

interface VersionModule {
    // Current version without v prefix
    version: string;

    // Version with v prefix (for git tags)
    versionWithV: string;

    // Helper function to bump version using semver
    bump: (type?: semver.ReleaseType) => string | null;

    // Parse version components
    parse: () => semver.SemVer | null;

    // Compare versions
    isGreaterThan: (otherVersion: string) => boolean;

    // Validate if string is valid semver
    isValid: (versionStr: string) => boolean;
}

const versionModule: VersionModule = {
    // Current version without v prefix
    version: currentVersion,

    // Version with v prefix (for git tags)
    versionWithV: `v${currentVersion}`,

    // Helper function to bump version using semver
    bump: function (type: semver.ReleaseType = 'patch'): string | null {
        if (
            !['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'].includes(
                type.toLowerCase(),
            )
        ) {
            throw new Error(
                'Invalid version bump type. Must be one of: patch, minor, major, prepatch, preminor, premajor, prerelease',
            );
        }

        return semver.inc(this.version, type);
    },

    // Parse version components
    parse: function (): semver.SemVer | null {
        return semver.parse(this.version);
    },

    // Compare versions
    isGreaterThan: function (otherVersion: string): boolean {
        return semver.gt(this.version, otherVersion);
    },

    // Validate if string is valid semver
    isValid: function (versionStr: string): boolean {
        return semver.valid(versionStr) !== null;
    },
};

export const { version, versionWithV } = versionModule;
export default versionModule;
