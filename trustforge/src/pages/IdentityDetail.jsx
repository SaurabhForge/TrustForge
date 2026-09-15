import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import HashViewer from '../components/HashViewer'
import { getIdentity, revokeIdentity, rotateKey, issueVC } from '../services/api'

const defaultIdentity = {
  id: 'TF-10482',
  did: 'did:trustforge:9a2f3b1c7e4a2d8f5c9e1a4b8d3c6f2a9c5d1e7b',
  controller: 'Saurabh Kumar',
  method: 'did:key',
  keyType: 'Ed25519',
  status: 'Active',
  created: '2026-08-15T09:22:11Z',
  updated: '2026-09-13T23:00:04Z',
  complianceScore: 98,
  publicKey: 'z6Mkf5rGMoaL6PKkMkMuR4mM9TmNDd8R1g5NJyNFyVaqr2Qb',
  txHash: '0x82ac3f4d1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3e6c',
  blockNumber: '18,293,410',
  credentials: [
    { id: 'VC-8821', type: 'SOC2 Type II', issuer: 'TrustForge Authority', issued: '2026-08-20', expires: '2027-08-20', status: 'Active' },
    { id: 'VC-8820', type: 'ISO 27001', issuer: 'GlobalCert Inc.', issued: '2026-07-01', expires: '2027-07-01', status: 'Active' },
    { id: 'VC-7741', type: 'KYC Verified', issuer: 'ID Verify Pro', issued: '2026-06-15', expires: '2027-06-15', status: 'Active' },
    { id: 'VC-6610', type: 'Employment', issuer: 'CommBank HR', issued: '2025-01-01', expires: '2026-01-01', status: 'Revoked' },
  ],
  auditLog: [
    { event: 'DID Created', actor: 'Admin', txHash: '0x82ac...91de', age: '29d ago' },
    { event: 'VC Issued', actor: 'Authority', txHash: '0x55bc...44af', age: '24d ago' },
    { event: 'Key Rotation', actor: 'HSM', txHash: '0x91de...78bc', age: '10d ago' },
    { event: 'Policy Sync', actor: 'System', txHash: '0x12fc...33ab', age: '2d ago' },
  ],
}

