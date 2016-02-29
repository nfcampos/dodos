import {flow, and} from './util'

const Arrays = new WeakMap()

export default class Dodo {
  constructor(array, filters, maps) {
    Arrays.set(this, array)
    this.filters = filters || []
    this.maps = maps || []
  }

  toArray() { return [...this] }

  *[Symbol.iterator]() {
    const filters = and(this.filters)
    const maps = this.maps.length ? flow(this.maps) : false

    let desc = {}
    for (const [colname, index] of Object.entries(Arrays.get(this).index))
      desc[colname] = {get: () => row[index]}
    const proxy = Object.defineProperties({}, desc)

    let row
    if (maps) {
      for (row of Arrays.get(this))
        if (filters(proxy))
          yield maps(proxy)
    } else {
      for (row of Arrays.get(this))
        if (filters(proxy))
          yield row
    }
  }

  filter(fn) {
    return new Dodo(Arrays.get(this), [...this.filters, fn], this.maps)
  }

  map(fn) {
    return new Dodo(Arrays.get(this), this.filters, [...this.maps, fn])
  }

  uniq(fn) { return new Set(this.map(fn)) }

  count() {
    let i = 0
    for (const row of this) // eslint-disable-line no-unused-vars
      ++i
    return i
  }

  group(colname) {
    let map = []
    for (const val of this.uniq(d => d[colname]))
      map.push([val, this.filter(d => d[colname] == val)])
    return Flock(map)
  }
}

function Flock(map, prop, args) {
  map = new Map(map)

  if (prop) {
    for (const [key, perspective] of map.entries())
      map.set(key, perspective[prop](...args))
  }

  // if the values are Dodos add the Dodo methods to the returned Map
  // otherwise just return a regular Map
  if (map.values().next().value instanceof Dodo)
    for (const method of Object.getOwnPropertyNames(Dodo.prototype))
      map[method] = (...args) => Flock(map, method, args)

  return map
}
