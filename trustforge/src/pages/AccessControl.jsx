import { useState, useEffect } from 'react'
import StatusBadge from '../components/StatusBadge'
import { getRoles, createRole, signQuorum, rejectQuorum, getCedarPolicies, evaluateCedarPolicy } from '../services/api'

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

  // AWS Open-Source Cedar Policy Engine State
  const [cedarPolicies, setCedarPolicies] = useState([])
  const [rawCedar, setRawCedar] = useState('')
  const [showRawCedar, setShowRawCedar] = useState(false)
  const [cedarRole, setCedarRole] = useState('SECURITY_ADMIN')
  const [cedarStatus, setCedarStatus] = useState('ACTIVE')
  const [cedarAction, setCedarAction] = useState('rotateKey')
  const [cedarDecision, setCedarDecision] = useState(null)
  const [evaluatingCedar, setEvaluatingCedar] = useState(false)

  const loadData = () => {
    getRoles()
      .then((res) => {
        if (res?.roles?.length) setRoleList(res.roles)
        if (res?.quorumRequests?.length) setQuorumList(res.quorumRequests)
      })
      .catch(() => {})

    getCedarPolicies()
      .then((res) => {
        if (res?.policies) setCedarPolicies(res.policies)
        if (res?.rawCedar) setRawCedar(res.rawCedar)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEvaluateCedar = async () => {
    setEvaluatingCedar(true)
    try {
      const res = await evaluateCedarPolicy({
        principal: {
          role: cedarRole,
          status: cedarStatus,
          did: 'did:trustforge:demo-user-001',
        },
        action: cedarAction,
        resource: {
          type: 'Asset',
          ownerDid: 'did:trustforge:demo-user-001',
        },
      })
      setCedarDecision(res)
    } catch (err) {
      setCedarDecision({
        decision: 'ERROR',
        diagnostics: { reason: err.message || 'Evaluation failed' },
      })
    } finally {
      setEvaluatingCedar(false)
    }
  }

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

      {/* AWS Open-Source Cedar Policy Engine Panel */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden border border-outline-variant/30">
        <div className="px-space-md py-4 bg-surface-container-low/40 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">policy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">AWS Cedar Policy Engine</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-code-xs text-[11px] font-medium border border-primary/20">
                  Cedar v3.0 Spec • Hackathon Policy Engine
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Open-source policy engine with strict guardrails, formal verification, and default-deny authorization.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRawCedar(!showRawCedar)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-on-surface hover:bg-surface-container font-label-sm text-label-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            <span>{showRawCedar ? 'Hide Raw Cedar' : 'View Cedar DSL (.cedar)'}</span>
          </button>
        </div>

        {/* Raw Cedar DSL Drawer */}
        {showRawCedar && (
          <div className="p-4 bg-surface-container-lowest border-b border-outline-variant/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">cedar/trustforge.cedar</span>
              <span className="font-code-xs text-[11px] text-outline">AWS Open Source Cedar DSL</span>
            </div>
            <pre className="p-4 rounded-lg bg-surface-container-high text-on-surface font-code-xs text-[12px] overflow-x-auto border border-outline-variant/30 leading-relaxed">
              {rawCedar || `// Loading Cedar specification...`}
            </pre>
          </div>
        )}

        {/* Live Simulator & Policy Grid */}
        <div className="p-space-md grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Evaluation Tester */}
          <div className="lg:col-span-5 bg-surface-container-low/30 p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-on-surface font-medium">
              <span className="material-symbols-outlined text-[18px] text-primary">play_circle</span>
              <span>Live Policy Evaluator</span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Simulate real-time authorization queries evaluated by the backend Cedar policy evaluator.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="font-label-xs text-[11px] text-on-surface-variant block mb-1 uppercase font-semibold">Principal Role</label>
                <select
                  value={cedarRole}
                  onChange={(e) => setCedarRole(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-body-sm"
                >
                  <option value="ADMIN">ADMIN (Super Admin)</option>
                  <option value="SECURITY_ADMIN">SECURITY_ADMIN (Keys & Quorum)</option>
                  <option value="AUDITOR">AUDITOR (Read-only Audit)</option>
                  <option value="VERIFIER">VERIFIER (Cryptographic Verification)</option>
                  <option value="USER">USER (Standard Account)</option>
                </select>
              </div>

              <div>
                <label className="font-label-xs text-[11px] text-on-surface-variant block mb-1 uppercase font-semibold">Principal Identity Status</label>
                <select
                  value={cedarStatus}
                  onChange={(e) => setCedarStatus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-body-sm"
                >
                  <option value="ACTIVE">ACTIVE (Good Standing)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary Hold)</option>
                  <option value="REVOKED">REVOKED (Revoked Cryptographic DID)</option>
                </select>
              </div>

              <div>
                <label className="font-label-xs text-[11px] text-on-surface-variant block mb-1 uppercase font-semibold">Target Action</label>
                <select
                  value={cedarAction}
                  onChange={(e) => setCedarAction(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-body-sm"
                >
                  <option value="rotateKey">rotateKey (Mutating Privileged)</option>
                  <option value="signQuorum">signQuorum (Mutating Privileged)</option>
                  <option value="mintAsset">mintAsset (Mutating)</option>
                  <option value="transferAsset">transferAsset (Mutating)</option>
                  <option value="updatePolicy">updatePolicy (Privileged)</option>
                  <option value="viewSecurityDashboard">viewSecurityDashboard (Read)</option>
                  <option value="viewAuditTrail">viewAuditTrail (Read)</option>
                  <option value="verifyCredential">verifyCredential (Cryptographic)</option>
                  <option value="verifyZkProof">verifyZkProof (Cryptographic)</option>
                  <option value="readOwnIdentity">readOwnIdentity (Self Read)</option>
                  <option value="deleteSystemData">deleteSystemData (Undefined / Arbitrary)</option>
                </select>
              </div>

              <button
                onClick={handleEvaluateCedar}
                disabled={evaluatingCedar}
                className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-md text-label-md shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>{evaluatingCedar ? 'Evaluating...' : 'Evaluate Against Cedar Policies'}</span>
              </button>
            </div>

            {/* Live Result Callout */}
            {cedarDecision && (
              <div className={`mt-2 p-3.5 rounded-lg border ${cedarDecision.decision === 'ALLOW' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-label-sm text-[12px] font-semibold text-on-surface">Cedar Engine Decision:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${cedarDecision.decision === 'ALLOW' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {cedarDecision.decision}
                  </span>
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                  {cedarDecision.diagnostics?.reason}
                </p>
                {cedarDecision.determiningPolicies?.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="font-code-xs text-[10px] text-outline uppercase">Determining Policy:</span>
                    {cedarDecision.determiningPolicies.map((p) => (
                      <span key={p} className="px-1.5 py-0.5 rounded bg-surface-container-high font-code-xs text-[10px] text-primary font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Cedar Rules Specification */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface font-semibold">Active Cedar Rules (AWS Open Source)</span>
              <span className="font-code-xs text-[11px] text-outline">6 Enforced Policies</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(cedarPolicies.length > 0 ? cedarPolicies : [
                { id: 'policy-1-superadmin', type: 'permit', description: 'Super Admin has unconditional authorization across all identities and assets', principal: 'TrustForge::Role::"ADMIN"', action: '*' },
                { id: 'policy-2-security-admin', type: 'permit', description: 'Security Admins can rotate keys, update policies, and sign quorums', principal: 'TrustForge::Role::"SECURITY_ADMIN"', action: 'rotateKey, updatePolicy...' },
                { id: 'policy-3-auditor', type: 'permit', description: 'Auditors have read-only access to audit trail and integrity proofs', principal: 'TrustForge::Role::"AUDITOR"', action: 'viewAuditTrail...' },
                { id: 'policy-4-verifier', type: 'permit', description: 'Authorized Verifiers can execute cryptographic VC and ZK proofs', principal: 'TrustForge::Role::"VERIFIER"', action: 'verifyCredential, verifyZkProof...' },
                { id: 'policy-5-user-self-read', type: 'permit', description: 'Standard Users can read their own credentials and assets', principal: 'TrustForge::User', action: 'readOwnIdentity, readOwnAssets' },
                { id: 'policy-6-strict-guardrail', type: 'forbid', description: 'Strict Guardrail: Revoked/suspended identities forbidden from mutating actions', principal: 'Any', action: 'mintAsset, transferAsset, rotateKey...' },
              ]).map((pol) => (
                <div key={pol.id} className="p-3 rounded-lg bg-surface-container-low/20 border border-outline-variant/20 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-code-xs text-[11px] font-semibold text-secondary">{pol.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${pol.type === 'forbid' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {pol.type}
                    </span>
                  </div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant leading-snug">{pol.description}</p>
                  <div className="pt-1.5 border-t border-outline-variant/15 flex items-center justify-between text-[10px] text-outline font-code-xs">
                    <span>Principal: {pol.principal}</span>
                    <span>Action: {Array.isArray(pol.action) ? pol.action.join(', ') : pol.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
