import React from 'react'
import { useParams, Link } from 'react-router-dom'
import Caso from './Caso'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import CssBaseline from '@mui/material/CssBaseline'

function caseUrl(filename: string): string {
  return filename.startsWith('seriea_')
    ? 'http://www.corteidh.or.cr/docs/opiniones/' + filename.replace(/json$/, 'pdf')
    : 'https://www.corteidh.or.cr/docs/casos/articulos/' + filename.replace(/json$/, 'pdf')
}

interface Props {
  allDocs: Caso[]
  articulos: Map<number, string>
}

export default function PaisPage({ allDocs, articulos }: Props) {
  const { pais } = useParams<{ pais: string }>()

  const cases = allDocs
    .filter(c => c.pais === pais)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  // Stats
  const years = cases.map(c => c.fecha?.slice(0, 4)).filter(Boolean) as string[]
  const yearMin = years.length ? Math.min(...years.map(Number)) : null
  const yearMax = years.length ? Math.max(...years.map(Number)) : null

  // Top 3 most cited articles
  const artCount = new Map<number, number>()
  for (const c of cases) {
    for (const a of (c.articulos || [])) {
      artCount.set(a, (artCount.get(a) || 0) + 1)
    }
  }
  const topArts = Array.from(artCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => `${articulos.get(id) || 'Art. ' + id} (${count})`)

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box sx={{ py: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <Link to="/">← Inicio</Link>
          </Typography>
          <Typography variant="h5" gutterBottom>
            Casos vs. {pais}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {cases.length} sentencias
            {yearMin && yearMax ? ` · ${yearMin}–${yearMax}` : ''}
            {topArts.length > 0 ? ` · Arts. más citados: ${topArts.join(', ')}` : ''}
          </Typography>
          <List>
            {cases.map(c => (
              <ListItem key={c.filename} disablePadding>
                <ListItemText>
                  <p>
                    <strong>
                      <a href={caseUrl(c.filename)} target="_blank" rel="noreferrer">
                        {c.caso} {c.fecha ? `(${c.fecha})` : ''}
                      </a>
                    </strong>
                    {c.tipo_sentencia?.length > 0 &&
                      <span style={{ marginLeft: 8, color: '#888', fontSize: '0.8em' }}>
                        {c.tipo_sentencia.join(', ')}
                      </span>}
                  </p>
                </ListItemText>
              </ListItem>
            ))}
          </List>
        </Box>
      </Container>
    </React.Fragment>
  )
}
