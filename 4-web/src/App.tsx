import React, { useState, useEffect, useRef } from 'react';
import Caso from './Caso'
import Highlighter from './Highlighter'
import './App.css';

// eslint-disable-next-line import/no-webpack-loader-syntax
const Worker = require('workerize-loader!./search.worker')

function App() {
  const [loading, setLoading] = useState(false)
  const [workerInstance, setWorkerInstance] = useState<any | null>(null)
  const [searchResults, setSearchResults] = useState<Caso[]>([])
  const [searchCriteria, setSearchCriteria] = useState('')
  const [didSearch, setDidSearch] = useState(false)
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState<null | number>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (workerInstance) return
    const w = new Worker()
    setWorkerInstance(w)
  }, [workerInstance])

  const processMessage = ({ data }: any) => {
    // I don't know why `const [t, params] = data` does not work
    const [t, params] = [data[0], data[1]]
    if (!t) return
    switch (t) {
      case 'setSearchResults': setSearchResults(params); break
      case 'setDidSearch': setDidSearch(params); break
      case 'setReady': setReady(params); break
      case 'setProgress': setProgress(params); break
      default: console.error('unexpected message type: ' + t); break
    }
  }

  useEffect(() => {
    if (!workerInstance) return
    workerInstance.addEventListener('message', processMessage)
    return () => workerInstance.removeEventListener('message', processMessage)
  })

  useEffect(() => {
    if (loading || !workerInstance) return
    setLoading(true)

    workerInstance.init()
  }, [loading, workerInstance])

  useEffect(() => {
    workerInstance?.search(searchCriteria)
  }, [searchCriteria, workerInstance])

  return (
    <div className="App">
      <header>
        Bienvenido al Buscador no oficial de Jurisprudencia de la Corte
        Interamericana de Derechos Humanos.
        {!ready && `Cargando... ${progress !== null ? Math.round(progress * 100) + '%' : ''}`}
        {ready && <label>
          <span>Buscar</span>
          <input autoFocus={true} type="text" placeholder={"bulacio"} value={searchCriteria} ref={searchInputRef} onChange={(event) => {
            const value = event.target.value
            setSearchCriteria(value)
          }} />
          <button onClick={() => {
            setSearchCriteria('')
            searchInputRef.current?.focus()
          }} aria-label="Clear" id="clear" className={searchCriteria === '' ? 'hidden' : ''}></button>
        </label>}
      </header>
      <div>
        {didSearch && searchResults.length > 0 && <>
          <ul>
            {searchResults.map(({ caso, data, filename, excerpt }) => (
              <li key={filename}>
                <p><strong><a href={'https://www.corteidh.or.cr/docs/casos/articulos/' + filename.replace(/json$/, 'pdf')} target="_blank" rel="noreferrer">{caso}</a></strong></p>
                <Highlighter text={data} criteria={searchCriteria} length={200} />
               </li>
            ))}
          </ul>
        </>}
      </div>
    </div>
  );
}

export default App;
