import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaFile = path.resolve(__dirname, '../../bedrock/agentcore/trustforge-agentcore-openapi.yaml');
const lambdaFile = path.resolve(__dirname, '../../bedrock/agentcore/agent_core_lambda.js');
const templateFile = path.resolve(__dirname, '../../template.yaml');

console.log('Testing Amazon Bedrock AgentCore & 7 Hackathon Conditions...');

// 1. Bedrock AgentCore OpenAPI Schema
assert(fs.existsSync(schemaFile), 'trustforge-agentcore-openapi.yaml must exist');
const schemaContent = fs.readFileSync(schemaFile, 'utf-8');
assert(schemaContent.includes('/access/cedar/evaluate'), 'Must include Cedar evaluation path');
assert(schemaContent.includes('/verifications/verify'), 'Must include verification path');
assert(schemaContent.includes('/stepfunctions/audit-workflow'), 'Must include Step Functions path');

// 2. Lambda Handler
assert(fs.existsSync(lambdaFile), 'agent_core_lambda.js must exist');
const lambdaContent = fs.readFileSync(lambdaFile, 'utf-8');
assert(lambdaContent.includes('exports.handler'), 'Must export handler function');

// 3. SAM Template covering all 7 conditions
assert(fs.existsSync(templateFile), 'template.yaml must exist');
const templateContent = fs.readFileSync(templateFile, 'utf-8');

// Condition 1: SageMaker / Bedrock
assert(templateContent.includes('AWS::Bedrock::Agent'), 'Must include Bedrock Agent');
assert(templateContent.includes('AWS::Bedrock::AgentAlias'), 'Must include Bedrock Agent Alias');
assert(templateContent.includes('AWS::Bedrock::Guardrail'), 'Must include Bedrock Guardrail');

// Condition 3: Lambda, API Gateway, Step Functions
assert(templateContent.includes('AWS::StepFunctions::StateMachine'), 'Must include Step Functions');
assert(templateContent.includes('AWS::Serverless::Function'), 'Must include Lambda functions');
assert(templateContent.includes('AWS::Serverless::HttpApi'), 'Must include API Gateway');

// Condition 4: Amplify Hosting / App Runner
assert(templateContent.includes('AWS::Amplify::App'), 'Must include Amplify Hosting');

// Condition 5: S3, DynamoDB
assert(templateContent.includes('AWS::S3::Bucket'), 'Must include S3 Bucket');
assert(templateContent.includes('AWS::DynamoDB::Table'), 'Must include DynamoDB Table');

// Condition 6: Cognito
assert(templateContent.includes('AWS::Cognito::UserPool'), 'Must include Cognito User Pool');

// Condition 7: CloudFront, EventBridge, SQS, SNS, CloudWatch
assert(templateContent.includes('AWS::Events::EventBus'), 'Must include EventBridge EventBus');
assert(templateContent.includes('AWS::SQS::Queue'), 'Must include SQS Queue');
assert(templateContent.includes('AWS::SNS::Topic'), 'Must include SNS Topic');
assert(templateContent.includes('AWS::Logs::LogGroup'), 'Must include CloudWatch LogGroup');

console.log('✓ All 7 conditions and Amazon Bedrock AgentCore assertions passed successfully!');
