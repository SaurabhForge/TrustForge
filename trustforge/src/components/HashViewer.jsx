import { useState } from 'react'

export default function HashViewer({ hash, label }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-surface-container-low border border-outline-variant/40 group">
      {label && <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{label}</span>}
      <span className="font-code-xs text-code-xs text-secondary truncate min-w-0">{hash}</span>
      <button
        onClick={handleCopy}
        title="Copy"
        className="shrink-0 text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
      >
        <span className="material-symbols-outlined text-[13px]">
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
    </div>
  )
}
