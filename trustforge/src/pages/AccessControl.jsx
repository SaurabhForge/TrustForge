import { useState, useEffect } from 'react'
import StatusBadge from '../components/StatusBadge'
import { getRoles, createRole, signQuorum, rejectQuorum } from '../services/api'

const defaultRoles = [
  { name: 'Super Admin', members: 2, permissions: ['all'], status: 'Active', color: 'bg-red-100 text-red-800' },
  { name: 'Security Admin', members: 5, permissions: ['did:create', 'did:revoke', 'vc:issue', 'policy:manage', 'audit:view'], status: 'Active', color: 'bg-primary/10 text-primary' },
  { name: 'Auditor', members: 8, permissions: ['audit:view', 'did:view', 'vc:view'], status: 'Active', color: 'bg-secondary/10 text-secondary' },
  { name: 'Developer', members: 12, permissions: ['did:view', 'vc:view', 'api:access'], status: 'Active', color: 'bg-emerald-100 text-emerald-800' },
  { name: 'Verifier', members: 20, permissions: ['vc:verify', 'did:view'], status: 'Active', color: 'bg-amber-100 text-amber-800' },
  { name: 'Read-Only', members: 34, permissions: ['did:view', 'vc:view', 'audit:view'], status: 'Active', color: 'bg-surface-container-high text-on-surface-variant' },
]

const defaultQuorum = [
  { id: 'QR-007', action: 'Revoke Identity TF-10440', threshold: '2/3', signed: 1, requestor: 'Admin', expires: '3h 22m', urgency: 'high' },
  { id: 'QR-006', action: 'Update Policy-008 Permissions', threshold: '3/5', signed: 2, requestor: 'Security Admin', expires: '11h 05m', urgency: 'medium' },
  { id: 'QR-005', action: 'Issue SOC2 Batch VC (x42)', threshold: '2/3', signed: 0, requestor: 'Auditor', expires: '22h 40m', urgency: 'low' },
]

const permissionMatrix = [
  { resource: 'DID Registry', actions: ['view', 'create', 'update', 'revoke', 'delete'] },
  { resource: 'Verifiable Credentials', actions: ['view', 'issue', 'verify', 'revoke'] },
  { resource: 'Policy Management', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'Audit Trail', actions: ['view', 'export'] },
  { resource: 'API Keys', actions: ['view', 'create', 'revoke'] },
  { resource: 'System Settings', actions: ['view', 'update'] },
]

const accessMatrix = {
  'Super Admin': { 'DID Registry': ['view', 'create', 'update', 'revoke', 'delete'], 'Verifiable Credentials': ['view', 'issue', 'verify', 'revoke'], 'Policy Management': ['view', 'create', 'update', 'delete'], 'Audit Trail': ['view', 'export'], 'API Keys': ['view', 'create', 'revoke'], 'System Settings': ['view', 'update'] },
  'Security Admin': { 'DID Registry': ['view', 'create', 'revoke'], 'Verifiable Credentials': ['view', 'issue', 'verify', 'revoke'], 'Policy Management': ['view', 'create', 'update'], 'Audit Trail': ['view', 'export'], 'API Keys': ['view'], 'System Settings': ['view'] },
  'Auditor': { 'DID Registry': ['view'], 'Verifiable Credentials': ['view', 'verify'], 'Policy Management': ['view'], 'Audit Trail': ['view', 'export'], 'API Keys': [], 'System Settings': ['view'] },
  'Developer': { 'DID Registry': ['view'], 'Verifiable Credentials': ['view', 'verify'], 'Policy Management': ['view'], 'Audit Trail': ['view'], 'API Keys': ['view', 'create'], 'System Settings': [] },
  'Verifier': { 'DID Registry': ['view'], 'Verifiable Credentials': ['view', 'verify'], 'Policy Management': [], 'Audit Trail': [], 'API Keys': [], 'System Settings': [] },
  'Read-Only': { 'DID Registry': ['view'], 'Verifiable Credentials': ['view'], 'Policy Management': ['view'], 'Audit Trail': ['view'], 'API Keys': [], 'System Settings': [] },
}

