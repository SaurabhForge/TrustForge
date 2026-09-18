import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cedarFile = path.resolve(__dirname, '../../cedar/trustforge.cedar');

console.log('Testing Cedar policy file existence and structure...');
assert(fs.existsSync(cedarFile), 'cedar/trustforge.cedar must exist');
const cedarContent = fs.readFileSync(cedarFile, 'utf-8');

assert(cedarContent.includes('TrustForge::Role::"ADMIN"'), 'Must define ADMIN policy');
assert(cedarContent.includes('TrustForge::Role::"SECURITY_ADMIN"'), 'Must define SECURITY_ADMIN policy');
assert(cedarContent.includes('TrustForge::Role::"AUDITOR"'), 'Must define AUDITOR policy');
assert(cedarContent.includes('TrustForge::Role::"VERIFIER"'), 'Must define VERIFIER policy');
assert(cedarContent.includes('forbid ('), 'Must define forbid guardrail');
assert(cedarContent.includes('REVOKED'), 'Guardrail must check REVOKED');

console.log('✓ All Cedar checks passed successfully!');
