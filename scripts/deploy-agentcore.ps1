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
Write-Host " TrustForge -- Amazon Bedrock AgentCore Deployment" -ForegroundColor Cyan
Write-Host " Target AWS Profile: $Profile -- Region: $Region" -ForegroundColor Cyan
Write-Host " Foundation Model:   $FoundationModel" -ForegroundColor Cyan
Write-Host " Track:              SHIP IT Deployed, with a URL" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Check AWS CLI Authentication
Write-Host "`n[Step 1/4] Checking AWS credentials for profile '$Profile'..." -ForegroundColor Yellow

$identityJson = aws sts get-caller-identity --profile $Profile --output json 2>$null
if (-not $identityJson) {
    Write-Host "`n[!] AWS credentials not found for profile '$Profile'." -ForegroundColor Red
    Write-Host "Please enter your AWS Access Key ID and Secret Access Key by running:" -ForegroundColor Yellow
    Write-Host "  aws configure --profile $Profile" -ForegroundColor Green
    Write-Host "`nOr open the AWS Bedrock Console in your browser:" -ForegroundColor Yellow
    Write-Host "  https://$Region.console.aws.amazon.com/bedrock/home?region=$Region#/agents" -ForegroundColor Cyan
    exit 1
}

$identity = $identityJson | ConvertFrom-Json
Write-Host "Authenticated as: $($identity.Arn)" -ForegroundColor Green

# 2. Verify Bedrock AgentCore Artifacts
Write-Host "`n[Step 2/4] Validating Bedrock AgentCore artifacts..." -ForegroundColor Yellow
$schema = (Resolve-Path "bedrock/agentcore/trustforge-agentcore-openapi.yaml").Path
$lambdaHandler = (Resolve-Path "bedrock/agentcore/agent_core_lambda.js").Path
$template = (Resolve-Path "template.yaml").Path

Write-Host "  AgentCore Schema:  $schema" -ForegroundColor Green
Write-Host "  Lambda Handler:    $lambdaHandler" -ForegroundColor Green
Write-Host "  Full SAM Template: $template" -ForegroundColor Green

# 3. Deploy via AWS SAM (All 7 Conditions)
Write-Host "`n[Step 3/4] Deploying AWS SAM Stack (Bedrock AgentCore, Step Functions, S3, DynamoDB, Cognito, EventBridge)..." -ForegroundColor Yellow
Write-Host "Executing SAM build and deployment..." -ForegroundColor Cyan

sam build --template-file template.yaml
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] SAM build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

sam deploy `
    --stack-name "trustforge-enterprise-prod" `
    --resolve-s3 `
    --profile "$Profile" `
    --region "$Region" `
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
    --no-confirm-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] SAM deploy encountered an issue. See details above." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 4. Final Verification
Write-Host "`n[Step 4/4] Amazon Bedrock AgentCore Deployment Complete!" -ForegroundColor Green
Write-Host "Console: https://$Region.console.aws.amazon.com/bedrock/home?region=$Region#/agents" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