export default function AccessControl() {
  const [roleList, setRoleList] = useState(defaultRoles)
  const [quorumList, setQuorumList] = useState(defaultQuorum)
  const [selectedRole, setSelectedRole] = useState('Security Admin')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [customAccessMatrix, setCustomAccessMatrix] = useState(accessMatrix)
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    color: 'bg-primary/10 text-primary',
    resources: ['DID Registry', 'Verifiable Credentials'],
  })

  const loadData = () => {
    getRoles()
      .then((res) => {
        if (res?.roles?.length) setRoleList(res.roles)
        if (res?.quorumRequests?.length) setQuorumList(res.quorumRequests)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateRole = async (e) => {
    e.preventDefault()
    if (!newRoleForm.name.trim()) return
    setCreating(true)
    try {
      const perms = newRoleForm.resources.map(r => r.toUpperCase().replace(/\s+/g, '_'))
      await createRole({
        name: newRoleForm.name.trim(),
        displayName: newRoleForm.name.trim(),
        color: newRoleForm.color,
        permissions: perms,
      })
      const newRoleObj = {
        name: newRoleForm.name.trim(),
        members: 1,
        permissions: perms,
        status: 'Active',
        color: newRoleForm.color,
      }
      setRoleList([newRoleObj, ...roleList])
      setSelectedRole(newRoleObj.name)
      // Populate default matrix
      setCustomAccessMatrix(prev => ({
        ...prev,
        [newRoleObj.name]: {
          'DID Registry': newRoleForm.resources.includes('DID Registry') ? ['view', 'create'] : [],
          'Verifiable Credentials': newRoleForm.resources.includes('Verifiable Credentials') ? ['view', 'issue'] : [],
          'Policy Management': newRoleForm.resources.includes('Policy Management') ? ['view', 'create'] : [],
          'Audit Trail': ['view'],
          'API Keys': ['view'],
          'System Settings': [],
        }
      }))
      setShowCreateModal(false)
      setNewRoleForm({ name: '', color: 'bg-primary/10 text-primary', resources: ['DID Registry', 'Verifiable Credentials'] })
      alert(`Role "${newRoleObj.name}" created successfully!`)
    } catch (err) {
      alert(err.message || 'Failed to create role')
    } finally {
      setCreating(false)
    }
  }

  const handleSign = async (id) => {
    try {
      await signQuorum(id)
      setQuorumList(prev => prev.map(q => {
        if (q.id === id) {
          const updated = (q.signed || 0) + 1
          return { ...q, signed: updated }
        }
        return q
      }))
      alert(`Quorum request ${id} signed successfully!`)
    } catch (err) {
      alert(err.message || 'Failed to sign quorum request')
    }
  }

  const handleReject = async (id) => {
    if (!confirm(`Are you sure you want to reject quorum request ${id}?`)) return
    try {
      await rejectQuorum(id)
      setQuorumList(prev => prev.filter(q => q.id !== id))
      alert(`Quorum request ${id} rejected.`)
    } catch (err) {
      alert(err.message || 'Failed to reject quorum request')
    }
  }

  const togglePermission = (resource, action) => {
    if (!isEditing) return
    setCustomAccessMatrix(prev => {
      const currentRoleObj = prev[selectedRole] || {}
      const currentActions = currentRoleObj[resource] || []
      const exists = currentActions.includes(action)
      const updated = exists ? currentActions.filter(a => a !== action) : [...currentActions, action]
      return {
        ...prev,
        [selectedRole]: {
          ...currentRoleObj,
          [resource]: updated,
        }
      }
    })
  }

  return (
    <div className="px-gutter-lg py-6 flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm mb-1">
            <span>Console</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">Access Control</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Role-Based Access Control & Permission Matrix</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Fine-grained RBAC policies, multi-sig quorum thresholds, and zero-trust enforcement
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors shadow-sm font-label-md text-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Role
          </button>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-md">
        {roleList.map(role => (
          <button
            key={role.name}
            onClick={() => setSelectedRole(role.name)}
            className={`bg-surface-container-lowest rounded-lg p-space-md shadow-sm text-left transition-all ${selectedRole === role.name ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${role.color}`}>{role.name}</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{role.members}</span>
            </div>
            <div className="font-body-sm text-body-sm text-on-surface-variant">members</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(role.permissions || []).slice(0, 2).map(p => (
                <span key={p} className="font-code-xs text-[10px] px-1 py-0.5 rounded bg-surface-container-high text-secondary">{p}</span>
              ))}
              {(role.permissions || []).length > 2 && (
                <span className="font-code-xs text-[10px] px-1 py-0.5 rounded bg-surface-container text-outline">+{(role.permissions || []).length - 2}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
        <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">grid_on</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Permission Matrix</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-label-sm bg-primary/10 text-primary font-medium">{selectedRole}</span>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-label-sm text-label-sm transition-colors ${isEditing ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container-low hover:bg-surface-container text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[15px]">{isEditing ? 'check' : 'edit'}</span>
            <span>{isEditing ? 'Done Editing' : 'Edit Permissions'}</span>
          </button>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-2.5 px-space-md font-semibold w-48">Resource</th>
                {['View', 'Create', 'Update', 'Revoke/Delete', 'Export/Issue'].map(action => (
                  <th key={action} className="py-2.5 px-space-md font-semibold text-center">{action}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {permissionMatrix.map(({ resource, actions }) => {
                const granted = customAccessMatrix[selectedRole]?.[resource] || []
                return (
                  <tr key={resource} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-space-md font-medium text-on-surface text-body-md">{resource}</td>
                    {['view', 'create', 'update', 'revoke', 'export'].map(action => {
                      const has = granted.some(g => g === action || (action === 'export' && (g === 'export' || g === 'issue')) || (action === 'revoke' && (g === 'revoke' || g === 'delete')))
                      return (
                        <td
                          key={action}
                          className={`py-3 px-space-md text-center ${isEditing ? 'cursor-pointer hover:bg-surface-container-high/50' : ''}`}
                          onClick={() => togglePermission(resource, action)}
                        >
                          {has ? (
                            <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[18px] text-outline-variant">remove_circle_outline</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Sig Quorum Panel */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
        <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-amber-600">how_to_reg</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Multi-Sig Quorum Requests</span>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-label-sm font-semibold">{quorumList.length} Requests</span>
        </div>
        <div className="flex flex-col divide-y divide-outline-variant/20">
          {quorumList.map(q => (
            <div key={q.id} className="px-space-md py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`p-1.5 rounded ${q.urgency === 'high' ? 'bg-red-50 text-red-600' : q.urgency === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-surface-container text-outline'}`}>
                  <span className="material-symbols-outlined text-[16px]">how_to_vote</span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-code-xs text-code-xs text-secondary font-semibold">{q.id}</span>
                    <span className="font-medium text-on-surface text-body-md">{q.action}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-on-surface-variant font-body-sm text-body-sm">
                    <span>Requestor: {q.requestor}</span>
                    <span>Threshold: {q.threshold}</span>
                    <span className="font-semibold text-primary">Signed: {q.signed}</span>
                    <span className={q.urgency === 'high' ? 'text-red-600 font-medium' : ''}>Expires: {q.expires}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleSign(q.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-sm text-label-sm shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">how_to_reg</span>
                  Sign
                </button>
                <button
                  onClick={() => handleReject(q.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-red-200 text-red-700 hover:bg-red-50 transition-colors font-label-sm text-label-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">cancel</span>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/40 w-full max-w-md mx-4">
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">admin_panel_settings</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Create New Role</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateRole}>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Risk Officer"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    value={newRoleForm.name}
                    onChange={e => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">Badge Color</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    value={newRoleForm.color}
                    onChange={e => setNewRoleForm({ ...newRoleForm, color: e.target.value })}
                  >
                    <option value="bg-primary/10 text-primary">Blue (Primary)</option>
                    <option value="bg-emerald-100 text-emerald-800">Green (Success)</option>
                    <option value="bg-amber-100 text-amber-800">Amber (Warning)</option>
                    <option value="bg-red-100 text-red-800">Red (Admin)</option>
                    <option value="bg-secondary/10 text-secondary">Slate (Auditor)</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-2">Resource Access</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['DID Registry', 'Verifiable Credentials', 'Policy Management', 'Audit Trail', 'API Keys', 'System Settings'].map(res => (
                      <label key={res} className="flex items-center gap-2 font-body-sm text-body-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRoleForm.resources.includes(res)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewRoleForm({ ...newRoleForm, resources: [...newRoleForm.resources, res] })
                            } else {
                              setNewRoleForm({ ...newRoleForm, resources: newRoleForm.resources.filter(r => r !== res) })
                            }
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>{res}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md shadow-sm disabled:opacity-50"
                >
                  <span>{creating ? 'Creating...' : 'Create Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
