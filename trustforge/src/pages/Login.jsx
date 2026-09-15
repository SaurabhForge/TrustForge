import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { siwLogin, loginAsPerson } from '../services/auth'

const LOGO_URL = '/trustforge-logo.svg'

const PRESET_PERSONAS = [
  {
    name: 'Saurabh Kumar',
    role: 'Super Admin',
    subtitle: 'Platform Creator & System Owner',
    email: 'sk1300374@gmail.com',
    avatar: '/admin-avatar.png',
    tfId: 'TF-10482',
    did: 'did:trustforge:9a2f3b1c8e21a4',
    icon: 'verified_user',
    color: 'border-primary/50 bg-primary/5',
    badgeColor: 'bg-primary/10 text-primary',
  },
  {
    name: 'Bharat Electronics Auditor',
    role: 'Chief Compliance Auditor',
    subtitle: 'Regulatory Compliance & ISO 27001',
    email: 'auditor@bel.co.in',
    avatar: '/default-avatar.svg',
    tfId: 'TF-10479',
    did: 'did:trustforge:4d9a11ef0b84c2',
    icon: 'gavel',
    color: 'border-emerald-500/30 bg-emerald-500/5',
    badgeColor: 'bg-emerald-500/10 text-emerald-700',
  },
  {
    name: 'SecOps Lead / HSM Node',
    role: 'Security Admin',
    subtitle: 'Cryptographic Key Custodian',
    email: 'secops@trustforge.io',
    avatar: '/default-avatar.svg',
    tfId: 'TF-10480',
    did: 'did:trustforge:7e2b88aa1459df',
    icon: 'shield',
    color: 'border-amber-500/30 bg-amber-500/5',
    badgeColor: 'bg-amber-500/10 text-amber-700',
  },
  {
    name: 'Smart Contract Developer',
    role: 'Quorum Signer & Dev',
    subtitle: 'Solidity & Zero-Knowledge Circuits',
    email: 'dev@trustforge.io',
    avatar: '/default-avatar.svg',
    tfId: 'TF-10481',
    did: 'did:trustforge:1a8c903ef82bc3',
    icon: 'terminal',
    color: 'border-sky-500/30 bg-sky-500/5',
    badgeColor: 'bg-sky-500/10 text-sky-700',
  },
  {
    name: 'Enterprise Employee',
    role: 'Identity Holder',
    subtitle: 'CommBank Verified Member',
    email: 'employee@commbank.com.au',
    avatar: '/default-avatar.svg',
    tfId: 'TF-10483',
    did: 'did:trustforge:33fc9a012de941',
    icon: 'badge',
    color: 'border-purple-500/30 bg-purple-500/5',
    badgeColor: 'bg-purple-500/10 text-purple-700',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const customPhotoInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('personas') // 'personas' | 'custom' | 'wallet'
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Custom User State
  const [customName, setCustomName] = useState('')
  const [customEmail, setCustomEmail] = useState('')
  const [customRole, setCustomRole] = useState('Compliance Auditor')
  const [customAvatar, setCustomAvatar] = useState(null)
  const [customAvatarPreview, setCustomAvatarPreview] = useState(null)

  // Handle Login as Pre-configured Persona
  const handlePersonaLogin = async (persona) => {
    setError('')
    setStatus(`Authenticating as ${persona.name}...`)
    try {
      await loginAsPerson({
        name: persona.name,
        email: persona.email,
        role: persona.role,
        avatar: persona.avatar,
        tfId: persona.tfId,
      })
      setStatus('Authenticated! Redirecting...')
      setTimeout(() => {
        navigate('/overview')
      }, 300)
    } catch (err) {
      setError(err.message || 'Login failed')
      setStatus('')
    }
  }

  // Handle Photo selection for Custom User
  const handleCustomPhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Selected image exceeds 5MB. Please choose a smaller image.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCustomAvatar(ev.target.result)
      setCustomAvatarPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Handle Custom User Login Submit
  const handleCustomLoginSubmit = async (e) => {
    e.preventDefault()
    if (!customName.trim()) {
      setError('Please enter your full name')
      return
    }
    setError('')
    setStatus(`Creating identity for ${customName}...`)
    try {
      await loginAsPerson({
        name: customName.trim(),
        email: customEmail.trim() || `${customName.toLowerCase().replace(/\s+/g, '.')}@trustforge.io`,
        role: customRole,
        avatar: customAvatar || '/default-avatar.svg',
      })
      setStatus('Authenticated! Redirecting...')
      setTimeout(() => {
        navigate('/overview')
      }, 300)
    } catch (err) {
      setError(err.message || 'Login failed')
      setStatus('')
    }
  }

  // MetaMask SIWE Login
  const handleMetaMaskLogin = async () => {
    setError('')
    setLoading(true)
    setStatus('Connecting...')
    try {
      await siwLogin((msg) => setStatus(msg))
      setStatus('Authenticated! Redirecting...')
      setTimeout(() => navigate('/overview'), 500)
    } catch (err) {
      setError(err.message || 'Authentication failed')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  // Quick Demo Login
  const handleDemoLogin = async () => {
    setStatus('Authenticating evaluator session...')
    try {
      await loginAsPerson({
        name: 'Hackathon Evaluator',
        email: 'evaluator@hackathon.org',
        role: 'Super Admin',
        avatar: '/admin-avatar.png',
      })
      navigate('/overview')
    } catch {
      navigate('/overview')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden py-10">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#6750A4 1px, transparent 1px), linear-gradient(90deg, #6750A4 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-2xl px-4">
        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-3 mb-2">
              <img src={LOGO_URL} alt="TrustForge" className="h-10 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-on-surface tracking-tight">TrustForge</h1>
                <p className="text-xs text-outline font-mono tracking-widest uppercase">Enterprise Identity Platform</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant text-center max-w-md mt-1">
              Decentralized Identity (W3C DID), Verifiable Credentials, Multi-Party Quorum & Hardware Security
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 bg-surface-container rounded-2xl mb-6">
            <button
              onClick={() => { setActiveTab('personas'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'personas'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">group</span>
              <span>Enterprise Personas</span>
            </button>

            <button
              onClick={() => { setActiveTab('custom'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'custom'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Custom Person</span>
            </button>

            <button
              onClick={() => { setActiveTab('wallet'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'wallet'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              <span>Web3 Wallet</span>
            </button>
          </div>

          {/* Status Alert */}
          {status && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
              <span className="material-symbols-outlined text-primary text-sm animate-spin">refresh</span>
              <span className="text-sm text-primary font-medium">{status}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2 bg-error/10 border border-error/20 rounded-xl p-3 mb-4">
              <span className="material-symbols-outlined text-error text-sm mt-0.5">error</span>
              <span className="text-sm text-error">{error}</span>
            </div>
          )}

          {/* TAB 1: PRESET ENTERPRISE PERSONAS */}
          {activeTab === 'personas' && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-outline uppercase tracking-wider mb-2">
                Select an authorized enterprise profile to enter:
              </p>

              <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {PRESET_PERSONAS.map((p) => {
                  const isSaurabh = p.name.includes('Saurabh')
                  return (
                    <div
                      key={p.name}
                      onClick={() => handlePersonaLogin(p)}
                      className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:border-primary/60 ${
                        p.color
                      } ${isSaurabh ? 'ring-1 ring-primary/40 bg-primary/[0.07]' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-surface-container shadow-sm"
                            onError={(e) => { e.currentTarget.src = '/admin-avatar.png'; }}
                          />
                          {isSaurabh && (
                            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-sm text-[10px]" title="Super Admin / Owner">
                              👑
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                              {p.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${p.badgeColor}`}>
                              {p.role}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant truncate mt-0.5">{p.subtitle}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-outline font-mono">
                            <span>{p.email}</span>
                            <span>•</span>
                            <span>{p.tfId}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="ml-3 shrink-0 px-3.5 py-1.5 rounded-xl bg-surface-container-high group-hover:bg-primary group-hover:text-on-primary text-xs font-semibold text-on-surface transition-all flex items-center gap-1 shadow-sm"
                      >
                        <span>Sign In</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM PERSON LOGIN WITH PHOTO UPLOAD */}
          {activeTab === 'custom' && (
            <form onSubmit={handleCustomLoginSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-sm font-semibold text-on-surface">Login as Any Person / Evaluator</h3>
                <p className="text-xs text-outline">Enter your details and upload your photo to test custom identity features.</p>
              </div>

              {/* Photo Upload Section */}
              <div className="flex flex-col items-center justify-center p-4 bg-surface-container/50 border border-outline-variant/40 rounded-2xl">
                <div
                  className="relative group cursor-pointer mb-2"
                  onClick={() => customPhotoInputRef.current?.click()}
                  title="Click to choose a photo from your computer"
                >
                  <img
                    src={customAvatarPreview || '/default-avatar.svg'}
                    alt="Custom Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/50 shadow-md group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-[20px]">add_a_photo</span>
                    <span className="text-[9px] text-white font-medium">Choose</span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={customPhotoInputRef}
                  onChange={handleCustomPhotoChange}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => customPhotoInputRef.current?.click()}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">upload</span>
                    <span>{customAvatarPreview ? 'Change Photo' : 'Upload Profile Photo'}</span>
                  </button>
                  {customAvatarPreview && (
                    <>
                      <span className="text-outline text-xs">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomAvatar(null)
                          setCustomAvatarPreview(null)
                        }}
                        className="text-xs text-error hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Form Inputs */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Verma or Alice Cooper"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Assigned Role</label>
                  <select
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Compliance Auditor">Compliance Auditor</option>
                    <option value="Security Admin">Security Admin</option>
                    <option value="Smart Contract Developer">Smart Contract Developer</option>
                    <option value="Enterprise Employee">Enterprise Employee</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold rounded-2xl py-3.5 px-6 transition-all duration-200 shadow-lg shadow-primary/20 text-sm mt-2"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Sign In as {customName.trim() || 'Custom User'}</span>
              </button>
            </form>
          )}

          {/* TAB 3: WEB3 WALLET (SIWE) */}
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-sm font-semibold text-on-surface mb-1">Sign-In with Ethereum (SIWE)</h3>
                <p className="text-xs text-outline">
                  Connect your MetaMask wallet and sign a cryptographic challenge to prove address ownership.
                </p>
              </div>

              {/* MetaMask Button */}
              <button
                onClick={handleMetaMaskLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-on-primary font-semibold rounded-2xl py-3.5 px-6 transition-all duration-200 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 35 33" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                      <g fillRule="nonzero" fill="none">
                        <polygon fill="#E17726" stroke="#E17726" strokeWidth=".25" points="32.958 1 19.158 10.896 21.625 5.144" />
                        <polygon fill="#E27625" stroke="#E27625" strokeWidth=".25" points="2.042 1 15.717 10.988 13.376 5.144" />
                        <polygon fill="#E27625" stroke="#E27625" strokeWidth=".25" points="28.095 23.511 24.298 29.144 32.168 31.243 34.354 23.636" />
                        <polygon fill="#E27625" stroke="#E27625" strokeWidth=".25" points=".662 23.636 2.833 31.243 10.702 29.144 6.905 23.511" />
                        <polygon fill="#E27625" stroke="#E27625" strokeWidth=".25" points="10.276 14.535 8.138 17.695 15.932 18.055 15.671 9.67" />
                        <polygon fill="#E27625" stroke="#E27625" strokeWidth=".25" points="24.724 14.535 19.219 9.577 19.069 18.055 26.862 17.695" />
                        <polygon fill="#E27625" stroke="#E27625" strokeWidth=".25" points="10.702 29.144 15.477 26.918 11.374 23.693" />
                        <polygon fill="#E27625" stroke="#E27625" strokeWidth=".25" points="19.524 26.918 24.298 29.144 23.627 23.693" />
                      </g>
                    </svg>
                    <span>Sign in with MetaMask</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 border-t border-outline-variant/40" />
                <span className="text-xs text-outline">or</span>
                <div className="flex-1 border-t border-outline-variant/40" />
              </div>

              {/* Demo Mode Button */}
              <button
                onClick={handleDemoLogin}
                className="w-full flex items-center justify-center gap-2 bg-surface-container border border-outline-variant/50 hover:bg-surface-container-high text-on-surface-variant font-medium rounded-2xl py-3 px-6 transition-all duration-200 text-xs sm:text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">science</span>
                <span>Instant Demo Access (Hackathon Judges)</span>
              </button>
            </div>
          )}

          {/* Security footnote */}
          <div className="mt-6 flex items-start gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">verified_user</span>
            <div>
              <p className="text-xs font-medium text-emerald-700">W3C Decentralized Identity & Cryptographic Auth</p>
              <p className="text-[11px] text-outline mt-0.5">
                Role-based access control with verifiable credentials and hardware security module (HSM) attestation.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { icon: 'badge', label: 'W3C DID', desc: 'Self-Sovereign Identity' },
            { icon: 'token', label: 'ERC-721 NFTs', desc: 'On-Chain Ownership' },
            { icon: 'verified_user', label: 'ZK Proofs', desc: 'Zero-Knowledge Privacy' },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-surface-container-lowest/60 border border-outline-variant/30 rounded-2xl p-2.5 text-center backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-primary text-xl">{f.icon}</span>
              <p className="text-xs font-semibold text-on-surface mt-0.5">{f.label}</p>
              <p className="text-[10px] text-outline">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
