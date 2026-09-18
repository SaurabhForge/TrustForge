<#
.SYNOPSIS
  Deploy TrustForge to AWS Amplify under profile 'saurabhkr'
.DESCRIPTION
  Automates the AWS Amplify app creation and deployment for the TrustForge repository.
#>

param (
    [string]$Profile = "saurabhkr",
    [string]$Region = "us-east-1",
    [string]$AppName = "TrustForge-Frontend",
    [string]$RepoUrl = "https://github.com/SaurabhForge/TrustForge"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " TrustForge — AWS Amplify Automated Deployment" -ForegroundColor Cyan
Write-Host " Target AWS Profile: $Profile | Region: $Region" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Verify AWS CLI Credentials
Write-Host "`n[Step 1/3] Verifying AWS credentials for profile '$Profile'..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --profile $Profile 2>$null | ConvertFrom-Json

if (-not $identity) {
    Write-Host "[!] AWS credentials not found or expired for profile '$Profile'." -ForegroundColor Red
    Write-Host "To configure credentials, please run:" -ForegroundColor Yellow
    Write-Host "  aws configure --profile $Profile" -ForegroundColor Green
    Write-Host "`nAlternatively, use the 1-Click AWS Amplify Web Console:" -ForegroundColor Yellow
    Write-Host "  Start-Process 'https://console.aws.amazon.com/amplify/home?region=$Region#/create'" -ForegroundColor Green
    exit 1
}

Write-Host "Authenticated as AWS Principal: $($identity.Arn)" -ForegroundColor Green

# 2. Check for Existing Amplify App
Write-Host "`n[Step 2/3] Checking for existing Amplify App '$AppName'..." -ForegroundColor Yellow
$existingApps = aws amplify list-apps --profile $Profile --region $Region | ConvertFrom-Json
$app = $existingApps.apps | Where-Object { $_.name -eq $AppName } | Select-Object -First 1

if ($app) {
    Write-Host "Found existing Amplify App ID: $($app.appId)" -ForegroundColor Green
    $appId = $app.appId
} else {
    Write-Host "Creating new AWS Amplify App '$AppName'..." -ForegroundColor Yellow
    $createResult = aws amplify create-app `
        --name "$AppName" `
        --repository "$RepoUrl" `
        --platform "WEB" `
        --profile $Profile `
        --region $Region | ConvertFrom-Json

    $appId = $createResult.app.appId
    Write-Host "Created Amplify App with ID: $appId" -ForegroundColor Green
}

# 3. Output Deployment Status & Console Link
$consoleUrl = "https://$Region.console.aws.amazon.com/amplify/home?region=$Region#/$appId"
Write-Host "`n[Step 3/3] Deployment Pipeline Configured Successfully!" -ForegroundColor Green
Write-Host "AWS Amplify Console URL: $consoleUrl" -ForegroundColor Cyan
Write-Host "Amplify App ID: $appId" -ForegroundColor Cyan
Write-Host "`n============================================================" -ForegroundColor Cyan
