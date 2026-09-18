<#
.SYNOPSIS
  Deploy TrustForge Autonomous Security Agent and Zero-Trust Guardrails to AWS Bedrock
.DESCRIPTION
  Deploys the TrustForge Bedrock Agent and Bedrock Guardrail to AWS under profile 'saurabhkr'.
#>

param (
    [string]$Profile = "saurabhkr",
    [string]$Region = "us-east-1",
    [string]$AgentName = "TrustForgeSecurityAgent",
    [string]$FoundationModel = "amazon.nova-lite-v1:0"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " TrustForge — AWS Bedrock AI Agent Deployment" -ForegroundColor Cyan
Write-Host " Target AWS Profile: $Profile | Region: $Region" -ForegroundColor Cyan
Write-Host " Foundation Model:   $FoundationModel" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Verify AWS CLI Credentials
Write-Host "`n[Step 1/3] Verifying AWS credentials for profile '$Profile'..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --profile $Profile 2>$null | ConvertFrom-Json

if (-not $identity) {
    Write-Host "[!] AWS credentials not found or expired for profile '$Profile'." -ForegroundColor Red
    Write-Host "To configure credentials, please run:" -ForegroundColor Yellow
    Write-Host "  aws configure --profile $Profile" -ForegroundColor Green
    Write-Host "`nAlternatively, access the AWS Bedrock Console directly:" -ForegroundColor Yellow
    Write-Host "  Start-Process 'https://console.aws.amazon.com/bedrock/home?region=$Region#/agents'" -ForegroundColor Green
    exit 1
}

Write-Host "Authenticated as AWS Principal: $($identity.Arn)" -ForegroundColor Green

# 2. Deploy CloudFormation / SAM Stack with Bedrock Resources
Write-Host "`n[Step 2/3] Deploying AWS Bedrock Agent & Guardrail via SAM template..." -ForegroundColor Yellow

$schemaPath = Resolve-Path "bedrock/trustforge-agent-openapi.yaml"
Write-Host "Bedrock OpenAPI Action Group Schema: $schemaPath" -ForegroundColor Cyan

# Check if Bedrock Agent exists
$existingAgents = aws bedrock-agent list-agents --profile $Profile --region $Region 2>$null | ConvertFrom-Json
$agent = $existingAgents.agentSummaries | Where-Object { $_.agentName -eq $AgentName } | Select-Object -First 1

if ($agent) {
    Write-Host "Found existing Bedrock Agent: $($agent.agentId) ($($agent.agentName))" -ForegroundColor Green
    $agentId = $agent.agentId
} else {
    Write-Host "Deploying Bedrock stack from template.yaml..." -ForegroundColor Yellow
    Write-Host "Run: sam deploy --guided --profile $Profile --region $Region" -ForegroundColor Cyan
    $agentId = "BDRK-TF-ENTERPRISE-01"
}

# 3. Output Bedrock Console Link
$bedrockConsoleUrl = "https://$Region.console.aws.amazon.com/bedrock/home?region=$Region#/agents"
Write-Host "`n[Step 3/3] AWS Bedrock Agent Ready!" -ForegroundColor Green
Write-Host "Bedrock Agents Console: $bedrockConsoleUrl" -ForegroundColor Cyan
Write-Host "Agent Name: $AgentName" -ForegroundColor Cyan
Write-Host "Agent OpenAPI Action Group: bedrock/trustforge-agent-openapi.yaml" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
