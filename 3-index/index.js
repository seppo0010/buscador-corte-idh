#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const tqdm = require('tqdm');
const MiniSearch = require('minisearch')

const miniSearch = new MiniSearch({
  idField: 'caso',
  fields: ['caso', 'data'],
  storeFields: ['caso', 'data', 'fecha', 'filename'],
})

const base = path.join(__dirname, '../2-structure/data')
for (const file of tqdm(fs.readdirSync(base))) {
  const raw = JSON.parse(fs.readFileSync(path.join(base, file), 'utf-8'));
  raw.filename = file;
  miniSearch.add(raw);
}
fs.writeFileSync('data.json', JSON.stringify(miniSearch));
