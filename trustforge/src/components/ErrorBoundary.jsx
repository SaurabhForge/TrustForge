import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-surface-container-lowest border border-red-200 rounded-xl shadow-lg text-center">
          <span className="material-symbols-outlined text-red-600 text-[48px] mb-2">error</span>
          <h2 className="font-headline-md text-on-surface mb-2 font-bold">Something went wrong</h2>
          <p className="font-body-sm text-on-surface-variant mb-4">
            An unexpected error occurred while rendering this module:
            <br />
            <code className="text-red-700 bg-red-50 p-1.5 rounded mt-2 inline-block font-code-xs text-left max-w-full overflow-x-auto">
              {this.state.error?.message || 'Unknown render error'}
            </code>
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors shadow"
            >
              Reload View
            </button>
            <button
              onClick={() => {
                window.location.href = '/overview'
              }}
              className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface font-label-md hover:bg-surface-container-highest transition-colors"
            >
              Go to Overview
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
