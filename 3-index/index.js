#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const tqdm = require('tqdm');
const MiniSearch = require('minisearch')

const miniSearch = new MiniSearch({
  idField: 'filename',
  fields: ['caso', 'data'],
  storeFields: ['caso', 'data', 'fecha', 'filename', 'articulos'],
})

const dataDir = process.env.DATA_DIR || 'data'
for (const file of tqdm(fs.readdirSync(dataDir).filter((x) => x.endsWith('.json')))) {
  const raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
  raw.filename = file;
  miniSearch.add(raw);
}
fs.writeFileSync(path.join(dataDir, 'data.json'), JSON.stringify(miniSearch));
