import React, { useState, useEffect, useRef } from 'react';
import Caso from './Caso'
import Highlighter from './Highlighter'
import './App.css';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';

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
    <React.Fragment><CssBaseline /><Container maxWidth="sm"><Box>
      <header>
        <p>
          Buscador no oficial de Jurisprudencia de la Corte
          Interamericana de Derechos Humanos.
        </p>
        {!ready && <>
          Cargando...
          <LinearProgress variant={'determinate'} value={100 * (progress || 0)} />
        </>}
        {ready && <label>
          <TextField autoFocus={true} type="search" label="Buscar" placeholder={"bulacio"} value={searchCriteria} ref={searchInputRef} onChange={(event) => {
            const value = event.target.value
            setSearchCriteria(value)
          }} fullWidth />
        </label>}
      </header>
      <div>
        {didSearch && searchResults.length > 0 && <>
          <List>
            {searchResults.map(({ caso, data, filename, excerpt }) => (
              <ListItem key={filename}>
                <ListItemText>
                  <p><strong><a href={'https://www.corteidh.or.cr/docs/casos/articulos/' + filename.replace(/json$/, 'pdf')} target="_blank" rel="noreferrer">{caso}</a></strong></p>
                  <p><Highlighter text={data} criteria={searchCriteria} length={200} /></p>
                </ListItemText>
               </ListItem>
            ))}
          </List>
        </>}
      </div>
    </Box></Container></React.Fragment>
  );
}

export default App;
