import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import ErrorBoundary from './ErrorBoundary'
import { getStoredWallet, clearToken, setStoredWallet, getStoredUser, getStoredAvatar, setStoredAvatar, updateUserProfile } from '../services/auth'

const LOGO_URL = '/trustforge-logo.svg'
const AVATAR_URL = '/admin-avatar.png'

const navItems = [
  { path: '/overview', icon: 'grid_view', label: 'Overview' },
  { path: '/identity-management', icon: 'badge', label: 'Identity Management' },
  { path: '/access-control', icon: 'admin_panel_settings', label: 'Access Control' },
  { path: '/verification-center', icon: 'verified_user', label: 'Verification Center' },
  { path: '/security-dashboard', icon: 'manage_search', label: 'Security Dashboard' },
  { path: '/audit-trail', icon: 'history_toggle_off', label: 'Audit Trail' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [searchVal, setSearchVal] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  const [currentUser, setCurrentUser] = useState(() => {
    return getStoredUser() || {
      name: 'Saurabh Kumar',
      email: 'sk1300374@gmail.com',
      role: 'Super Admin',
      did: 'did:trustforge:9a2f3b1c8e21a4',
      avatar: '/admin-avatar.png',
      tfId: 'TF-10482'
    }
  })
  
  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return getStoredAvatar() || currentUser?.avatar || '/admin-avatar.png'
  })

  const [walletAddress, setWalletAddress] = useState(() => {
    const stored = getStoredWallet()
    return stored ? `${stored.slice(0, 6)}...${stored.slice(-4)}` : '0x71A4...92F1'
  })
  const [connected, setConnected] = useState(true)
  const [unreadCount, setUnreadCount] = useState(2)
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Multi-Sig Quorum Action Required', desc: 'Threshold 2/3 pending for QR-007', time: '5m ago', unread: true, type: 'warning' },
    { id: 2, title: 'Cryptographic Attestation Completed', desc: 'Block #18,294,105 anchored to L1', time: '12m ago', unread: true, type: 'success' },
    { id: 3, title: 'Key Rotation Executed', desc: 'HSM-Node-01 rotated keys for TF-10478', time: '1h ago', unread: false, type: 'info' },
  ])

  useEffect(() => {
    const stored = getStoredWallet()
    if (stored) {
      setWalletAddress(`${stored.slice(0, 6)}...${stored.slice(-4)}`)
      setConnected(true)
    }
    const syncUser = () => {
      const u = getStoredUser()
      if (u) setCurrentUser(u)
      const av = getStoredAvatar() || u?.avatar || '/admin-avatar.png'
      setCurrentAvatar(av)
    }
    syncUser()
    window.addEventListener('trustforge:avatar-updated', syncUser)
    window.addEventListener('storage', syncUser)
    return () => {
      window.removeEventListener('trustforge:avatar-updated', syncUser)
      window.removeEventListener('storage', syncUser)
    }
  }, [])

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      if (searchVal.startsWith('0x') || searchVal.startsWith('AE-')) {
        navigate(`/audit-trail?search=${encodeURIComponent(searchVal.trim())}`)
      } else {
        navigate(`/identity-management?search=${encodeURIComponent(searchVal.trim())}`)
      }
    }
  }

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        if (accounts && accounts[0]) {
          const addr = accounts[0]
          setStoredWallet(addr)
          setWalletAddress(`${addr.slice(0, 6)}...${addr.slice(-4)}`)
          setConnected(true)
          setWalletOpen(false)
          return
        }
      } catch {}
    }
    // Fallback simulate testnet connection
    setWalletAddress('0xf39F...2266')
    setConnected(true)
    setWalletOpen(false)
  }

  const handleLogout = () => {
    clearToken()
    setUserMenuOpen(false)
    navigate('/login')
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size exceeds 5MB. Please choose a smaller image.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      updateUserProfile({ avatar: dataUrl })
      setCurrentAvatar(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleResetPhoto = () => {
    const isSaurabh = (currentUser?.name && currentUser.name.toLowerCase().includes('saurabh')) || currentUser?.email === 'sk1300374@gmail.com'
    const defaultAv = isSaurabh ? '/admin-avatar.png' : '/default-avatar.svg'
    updateUserProfile({ avatar: defaultAv })
    setCurrentAvatar(defaultAv)
  }

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })))
    setUnreadCount(0)
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md antialiased">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest border-r border-outline-variant/40 z-50 flex flex-col justify-between select-none">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="h-16 px-space-md flex items-center justify-between border-b border-outline-variant/30">
            <div className="flex items-center gap-space-sm">
              <img alt="TrustForge Logo" className="h-8 w-auto object-contain" src={LOGO_URL} />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none">TrustForge</span>
                <span className="text-[9px] font-mono tracking-wider text-outline uppercase leading-none mt-1">Security Suite</span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded border border-outline-variant/60 bg-surface-container-low text-[10px] font-semibold tracking-wider text-secondary uppercase">
              Enterprise
            </span>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 px-space-sm pt-space-md">
            {navItems.map(({ path, icon, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `group flex items-center gap-space-sm px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-surface-container-high text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                <span className="font-label-md text-label-md">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom user panel */}
        <div className="border-t border-outline-variant/30 p-space-sm bg-surface-container-low/40 flex flex-col gap-space-sm">
          {/* Node status */}
          <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant/40 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-label-sm text-[11px] font-semibold text-on-surface">Sepolia Testnet</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-surface-container-high text-secondary">Prod</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-code-xs text-code-xs">
              <span>Block #18,294,105</span>
              <span className="text-emerald-700 font-medium">Synced</span>
            </div>
          </div>
          {/* User */}
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-space-sm p-1.5 rounded hover:bg-surface-container-high/40 transition-colors cursor-pointer"
          >
            <img
              alt={currentUser.name || 'User'}
              className="w-8 h-8 rounded-full object-cover border border-primary/40"
              src={currentAvatar}
              onError={(e) => { e.currentTarget.src = '/admin-avatar.png'; }}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">{currentUser.name || 'Saurabh Kumar'}</span>
              <span className="font-code-xs text-code-xs text-on-surface-variant truncate">{currentUser.did || 'did:trustforge:9a2f...'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="pl-[260px]">
        {/* Top Header */}
        <header className="fixed top-0 left-[260px] right-0 h-16 bg-surface-container-lowest border-b border-outline-variant/40 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-label-sm text-label-sm text-on-surface-variant">TrustForge Console</span>
            <span className="text-outline-variant">/</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span className="font-label-sm text-label-sm text-on-surface font-semibold">Production Node</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface-variant focus-within:border-primary">
              <span className="material-symbols-outlined text-[16px]">search</span>
              <input
                id="global-search"
                type="text"
                placeholder="Search DIDs, Hashes, Assets..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onKeyDown={handleSearchSubmit}
                className="bg-transparent font-body-sm text-body-sm text-on-surface outline-none placeholder:text-outline w-48 hidden lg:block"
              />
              <kbd
                onClick={() => document.getElementById('global-search')?.focus()}
                className="hidden lg:inline font-code-xs text-code-xs px-1.5 py-0.5 bg-surface-container-lowest border border-outline-variant/60 rounded text-on-surface-variant cursor-pointer hover:bg-surface-container"
              >
                Ctrl K
              </kbd>
            </div>

            {/* RPC */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span className="font-code-xs text-code-xs text-on-surface font-medium">RPC 12ms</span>
            </div>

            {/* Wallet Connect Chip */}
            <div className="relative">
              <button
                onClick={() => setWalletOpen(!walletOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant/40 font-code-xs text-code-xs text-on-surface hover:bg-surface-container transition-colors shadow-sm"
              >
                <span className={`material-symbols-outlined text-[14px] ${connected ? 'text-emerald-700' : 'text-outline'}`}>
                  {connected ? 'check_circle' : 'account_balance_wallet'}
                </span>
                <span>{connected ? walletAddress : 'Connect Wallet'}</span>
                <span className="material-symbols-outlined text-[14px] text-outline">arrow_drop_down</span>
              </button>

              {walletOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 p-3 z-50 flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                    <span className="font-label-sm text-label-sm font-semibold text-on-surface">Web3 Provider</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-code-xs font-semibold">Active</span>
                  </div>
                  <div className="font-code-xs text-code-xs text-on-surface bg-surface-container-low p-2 rounded break-all">
                    {connected ? walletAddress : 'Not connected'}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">Network: Sepolia L1 Anchor (Chain ID: 11155111)</div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={connectWallet}
                      className="flex-1 py-1 px-2 rounded bg-primary-container text-on-primary hover:bg-primary text-label-sm font-label-sm transition-colors text-center"
                    >
                      {connected ? 'Reconnect' : 'Connect'}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(walletAddress)
                        alert('Address copied to clipboard!')
                      }}
                      className="p-1 rounded bg-surface-container-low hover:bg-surface-container text-on-surface"
                      title="Copy Address"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                className="relative p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full ring-2 ring-surface-container-lowest" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/40 p-4 z-50 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                    <div className="flex items-center gap-1.5">
                      <span className="font-headline-sm text-headline-sm text-on-surface">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-semibold">{unreadCount}</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-primary text-[11px] font-label-sm hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col divide-y divide-outline-variant/20 max-h-64 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className={`py-2 flex items-start gap-2.5 ${n.unread ? 'opacity-100 font-medium' : 'opacity-70'}`}>
                        <span className={`material-symbols-outlined text-[18px] mt-0.5 ${n.type === 'warning' ? 'text-amber-500' : n.type === 'success' ? 'text-emerald-600' : 'text-primary'}`}>
                          {n.type === 'warning' ? 'warning' : n.type === 'success' ? 'verified' : 'info'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-body-sm text-on-surface block leading-tight">{n.title}</span>
                          <span className="text-[11px] text-on-surface-variant block mt-0.5 leading-snug">{n.desc}</span>
                          <span className="text-[10px] font-code-xs text-outline block mt-0.5">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-outline-variant/40" />

            {/* User avatar dropdown */}
            <div className="relative">
              <div
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-1 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <img
                  alt={currentUser.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-primary/40 shadow-sm"
                  src={currentAvatar}
                  onError={(e) => { e.currentTarget.src = '/admin-avatar.png'; }}
                />
                <div className="hidden xl:flex flex-col text-left">
                  <span className="font-label-sm text-label-sm text-on-surface leading-tight font-semibold">{currentUser.name || 'Saurabh Kumar'}</span>
                  <span className="font-label-sm text-[10px] text-secondary font-medium leading-none">{currentUser.role || 'Super Admin'}</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">keyboard_arrow_down</span>
              </div>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 p-4 z-50 flex flex-col gap-3">
                  {/* User Header with Avatar & Photo Edit Badge */}
                  <div className="pb-3 border-b border-outline-variant/20 flex items-center gap-3">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      title="Click to upload new profile photo"
                    >
                      <img
                        alt={currentUser.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 shadow-md group-hover:opacity-75 transition-opacity"
                        src={currentAvatar}
                        onError={(e) => { e.currentTarget.src = '/admin-avatar.png'; }}
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-[16px]">photo_camera</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-label-md text-label-md font-semibold text-on-surface block truncate">{currentUser.name || 'Saurabh Kumar'}</span>
                      <span className="text-[11px] text-on-surface-variant block truncate">{currentUser.email || 'sk1300374@gmail.com'}</span>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">{currentUser.role || 'Super Admin'}</span>
                    </div>
                  </div>

                  {/* Hidden file input for photo upload */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Photo Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">upload</span>
                      <span>Upload Photo</span>
                    </button>
                    <button
                      onClick={handleResetPhoto}
                      className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[11px] font-medium transition-colors"
                      title="Reset to default photo"
                    >
                      <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                      <span>Reset</span>
                    </button>
                  </div>

                  {/* DID preview badge */}
                  <div className="bg-surface-container-low/80 rounded-lg px-2.5 py-1.5 font-code-xs text-[10px] text-outline flex items-center justify-between">
                    <span className="truncate max-w-[180px]">{currentUser.did || 'did:trustforge:9a2f3b1c...'}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(currentUser.did || 'did:trustforge:9a2f3b1c...');
                        alert('DID copied to clipboard!');
                      }}
                      className="text-primary hover:underline ml-1 shrink-0 font-medium"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Links */}
                  <div className="flex flex-col gap-0.5">
                    <NavLink
                      to={`/identity-management/${currentUser.tfId || 'TF-10482'}`}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container text-body-sm font-body-sm text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-secondary">badge</span>
                      <span>My DID Profile</span>
                    </NavLink>
                    <NavLink
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container text-body-sm font-body-sm text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-secondary">settings</span>
                      <span>Platform Settings</span>
                    </NavLink>
                  </div>

                  {/* Sign out and switch user */}
                  <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-primary/10 text-body-sm font-body-sm text-primary transition-colors text-left font-medium"
                    >
                      <span className="material-symbols-outlined text-[16px]">switch_account</span>
                      <span>Switch User / Persona</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-50 text-body-sm font-body-sm text-red-700 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-16 min-h-screen bg-background">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
