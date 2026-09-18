const rawApiUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE = rawApiUrl ? `${rawApiUrl.replace(/\/$/, '')}/api` : '/api';

export async function request(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('tf_jwt') || localStorage.getItem('tf_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !endpoint.startsWith('/auth/')) {
      localStorage.removeItem('tf_jwt');
      localStorage.removeItem('tf_token');
      localStorage.removeItem('tf_wallet');
      localStorage.removeItem('tf_user');
      window.location.href = '/login';
    }

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json?.error?.message || `Request failed with status ${res.status}`);
    }
    return json.data;
  } catch (err) {
    console.warn(`[TrustForge API] ${endpoint} failed, using local state:`, err.message);
    throw err;
  }
}

// Dashboard
export async function getOverview() {
  return request('/dashboard/overview');
}

export async function getSecurityDashboard() {
  return request('/dashboard/security');
}

// Identities
export async function getIdentities(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/identities${query ? `?${query}` : ''}`);
}

export async function getIdentity(id) {
  return request(`/identities/${id}`);
}

export async function createIdentity(data) {
  return request('/identities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function revokeIdentity(id) {
  return request(`/identities/${id}/revoke`, { method: 'POST' });
}

export async function reactivateIdentity(id) {
  return request(`/identities/${id}/reactivate`, { method: 'POST' });
}

export async function verifyIdentity(id) {
  return request(`/identities/${id}/verify`, { method: 'POST' });
}

export async function rotateKey(id) {
  return request(`/identities/${id}/rotate-key`, { method: 'POST' });
}

export async function issueVC(id, data) {
  return request(`/identities/${id}/issue-vc`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Roles & Access Control
export async function getRoles() {
  return request('/access/roles');
}

export async function createRole(data) {
  return request('/access/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function signQuorum(id) {
  return request(`/access/quorum/${id}/sign`, { method: 'POST' });
}

export async function rejectQuorum(id) {
  return request(`/access/quorum/${id}/reject`, { method: 'POST' });
}

export async function getPermissions() {
  return request('/access/permissions');
}

export async function getCedarPolicies() {
  return request('/access/cedar/policies');
}

export async function evaluateCedarPolicy(payload) {
  return request('/access/cedar/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function assignRole(identityId, roleName) {
  return request('/access/roles/assign', {
    method: 'POST',
    body: JSON.stringify({ identityId, roleName }),
  });
}

// Assets
export async function getAssets(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/assets${query ? `?${query}` : ''}`);
}

export async function getAsset(id) {
  return request(`/assets/${id}`);
}

export async function createAsset(data) {
  return request('/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function mintAsset(id) {
  return request(`/assets/${id}/mint`, { method: 'POST' });
}

export async function transferAsset(id, recipientDid) {
  return request(`/assets/${id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ recipientDid }),
  });
}

export async function revokeAsset(id) {
  return request(`/assets/${id}/revoke`, { method: 'POST' });
}

// Verifications
export async function getVerifications() {
  return request('/verifications');
}

export async function createVerification(data) {
  return request('/verifications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyIdentifier(identifier) {
  return request(`/verify/${encodeURIComponent(identifier)}`);
}

// Audit Trail
export async function getAuditEvents(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/audit${query ? `?${query}` : ''}`);
}

export async function verifyAuditIntegrity() {
  return request('/audit/verify', { method: 'POST' });
}

// Auth
export async function requestNonce(address) {
  return request('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
}

export async function verifySignature(address, signature) {
  return request('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ address, signature }),
  });
}

export async function getMe() {
  return request('/auth/me');
}

export async function logout() {
  localStorage.removeItem('tf_jwt');
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_wallet');
  localStorage.removeItem('tf_user');
  return request('/auth/logout', { method: 'POST' }).catch(() => {});
}

// System Health & Backup
export async function getSystemHealth() {
  return request('/system/health');
}

export async function downloadSystemBackup() {
  const token = localStorage.getItem('tf_jwt') || localStorage.getItem('tf_token');
  const res = await fetch(`${API_BASE}/system/backup`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trustforge_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function restoreSystemBackup(backupData) {
  return request('/system/restore', {
    method: 'POST',
    body: JSON.stringify({ backup: backupData }),
  });
}

