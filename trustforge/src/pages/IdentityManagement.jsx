import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import HashViewer from '../components/HashViewer'
import { getIdentities, createIdentity, revokeIdentity } from '../services/api'

const defaultIdentities = [
  { id: 'TF-10482', did: 'did:trustforge:9a2f3b1c...', controller: 'Saurabh Kumar', method: 'did:key', keyType: 'Ed25519', credentials: 4, status: 'Active', lastSeen: '2m ago', created: '2026-08-15', complianceScore: 98 },
  { id: 'TF-10480', did: 'did:trustforge:3b1c7e4a...', controller: 'Marcus Vance', method: 'did:ion', keyType: 'secp256k1', credentials: 7, status: 'Active', lastSeen: '8m ago', created: '2026-07-22', complianceScore: 95 },
  { id: 'TF-10478', did: 'did:trustforge:7e4a2d8f...', controller: 'HSM-Node-01', method: 'did:web', keyType: 'P-256', credentials: 2, status: 'Active', lastSeen: '15m ago', created: '2026-06-10', complianceScore: 100 },
  { id: 'TF-10476', did: 'did:trustforge:2d8f5c9e...', controller: 'Priya Menon', method: 'did:key', keyType: 'Ed25519', credentials: 3, status: 'Pending', lastSeen: '1h ago', created: '2026-09-01', complianceScore: 72 },
  { id: 'TF-10455', did: 'did:trustforge:5c9e1a4b...', controller: 'Legacy System', method: 'did:ethr', keyType: 'secp256k1', credentials: 1, status: 'Revoked', lastSeen: '3d ago', created: '2025-12-01', complianceScore: 10 },
  { id: 'TF-10450', did: 'did:trustforge:1a4b8d3c...', controller: 'Dao Li', method: 'did:ion', keyType: 'P-384', credentials: 5, status: 'Active', lastSeen: '4h ago', created: '2026-05-18', complianceScore: 91 },
  { id: 'TF-10448', did: 'did:trustforge:8d3c6f2a...', controller: 'Jamie Osei', method: 'did:key', keyType: 'Ed25519', credentials: 6, status: 'Active', lastSeen: '1d ago', created: '2026-04-02', complianceScore: 88 },
  { id: 'TF-10440', did: 'did:trustforge:6f2a9c5d...', controller: 'Sys Validator', method: 'did:web', keyType: 'P-256', credentials: 0, status: 'Pending', lastSeen: '2d ago', created: '2026-09-10', complianceScore: 60 },
]

