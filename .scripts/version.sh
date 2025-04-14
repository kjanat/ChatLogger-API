#!/bin/bash
# Version management script for ChatLogger
# Usage: bash version.sh [patch|minor|major|build|deploy]
#   patch|minor|major - Bump the version
#   build - Build Docker image with current version
#   deploy - Deploy using Docker Compose with current version

if [ "$1" == "patch" ] || [ "$1" == "minor" ] || [ "$1" == "major" ]; then
  npm run version:$1
elif [ "$1" == "build" ]; then
  npm run docker:build
elif [ "$1" == "deploy" ]; then
  npm run docker:compose
else
  echo "ChatLogger Version Management"
  echo "----------------------------"
  VERSION=$(node -e "console.log(require('../src/config/version.js').version)")
  echo "Current version: $VERSION"
  echo ""
  echo "Usage: bash version.sh [patch|minor|major|build|deploy]"
  echo "  patch - Bump patch version (0.1.1 -> 0.1.2)"
  echo "  minor - Bump minor version (0.1.1 -> 0.2.0)"
  echo "  major - Bump major version (0.1.1 -> 1.0.0)"
  echo "  build - Build Docker image with current version"
  echo "  deploy - Deploy with Docker Compose using current version"
fi