export default function IdentityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState({ ...defaultIdentity, id: id || defaultIdentity.id })
  const [loading, setLoading] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showDidModal, setShowDidModal] = useState(false)
  const [didDocJson, setDidDocJson] = useState(null)
  const [loadingDidDoc, setLoadingDidDoc] = useState(false)
  const [showVcModal, setShowVcModal] = useState(false)
  const [vcDocJson, setVcDocJson] = useState(null)
  const [loadingVcDoc, setLoadingVcDoc] = useState(false)
  const [copied, setCopied] = useState(false)
  const [vcForm, setVcForm] = useState({
    type: 'SOC2 Type II',
    issuer: 'TrustForge Authority',
    validityYears: '1',
  })

  const handleViewDidDoc = async () => {
    setLoadingDidDoc(true)
    try {
      const res = await fetch(`/api/identities/${data.id}/did-document`)
      const json = await res.json()
      setDidDocJson(json.data || json)
      setShowDidModal(true)
    } catch {
      alert('Failed to load DID Document')
    } finally {
      setLoadingDidDoc(false)
    }
  }

  const handleViewVcDoc = async (vcId) => {
    setLoadingVcDoc(true)
    try {
      const res = await fetch(`/api/assets/${vcId}/vc`)
      const json = await res.json()
      setVcDocJson(json.data || json)
      setShowVcModal(true)
    } catch {
      alert('Failed to load Verifiable Credential Document')
    } finally {
      setLoadingVcDoc(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getIdentity(id)
      if (res) setData(res)
    } catch {
      // Keep default on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleRevoke = async () => {
    if (!confirm(`Are you sure you want to revoke ${data.id}?`)) return
    try {
      await revokeIdentity(data.id)
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to revoke identity')
    }
  }

  const handleRotateKey = async () => {
    if (!confirm(`Rotate cryptographic signing key for ${data.id}? This will generate a new key and anchor the update on Sepolia.`)) return
    setRotating(true)
    try {
      const res = await rotateKey(data.id)
      if (res?.publicKey) {
        setData(prev => ({
          ...prev,
          publicKey: res.publicKey,
          txHash: res.txHash || prev.txHash,
          blockNumber: res.blockNumber || prev.blockNumber,
          auditLog: [
            { event: 'Key Rotation', actor: 'HSM-Node-01', txHash: res.txHash ? `${res.txHash.slice(0, 6)}...${res.txHash.slice(-4)}` : '0x91de...78bc', age: 'Just now' },
            ...(prev.auditLog || [])
          ]
        }))
        alert('Cryptographic key rotated successfully and anchored to Sepolia!')
      }
    } catch (err) {
      alert(err.message || 'Failed to rotate key')
    } finally {
      setRotating(false)
    }
  }

  const handleIssueVC = async (e) => {
    e.preventDefault()
    setIssuing(true)
    try {
      const res = await issueVC(data.id, {
        type: vcForm.type,
        issuer: vcForm.issuer,
      })
      if (res) {
        setData(prev => ({
          ...prev,
          credentials: [res, ...(prev.credentials || [])],
          auditLog: [
            { event: 'VC Issued', actor: res.issuer || 'TrustForge Authority', txHash: res.txHash ? `${res.txHash.slice(0, 6)}...${res.txHash.slice(-4)}` : '0x55bc...44af', age: 'Just now' },
            ...(prev.auditLog || [])
          ]
        }))
        setShowIssueModal(false)
        alert(`Verifiable Credential "${res.type}" (${res.id}) issued successfully!`)
      }
    } catch (err) {
      alert(err.message || 'Failed to issue credential')
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="px-gutter-lg py-6 flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm mb-1">
            <button onClick={() => navigate('/identity-management')} className="hover:text-primary transition-colors">Identity Management</button>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">{data.id}</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">{data.controller}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={data.status} />
            <span className="font-code-xs text-code-xs text-on-surface-variant">{data.did}</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={handleViewDidDoc}
            disabled={loadingDidDoc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors font-label-md text-label-md shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">data_object</span>
            <span>{loadingDidDoc ? 'Loading...' : 'W3C DID Document'}</span>
          </button>
          <button
            onClick={handleRotateKey}
            disabled={rotating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md shadow-sm disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] text-secondary ${rotating ? 'animate-spin' : ''}`}>autorenew</span>
            <span>{rotating ? 'Rotating...' : 'Rotate Key'}</span>
          </button>
          <button
            onClick={handleRevoke}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-red-200 text-red-700 hover:bg-red-50 transition-colors font-label-md text-label-md shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            Revoke
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* Left: Identity Info */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* Core DID Document */}
          <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
            <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">badge</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">DID Document</span>
            </div>
            <div className="p-space-md flex flex-col gap-3">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Identifier</span>
                <HashViewer hash={data.did} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Method</span>
                  <span className="font-code-xs text-code-xs px-2 py-1 rounded bg-surface-container-high text-secondary">{data.method}</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Key Algorithm</span>
                  <span className="font-code-xs text-code-xs px-2 py-1 rounded bg-surface-container-high text-secondary">{data.keyType}</span>
                </div>
              </div>
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Public Key</span>
                <HashViewer hash={data.publicKey} />
              </div>
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Anchor Tx Hash</span>
                <HashViewer hash={data.txHash} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Block</span>
                  <span className="font-code-xs text-code-xs text-on-surface">#{data.blockNumber}</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Compliance</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${data.complianceScore}%` }} />
                    </div>
                    <span className="font-code-xs text-code-xs text-emerald-700">{data.complianceScore}%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-outline-variant/20">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-0.5">Created</span>
                  <span className="font-body-sm text-body-sm text-on-surface">{new Date(data.created).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-0.5">Updated</span>
                  <span className="font-body-sm text-body-sm text-on-surface">{new Date(data.updated).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Credentials & Audit */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          {/* Verifiable Credentials */}
          <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
            <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">workspace_premium</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Verifiable Credentials</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-label-sm bg-surface-container text-secondary font-medium">{data.credentials.length}</span>
              </div>
              <button
                onClick={() => setShowIssueModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-sm text-label-sm shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Issue VC
              </button>
            </div>
            <table className="w-full text-left font-body-md text-body-md">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-2.5 px-space-md font-semibold">ID</th>
                  <th className="py-2.5 px-space-md font-semibold">Type</th>
                  <th className="py-2.5 px-space-md font-semibold">Issuer</th>
                  <th className="py-2.5 px-space-md font-semibold">Issued</th>
                  <th className="py-2.5 px-space-md font-semibold">Expires</th>
                  <th className="py-2.5 px-space-md font-semibold text-center">Status</th>
                  <th className="py-2.5 px-space-md font-semibold text-right">W3C Credential</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {data.credentials.map(vc => (
                  <tr key={vc.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-2.5 px-space-md">
                      <span className="font-code-xs text-code-xs font-semibold text-primary">{vc.id}</span>
                    </td>
                    <td className="py-2.5 px-space-md font-medium text-on-surface">{vc.type}</td>
                    <td className="py-2.5 px-space-md font-body-sm text-body-sm text-on-surface-variant">{vc.issuer}</td>
                    <td className="py-2.5 px-space-md font-body-sm text-body-sm text-on-surface-variant">{vc.issued}</td>
                    <td className="py-2.5 px-space-md font-body-sm text-body-sm text-on-surface-variant">{vc.expires}</td>
                    <td className="py-2.5 px-space-md text-center"><StatusBadge status={vc.status} /></td>
                    <td className="py-2.5 px-space-md text-right">
                      <button
                        onClick={() => handleViewVcDoc(vc.id)}
                        disabled={loadingVcDoc}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-high hover:bg-primary hover:text-white text-primary text-xs font-mono transition-colors border border-outline-variant/40"
                        title="View signed W3C Verifiable Credential JSON"
                      >
                        <span className="material-symbols-outlined text-[13px]">code</span>
                        <span>W3C VC</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audit Log */}
          <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
            <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">history_toggle_off</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Audit Log</span>
            </div>
            <div className="flex flex-col divide-y divide-outline-variant/20">
              {data.auditLog.map((entry, i) => (
                <div key={i} className="px-space-md py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <span className="font-medium text-on-surface text-body-md">{entry.event}</span>
                      <span className="ml-2 font-body-sm text-body-sm text-on-surface-variant">by {entry.actor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-code-xs text-code-xs text-secondary hover:text-primary cursor-pointer">{entry.txHash}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{entry.age}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Issue VC Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/40 w-full max-w-md mx-4">
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">workspace_premium</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Issue Verifiable Credential</h2>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleIssueVC}>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">Subject DID</label>
                  <input
                    type="text"
                    disabled
                    value={data.did}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-low text-on-surface-variant font-code-xs text-code-xs"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">Credential Type *</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    value={vcForm.type}
                    onChange={e => setVcForm({ ...vcForm, type: e.target.value })}
                  >
                    <option value="SOC2 Type II">SOC2 Type II Attestation</option>
                    <option value="ISO 27001">ISO 27001 Security Standard</option>
                    <option value="KYC Verified">KYC Identity Assurance</option>
                    <option value="Employment Credential">Enterprise Employment Credential</option>
                    <option value="BBS+ Selective Disclosure">BBS+ Zero-Knowledge Disclosure</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">Issuing Authority *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    value={vcForm.issuer}
                    onChange={e => setVcForm({ ...vcForm, issuer: e.target.value })}
                  />
                </div>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md shadow-sm disabled:opacity-50"
                >
                  <span>{issuing ? 'Issuing...' : 'Issue Credential'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* W3C DID Document Modal */}
      {showDidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-xl">data_object</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">W3C DID Document</h3>
                  <p className="text-xs text-on-surface-variant font-mono">{data.did}</p>
                </div>
              </div>
              <button onClick={() => setShowDidModal(false)} className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-surface-container-lowest">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">application/did+ld+json</span>
                <button
                  onClick={() => copyToClipboard(didDocJson)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                >
                  <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 text-on-surface font-mono text-xs overflow-x-auto leading-relaxed">
                {JSON.stringify(didDocJson, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low/30 flex justify-end">
              <button
                onClick={() => setShowDidModal(false)}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* W3C Verifiable Credential Modal */}
      {showVcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-xl">workspace_premium</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">W3C Verifiable Credential & NFT Metadata</h3>
                  <p className="text-xs text-on-surface-variant font-mono">Standard ERC-721 Token Bound to Subject DID</p>
                </div>
              </div>
              <button onClick={() => setShowVcModal(false)} className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-surface-container-lowest">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">application/vc+ld+json</span>
                <button
                  onClick={() => copyToClipboard(vcDocJson)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                >
                  <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 text-on-surface font-mono text-xs overflow-x-auto leading-relaxed">
                {JSON.stringify(vcDocJson, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low/30 flex justify-end">
              <button
                onClick={() => setShowVcModal(false)}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