export default function IdentityManagement() {
  const navigate = useNavigate()
  const [identitiesList, setIdentitiesList] = useState(defaultIdentities)
  const [stats, setStats] = useState({ total: '14,892', active: '14,210', pending: '482', revoked: '200' })
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6
  const [formData, setFormData] = useState({
    controllerName: '',
    method: 'did:key',
    keyAlgorithm: 'Ed25519',
    services: '',
  })

  const loadIdentities = async () => {
    setLoading(true)
    try {
      const res = await getIdentities({ status: filter, search })
      if (res?.identities?.length) {
        setIdentitiesList(res.identities)
      }
      if (res?.stats) {
        setStats({
          total: res.stats.total?.toLocaleString() || '14,892',
          active: res.stats.active?.toLocaleString() || '14,210',
          pending: res.stats.pending?.toLocaleString() || '482',
          revoked: res.stats.revoked?.toLocaleString() || '200',
        })
      }
    } catch {
      // Keep current state on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIdentities()
    setCurrentPage(1)
  }, [filter, search])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.controllerName) return
    setCreating(true)
    try {
      await createIdentity(formData)
      setShowCreateModal(false)
      setFormData({ controllerName: '', method: 'did:key', keyAlgorithm: 'Ed25519', services: '' })
      loadIdentities()
    } catch (err) {
      alert(err.message || 'Failed to create identity')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id, e) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to revoke identity ${id}?`)) return
    try {
      await revokeIdentity(id)
      loadIdentities()
    } catch (err) {
      alert(err.message || 'Failed to revoke identity')
    }
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Controller', 'DID', 'Method', 'Key Type', 'Credentials', 'Compliance Score', 'Status', 'Last Active']
    const rows = filtered.map(item => [
      item.id,
      `"${item.controller}"`,
      item.did,
      item.method,
      item.keyType,
      item.credentials,
      `${item.complianceScore}%`,
      item.status,
      item.lastSeen
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `trustforge_dids_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filtered = identitiesList.filter(id => {
    const matchStatus = filter === 'ALL' || id.status.toUpperCase() === filter
    const matchSearch = search === '' || 
      id.id.toLowerCase().includes(search.toLowerCase()) ||
      id.controller.toLowerCase().includes(search.toLowerCase()) ||
      id.did.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedList = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="px-gutter-lg py-6 flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm mb-1">
            <span>Console</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">Identity Management</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Identity Management & DID Registry</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            W3C Compliant Decentralized Identifiers — Lifecycle, Key Rotation, Credential Issuance
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors shadow-sm font-label-md text-label-md"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">file_download</span>
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors shadow-sm font-label-md text-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create DID</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
        {[
          { label: 'Total DIDs', value: stats.total, icon: 'badge', color: 'text-primary' },
          { label: 'Active', value: stats.active, icon: 'check_circle', color: 'text-emerald-700' },
          { label: 'Pending', value: stats.pending, icon: 'pending', color: 'text-amber-600' },
          { label: 'Revoked', value: stats.revoked, icon: 'cancel', color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex items-center gap-3">
            <span className={`material-symbols-outlined text-[24px] ${s.color}`}>{s.icon}</span>
            <div>
              <div className="font-headline-md text-headline-md text-on-surface font-bold">{s.value}</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low/30 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">badge</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">DID Registry</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-on-surface-variant">
              <span className="material-symbols-outlined text-[15px]">search</span>
              <input
                className="bg-transparent text-body-sm font-body-sm text-on-surface outline-none placeholder:text-outline w-44"
                placeholder="Search DID, controller..."
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="appearance-none font-label-sm text-label-sm bg-surface-container-lowest text-on-surface px-2.5 py-1.5 pr-7 rounded-lg shadow-sm border border-outline-variant/40 focus:outline-none cursor-pointer"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-2.5 px-space-md font-semibold">ID</th>
                <th className="py-2.5 px-space-md font-semibold">DID / Controller</th>
                <th className="py-2.5 px-space-md font-semibold">Method</th>
                <th className="py-2.5 px-space-md font-semibold">Key Type</th>
                <th className="py-2.5 px-space-md font-semibold">Credentials</th>
                <th className="py-2.5 px-space-md font-semibold">Compliance</th>
                <th className="py-2.5 px-space-md font-semibold">Last Active</th>
                <th className="py-2.5 px-space-md font-semibold text-right">Status</th>
                <th className="py-2.5 px-space-md font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-on-surface divide-y divide-outline-variant/20">
              {paginatedList.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                  onClick={() => navigate(`/identity-management/${row.id}`)}
                >
                  <td className="py-2.5 px-space-md">
                    <span className="font-code-xs text-code-xs font-semibold text-primary">{row.id}</span>
                  </td>
                  <td className="py-2.5 px-space-md">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-on-surface">{row.controller}</span>
                      <span className="font-code-xs text-code-xs text-on-surface-variant">{row.did}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-space-md">
                    <span className="font-code-xs text-code-xs px-2 py-0.5 rounded bg-surface-container-high text-secondary">{row.method}</span>
                  </td>
                  <td className="py-2.5 px-space-md font-code-xs text-code-xs text-on-surface-variant">{row.keyType}</td>
                  <td className="py-2.5 px-space-md">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">workspace_premium</span>
                      <span className="font-medium">{row.credentials}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-space-md">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.complianceScore >= 90 ? 'bg-emerald-600' : row.complianceScore >= 60 ? 'bg-amber-500' : 'bg-red-600'}`}
                          style={{ width: `${row.complianceScore}%` }}
                        />
                      </div>
                      <span className="font-code-xs text-code-xs text-on-surface-variant">{row.complianceScore}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-space-md font-body-sm text-body-sm text-on-surface-variant">{row.lastSeen}</td>
                  <td className="py-2.5 px-space-md text-right">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-2.5 px-space-md text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/identity-management/${row.id}`)} className="p-1 text-outline hover:text-primary hover:bg-surface-container-high rounded transition-colors" title="View">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </button>
                      <button onClick={(e) => handleRevoke(row.id, e)} className="p-1 text-outline hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Revoke">
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-space-md py-3 border-t border-outline-variant/20 flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Showing {paginatedList.length} of {filtered.length} identities (Page {currentPage} of {totalPages})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-sm text-label-sm disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-2.5 py-1 rounded font-label-sm text-label-sm transition-colors ${
                  currentPage === pageNum
                    ? 'bg-primary-container text-on-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-sm text-label-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create DID Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/40 w-full max-w-lg mx-4">
            <div className="p-6 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface-container-high text-primary">
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">Create Decentralized Identity</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Issue a new W3C-compliant DID on Sepolia</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
                </button>
              </div>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1.5">Controller Name <span className="text-error">*</span></label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-outline"
                    placeholder="e.g. Saurabh Kumar"
                    type="text"
                    required
                    value={formData.controllerName}
                    onChange={e => setFormData({ ...formData, controllerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1.5">DID Method <span className="text-error">*</span></label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    value={formData.method}
                    onChange={e => setFormData({ ...formData, method: e.target.value })}
                  >
                    <option>did:key</option>
                    <option>did:ion</option>
                    <option>did:web</option>
                    <option>did:ethr</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1.5">Key Algorithm <span className="text-error">*</span></label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    value={formData.keyAlgorithm}
                    onChange={e => setFormData({ ...formData, keyAlgorithm: e.target.value })}
                  >
                    <option>Ed25519</option>
                    <option>secp256k1</option>
                    <option>P-256</option>
                    <option>P-384</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1.5">Services (optional)</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary placeholder:text-outline"
                    placeholder="e.g. https://example.com/vc"
                    type="text"
                    value={formData.services}
                    onChange={e => setFormData({ ...formData, services: e.target.value })}
                  />
                </div>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-space-sm">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors shadow-sm font-label-md text-label-md disabled:opacity-50">
                  <span className="material-symbols-outlined text-[16px]">{creating ? 'hourglass_top' : 'add'}</span>
                  <span>{creating ? 'Creating...' : 'Create Identity'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
