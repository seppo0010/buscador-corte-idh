import React from 'react'
import './Highlighter.css'

interface HighlighterProps {
  text: string
  criteria?: string
  length?: number
}

function Highlighter({ text, criteria, length = 200 }: React.PropsWithChildren<HighlighterProps>) {
  if (!text) return <span />

  // Parse all search terms (handles quoted phrases and individual words)
  const terms = Array.from((criteria || '').matchAll(/"([^"]+)"|([\w\u00C0-\u024F]+)/g))
    .map(m => (m[1] || m[2]).toLowerCase())
    .filter(t => t.length >= 2)

  if (!terms.length) {
    return <span className="no-hl">{text.slice(0, length)}</span>
  }

  const textLower = text.toLowerCase()

  // Find the best excerpt window: slide over text to find where most terms cluster
  const step = 20
  let bestScore = -1
  let bestPos = 0
  for (let i = 0; i < Math.max(1, text.length - length); i += step) {
    const window = textLower.slice(i, i + length)
    const score = terms.filter(t => window.includes(t)).length
    if (score > bestScore) {
      bestScore = score
      bestPos = i
    }
  }

  const excerpt = text.slice(bestPos, bestPos + length)

  // Build a single regex alternation for all terms (escaped)
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(escaped.join('|'), 'gi')

  // Split excerpt into highlighted and plain parts
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(excerpt)) !== null) {
    if (match.index > last) {
      parts.push(<span key={key++} className="no-hl">{excerpt.slice(last, match.index)}</span>)
    }
    parts.push(<span key={key++} className="hl">{match[0]}</span>)
    last = match.index + match[0].length
  }
  if (last < excerpt.length) {
    parts.push(<span key={key++} className="no-hl">{excerpt.slice(last)}</span>)
  }

  return <span>{parts}</span>
}

export default Highlighter
