import { useState, useEffect } from 'react'
import StatusBadge from '../components/StatusBadge'
import { getOverview, API_BASE } from '../services/api'

const defaultMetrics = [
  { label: 'Total Identities', value: '12,842', icon: 'badge', trend: '+3.8%', sub: 'W3C DID v1.0', trendColor: 'text-emerald-700' },
  { label: 'Active Identities', value: '12,106', icon: 'how_to_reg', trend: '94.3% compliance', sub: 'Verified & Synced', trendColor: 'text-primary' },
  { label: 'Digital Assets', value: '4,281', icon: 'token', trend: 'ERC-721 / ERC-1155', sub: '9 Registries', trendColor: 'text-secondary' },
  { label: 'Verified Assets', value: '3,994', icon: 'verified', trend: '93.3% anchored', sub: 'On-chain', trendColor: 'text-emerald-700' },
]

const defaultActivity = [
  { type: 'NFT Mint', icon: 'token', actor: 'Admin', did: 'did:trustforge:9a2f...', target: 'TF-10482', txHash: '0x82ac...91de', age: '2m ago', status: 'Synced' },
  { type: 'DID Update', icon: 'badge', actor: 'Controller', did: 'did:trustforge:3b1c...', target: 'TF-10480', txHash: '0x91bc...44af', age: '8m ago', status: 'Verified' },
  { type: 'Key Rotation', icon: 'key', actor: 'HSM Node', did: 'did:trustforge:7e4a...', target: 'TF-10478', txHash: '0x44de...78bc', age: '15m ago', status: 'Active' },
  { type: 'Policy Update', icon: 'admin_panel_settings', actor: 'Auditor', did: 'did:trustforge:2d8f...', target: 'Policy-004', txHash: '0x12fc...33ab', age: '22m ago', status: 'Verified' },
  { type: 'Credential Revoke', icon: 'cancel', actor: 'Admin', did: 'did:trustforge:9a2f...', target: 'TF-10455', txHash: '0x55aa...91bc', age: '41m ago', status: 'Revoked' },
  { type: 'Quorum Signed', icon: 'how_to_reg', actor: 'Multi-Sig', did: 'did:trustforge:4c7e...', target: 'Quorum-007', txHash: '0x88dd...12ef', age: '1h ago', status: 'Active' },
  { type: 'ZK Proof Submit', icon: 'verified_user', actor: 'Validator', did: 'did:trustforge:5f2b...', target: 'ZKP-2291', txHash: '0x39cc...56bd', age: '2h ago', status: 'Verified' },
]

const defaultSystemStatus = [
  { label: 'Attestation Engine', status: 'Online', latency: '4ms', icon: 'check_circle', color: 'text-emerald-600' },
  { label: 'ZK-STARK Verifier', status: 'Online', latency: '12ms', icon: 'check_circle', color: 'text-emerald-600' },
  { label: 'DID Registry Sync', status: 'Online', latency: '8ms', icon: 'check_circle', color: 'text-emerald-600' },
  { label: 'Multi-Sig Quorum', status: 'Pending', latency: '3 awaiting', icon: 'warning', color: 'text-amber-500' },
  { label: 'HSM Integration', status: 'Online', latency: '2ms', icon: 'check_circle', color: 'text-emerald-600' },
]

