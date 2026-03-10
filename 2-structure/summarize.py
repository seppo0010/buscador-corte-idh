"""
Pre-compute AI summaries using a local Ollama model (qwen2.5:3b).
Reads existing JSON files, adds resumen_ia field, writes back.
Incremental: skips docs that already have resumen_ia.
Requires Ollama running locally: ollama serve && ollama pull qwen2.5:3b
"""
import json
import os
import sys
from glob import glob

try:
    import httpx
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'httpx'])
    import httpx

data_dir = os.environ.get('DATA_DIR', 'data')
abs_data_dir = os.path.abspath(data_dir)
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434/api/generate')
MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:3b')

PROMPT = """Eres un asistente jurídico especializado en derecho internacional de los derechos humanos.
A continuación se presenta la parte resolutiva de una sentencia de la Corte Interamericana de Derechos Humanos.
Escribe un resumen neutral de 2-3 oraciones en español describiendo qué decidió la Corte.
Sé conciso y preciso. No uses frases introductorias como "La Corte decidió que..."; ve directo al contenido.

PARTE RESOLUTIVA:
"""

def summarize(resumen_text: str) -> str:
    response = httpx.post(OLLAMA_URL, json={
        'model': MODEL,
        'prompt': PROMPT + resumen_text[:2000],
        'stream': False,
    }, timeout=120)
    response.raise_for_status()
    return response.json()['response'].strip()

def run():
    files = sorted(glob(os.path.join(abs_data_dir, '*.json')))
    files = [f for f in files if os.path.basename(f) != 'data.json']

    skipped = 0
    updated = 0
    errors = 0

    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            doc = json.load(f)

        if doc.get('resumen_ia') or not doc.get('resumen'):
            skipped += 1
            continue

        print(f"Summarizing: {os.path.basename(filepath)} — {doc.get('caso', '')[:60]}")
        try:
            doc['resumen_ia'] = summarize(doc['resumen'])
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(json.dumps(doc, ensure_ascii=False))
            updated += 1
            print(f"  → {doc['resumen_ia'][:120]}")
        except Exception as e:
            print(f"  ERROR: {e}")
            errors += 1

    print(f"\nDone. Updated: {updated}, Skipped: {skipped}, Errors: {errors}")

if __name__ == '__main__':
    run()
