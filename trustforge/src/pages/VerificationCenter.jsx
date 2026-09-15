import { useState, useEffect } from 'react'
import StatusBadge from '../components/StatusBadge'
import HashViewer from '../components/HashViewer'
import { getVerifications, verifyIdentifier, createVerification } from '../services/api'

const defaultJobs = [
  { id: 'VJ-4421', credential: 'SOC2 Type II', subject: 'TF-10482', issuer: 'TrustForge Authority', proof: 'ZK-STARK', result: 'Verified', latency: '11ms', timestamp: '0m ago', txHash: '0x91bc...44af' },
  { id: 'VJ-4420', credential: 'KYC Verified', subject: 'TF-10480', issuer: 'ID Verify Pro', proof: 'BBS+', result: 'Verified', latency: '8ms', timestamp: '2m ago', txHash: '0x44de...78bc' },
  { id: 'VJ-4419', credential: 'ISO 27001', subject: 'TF-10476', issuer: 'GlobalCert Inc.', proof: 'ZK-STARK', result: 'Pending', latency: '—', timestamp: '5m ago', txHash: '—' },
  { id: 'VJ-4418', credential: 'Employment', subject: 'TF-10455', issuer: 'CommBank HR', proof: 'JWT-VC', result: 'Revoked', latency: '3ms', timestamp: '41m ago', txHash: '0x55aa...91bc' },
  { id: 'VJ-4417', credential: 'Accreditation', subject: 'TF-10450', issuer: 'AccredBody', proof: 'ZK-STARK', result: 'Verified', latency: '14ms', timestamp: '1h ago', txHash: '0x12fc...33ab' },
  { id: 'VJ-4416', credential: 'PII Token', subject: 'TF-10448', issuer: 'Privacy Shield', proof: 'BBS+', result: 'Verified', latency: '6ms', timestamp: '2h ago', txHash: '0x39cc...56bd' },
]

const defaultZkProofs = [
  { id: 'ZKP-2291', type: 'ZK-STARK', status: 'Valid', circuit: 'identity-membership-v2', generatedAt: '2026-09-13 22:58', verifiedAt: '2026-09-13 22:59', latency: '12ms', publicInputs: 4, proofSize: '62 KB' },
  { id: 'ZKP-2290', type: 'BBS+', status: 'Valid', circuit: 'selective-disclosure-v3', generatedAt: '2026-09-13 22:51', verifiedAt: '2026-09-13 22:51', latency: '4ms', publicInputs: 2, proofSize: '1.1 KB' },
  { id: 'ZKP-2289', type: 'ZK-STARK', status: 'Invalid', circuit: 'policy-compliance-v1', generatedAt: '2026-09-13 22:40', verifiedAt: '2026-09-13 22:41', latency: '18ms', publicInputs: 6, proofSize: '75 KB' },
  { id: 'ZKP-2288', type: 'JWT-VC', status: 'Valid', circuit: 'n/a', generatedAt: '2026-09-13 22:10', verifiedAt: '2026-09-13 22:10', latency: '2ms', publicInputs: 1, proofSize: '0.4 KB' },
]

