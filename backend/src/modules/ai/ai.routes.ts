import { Router } from 'express';
import { getBedrockStatus, runBedrockAudit, queryBedrockAgent, invokeBedrockAgentCore } from './ai.controller';

const router = Router();

// AWS Bedrock Generative AI & Autonomous Agent Endpoints
router.get('/bedrock/status', getBedrockStatus);
router.post('/bedrock/audit', runBedrockAudit);
router.post('/bedrock/query', queryBedrockAgent);
router.post('/bedrock/agentcore/invoke', invokeBedrockAgentCore);

export default router;
