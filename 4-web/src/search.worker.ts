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
  fetch(`${process.env.PUBLIC_URL}/data.json`)
    .then((res) => res.text())
    // minisearch configuration must match datamaker's
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
