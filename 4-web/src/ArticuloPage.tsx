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
  articuloTexts: Map<number, string>
}

export default function ArticuloPage({ allDocs, articulos, articuloTexts }: Props) {
  const { id } = useParams<{ id: string }>()
  const artId = parseInt(id || '0', 10)
  const name = articulos.get(artId) || `Artículo ${artId}`
  const text = articuloTexts.get(artId) || ''

  const cases = allDocs
    .filter(c => (c.articulos || []).includes(artId))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box sx={{ py: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <Link to="/">← Inicio</Link>
          </Typography>
          <Typography variant="h5" gutterBottom>
            {name}
          </Typography>
          {text && (
            <Box sx={{ borderLeft: '3px solid #ccc', pl: 2, mb: 3, color: 'text.secondary' }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                {text}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {cases.length} casos citan este artículo
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
                    {c.pais && <span style={{ marginLeft: 8, color: '#666', fontSize: '0.85em' }}>{c.pais}</span>}
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
