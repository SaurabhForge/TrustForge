import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaFile = path.resolve(__dirname, '../../bedrock/trustforge-agent-openapi.yaml');
const templateFile = path.resolve(__dirname, '../../template.yaml');

console.log('Testing AWS Bedrock schema and template integration...');

// 1. Verify Bedrock OpenAPI Action Group Schema
assert(fs.existsSync(schemaFile), 'bedrock/trustforge-agent-openapi.yaml must exist');
const schemaContent = fs.readFileSync(schemaFile, 'utf-8');
assert(schemaContent.includes('/access/cedar/evaluate'), 'Must define Cedar evaluate path in Bedrock schema');
assert(schemaContent.includes('evaluateCedarPolicy'), 'Must define evaluateCedarPolicy operationId');
assert(schemaContent.includes('/dashboard/security'), 'Must define security dashboard path');

// 2. Verify SAM template Bedrock resources
assert(fs.existsSync(templateFile), 'template.yaml must exist');
const templateContent = fs.readFileSync(templateFile, 'utf-8');
assert(templateContent.includes('TrustForgeBedrockAgent'), 'template.yaml must declare Bedrock Agent');
assert(templateContent.includes('TrustForgeBedrockGuardrail'), 'template.yaml must declare Bedrock Guardrail');

console.log('✓ All AWS Bedrock assertions passed successfully!');
