#!/usr/bin/env bash
set -Eeu

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
DATA_DIR=${DATA_DIR:-data}
pushd "$SCRIPT_DIR"
set -x

mkdir -p $DATA_DIR
for f in $DATA_DIR/*.pdf; do
	file=$(basename "$f")
	txt="$DATA_DIR/${file%.pdf}.txt"
	if ! [ -f "$txt" ]; then pdftotext "$f" "$txt"; fi
done

set +x
popd
