import fetchProgress from 'fetch-progress'
import MiniSearch from 'minisearch'

let index: MiniSearch
let criteria = ''

const doSearch = () => {
  if (!index) return
  const c = criteria.split(' ').filter((x) => x.length >= 3).join(' ')
  if (c === '') {
    global.self.postMessage(['setDidSearch', false])
    global.self.postMessage(['setSearchResults', []])
    return
  }
  const results = index.search(criteria)
  global.self.postMessage(['setDidSearch', true])
  global.self.postMessage(['setSearchResults', results.slice(0, 40)])
}

export async function init () {
  let contentLength = -1;
  // for some reason, mf react server does not return content-length on static GET
  fetch(`${process.env.PUBLIC_URL}/data.json`, { method: 'HEAD' })
    .then((res) => contentLength = parseInt(res.headers.get('content-length') || '-1', 10))
  fetch(`${process.env.PUBLIC_URL}/data.json`)
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
    .then((res) => res.text())
    // minisearch configuration must match 3-index's
    .then((data) => {
      index = MiniSearch.loadJSON(data, {
        idField: 'caso',
        fields: ['caso', 'data'],
        storeFields: ['caso', 'data', 'fecha', 'filename'],
        searchOptions: {
          boost: { caso: 10 },
          combineWith: 'AND',
          prefix: true
        }
      })
      global.self.postMessage(['setReady', true])

      doSearch()
    })
    // TODO: handle error
}

export async function search (searchCriteria: string) {
  criteria = searchCriteria
  doSearch()
}
