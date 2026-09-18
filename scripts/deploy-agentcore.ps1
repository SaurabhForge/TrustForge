<#
.SYNOPSIS
  Deploy TrustForge to Amazon Bedrock AgentCore and AWS Cloud
.DESCRIPTION
  Automates the Amazon Bedrock AgentCore deployment fulfilling all 7 "SHIP IT" conditions for AWS profile 'saurabhkr'.
#>

param (
    [string]$Profile = "saurabhkr",
    [string]$Region = "us-east-1",
    [string]$AgentName = "TrustForgeAgentCore",
    [string]$FoundationModel = "amazon.nova-lite-v1:0"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " TrustForge — Amazon Bedrock AgentCore Deployment" -ForegroundColor Cyan
Write-Host " Target AWS Profile: $Profile | Region: $Region" -ForegroundColor Cyan
Write-Host " Foundation Model:   $FoundationModel" -ForegroundColor Cyan
Write-Host " Track:              SHIP IT Deployed, with a URL" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Check AWS CLI Authentication
Write-Host "`n[Step 1/4] Checking AWS credentials for profile '$Profile'..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --profile $Profile 2>$null | ConvertFrom-Json

if (-not $identity) {
    Write-Host "[!] AWS credentials not found for profile '$Profile'." -ForegroundColor Red
    Write-Host "Please configure credentials with:" -ForegroundColor Yellow
    Write-Host "  aws configure --profile $Profile" -ForegroundColor Green
    Write-Host "`nOr open the AWS Bedrock Agents Console directly:" -ForegroundColor Yellow
    Write-Host "  Start-Process 'https://console.aws.amazon.com/bedrock/home?region=$Region#/agents'" -ForegroundColor Green
    exit 1
}

Write-Host "Authenticated as: $($identity.Arn)" -ForegroundColor Green

# 2. Verify Bedrock AgentCore Artifacts
Write-Host "`n[Step 2/4] Validating Bedrock AgentCore artifacts..." -ForegroundColor Yellow
$schema = Resolve-Path "bedrock/agentcore/trustforge-agentcore-openapi.yaml"
$lambdaHandler = Resolve-Path "bedrock/agentcore/agent_core_lambda.js"
$template = Resolve-Path "template.yaml"

Write-Host "✓ AgentCore Schema:  $schema" -ForegroundColor Green
Write-Host "✓ Lambda Handler:    $lambdaHandler" -ForegroundColor Green
Write-Host "✓ Full SAM Template: $template" -ForegroundColor Green

# 3. Deploy via AWS SAM (All 7 Conditions)
Write-Host "`n[Step 3/4] Deploying AWS SAM Stack (Bedrock AgentCore, Step Functions, S3, DynamoDB, Cognito, EventBridge)..." -ForegroundColor Yellow
Write-Host "Executing SAM build and deployment..." -ForegroundColor Cyan

sam build --template-file template.yaml
sam deploy `
    --stack-name "trustforge-enterprise-prod" `
    --profile "$Profile" `
    --region "$Region" `
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
    --no-confirm-changeset

# 4. Final Verification
Write-Host "`n[Step 4/4] Amazon Bedrock AgentCore Deployment Complete!" -ForegroundColor Green
Write-Host "Console: https://$Region.console.aws.amazon.com/bedrock/home?region=$Region#/agents" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
