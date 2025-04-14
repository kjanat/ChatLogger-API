parameter(
	[switch]$detached = $false,
	[switch]$force = $false,
	[switch]$build = $false
)

Set-Location $PSScriptRoot

# Depending on $detached, run the command with or without -d flag
if ($detached) {
	$dockerComposeArgs = @("up", "-d")
} else {
	$dockerComposeArgs = @("up")
}

if ($force) { $dockerComposeArgs += @("--force-recreate") }

if ($build) { $dockerComposeArgs += @("--build") }

Write-Host "Starting Docker containers with arguments: $dockerComposeArgs"
# Check if Docker is running

$dockerStatus = & docker info 2>$null
if (-not $dockerStatus) {
    Write-Host "Docker is not running. Please start Docker and try again."
    exit 1
}

Write-Host "Executing Docker Compose with arguments: $dockerComposeArgs"

# Run Docker Compose command with the specified arguments
docker-compose -f ..\docker-compose.yml @dockerComposeArgs
if ($LASTEXITCODE -ne 0) {
	Write-Host "Docker Compose command failed with exit code $LASTEXITCODE."
	exit $LASTEXITCODE
}
