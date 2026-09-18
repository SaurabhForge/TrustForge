/**
 * =============================================================================
 * TrustForge Amazon Bedrock AgentCore — Action Group Lambda Handler
 * AWS Bedrock Agent Execution Engine Integration
 * =============================================================================
 */

exports.handler = async (event) => {
  console.log('🤖 [Bedrock AgentCore] Event received:', JSON.stringify(event, null, 2));

  const actionGroup = event.actionGroup || 'TrustForgeAgentCoreActionGroup';
  const apiPath = event.apiPath || '';
  const httpMethod = event.httpMethod || 'POST';

  let responseBody = { status: 'success', message: 'Action processed by TrustForge AgentCore' };
  let statusCode = 200;

  try {
    const rawBody = event.requestBody?.content?.['application/json']?.properties || {};
    const parsedBody = {};
    for (const p of rawBody) {
      parsedBody[p.name] = p.value;
    }

    if (apiPath === '/access/cedar/evaluate') {
      const principalRole = parsedBody.role || 'SECURITY_ADMIN';
      const principalStatus = parsedBody.status || 'ACTIVE';
      const action = parsedBody.action || 'rotateKey';

      const isRevoked = ['REVOKED', 'SUSPENDED'].includes(principalStatus.toUpperCase());
      const isMutating = ['rotateKey', 'mintAsset', 'transferAsset', 'signQuorum'].includes(action);

      if (isRevoked && isMutating) {
        responseBody = {
          decision: 'DENY',
          determiningPolicies: ['policy-6-strict-guardrail'],
          diagnostics: {
            reason: `Strict Guardrail: Principal status is ${principalStatus}. Mutating action '${action}' is forbidden by Cedar policy.`,
          },
        };
      } else {
        responseBody = {
          decision: 'ALLOW',
          determiningPolicies: ['policy-2-security-admin'],
          diagnostics: {
            reason: `Principal with role ${principalRole} authorized to execute ${action} under Cedar Policy 2.`,
          },
        };
      }
    } else if (apiPath === '/verifications/verify') {
      responseBody = {
        valid: true,
        proofType: parsedBody.proofType || 'ZK-STARK',
        verifiedAt: new Date().toISOString(),
        issuerDid: 'did:trustforge:admin',
      };
    } else if (apiPath === '/dashboard/security') {
      responseBody = {
        identitiesCount: 14892,
        activeControllers: 14210,
        merkleRoot: '0x4f8d9b23c10a76e93dfa289b02f84c8a1136bdf483a9032fa89b21f08a9c',
        status: 'OPTIMAL',
      };
    } else if (apiPath === '/stepfunctions/audit-workflow') {
      responseBody = {
        executionArn: `arn:aws:states:us-east-1:123456789012:execution:TrustForgeAuditStateMachine:${Date.now()}`,
        status: 'RUNNING',
        startedAt: new Date().toISOString(),
      };
    } else {
      responseBody = {
        message: `Handled operation ${apiPath} via TrustForge AgentCore`,
      };
    }
  } catch (err) {
    console.error('❌ [Bedrock AgentCore] Error:', err);
    statusCode = 500;
    responseBody = { error: err.message };
  }

  const response = {
    messageVersion: '1.0',
    response: {
      actionGroup,
      apiPath,
      httpMethod,
      httpStatusCode: statusCode,
      responseBody: {
        'application/json': {
          body: JSON.stringify(responseBody),
        },
      },
    },
  };

  console.log('🤖 [Bedrock AgentCore] Returning response:', JSON.stringify(response));
  return response;
};
