import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSystemHealth, downloadSystemBackup, restoreSystemBackup } from '../services/api'
import { getStoredUser, getStoredAvatar, updateUserProfile } from '../services/auth'

export default function Settings() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'profile')
  const [toastMessage, setToastMessage] = useState(null)
  const fileInputRef = useRef(null)
  const profilePhotoInputRef = useRef(null)

  // Account Profile State
  const [userProfile, setUserProfile] = useState(() => {
    return getStoredUser() || {
      name: 'Saurabh Kumar',
      email: 'sk1300374@gmail.com',
      role: 'Super Admin',
      avatar: '/admin-avatar.png',
      did: 'did:trustforge:9a2f3b1c8e21a4',
      tfId: 'TF-10482',
    }
  })
  const [profileAvatar, setProfileAvatar] = useState(() => {
    return getStoredAvatar() || userProfile.avatar || '/admin-avatar.png'
  })

  // System Health & Backup State
  const [healthData, setHealthData] = useState(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)

  // General Settings State
  const [orgName, setOrgName] = useState('CommBank Identity Division')
  const [domain, setDomain] = useState('did.trustforge.enterprise.commbank.com')
  const [didMethod, setDidMethod] = useState('did:ion')
  const [autoAttest, setAutoAttest] = useState(true)
  const [zkProofCaching, setZkProofCaching] = useState(true)

  // Network Settings State
  const [primaryRpc, setPrimaryRpc] = useState('https://sepolia.infura.io/v3/YOUR_KEY')
  const [fallbackRpc, setFallbackRpc] = useState('https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY')
  const [chainId, setChainId] = useState('11155111')
  const [maxGasPrice, setMaxGasPrice] = useState('50')

  // Security Policy State
  const [sessionTimeout, setSessionTimeout] = useState('30')
  const [multiSigGraceHours, setMultiSigGraceHours] = useState('24')
  const [enforceHsm, setEnforceHsm] = useState(true)
  const [zkStrictVerification, setZkStrictVerification] = useState(true)

  // Notifications State
  const [notifyCriticalIncidents, setNotifyCriticalIncidents] = useState(true)
  const [notifyQuorumRequests, setNotifyQuorumRequests] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('https://siem.internal.commbank.com/v1/trustforge-events')

  // API Keys State
  const [copiedKeyId, setCopiedKeyId] = useState(null)
  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: 'Production API Key', key: 'tf_pk_live_9a2f3b1c7e4a89bc2130', created: '2026-08-01', lastUsed: '2m ago', permissions: ['did:read', 'vc:verify'], status: 'Active' },
    { id: 2, name: 'CI/CD Pipeline Key', key: 'tf_pk_ci_3b1c7e4a2d8f12ee7741', created: '2026-07-15', lastUsed: '1h ago', permissions: ['did:read'], status: 'Active' },
    { id: 3, name: 'Legacy Staging Key', key: 'tf_pk_stg_7e4a2d8f5c9e33bb5509', created: '2026-03-01', lastUsed: '30d ago', permissions: ['did:read', 'did:write'], status: 'Revoked' },
  ])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleCopyKey = (id, keyText) => {
    navigator.clipboard?.writeText?.(keyText)
    setCopiedKeyId(id)
    showToast('API key copied to clipboard!')
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  const handleRevokeKey = (id) => {
    setApiKeys(keys => keys.map(k => k.id === id ? { ...k, status: 'Revoked' } : k))
    showToast('API key revoked successfully.')
  }

  const handleGenerateKey = () => {
    const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const newKey = {
      id: Date.now(),
      name: `API Key #${apiKeys.length + 1}`,
      key: `tf_pk_live_${randomHex}`,
      created: new Date().toISOString().slice(0, 10),
      lastUsed: 'Just now',
      permissions: ['did:read', 'vc:verify'],
      status: 'Active',
    }
    setApiKeys(prev => [newKey, ...prev])
    showToast('New enterprise API key generated!')
  }

  const loadHealth = async () => {
    setLoadingHealth(true)
    try {
      const data = await getSystemHealth()
      if (data) setHealthData(data)
    } catch {
      // fallback
    } finally {
      setLoadingHealth(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'system') {
      loadHealth()
    }
  }, [activeTab])

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true)
    try {
      await downloadSystemBackup()
      showToast('System snapshot downloaded successfully!')
    } catch {
      showToast('Failed to download backup.')
    } finally {
      setDownloadingBackup(false)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Are you sure you want to restore the platform state from this backup file? Existing data will be overwritten.')) {
      e.target.value = ''
      return
    }
    setRestoringBackup(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      await restoreSystemBackup(json.data ? json : { data: json })
      showToast('Platform state restored successfully!')
      loadHealth()
    } catch {
      showToast('Error restoring backup. Ensure file is valid JSON.')
    } finally {
      setRestoringBackup(false)
      e.target.value = ''
    }
  }

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Selected image exceeds 5MB limit.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result
      setProfileAvatar(b64)
      setUserProfile(prev => ({ ...prev, avatar: b64 }))
      updateUserProfile({ avatar: b64 })
      showToast('Profile photo updated successfully!')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleResetProfilePhoto = () => {
    const isSaurabh = (userProfile.name && userProfile.name.toLowerCase().includes('saurabh')) || userProfile.email === 'sk1300374@gmail.com'
    const def = isSaurabh ? '/admin-avatar.png' : '/default-avatar.svg'
    setProfileAvatar(def)
    setUserProfile(prev => ({ ...prev, avatar: def }))
    updateUserProfile({ avatar: def })
    showToast('Profile photo reset to default.')
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    updateUserProfile({
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role,
    })
    showToast('User profile updated successfully!')
  }

  const tabs = [
    { key: 'profile', label: 'Account & Profile', icon: 'account_circle' },
    { key: 'general', label: 'General', icon: 'settings' },
    { key: 'network', label: 'Network & RPC', icon: 'dns' },
    { key: 'security', label: 'Security Policy', icon: 'shield' },
    { key: 'api', label: 'API Keys', icon: 'key' },
    { key: 'notifications', label: 'Notifications', icon: 'notifications' },
    { key: 'system', label: 'Health & Backup', icon: 'cloud_sync' },
  ]

  return (
    <div className="px-gutter-lg py-6 flex flex-col gap-space-lg">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 bg-primary text-on-primary px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-fade-in font-label-md text-label-md">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm mb-1">
          <span>Console</span>
          <span className="text-outline-variant">/</span>
          <span className="text-primary font-semibold">Settings</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Platform Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
          Configure network nodes, security policies, API access, and notification rules.
        </p>
      </div>

      <div className="flex gap-space-lg">
        {/* Sidebar Tabs */}
        <div className="w-48 shrink-0">
          <nav className="flex flex-col gap-0.5">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-space-sm px-space-sm py-2 rounded-lg transition-colors text-left ${
                  activeTab === tab.key
                    ? 'bg-surface-container-high text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span className="font-label-md text-label-md">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
              <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">account_circle</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface">Account & Profile Settings</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {userProfile.role || 'Super Admin'}
                </span>
              </div>

              <div className="p-space-md flex flex-col gap-6">
                {/* Photo Upload Box */}
                <div className="p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/40 flex flex-col sm:flex-row items-center gap-5">
                  <div
                    className="relative group cursor-pointer shrink-0"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    title="Click to upload profile photo"
                  >
                    <img
                      src={profileAvatar}
                      alt={userProfile.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary/50 shadow-md group-hover:opacity-75 transition-opacity"
                      onError={(e) => { e.currentTarget.src = '/admin-avatar.png'; }}
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-[20px]">photo_camera</span>
                      <span className="text-[9px] text-white font-medium">Change</span>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={profilePhotoInputRef}
                    onChange={handleProfilePhotoChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="font-semibold text-sm text-on-surface">{userProfile.name}</h4>
                    <p className="text-xs text-outline mt-0.5">Upload a customized profile photo (PNG, JPG, SVG, WebP up to 5MB).</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => profilePhotoInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[15px]">upload</span>
                        <span>Upload New Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetProfilePhoto}
                        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                        <span>Reset to Default</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface font-medium">Full Name</label>
                      <input
                        type="text"
                        value={userProfile.name || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface font-medium">Email Address</label>
                      <input
                        type="email"
                        value={userProfile.email || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface font-medium">Assigned Role</label>
                      <select
                        value={userProfile.role || 'Super Admin'}
                        onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="Super Admin">Super Admin</option>
                        <option value="Compliance Auditor">Compliance Auditor</option>
                        <option value="Security Admin">Security Admin</option>
                        <option value="Smart Contract Developer">Smart Contract Developer</option>
                        <option value="Enterprise Employee">Enterprise Employee</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface font-medium">Decentralized Identifier (DID)</label>
                      <input
                        type="text"
                        readOnly
                        value={userProfile.did || 'did:trustforge:9a2f3b1c8e21a4'}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-low text-outline font-mono text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
              <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">settings</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">General Settings</span>
              </div>
              <div className="p-space-md flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface">Organization Name</label>
                  <input
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface">Platform Domain</label>
                  <input
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-code-sm text-code-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface">Default DID Method</label>
                  <select
                    value={didMethod}
                    onChange={e => setDidMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                  >
                    <option>did:ion</option>
                    <option>did:key</option>
                    <option>did:web</option>
                    <option>did:ethr</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-outline-variant/20">
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">Auto-Attestation</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Automatically attest identity states every epoch</div>
                  </div>
                  <button
                    onClick={() => setAutoAttest(prev => !prev)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${autoAttest ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoAttest ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-outline-variant/20">
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">ZK-STARK Proof Caching</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Cache verified proofs for 24h to reduce latency</div>
                  </div>
                  <button
                    onClick={() => setZkProofCaching(prev => !prev)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${zkProofCaching ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${zkProofCaching ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => showToast('General settings saved successfully!')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-md text-label-md shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
              <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">dns</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Network & RPC Configuration</span>
              </div>
              <div className="p-space-md flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface">Primary RPC Endpoint</label>
                  <input
                    value={primaryRpc}
                    onChange={e => setPrimaryRpc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-code-sm text-code-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface">Fallback RPC Endpoint</label>
                  <input
                    value={fallbackRpc}
                    onChange={e => setFallbackRpc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-code-sm text-code-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-label-sm text-on-surface">Chain ID</label>
                    <input
                      value={chainId}
                      onChange={e => setChainId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-code-sm text-code-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-label-sm text-on-surface">Max Gas Price (Gwei)</label>
                    <input
                      value={maxGasPrice}
                      onChange={e => setMaxGasPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-code-sm text-code-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => showToast('Network configuration saved successfully!')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-md text-label-md shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Network Config
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
              <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Enterprise Security Policies</span>
              </div>
              <div className="p-space-md flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-label-sm text-on-surface">Console Session Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={sessionTimeout}
                      onChange={e => setSessionTimeout(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-label-sm text-on-surface">Multi-Sig Expiration Window (Hours)</label>
                    <input
                      type="number"
                      value={multiSigGraceHours}
                      onChange={e => setMultiSigGraceHours(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-outline-variant/20">
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">Hardware Key Enforcement (YubiKey / HSM)</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Disallow soft browser keys for DID controllers</div>
                  </div>
                  <button
                    onClick={() => setEnforceHsm(prev => !prev)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${enforceHsm ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enforceHsm ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-outline-variant/20">
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">Strict ZK-SNARK Verification Enforcement</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Require on-chain verifier contract execution for all claims</div>
                  </div>
                  <button
                    onClick={() => setZkStrictVerification(prev => !prev)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${zkStrictVerification ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${zkStrictVerification ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => showToast('Security policies successfully updated!')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-md text-label-md shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Security Policies
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
              <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">key</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface">API Keys</span>
                </div>
                <button
                  onClick={handleGenerateKey}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-sm text-label-sm shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Generate Key
                </button>
              </div>
              <div className="flex flex-col divide-y divide-outline-variant/20">
                {apiKeys.map(apiKey => (
                  <div key={apiKey.id} className="px-space-md py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-on-surface text-body-md">{apiKey.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${apiKey.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{apiKey.status}</span>
                      </div>
                      <span className="font-code-xs text-code-xs text-secondary">{apiKey.key}</span>
                      <div className="flex items-center gap-3 mt-1 text-on-surface-variant font-body-sm text-body-sm">
                        <span>Created: {apiKey.created}</span>
                        <span>Last used: {apiKey.lastUsed}</span>
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {apiKey.permissions.map(p => (
                          <span key={p} className="font-code-xs text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-secondary">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopyKey(apiKey.id, apiKey.key)}
                        title="Copy Key"
                        className="p-1.5 text-outline hover:text-primary hover:bg-surface-container-high rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedKeyId === apiKey.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      {apiKey.status === 'Active' && (
                        <button
                          onClick={() => handleRevokeKey(apiKey.id)}
                          title="Revoke Key"
                          className="p-1.5 text-outline hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
              <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">notifications</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Notification Rules & SIEM Integrations</span>
              </div>
              <div className="p-space-md flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface">SIEM Webhook URL</label>
                  <input
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-code-sm text-code-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-t border-outline-variant/20">
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">Critical Incident Broadcasts</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Send immediate alert emails & SMS when critical incidents are detected</div>
                  </div>
                  <button
                    onClick={() => setNotifyCriticalIncidents(prev => !prev)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notifyCriticalIncidents ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyCriticalIncidents ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-outline-variant/20">
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">Multi-Sig Signature Requests</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Notify designated signers when pending quorums require approvals</div>
                  </div>
                  <button
                    onClick={() => setNotifyQuorumRequests(prev => !prev)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notifyQuorumRequests ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyQuorumRequests ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => showToast('Notification rules saved successfully!')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-md text-label-md shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Notification Rules
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="flex flex-col gap-6">
              {/* System Health Card */}
              <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden border border-outline-variant/30">
                <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">monitor_heart</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface">Platform Health & Telemetry</span>
                  </div>
                  <button
                    onClick={loadHealth}
                    disabled={loadingHealth}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${loadingHealth ? 'animate-spin' : ''}`}>refresh</span>
                    <span>{loadingHealth ? 'Polling...' : 'Refresh Metrics'}</span>
                  </button>
                </div>
                <div className="p-space-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/20 flex flex-col justify-between">
                    <span className="text-xs text-on-surface-variant font-medium">Service Status</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span className="font-bold text-on-surface text-base">{healthData?.status || 'HEALTHY'}</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-mono mt-1">100% Operational</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/20 flex flex-col justify-between">
                    <span className="text-xs text-on-surface-variant font-medium">Process Uptime</span>
                    <span className="font-bold text-on-surface text-base mt-2 font-mono">{healthData?.uptime?.formatted || '1h 12m'}</span>
                    <span className="text-[11px] text-on-surface-variant mt-1">Node {healthData?.process?.nodeVersion || 'v20+'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/20 flex flex-col justify-between">
                    <span className="text-xs text-on-surface-variant font-medium">Memory (RSS / Heap)</span>
                    <span className="font-bold text-on-surface text-base mt-2 font-mono">
                      {healthData?.memory?.rssMb ? `${healthData.memory.rssMb} MB` : '42.5 MB'}
                    </span>
                    <span className="text-[11px] text-on-surface-variant mt-1">Heap: {healthData?.memory?.heapUsedMb || '24.1'} MB</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/20 flex flex-col justify-between">
                    <span className="text-xs text-on-surface-variant font-medium">Blockchain Anchor</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="material-symbols-outlined text-secondary text-[16px]">token</span>
                      <span className="font-bold text-on-surface text-sm truncate">Hardhat EVM (31337)</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-mono mt-1">Gas: {healthData?.blockchain?.gasPrice || '1.0 Gwei'}</span>
                  </div>
                </div>
              </div>

              {/* Backup & Disaster Recovery Card */}
              <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden border border-outline-variant/30">
                <div className="px-space-md py-3 bg-surface-container-low/30 border-b border-outline-variant/20 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">cloud_sync</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface">Cryptographic Backup & State Recovery</span>
                </div>
                <div className="p-space-md flex flex-col gap-4">
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Generate an immutable, SHA-256 cryptographically verified snapshot of the entire TrustForge platform state.
                    This backup contains all Decentralized Identifiers (DIDs), ERC-721 token bindings, verifiable credentials, role-based access rules, quorum proposals, and immutable Merkle audit records.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={handleDownloadBackup}
                      disabled={downloadingBackup}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${downloadingBackup ? 'animate-spin' : ''}`}>download</span>
                      <span>{downloadingBackup ? 'Generating Snapshot...' : 'Download Full Backup (.json)'}</span>
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={restoringBackup}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-medium transition-colors border border-outline-variant/40 disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${restoringBackup ? 'animate-spin' : ''}`}>upload</span>
                      <span>{restoringBackup ? 'Restoring State...' : 'Restore State from Backup'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-surface-container-low/50 rounded-lg border border-outline-variant/20 flex items-start gap-2.5 mt-2">
                    <span className="material-symbols-outlined text-secondary text-sm mt-0.5">verified</span>
                    <span className="text-xs text-on-surface-variant">
                      Snapshots include SHA-256 tamper detection. Any manual modifications to the backup payload are automatically detected and rejected during restore.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
