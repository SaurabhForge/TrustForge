/**
 * auth.js — Token management for TrustForge SIWE authentication.
 * Wraps localStorage JWT storage and provides SIWE flow helpers.
 */

import { API_BASE } from './api';

const TOKEN_KEY = 'tf_jwt';
const USER_KEY = 'tf_user';
const WALLET_KEY = 'tf_wallet';
const AVATAR_KEY = 'tf_avatar';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(WALLET_KEY);
  localStorage.removeItem(AVATAR_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch { return null; }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredWallet() {
  return localStorage.getItem(WALLET_KEY);
}

export function setStoredWallet(address) {
  localStorage.setItem(WALLET_KEY, address);
}

export function getStoredAvatar() {
  return localStorage.getItem(AVATAR_KEY);
}

export function setStoredAvatar(avatarUrl) {
  if (avatarUrl) {
    localStorage.setItem(AVATAR_KEY, avatarUrl);
  } else {
    localStorage.removeItem(AVATAR_KEY);
  }
}

/**
 * Sign in as any persona or custom user
 */
export async function loginAsPerson({ name, email, role, avatar, walletAddress, tfId }) {
  const isSaurabh = (name && name.toLowerCase().includes('saurabh')) || email === 'sk1300374@gmail.com';
  const userAvatar = avatar || (isSaurabh ? '/admin-avatar.png' : '/default-avatar.svg');

  try {
    const res = await fetch(`${API_BASE}/auth/persona-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, avatar: userAvatar, walletAddress, tfId }),
    });
    const json = await res.json();
    if (res.ok && json.success && json.data?.token) {
      const { token, user } = json.data;
      setToken(token);
      setStoredWallet(user.walletAddress);
      const fullUser = {
        ...user,
        avatar: userAvatar,
      };
      setStoredUser(fullUser);
      setStoredAvatar(userAvatar);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('trustforge:avatar-updated'));
      }
      return { token, user: fullUser };
    }
  } catch (err) {
    console.warn('[TrustForge Auth] Backend persona login error, falling back to local session:', err);
  }

  // Fallback if backend is unreachable
  const addr = walletAddress || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const fakePayload = btoa(JSON.stringify({
    userId: 'user_' + Date.now(),
    walletAddress: addr,
    role: role || 'Admin',
    roles: [role || 'Admin'],
    name: name || 'Saurabh Kumar',
    email: email || 'sk1300374@gmail.com',
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  }));
  const token = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.sig`;

  const user = {
    name: name || (isSaurabh ? 'Saurabh Kumar' : 'TrustForge User'),
    email: email || (isSaurabh ? 'sk1300374@gmail.com' : 'user@trustforge.io'),
    role: role || (isSaurabh ? 'Super Admin' : 'Auditor / Member'),
    roles: [role || 'Super Admin'],
    walletAddress: addr,
    avatar: userAvatar,
    tfId: tfId || 'TF-10482',
    did: `did:trustforge:${addr.slice(2, 22)}`,
  };

  setToken(token);
  setStoredWallet(addr);
  setStoredUser(user);
  setStoredAvatar(userAvatar);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('trustforge:avatar-updated'));
  }

  return { token, user };
}

/**
 * Update current user's profile and avatar
 */
export function updateUserProfile(updates) {
  const current = getStoredUser() || {};
  const updated = { ...current, ...updates };
  setStoredUser(updated);
  if (updates.avatar !== undefined) {
    setStoredAvatar(updates.avatar);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('trustforge:avatar-updated'));
  }
  return updated;
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  // Decode JWT payload (no verification — backend does that)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch { return false; }
}

/**
 * Full SIWE login flow:
 * 1. Connect MetaMask
 * 2. Request nonce from backend
 * 3. Sign message
 * 4. Verify signature → get JWT
 */
export async function siwLogin(onStatus) {
  // Step 1: Connect MetaMask
  if (!window.ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask to continue.');
  }

  onStatus?.('Requesting wallet access…');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) throw new Error('No accounts found in MetaMask.');
  const address = accounts[0];

  // Step 2: Detect chain ID (informational / support Sepolia & Localhost)
  try {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    console.log(`[TrustForge Auth] Connected to chainId ${chainId}`);
  } catch {}

  onStatus?.('Requesting nonce from server…');
  const nonceRes = await fetch(`${API_BASE}/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const nonceData = await nonceRes.json();
  if (!nonceRes.ok || !nonceData.success) {
    throw new Error(nonceData.error?.message || 'Failed to get nonce');
  }

  const { message } = nonceData.data;

  // Step 3: Sign
  onStatus?.('Please sign the message in MetaMask…');
  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, address],
  });

  // Step 4: Verify
  onStatus?.('Verifying signature…');
  const verifyRes = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.success) {
    throw new Error(verifyData.error?.message || 'Signature verification failed');
  }

  const { token, user } = verifyData.data;
  setToken(token);
  setStoredUser(user);
  setStoredWallet(address);
  return { token, user, address };
}
