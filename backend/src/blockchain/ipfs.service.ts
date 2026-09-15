import crypto from 'crypto';

export interface IpfsUploadResult {
  cid: string;
  hash: string;
  size: number;
}

export class IpfsService {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.IPFS_API_URL || 'http://localhost:5001';
  }

  async uploadMetadata(metadata: object): Promise<IpfsUploadResult> {
    const jsonString = JSON.stringify(metadata);
    const hash = this.calculateHash(jsonString);
    const mockCid = 'Qm' + crypto.createHash('sha256').update(jsonString).digest('hex').slice(0, 44);

    return {
      cid: mockCid,
      hash,
      size: Buffer.byteLength(jsonString, 'utf8'),
    };
  }

  async getMetadata(cid: string): Promise<object | null> {
    return {
      cid,
      note: 'Retrieved from decentralized storage',
    };
  }

  calculateHash(content: string): string {
    return '0x' + crypto.createHash('sha256').update(content).digest('hex');
  }

  verifyHash(content: string, expectedHash: string): boolean {
    const computed = this.calculateHash(content);
    return computed.toLowerCase() === expectedHash.toLowerCase();
  }
}

export const ipfsService = new IpfsService();
export default ipfsService;