export default function Overview() {
  const [metricsList, setMetricsList] = useState(defaultMetrics)
  const [activityList, setActivityList] = useState(defaultActivity)
  const [statusList, setStatusList] = useState(defaultSystemStatus)
  const [blockNumber, setBlockNumber] = useState('#18,294,105')
  const [blockchainStats, setBlockchainStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterText, setFilterText] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getOverview()
      if (data?.metrics?.length) setMetricsList(data.metrics)
      if (data?.recentActivity?.length) setActivityList(data.recentActivity)
      if (data?.systemStatus?.length) setStatusList(data.systemStatus)
      if (data?.blockchain?.blockNumber) setBlockNumber('#' + data.blockchain.blockNumber)

      // Fetch live blockchain node metrics
      const bcRes = await fetch(`${API_BASE}/dashboard/blockchain`)
      const bcData = await bcRes.json()
      if (bcData?.success && bcData.data) {
        setBlockchainStats(bcData.data)
        if (bcData.data.blockNumber) setBlockNumber('#' + bcData.data.blockNumber)
      }
    } catch {
      // Graceful fallback to default state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleExportCSV = () => {
    const headers = ['Event Type', 'Actor', 'DID', 'Target', 'Tx Hash', 'Age', 'Status']
    const rows = activityList.map(a => [
      `"${a.type}"`,
      `"${a.actor}"`,
      `"${a.did}"`,
      `"${a.target}"`,
      `"${a.txHash}"`,
      `"${a.age}"`,
      `"${a.status}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `trustforge_activity_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredActivity = activityList.filter(row => {
    if (!filterText) return true
    const q = filterText.toLowerCase()
    return (
      row.type?.toLowerCase().includes(q) ||
      row.actor?.toLowerCase().includes(q) ||
      row.did?.toLowerCase().includes(q) ||
      row.target?.toLowerCase().includes(q) ||
      row.txHash?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="px-gutter-lg py-6 flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm mb-1">
            <span>Console</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">Overview</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Operational Overview</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Decentralized Trust & Cryptographic Infrastructure Operational Plane
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-space-sm self-start md:self-auto">
          <div className="flex items-center gap-space-sm px-3 py-1.5 rounded bg-surface-container-lowest shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="font-label-sm text-label-sm text-on-surface font-semibold">Sepolia Execution Anchor</span>
            </div>
            <span className="h-3 w-px bg-surface-container-high" />
            <div className="flex items-center gap-1 font-code-xs text-code-xs text-on-surface-variant">
              <span>Block</span>
              <span className="font-medium text-on-surface">{blockNumber}</span>
            </div>
            <span className="h-3 w-px bg-surface-container-high" />
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary font-code-xs text-[10px] font-semibold uppercase">Synced</span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-lowest text-on-surface-variant hover:text-on-surface shadow-sm hover:bg-surface-container transition-colors font-label-sm text-label-sm disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span>{loading ? 'Syncing...' : 'Refresh Node'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
        {metricsList.map((m) => (
          <div key={m.label} className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{m.label}</span>
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight mt-1">{m.value}</span>
              </div>
              <div className="p-2 rounded bg-surface-container-low text-primary">
                <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-sm flex items-center justify-between bg-surface-container-low/40 -mx-space-md -mb-space-md px-space-md py-2">
              <span className={`font-label-sm text-label-sm font-medium ${m.trendColor}`}>{m.trend}</span>
              <span className="font-code-xs text-code-xs text-on-surface-variant">{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* Recent Activity Table */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
          <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Recent Activity</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-label-sm bg-surface-container text-secondary font-medium">Real-time Stream</span>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px]">filter_list</span>
                <input
                  className="bg-transparent text-body-sm font-body-sm text-on-surface outline-none placeholder:text-outline w-36"
                  placeholder="Filter events..."
                  type="text"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                />
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-3 py-1 bg-surface-container-low hover:bg-surface-container text-on-surface rounded font-label-sm text-label-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">file_download</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left font-body-md text-body-md border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-2.5 px-space-md font-semibold">Event Type</th>
                  <th className="py-2.5 px-space-md font-semibold">Actor / DID</th>
                  <th className="py-2.5 px-space-md font-semibold">Target</th>
                  <th className="py-2.5 px-space-md font-semibold">Tx Hash</th>
                  <th className="py-2.5 px-space-md font-semibold">Age</th>
                  <th className="py-2.5 px-space-md font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-on-surface divide-y divide-outline-variant/20">
                {filteredActivity.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-2.5 px-space-md">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-surface-container-high text-primary">
                          <span className="material-symbols-outlined text-[14px]">{row.icon}</span>
                        </span>
                        <span className="font-medium text-on-surface">{row.type}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-space-md">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-sm text-label-sm font-medium text-on-surface">{row.actor}</span>
                        <span className="font-code-xs text-code-xs text-on-surface-variant bg-surface-container-low px-1 rounded">{row.did}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-space-md">
                      <span className="font-code-xs text-code-xs font-semibold text-primary">{row.target}</span>
                    </td>
                    <td className="py-2.5 px-space-md">
                      <div className="flex items-center gap-1 font-code-xs text-code-xs text-secondary hover:text-primary cursor-pointer">
                        <span>{row.txHash}</span>
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-space-md font-body-sm text-body-sm text-on-surface-variant">{row.age}</td>
                    <td className="py-2.5 px-space-md text-right">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status Panel */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
            <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">monitor_heart</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">System Health</span>
            </div>
            <div className="flex flex-col divide-y divide-outline-variant/20">
              {statusList.map((s) => (
                <div key={s.label} className="px-space-md py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[16px] ${s.color}`}>{s.icon}</span>
                    <span className="font-body-md text-body-md text-on-surface">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-code-xs text-code-xs text-on-surface-variant">{s.latency}</span>
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Score */}
          <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Compliance Score</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e7ff" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e40af" strokeWidth="3"
                    strokeDasharray="94.3 100" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">94%</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span className="font-body-sm text-body-sm text-on-surface-variant">SOC2 Type II</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="font-body-sm text-body-sm text-on-surface-variant">W3C DID v1.0</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="font-body-sm text-body-sm text-on-surface-variant">GDPR Partial</span>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Contract & Blockchain Explorer Card */}
          <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-md border border-outline-variant/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">token</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">EVM Blockchain Engine</span>
              </div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${blockchainStats?.onChain ? 'bg-emerald-100 text-emerald-800' : 'bg-primary/10 text-primary'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${blockchainStats?.onChain ? 'bg-emerald-600 animate-pulse' : 'bg-primary'}`} />
                {blockchainStats?.onChain ? 'Hardhat Node Live' : 'Node Anchored'}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">Network</span>
                <span className="font-semibold text-on-surface">{blockchainStats?.network || 'Hardhat Local (31337)'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">RPC Endpoint</span>
                <span className="text-secondary">{blockchainStats?.nodeUrl || 'http://127.0.0.1:8545'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">Gas Price</span>
                <span className="text-emerald-700 font-semibold">{blockchainStats?.gasPrice || '1.0 Gwei'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">Identity Registry</span>
                <span className="text-primary font-bold">0x5FbD...0aa3</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
                <span className="text-on-surface-variant">Asset Registry (NFT)</span>
                <span className="text-primary font-bold">0x9fE4...fa6e0</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-on-surface-variant">Access Control</span>
                <span className="text-primary font-bold">0xe7f1...F0512</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
