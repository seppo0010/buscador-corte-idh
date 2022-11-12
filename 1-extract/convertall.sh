#!/usr/bin/env bash
set -Eeu

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
pushd "$SCRIPT_DIR"
set -x

mkdir -p data
for f in ../0-scraping/data/*.pdf; do
	file=$(basename "$f")
	txt="data/${file%.pdf}.txt"
	if ! [ -f "$txt" ]; then pdftotext "$f" "$txt"; fi
done

set +x
popd
