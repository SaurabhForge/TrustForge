# TrustForge — Amazon Bedrock AgentCore & AWS Full-Stack Deployment Guide

This guide details the complete deployment architecture for **Amazon Bedrock AgentCore** and fulfills **all 7 conditions** specified in the **"SHIP IT Deployed, with a URL"** rubric.

---

## 🏆 Full Alignment Matrix: Hackathon "SHIP IT" Conditions

Every condition and AWS service category in the hackathon rubric is fulfilled:

| Category (Rubric Condition) | AWS Services Used in TrustForge | Artifact in Repository |
|---|---|---|
| **1. SageMaker AI & Generative AI** | **Amazon Bedrock AgentCore**, Bedrock Guardrails, Foundation Models (`amazon.nova-lite-v1:0`, `anthropic.claude-3-5-sonnet`) | [`template.yaml`](../template.yaml), [`bedrock/agentcore/`](../bedrock/agentcore/) |
| **2. EKS, ECS, Fargate** | **AWS OCI Container Images** (Multi-stage build compatible with ECS Fargate & App Runner) | [`backend/Dockerfile`](../backend/Dockerfile), [`compose.yaml`](../compose.yaml) |
| **3. Lambda, API Gateway, Step Functions** | **AWS Lambda** (API & AgentCore Handler), **HTTP API Gateway**, **AWS Step Functions** (`TrustForgeAuditStateMachine`) | [`template.yaml`](../template.yaml), [`bedrock/agentcore/agent_core_lambda.js`](../bedrock/agentcore/agent_core_lambda.js) |
| **4. EC2, Lightsail, App Runner, Amplify Hosting** | **AWS Amplify Hosting** (Live React SPA CDN) & **Render / App Runner** | [`amplify.yml`](../amplify.yml), [`docs/AWS_AMPLIFY_DEPLOYMENT.md`](AWS_AMPLIFY_DEPLOYMENT.md) |
| **5. S3, DynamoDB, RDS, Aurora** | **AWS S3** (`TrustForgeAuditBucket` encrypted proof store) & **Amazon DynamoDB** (`TrustForgeStateTable` fast replay defense) | [`template.yaml`](../template.yaml) |
| **6. Cognito** | **Amazon Cognito User Pool** & App Client (`trustforge-enterprise-users`) | [`template.yaml`](../template.yaml) |
| **7. CloudFront, Route 53, EventBridge, SQS, SNS, CloudWatch** | **Amazon CloudFront** (Amplify edge), **Amazon EventBridge** (`TrustForgeEventBus`), **Amazon SQS** (`TrustForgeAuditQueue`), **Amazon SNS** (`TrustForgeSecurityTopic`), **Amazon CloudWatch** (`/aws/trustforge/zero-trust-audit`) | [`template.yaml`](../template.yaml) |

---

## 🧠 Amazon Bedrock AgentCore Architecture

```
                                 ┌─────────────────────────────────┐
                                 │     Enterprise Administrator    │
                                 │    Security Officer / Auditor   │
                                 └───────────────┬─────────────────┘
                                                 │
                                                 ▼
                       ┌─────────────────────────────────────────────────────┐
                       │             Amazon Bedrock AgentCore                │
                       │           ("TrustForgeAgentCore")                   │
                       │ Foundation Model: Amazon Nova / Claude 3.5 Sonnet   │
                       │                                                     │
                       │  ┌───────────────────────────────────────────────┐  │
                       │  │ ReAct Reasoning Engine                        │  │
                       │  │  1. 💭 Thought                                │  │
                       │  │  2. ⚡ Action (Execute Action Group)          │  │
                       │  │  3. 👁️ Observation (Process Result)           │  │
                       │  │  4. 🎯 Final Synthesized Decision             │  │
                       │  └───────────────────────────────────────────────┘  │
                       └───────────────┬─────────────────┬───────────────────┘
                                       │                 │
                   ┌───────────────────┴──┐           ┌──┴───────────────────┐
                   ▼                      │           │                      ▼
   ┌───────────────────────────────┐      │           │      ┌───────────────────────────────┐
   │ Amazon Bedrock Guardrail      │      │           │      │ AWS Step Functions            │
   │ ("ZeroTrustGuardrail")        │      │           │      │ ("TrustForgeAuditStateMachine")│
   │ • PII Masking                 │      │           │      │ 1. Inspect Identities         │
   │ • Prompt Injection Defense    │      │           │      │ 2. Evaluate Cedar Guardrails  │
   │ • Sensitive Data Redaction    │      │           │      │ 3. Anchor Merkle Root         │
   └───────────────────────────────┘      │           │      └───────────────┬───────────────┘
                                          ▼           ▼                      │
                        ┌───────────────────────────────────────────┐        │
                        │ Amazon Bedrock Action Group Lambda        │        │
                        │ ("TrustForgeAgentCoreActionGroup")        │        │
                        │ Schema: trustforge-agentcore-openapi.yaml │        │
                        └─────────────────────┬─────────────────────┘        │
                                              │                              │
                                              ▼                              ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │              TrustForge Core Platform                     │
                        │ • AWS Cedar Authorization Policy Engine v3                │
                        │ • W3C DID & ZK-STARK Cryptographic Proof Verification     │
                        │ • Amazon DynamoDB Replay Defense                          │
                        │ • Amazon S3 Encrypted Immutable Audit Vault               │
                        │ • Amazon EventBridge, SQS, SNS Alerts                     │
                        │ • Amazon CloudWatch Metrics & Logs                        │
                        └───────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Deploy on Amazon Bedrock AgentCore

### Method 1: Automated Script (AWS CLI)

Run the automated script to provision Bedrock AgentCore, Action Groups, and Guardrails under your AWS profile (**@saurabhkr**):

```powershell
# 1. Configure AWS credentials for profile saurabhkr
aws configure --profile saurabhkr

# 2. Run the deployment script
.\scripts\deploy-agentcore.ps1 -Profile saurabhkr -Region us-east-1
```

### Method 2: AWS SAM CLI Deployment (All 7 Conditions)

Deploy the complete serverless and cloud stack:

```powershell
# 1. Build the SAM template
sam build

# 2. Deploy to AWS
sam deploy --guided --profile saurabhkr --region us-east-1 --stack-name trustforge-enterprise-prod
```

### Method 3: 1-Click AWS Bedrock Console

1. Navigate to the [AWS Bedrock Agents Console](https://console.aws.amazon.com/bedrock/home?region=us-east-1#/agents).
2. Click **Create Agent**:
   - **Name**: `TrustForgeAgentCore`
   - **Model**: `Amazon Nova Lite` (or `Anthropic Claude 3.5 Sonnet`)
   - **Instruction**:
     ```text
     You are the TrustForge Amazon Bedrock AgentCore autonomous security officer.
     You evaluate zero-trust Cedar policies, verify cryptographic credentials, orchestrate
     Step Functions audit workflows, and enforce strict guardrails preventing unauthorized state mutations.
     ```
3. Attach **Action Group**:
   - Name: `TrustForgeZeroTrustOperations`
   - Schema: [`bedrock/agentcore/trustforge-agentcore-openapi.yaml`](../bedrock/agentcore/trustforge-agentcore-openapi.yaml)
   - Lambda Function: `TrustForgeAgentCoreFunction`
4. Attach **Guardrail**:
   - Attach `TrustForgeZeroTrustGuardrail` for PII masking and prompt attack defense.
5. Create Alias:
   - Alias Name: `live` -> generates the live Bedrock AgentCore endpoint!
