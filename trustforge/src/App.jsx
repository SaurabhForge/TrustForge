import { Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './services/auth'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Overview from './pages/Overview'
import IdentityManagement from './pages/IdentityManagement'
import IdentityDetail from './pages/IdentityDetail'
import AccessControl from './pages/AccessControl'
import VerificationCenter from './pages/VerificationCenter'
import SecurityDashboard from './pages/SecurityDashboard'
import AuditTrail from './pages/AuditTrail'
import Settings from './pages/Settings'

/** Guard: redirect to /login if no valid JWT */
function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return (
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — all pages under Layout */}
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="identity-management" element={<IdentityManagement />} />
        <Route path="identity-management/:id" element={<IdentityDetail />} />
        <Route path="access-control" element={<AccessControl />} />
        <Route path="verification-center" element={<VerificationCenter />} />
        <Route path="security-dashboard" element={<SecurityDashboard />} />
        <Route path="audit-trail" element={<AuditTrail />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  )
}