export default function VerificationCenter() {
  const [activeTab, setActiveTab] = useState('jobs')
  const [inputDID, setInputDID] = useState('')
  const [jobs, setJobs] = useState(defaultJobs)
  const [proofs, setProofs] = useState(defaultZkProofs)
  const [stats, setStats] = useState({
    totalVerifications: '4.1M',
    successRate: '99.98%',
    avgLatency: '12ms',
    activeProofs: '1,284',
  })
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)

  const loadData = async () => {
    try {
      const res = await getVerifications()
      if (res?.jobs?.length) setJobs(res.jobs)
      if (res?.zkProofs?.length) setProofs(res.zkProofs)
      if (res?.stats) setStats(res.stats)
    } catch {}
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleManualVerify = async (targetDid) => {
    const target = (typeof targetDid === 'string' ? targetDid : inputDID).trim() || 'TF-10482'
    setInputDID(target)
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await verifyIdentifier(target)
      setVerifyResult(res)
      loadData()
    } catch (err) {
      setVerifyResult({ verified: false, error: err.message, identifier: target })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="px-gutter-lg py-6 flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm mb-1">
            <span>Console</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">Verification Center</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Cryptographic Verification Center</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            ZK-STARK, BBS+, JWT-VC real-time proof verification and on-chain anchoring
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => handleManualVerify('TF-10482')}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors shadow-sm font-label-md text-label-md disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${verifying ? 'animate-spin' : ''}`}>
              {verifying ? 'sync' : 'verified_user'}
            </span>
            <span>{verifying ? 'Verifying...' : 'Verify Credential'}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
        {[
          { label: 'Total Verifications', value: stats.totalVerifications, icon: 'verified_user', color: 'text-primary', sub: 'All-time' },
          { label: 'Success Rate', value: stats.successRate, icon: 'check_circle', color: 'text-emerald-700', sub: '30-day window' },
          { label: 'Avg. Latency', value: stats.avgLatency, icon: 'timer', color: 'text-secondary', sub: 'ZK-STARK avg' },
          { label: 'Active Proofs', value: stats.activeProofs, icon: 'lock', color: 'text-primary', sub: 'On-chain anchored' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{s.label}</span>
              <span className={`material-symbols-outlined text-[20px] ${s.color}`}>{s.icon}</span>
            </div>
            <div className="font-headline-md text-headline-md text-on-surface font-bold">{s.value}</div>
            <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Manual Verification Panel */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">search</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Manual Verification</span>
          </div>
          <div className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
            <span className="text-[11px] font-label-sm">Quick Test:</span>
            {['TF-10482', 'TF-10480', 'TF-10478'].map(did => (
              <button
                key={did}
                onClick={() => handleManualVerify(did)}
                className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-primary font-code-xs text-[11px] transition-colors"
              >
                {did}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-code-sm text-code-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-outline"
            placeholder="Enter DID, VC ID, or credential hash (e.g. TF-10482)..."
            value={inputDID}
            onChange={e => setInputDID(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualVerify()}
          />
          <button
            onClick={() => handleManualVerify()}
            disabled={verifying}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-md text-label-md shadow-sm shrink-0 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${verifying ? 'animate-spin' : ''}`}>
              {verifying ? 'hourglass_top' : 'verified_user'}
            </span>
            {verifying ? 'Verifying...' : 'Verify Now'}
          </button>
        </div>

        {/* Verification Result Card */}
        {verifyResult && (
          <div className={`mt-4 p-4 rounded-lg border ${verifyResult.verified ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'} flex items-start justify-between gap-4`}>
            <div className="flex items-start gap-3">
              <span className={`material-symbols-outlined text-[24px] ${verifyResult.verified ? 'text-emerald-600' : 'text-red-600'}`}>
                {verifyResult.verified ? 'verified' : 'cancel'}
              </span>
              <div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                  <span>{verifyResult.verified ? 'Cryptographically Verified' : 'Verification Unsuccessful'}</span>
                  <StatusBadge status={verifyResult.verified ? 'Verified' : 'Revoked'} />
                </div>
                <div className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Identifier: <code className="font-code-xs bg-surface-container-high px-1.5 py-0.5 rounded">{verifyResult.identifier}</code>
                </div>
                {verifyResult.identity && (
                  <div className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    Identity ID: {verifyResult.identity.id} · Status: {verifyResult.identity.status} · Compliance: {verifyResult.identity.complianceScore}%
                  </div>
                )}
                {verifyResult.blockchain && (
                  <div className="mt-1 text-xs text-emerald-700 font-medium">
                    Anchor: {verifyResult.blockchain.network} · On-chain verified at {new Date(verifyResult.blockchain.checkedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setVerifyResult(null)} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-outline-variant/20 px-space-md flex items-center gap-0">
          {[
            { key: 'jobs', label: 'Verification Jobs', icon: 'task_alt' },
            { key: 'proofs', label: 'ZK Proof Registry', icon: 'lock' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 font-label-md text-label-md border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'jobs' && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left font-body-md text-body-md">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-2.5 px-space-md font-semibold">Job ID</th>
                  <th className="py-2.5 px-space-md font-semibold">Credential</th>
                  <th className="py-2.5 px-space-md font-semibold">Subject</th>
                  <th className="py-2.5 px-space-md font-semibold">Proof Type</th>
                  <th className="py-2.5 px-space-md font-semibold">Tx Hash</th>
                  <th className="py-2.5 px-space-md font-semibold">Latency</th>
                  <th className="py-2.5 px-space-md font-semibold">Time</th>
                  <th className="py-2.5 px-space-md font-semibold text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-2.5 px-space-md">
                      <span className="font-code-xs text-code-xs font-semibold text-primary">{job.id}</span>
                    </td>
                    <td className="py-2.5 px-space-md font-medium text-on-surface">{job.credential}</td>
                    <td className="py-2.5 px-space-md">
                      <span className="font-code-xs text-code-xs text-secondary">{job.subject}</span>
                    </td>
                    <td className="py-2.5 px-space-md">
                      <span className="font-code-xs text-code-xs px-2 py-0.5 rounded bg-surface-container-high text-secondary">{job.proof}</span>
                    </td>
                    <td className="py-2.5 px-space-md">
                      <span className="font-code-xs text-code-xs text-secondary hover:text-primary cursor-pointer">{job.txHash}</span>
                    </td>
                    <td className="py-2.5 px-space-md font-code-xs text-code-xs text-on-surface-variant">{job.latency}</td>
                    <td className="py-2.5 px-space-md font-body-sm text-body-sm text-on-surface-variant">{job.timestamp}</td>
                    <td className="py-2.5 px-space-md text-right">
                      <StatusBadge status={job.result} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'proofs' && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left font-body-md text-body-md">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-2.5 px-space-md font-semibold">Proof ID</th>
                  <th className="py-2.5 px-space-md font-semibold">Type</th>
                  <th className="py-2.5 px-space-md font-semibold">Circuit</th>
                  <th className="py-2.5 px-space-md font-semibold">Public Inputs</th>
                  <th className="py-2.5 px-space-md font-semibold">Proof Size</th>
                  <th className="py-2.5 px-space-md font-semibold">Latency</th>
                  <th className="py-2.5 px-space-md font-semibold">Verified At</th>
                  <th className="py-2.5 px-space-md font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {proofs.map(proof => (
                  <tr key={proof.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-2.5 px-space-md">
                      <span className="font-code-xs text-code-xs font-semibold text-primary">{proof.id}</span>
                    </td>
                    <td className="py-2.5 px-space-md">
                      <span className="font-code-xs text-code-xs px-2 py-0.5 rounded bg-surface-container-high text-secondary">{proof.type}</span>
                    </td>
                    <td className="py-2.5 px-space-md font-code-xs text-code-xs text-on-surface-variant">{proof.circuit}</td>
                    <td className="py-2.5 px-space-md font-code-xs text-code-xs text-on-surface">{proof.publicInputs}</td>
                    <td className="py-2.5 px-space-md font-code-xs text-code-xs text-on-surface-variant">{proof.proofSize}</td>
                    <td className="py-2.5 px-space-md font-code-xs text-code-xs text-on-surface-variant">{proof.latency}</td>
                    <td className="py-2.5 px-space-md font-body-sm text-body-sm text-on-surface-variant">{proof.verifiedAt}</td>
                    <td className="py-2.5 px-space-md text-right">
                      <StatusBadge status={proof.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
