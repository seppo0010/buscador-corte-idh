#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const tqdm = require('tqdm');
const MiniSearch = require('minisearch')

const miniSearch = new MiniSearch({
  idField: 'filename',
  fields: ['caso', 'data'],
  storeFields: ['caso', 'resumen', 'fecha', 'filename', 'articulos', 'pais', 'numero_serie', 'tipo_documento', 'tipo_sentencia', 'casos_relacionados'],
})

const dataDir = process.env.DATA_DIR || 'data'

// Write per-document full text to 4-web/public/texts/ for on-demand loading
const textsDir = path.join(__dirname, '..', '4-web', 'public', 'texts')
if (!fs.existsSync(textsDir)) fs.mkdirSync(textsDir, { recursive: true })

for (const file of tqdm(fs.readdirSync(dataDir).filter((x) => x.endsWith('.json') && x !== 'data.json'))) {
  const raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
  raw.filename = file;

  // Write per-doc text file (gzipped) before removing data from stored fields
  if (raw.data) {
    const textContent = JSON.stringify({ data: raw.data });
    const compressed = zlib.gzipSync(Buffer.from(textContent, 'utf-8'), { level: 9 });
    fs.writeFileSync(path.join(textsDir, file.replace('.json', '.json.gz')), compressed);
  }

  miniSearch.add(raw);
}
fs.writeFileSync(path.join(dataDir, 'data.json'), JSON.stringify(miniSearch));
