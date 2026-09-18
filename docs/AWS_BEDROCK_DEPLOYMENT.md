# TrustForge — AWS Bedrock AI Agent & Guardrail Deployment Guide

This guide walks you through deploying the **TrustForge Autonomous AI Security Agent** and **Zero-Trust Guardrails** on **AWS Bedrock** using your AWS account (**@saurabhkr**).

---

## Architecture: TrustForge on AWS Bedrock

```
                                 ┌─────────────────────────────────┐
                                 │     Enterprise Administrator    │
                                 │    Security Officer / Auditor   │
                                 └───────────────┬─────────────────┘
                                                 │ Natural Language / Query
                                                 ▼
                                 ┌─────────────────────────────────┐
                                 │       AWS Bedrock Agent         │
                                 │  ("TrustForgeSecurityAgent")    │
                                 │ Foundation Model: Amazon Nova / │
                                 │    Anthropic Claude 3.5 Sonnet  │
                                 └───────────────┬─────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
                   ▼                                                           ▼
   ┌───────────────────────────────┐                           ┌───────────────────────────────┐
   │ AWS Bedrock Guardrail         │                           │ Bedrock Action Group          │
   │ ("ZeroTrustGuardrail")        │                           │ (OpenAPI 3.0 Specification)   │
   │ • PII Masking                 │                           │ • POST /access/cedar/evaluate │
   │ • Prompt Injection Defense    │                           │ • GET  /dashboard/security    │
   │ • Sensitive Data Redaction    │                           │ • GET  /audit/events          │
   └───────────────────────────────┘                           └───────────────┬───────────────┘
                                                                               │
                                                                               ▼
                                                               ┌───────────────────────────────┐
                                                               │ TrustForge REST API Backend   │
                                                               │ • AWS Cedar Policy Engine     │
                                                               │ • W3C DID & ZK-STARK Verifier │
                                                               │ • Immutable Merkle Audit Log  │
                                                               └───────────────────────────────┘
```

---

## Components Included in TrustForge

1. **AWS Bedrock Action Group Schema**:
   [`bedrock/trustforge-agent-openapi.yaml`](../bedrock/trustforge-agent-openapi.yaml)
   Fully compliant OpenAPI 3.0 specification allowing Bedrock Foundation Models to evaluate Cedar policies and query zero-trust telemetry.

2. **AWS SAM / CloudFormation Resources**:
   [`template.yaml`](../template.yaml)
   Includes `AWS::Bedrock::Agent`, `AWS::Bedrock::Guardrail`, and IAM execution policies.

3. **Backend Bedrock REST API**:
   - `GET  /api/ai/bedrock/status`: Health check & available models.
   - `POST /api/ai/bedrock/audit`: AI-driven zero-trust threat intelligence report.
   - `POST /api/ai/bedrock/query`: Bedrock Autonomous Agent natural-language query evaluator.

4. **Automated Deployment Script**:
   [`scripts/deploy-bedrock.ps1`](../scripts/deploy-bedrock.ps1)

---

## Method 1: Deploying via AWS Bedrock Console (Recommended)

### Step 1: Open AWS Bedrock Agents Console
1. Log in to the AWS Management Console with your **@saurabhkr** account.
2. Ensure your region is set to **us-east-1** (N. Virginia).
3. Navigate to [AWS Bedrock Agents](https://console.aws.amazon.com/bedrock/home?region=us-east-1#/agents).

### Step 2: Create Bedrock Agent
1. Click **Create Agent**.
2. **Agent Name**: `TrustForgeSecurityAgent`
3. **Agent Description**: `Autonomous Zero-Trust AI Agent for TrustForge Cedar policy evaluation and verification.`
4. **Foundation Model**: Select `Amazon Nova Lite` (or `Anthropic Claude 3.5 Sonnet`).
5. **Instructions for the Agent**:
   ```text
   You are the TrustForge Enterprise Zero-Trust Security Agent.
   You inspect decentralized identities, evaluate AWS Cedar policies, verify
   cryptographic credentials, and audit security events. Always enforce strict
   guardrails: deny mutating actions for suspended or revoked identities.
   ```

### Step 3: Add Action Group
1. Under **Action Groups**, click **Add**.
2. **Action Group Name**: `TrustForgeOperations`
3. **Action Group Type**: Select `Define with API schemas`.
4. Select `Select an existing API schema` and upload [`bedrock/trustforge-agent-openapi.yaml`](../bedrock/trustforge-agent-openapi.yaml).
5. Link the Action Group to the TrustForge backend endpoint (`https://trustforge-backend-wpib.onrender.com/api`).

### Step 4: Attach Bedrock Guardrail
1. Navigate to [AWS Bedrock Guardrails](https://console.aws.amazon.com/bedrock/home?region=us-east-1#/guardrails).
2. Click **Create Guardrail** -> Name: `TrustForgeZeroTrustGuardrail`.
3. Enable:
   - **Sensitive Information Filters**: PII Masking (Mask email, DID keys).
   - **Prompt Attacks Filter**: High strength.
4. Attach this guardrail to your `TrustForgeSecurityAgent`.

---

## Method 2: Deploying via AWS CLI & SAM

```powershell
# 1. Configure credentials for profile saurabhkr
aws configure --profile saurabhkr

# 2. Deploy via SAM CLI
sam build
sam deploy --guided --profile saurabhkr --region us-east-1

# 3. Or run the automated script
.\scripts\deploy-bedrock.ps1 -Profile saurabhkr -Region us-east-1
```
