export default function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    revoked: 'bg-red-50 text-red-800 border-red-200',
    critical: 'bg-red-50 text-red-800 border-red-200',
    synced: 'bg-surface-container-high text-primary border-outline-variant/40',
    info: 'bg-surface-container-high text-primary border-outline-variant/40',
  }

  const dots = {
    active: 'bg-emerald-600',
    verified: 'bg-emerald-600',
    pending: 'bg-amber-500',
    warning: 'bg-amber-500',
    revoked: 'bg-red-600',
    critical: 'bg-red-600',
    synced: 'bg-primary',
    info: 'bg-primary',
  }

  const key = status.toLowerCase()
  const cls = styles[key] || styles.synced
  const dot = dots[key] || dots.synced

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-label-sm text-[11px] font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}
