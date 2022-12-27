import fetchProgress from 'fetch-progress'
import MiniSearch from 'minisearch'
import pako from 'pako'
import Caso from './Caso'

let index: MiniSearch
let criteria = ''
let articuloFilter: null | number = null

const doSearch = () => {
  if (!index) return
  const c = criteria.split(' ').filter((x) => x.length >= 3).join(' ')
  if (c === '') {
    global.self.postMessage(['setDidSearch', false])
    global.self.postMessage(['setSearchResults', []])
    return
  }
  let searchCriteria = criteria
  const words = Array.from(criteria.matchAll(/"([^"]+)"|([\w]+)/g)).map(x => (x[1] || x[2]).toLowerCase())
  let results = index.search(searchCriteria, {
    filter: ({ articulos, data }) => (
      (articuloFilter === null || articulos.includes(articuloFilter)) &&
      words.every((word: string) => data.toLowerCase().includes(word))
    ),
  })
  global.self.postMessage(['setDidSearch', true])
  global.self.postMessage(['setSearchResults', results.slice(0, 40)])
}

export async function init () {
  let contentLength = -1;
  // for some reason, mf react server does not return content-length on static GET
  fetch(`${process.env.PUBLIC_URL}/data.json.gz`, { method: 'HEAD' })
    .then((res) => contentLength = parseInt(res.headers.get('content-length') || '-1', 10))
  fetch(`${process.env.PUBLIC_URL}/data.json.gz`)
    .then(fetchProgress({
      onProgress({ transferred } ) {
        if (contentLength !== -1) {
          global.self.postMessage(['setProgress', transferred / contentLength])
        }
      },
      onError(err) {
        // TODO: something
      },
    }))
    .then((res) => res.arrayBuffer())
    // minisearch configuration must match 3-index's
    .then((data) => {
      const textData = new TextDecoder().decode(pako.inflate(data));
      index = MiniSearch.loadJSON(textData, {
        idField: 'caso',
        fields: ['caso', 'data'],
        storeFields: ['caso', 'data', 'fecha', 'filename', 'articulos'],
        searchOptions: {
          boost: { caso: 10 },
          combineWith: 'AND',
          prefix: true
        }
      })
      const storedFields: Caso[] = Object.values(JSON.parse(textData).storedFields);
      storedFields.sort((a: Caso, b: Caso) => (a.fecha || '').localeCompare(b.fecha || ''))
      global.self.postMessage(['setLatest', storedFields.slice(-10).reverse()]);
      global.self.postMessage(['setReady', true])
      doSearch()
    })
    // TODO: handle error
}

export async function search (searchCriteria: string, searchArticuloFilter: number | null) {
  criteria = searchCriteria
  articuloFilter = searchArticuloFilter
  doSearch()
}
