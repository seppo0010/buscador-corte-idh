import fetchProgress from 'fetch-progress'
import MiniSearch from 'minisearch'
import pako from 'pako'
import Caso from './Caso'

let index: MiniSearch
let allDocs: Caso[] = []
let criteria = ''
let articuloFilter: null | number = null
let paisFilter: null | string = null
let desdeFilter: null | number = null
let hastaFilter: null | number = null
let tipoFilter: null | string = null
let sortOrder: 'relevancia' | 'fecha' = 'relevancia'

const matchesFilters = ({ articulos, pais, fecha, tipo_documento }: any): boolean => {
  if (articuloFilter !== null && !(articulos || []).includes(articuloFilter)) return false
  if (paisFilter && pais !== paisFilter) return false
  if (fecha) {
    const year = parseInt(fecha.slice(0, 4), 10)
    if (desdeFilter !== null && year < desdeFilter) return false
    if (hastaFilter !== null && year > hastaFilter) return false
  }
  if (tipoFilter && tipo_documento !== tipoFilter) return false
  return true
}

const hasActiveFilters = () =>
  articuloFilter !== null || paisFilter !== null ||
  desdeFilter !== null || hastaFilter !== null || tipoFilter !== null

const doSearch = () => {
  if (!index) return
  const c = criteria.split(' ').filter((x) => x.length >= 3).join(' ')

  if (c === '' && !hasActiveFilters()) {
    global.self.postMessage(['setDidSearch', false])
    global.self.postMessage(['setSearchResults', []])
    return
  }

  global.self.postMessage(['setDidSearch', true])

  if (c === '') {
    // Filters only — scan all stored docs sorted by date
    const results = allDocs
      .filter(matchesFilters)
      .sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''))
    global.self.postMessage(['setSearchResults', results.slice(0, 40)])
    return
  }

  let results = index.search(criteria, { filter: matchesFilters })
  if (sortOrder === 'fecha') {
    results = results.sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''))
  }
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
        idField: 'filename',
        fields: ['caso', 'data'],
        storeFields: ['caso', 'resumen', 'fecha', 'filename', 'articulos', 'pais', 'numero_serie', 'tipo_documento', 'tipo_sentencia'],
        searchOptions: {
          boost: { caso: 10 },
          combineWith: 'AND',
          prefix: true
        }
      })
      const storedFields: Caso[] = Object.values(JSON.parse(textData).storedFields);
      storedFields.sort((a: Caso, b: Caso) => (a.fecha || '').localeCompare(b.fecha || ''))
      allDocs = storedFields
      global.self.postMessage(['setLatest', storedFields.slice(-10).reverse()]);

      const countries = Array.from(new Set(
        storedFields.map((c: Caso) => c.pais).filter(Boolean)
      )).sort() as string[];
      global.self.postMessage(['setCountries', countries]);

      global.self.postMessage(['setReady', true])
      doSearch()
    })
    // TODO: handle error
}

export async function search (
  searchCriteria: string,
  searchArticuloFilter: number | null,
  searchPaisFilter: string | null,
  searchDesdeFilter: number | null,
  searchHastaFilter: number | null,
  searchTipoFilter: string | null,
  searchSortOrder: 'relevancia' | 'fecha',
) {
  criteria = searchCriteria
  articuloFilter = searchArticuloFilter
  paisFilter = searchPaisFilter
  desdeFilter = searchDesdeFilter
  hastaFilter = searchHastaFilter
  tipoFilter = searchTipoFilter
  sortOrder = searchSortOrder
  doSearch()
}
