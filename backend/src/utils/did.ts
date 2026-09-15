import { ethers } from 'ethers';
import crypto from 'crypto';

export function generateDID(method: string = 'did:key', walletAddress?: string): string {
  // Generate a unique identifier
  const randomBytes = crypto.randomBytes(20).toString('hex');
  const identifier = walletAddress
    ? ethers.keccak256(ethers.toUtf8Bytes(walletAddress + Date.now())).slice(2, 42)
    : randomBytes;
  return `did:trustforge:${identifier}`;
}

export function generateTfId(sequenceNum: number): string {
  return `TF-${(10000 + sequenceNum).toString()}`;
}

export function generateVcId(sequenceNum: number): string {
  return `VC-${(8000 + sequenceNum).toString()}`;
}

export function generateVjId(sequenceNum: number): string {
  return `VJ-${(4000 + sequenceNum).toString()}`;
}

export function generateZkpId(sequenceNum: number): string {
  return `ZKP-${(2000 + sequenceNum).toString()}`;
}

export function generateAeId(sequenceNum: number): string {
  return `AE-${(9000 + sequenceNum).toString()}`;
}

export function generateQrId(sequenceNum: number): string {
  return `QR-${(1 + sequenceNum).toString().padStart(3, '0')}`;
}

export function truncateDid(did: string): string {
  if (did.length <= 30) return did;
  return did.slice(0, 22) + '...';
}

export function truncateHash(hash: string): string {
  if (!hash || hash.length <= 14) return hash;
  return hash.slice(0, 6) + '...' + hash.slice(-4);
}

export function generateMockTxHash(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

export function generateMockBlockNumber(): string {
  const base = 18290000;
  return (base + Math.floor(Math.random() * 10000)).toLocaleString();
}

export function timeAgo(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  const now = new Date();
  const diff = Math.max(0, now.getTime() - (isNaN(d.getTime()) ? now.getTime() : d.getTime()));
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
