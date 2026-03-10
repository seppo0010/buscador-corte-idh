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
import Grid from '@mui/material/Grid';
// eslint-disable-next-line import/no-webpack-loader-syntax
import cadh from './cadh.txt';

// eslint-disable-next-line import/no-webpack-loader-syntax
const Worker = require('workerize-loader!./search.worker')

function caseUrl(filename: string): string {
  return filename.startsWith('seriea_')
    ? 'http://www.corteidh.or.cr/docs/opiniones/' + filename.replace(/json$/, 'pdf')
    : 'https://www.corteidh.or.cr/docs/casos/articulos/' + filename.replace(/json$/, 'pdf')
}

function readUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    q: params.get('q') || '',
    art: params.get('art') ? parseInt(params.get('art')!, 10) : null,
    pais: params.get('pais') || null,
    desde: params.get('desde') ? parseInt(params.get('desde')!, 10) : null,
    hasta: params.get('hasta') ? parseInt(params.get('hasta')!, 10) : null,
    tipo: params.get('tipo') || null,
    orden: (params.get('orden') as 'relevancia' | 'fecha') || 'relevancia',
  }
}

function App() {
  const initial = readUrlParams()
  const [loading, setLoading] = useState(false)
  const [workerInstance, setWorkerInstance] = useState<any | null>(null)
  const [searchResults, setSearchResults] = useState<Caso[]>([])
  const [searchCriteria, setSearchCriteria] = useState(initial.q)
  const [articuloFilter, setArticuloFilter] = useState<null | number>(initial.art)
  const [paisFilter, setPaisFilter] = useState<null | string>(initial.pais)
  const [desdeFilter, setDesdeFilter] = useState<null | number>(initial.desde)
  const [hastaFilter, setHastaFilter] = useState<null | number>(initial.hasta)
  const [tipoFilter, setTipoFilter] = useState<null | string>(initial.tipo)
  const [sortOrder, setSortOrder] = useState<'relevancia' | 'fecha'>(initial.orden)
  const [didSearch, setDidSearch] = useState(false)
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState<null | number>(null);
  const [latest, setLatest] = useState<null | Caso[]>(null);
  const [articulos, setArticulos] = useState<null | Map<number, string>>(null);
  const [loadingArticulos, setLoadingArticulos] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchCriteria) params.set('q', searchCriteria)
    if (articuloFilter) params.set('art', String(articuloFilter))
    if (paisFilter) params.set('pais', paisFilter)
    if (desdeFilter) params.set('desde', String(desdeFilter))
    if (hastaFilter) params.set('hasta', String(hastaFilter))
    if (tipoFilter) params.set('tipo', tipoFilter)
    if (sortOrder !== 'relevancia') params.set('orden', sortOrder)
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? '?' + qs : window.location.pathname)
  }, [searchCriteria, articuloFilter, paisFilter, desdeFilter, hastaFilter, tipoFilter, sortOrder])

  useEffect(() => {
    if (workerInstance) return
    const w = new Worker()
    setWorkerInstance(w)
  }, [workerInstance])

  const processMessage = ({ data }: any) => {
    const [t, params] = [data[0], data[1]]
    if (!t) return
    switch (t) {
      case 'setSearchResults': setSearchResults(params); break
      case 'setDidSearch': setDidSearch(params); break
      case 'setReady': setReady(params); break
      case 'setProgress': setProgress(params); break
      case 'setLatest': setLatest(params); break
      case 'setCountries': setCountries(params); break
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
    workerInstance?.search(searchCriteria, articuloFilter, paisFilter, desdeFilter, hastaFilter, tipoFilter, sortOrder)
  }, [searchCriteria, articuloFilter, paisFilter, desdeFilter, hastaFilter, tipoFilter, sortOrder, workerInstance])

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

  const renderCasoItem = (c: Caso, showHighlight: boolean) => (
    <ListItem key={c.filename}>
      <ListItemText>
        <p>
          <strong>
            <a href={caseUrl(c.filename)} target="_blank" rel="noreferrer">
              {c.caso} {c.fecha ? `(${c.fecha})` : ''}
            </a>
          </strong>
          {c.pais && <span style={{marginLeft: 8, color: '#666', fontSize: '0.85em'}}>{c.pais}</span>}
          {c.tipo_sentencia && c.tipo_sentencia.length > 0 &&
            <span style={{marginLeft: 8, color: '#888', fontSize: '0.8em'}}>{c.tipo_sentencia.join(', ')}</span>}
        </p>
        <p>
          {showHighlight
            ? <Highlighter text={c.resumen || ''} criteria={searchCriteria} length={300} />
            : <span>{c.resumen ? c.resumen.slice(0, 300) : ''}</span>}
        </p>
      </ListItemText>
    </ListItem>
  )

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
        {ready && <>
          <TextField autoFocus={true} type="search" label="Buscar" placeholder={"bulacio"} value={searchCriteria} ref={searchInputRef} onChange={(event) => {
            setSearchCriteria(event.target.value)
          }} fullWidth style={{marginBottom: 8}} />

          <Grid container spacing={1} style={{marginBottom: 8}}>
            {articulos && (
              <Grid item xs={12} sm={6}>
                <Select
                  label="Artículo"
                  onChange={(event: SelectChangeEvent) => {
                    const id = parseInt(event.target.value as string, 10);
                    setArticuloFilter(id === 0 ? null : id);
                  }}
                  value={'' + (articuloFilter || 0)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value={0}>Cualquier artículo</MenuItem>
                  {Array.from(articulos.entries()).map(([id, name]: [number, string]) => (
                    <MenuItem key={id} value={id}>{name}</MenuItem>))}
                </Select>
              </Grid>
            )}
            {countries.length > 0 && (
              <Grid item xs={12} sm={6}>
                <Select
                  onChange={(event: SelectChangeEvent) => {
                    setPaisFilter(event.target.value || null);
                  }}
                  value={paisFilter || ''}
                  fullWidth
                  size="small"
                  displayEmpty
                >
                  <MenuItem value=''>Cualquier país</MenuItem>
                  {countries.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </Grid>
            )}
            <Grid item xs={6} sm={3}>
              <TextField
                label="Desde año"
                type="number"
                size="small"
                value={desdeFilter || ''}
                onChange={(e) => setDesdeFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
                fullWidth
                inputProps={{ min: 1979, max: 2030 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                label="Hasta año"
                type="number"
                size="small"
                value={hastaFilter || ''}
                onChange={(e) => setHastaFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
                fullWidth
                inputProps={{ min: 1979, max: 2030 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Select
                onChange={(event: SelectChangeEvent) => {
                  setTipoFilter(event.target.value || null);
                }}
                value={tipoFilter || ''}
                fullWidth
                size="small"
                displayEmpty
              >
                <MenuItem value=''>Tipo de documento</MenuItem>
                <MenuItem value='caso'>Casos</MenuItem>
                <MenuItem value='opinion_consultiva'>Opiniones Consultivas</MenuItem>
                <MenuItem value='resolucion'>Resoluciones</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Select
                onChange={(event: SelectChangeEvent) => {
                  setSortOrder(event.target.value as 'relevancia' | 'fecha');
                }}
                value={sortOrder}
                fullWidth
                size="small"
              >
                <MenuItem value='relevancia'>Por relevancia</MenuItem>
                <MenuItem value='fecha'>Por fecha</MenuItem>
              </Select>
            </Grid>
          </Grid>
        </>}
      </header>
      <div>
        {!didSearch && latest !== null && latest.length > 0 && <>
          <Typography variant="subtitle2" style={{marginLeft: 16}}>Casos más recientes</Typography>
          <List>
            {latest.map((c) => renderCasoItem(c, false))}
          </List>
        </>}
        {didSearch && <>
          {searchResults.length === 0 && <p style={{marginLeft: 16}}>No hay resultados</p>}
          {searchResults.length > 0 && <List>
            {searchResults.map((c) => renderCasoItem(c, true))}
          </List>}
        </>}
      </div>
    </Box></Container></React.Fragment>
  );
}

export default App;
