"""
Build cross-case citation graph.
1. Extract 'Caso X Vs. Y' mentions from each document's full text.
2. Store casos_citados: [filenames] in each JSON.
3. Compute co-citation similarity + direct citation links.
4. Store casos_relacionados: [top-5 filenames] in each JSON.

Run after build.py:
    python3 2-structure/build_citations.py
"""
import json
import os
import re
import unicodedata
from collections import defaultdict
from glob import glob

data_dir = os.environ.get('DATA_DIR', 'data')
abs_data_dir = os.path.abspath(data_dir)


def normalize(s: str) -> str:
    """Lowercase, remove diacritics, collapse whitespace."""
    s = s.lower().strip()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'\s+', ' ', s)
    return s


def run():
    files = sorted(glob(os.path.join(abs_data_dir, '*.json')))
    files = [f for f in files if os.path.basename(f) != 'data.json']

    # Load all docs
    docs = {}  # filename → doc dict
    for filepath in files:
        with open(filepath, encoding='utf-8') as f:
            doc = json.load(f)
        filename = os.path.basename(filepath)
        doc['_filepath'] = filepath
        docs[filename] = doc

    # Build normalized lookup: norm_key → filename
    # Key: normalize("name_part vs country_part") from the caso field
    lookup = {}
    for filename, doc in docs.items():
        caso = doc.get('caso', '')
        m = re.search(r'(?:CASO\s+)?(.+?)\s+VS\.?\s+(.+)', caso, re.IGNORECASE)
        if m:
            name_part = normalize(m.group(1))
            country_part = normalize(m.group(2).split('(')[0])  # drop trailing parentheticals
            key = name_part + ' vs ' + country_part
            lookup[key] = filename
            # Also index by name only (for partial matches in text)
            lookup['name:' + name_part] = filename

    print(f'Lookup entries: {len(lookup)} for {len(docs)} docs')

    # Citation pattern: "Caso X Vs. Y" — capture name and country
    CITE_RE = re.compile(
        r'[Cc]aso\s+([\w\s\u00C0-\u024F\-]+?)\s+[Vv]s?\.\s+([\w\s\u00C0-\u024F]{2,40}?)(?=[\.,;\n\(\[\"])',
    )

    # Extract citations for each doc
    cited_by = defaultdict(set)   # filename → set of filenames it cites
    for filename, doc in docs.items():
        text = doc.get('data', '')
        found = set()
        for m in CITE_RE.finditer(text):
            name_part = normalize(m.group(1))
            country_part = normalize(m.group(2))
            key = name_part + ' vs ' + country_part
            if key in lookup:
                target = lookup[key]
                if target != filename:
                    found.add(target)
            else:
                # Try name-only fallback
                nkey = 'name:' + name_part
                if nkey in lookup:
                    target = lookup[nkey]
                    if target != filename:
                        found.add(target)
        cited_by[filename] = found

    total_citations = sum(len(v) for v in cited_by.values())
    print(f'Total citations found: {total_citations}')

    # Build reverse index: citee → set of docs that cite it
    cited_by_reverse = defaultdict(set)
    for filename, targets in cited_by.items():
        for target in targets:
            cited_by_reverse[target].add(filename)

    # Compute relatedness score for each pair
    # Score components:
    #   +2 for each shared cited case (co-citation)
    #   +3 for direct citation (A cites B or B cites A)
    def related_scores(filename):
        scores = defaultdict(int)
        citations = cited_by[filename]

        # Direct citations: this doc cites others
        for target in citations:
            scores[target] += 3

        # Reverse citations: others cite this doc
        for citer in cited_by_reverse[filename]:
            scores[citer] += 3

        # Co-citation: find all docs that cite the same cases this doc cites
        for cited_case in citations:
            for co_citer in cited_by_reverse[cited_case]:
                if co_citer != filename:
                    scores[co_citer] += 2

        # Also: cases this doc cites that share citations with each other
        # (docs cited by the same set of cases as this doc — bibliographic coupling)
        for citer in cited_by_reverse[filename]:
            for co_cited in cited_by[citer]:
                if co_cited != filename:
                    scores[co_cited] += 1

        scores.pop(filename, None)
        return scores

    # Write updated JSON files
    for filename, doc in docs.items():
        filepath = doc.pop('_filepath')
        casos_citados = sorted(cited_by[filename])
        scores = related_scores(filename)
        casos_relacionados = sorted(scores, key=lambda x: -scores[x])[:5]

        doc['casos_citados'] = casos_citados
        doc['casos_relacionados'] = casos_relacionados

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(json.dumps(doc, ensure_ascii=False))

    # Summary
    docs_with_citations = sum(1 for v in cited_by.values() if v)
    docs_with_related = sum(1 for d in docs.values() if d.get('casos_relacionados'))
    print(f'Docs with citations: {docs_with_citations}')
    print(f'Docs with related cases: {docs_with_related}')
    print('Done.')


if __name__ == '__main__':
    run()
