import React, { useState, useEffect } from 'react'
import './Highlighter.css'

interface HighlighterProps {
  text: string
  criteria?: string
  length?: number
}

function Highlighter({ text, criteria, length }: React.PropsWithChildren<HighlighterProps>) {
  const [highlightedText, setHighlightedText] = useState(<React.Fragment></React.Fragment>)
  useEffect(() => {
    const updateFragment = () => {
      setHighlightedText(<React.Fragment>
        <span className="no-hl">{length ? text.slice(0, length) : text}</span>
      </React.Fragment>)
    }

    if (!criteria) {
      updateFragment();
      return;
    };

    const term = criteria.split(' ')[0];
    const index = text.search(new RegExp(term, 'i'))

    if (index === -1) {
      updateFragment();
      return;
    };

    setHighlightedText(<React.Fragment>
      <span className="no-hl">{text.slice(length ? Math.max(0, index - (length / 2)) : 0, index)}</span>
      <span className="hl">{text.slice(index, index + term.length)}</span>
      <span className="no-hl">{length ? text.slice(index + term.length, index + term.length + (length / 2)) : text.slice(index + term.length)}</span>
    </React.Fragment>)
  }, [text, criteria, length])

  return (
    <span>
      {highlightedText}
    </span>
  )
}

export default Highlighter
