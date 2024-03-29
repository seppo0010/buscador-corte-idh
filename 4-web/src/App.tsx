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
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent }  from '@mui/material/Select';
import Typography from '@mui/material/Typography';
// eslint-disable-next-line import/no-webpack-loader-syntax
import cadh from './cadh.txt';

// eslint-disable-next-line import/no-webpack-loader-syntax
const Worker = require('workerize-loader!./search.worker')

function App() {
  const [loading, setLoading] = useState(false)
  const [workerInstance, setWorkerInstance] = useState<any | null>(null)
  const [searchResults, setSearchResults] = useState<Caso[]>([])
  const [searchCriteria, setSearchCriteria] = useState('')
  const [articuloFilter, setArticuloFilter] = useState<null | number>(null)
  const [didSearch, setDidSearch] = useState(false)
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState<null | number>(null);
  const [latest, setLatest] = useState<null | Caso[]>(null);
  const [articulos, setArticulos] = useState<null | Map<number, string>>(null);
  const [loadingArticulos, setLoadingArticulos] = useState(false);
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
      case 'setLatest': setLatest(params); break
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
    workerInstance?.search(searchCriteria, articuloFilter)
  }, [searchCriteria, articuloFilter, workerInstance])

  useEffect(() => {
    if (loadingArticulos) return;
    setLoadingArticulos(true);
    (async () => {
      const req = await fetch(cadh)
      const res = await req.text();
      const map = new Map();
      for (const [name, id] of Array.from(res.matchAll(/^Artículo ([0-9]+).*/gmd))) {
        map.set(parseInt(id, 10), name);
      }
      setArticulos(map);
    })();
  }, [articulos, loadingArticulos]);

  return (
    <React.Fragment><CssBaseline /><Container maxWidth="sm"><Box>
      <header style={{marginBottom: 40}}>
        <p>
          Buscador no oficial de Jurisprudencia de la Corte
          Interamericana de Derechos Humanos.<br />
          {process.env.REACT_APP_DATE !== "" ? <span>(&Uacute;ltima actualizaci&oacute;n: {process.env.REACT_APP_DATE})</span> : ''}
        </p>
        {!ready && <>
          Cargando...
          <LinearProgress variant={'determinate'} value={100 * (progress || 0)} />
        </>}
        {ready &&
          <TextField autoFocus={true} type="search" label="Buscar" placeholder={"bulacio"} value={searchCriteria} ref={searchInputRef} onChange={(event) => {
            const value = event.target.value
            setSearchCriteria(value)
          }} fullWidth />
        }
        {ready && articulos &&
          <Select
            label="Artículo"
            onChange={(event: SelectChangeEvent) => {
              const id = parseInt(event.target.value as string, 10);
              setArticuloFilter(id === 0 ? null : id);
            }}
            value={'' + (articuloFilter || 0)}
            fullWidth
          >
            <MenuItem value={0}>Cualquier artículo</MenuItem>
            {Array.from(articulos.entries()).map(([id, name]: [number, string]) => (
              <MenuItem key={id} value={id}>{name}</MenuItem>))}
          </Select>
        }
      </header>
      <div>
        {!didSearch && latest !== null && latest.length > 0 && <>
          <Typography variant="subtitle2" style={{marginLeft: 16}}>Casos más recientes</Typography>
          <List>
            {latest.map(({ caso, data, filename, excerpt, fecha }) => (
              <ListItem key={filename}>
                <ListItemText>
                  <p><strong><a href={
                    filename.startsWith('seriea_') ?
                    'http://www.corteidh.or.cr/docs/opiniones/' + filename.replace(/json$/, 'pdf') :
                    'https://www.corteidh.or.cr/docs/casos/articulos/' + filename.replace(/json$/, 'pdf')
                  } target="_blank" rel="noreferrer">{caso} {fecha ? `(${fecha})` : ''}</a></strong></p>
                  <p>{data.substr(data.indexOf('\n\n'), 200)}</p>
                </ListItemText>
               </ListItem>
            ))}
          </List>
        </>}
        {didSearch && <>
          {searchResults.length === 0 && <p style={{marginLeft: 16}}>No hay resultados</p>}
          {searchResults.length > 0 && <List>
            {searchResults.map(({ caso, data, filename, excerpt, fecha }) => (
              <ListItem key={filename}>
                <ListItemText>
                  <p><strong><a href={
                    filename.startsWith('seriea_') ?
                    'http://www.corteidh.or.cr/docs/opiniones/' + filename.replace(/json$/, 'pdf') :
                    'https://www.corteidh.or.cr/docs/casos/articulos/' + filename.replace(/json$/, 'pdf')
                  } target="_blank" rel="noreferrer">{caso} {fecha ? `(${fecha})` : ''}</a></strong></p>
                  <p><Highlighter text={data} criteria={searchCriteria} length={200} /></p>
                </ListItemText>
               </ListItem>
            ))}
          </List>}
        </>}
      </div>
    </Box></Container></React.Fragment>
  );
}

export default App;
