#!/usr/bin/env bash
set -Eeux

rm -f $DATA_DIR/data.json
node 0-scraping/index.js
bash 1-extract/convertall.sh
python3 2-structure/build.py
node 3-index/index.js
gzip -n $DATA_DIR/data.json --stdout > 4-web/public/data.json.gz
pushd 4-web
npm run deploy
