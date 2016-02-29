import {or} from './util'
import {first, filter} from './symbols'

export default class Perspective {
  constructor(array, masks, colname) {
    let desc = {}
    for (const colname of Object.keys(array.index))
      desc[colname] = {get: () => new Perspective(array, masks, colname)}
    Object.defineProperties(this, desc)

    this.array = array
    this.masks = masks || []
    this.col = colname ? array.index[colname] : false
  }

  toArray() { return [...this] }

  *[Symbol.iterator]() {
    const masks = or(this.masks)
    for (const row of this.array)
      if (masks(row))
        yield row
  }

  [filter](fn) { return new Perspective(this.array, [...this.masks, fn]) }

  eq(comp) {
    return this[filter](row => row[this.col] === comp)
  }

  between(down, up) {
    return this[filter](row => row[this.col] <= up && row[this.col] >= down)
  }

  *map(fn) {
    if (this.col)
      for (const row of this)
        yield fn ? fn(row[this.col]) : row[this.col]
    else
      for (const row of this)
        yield fn ? fn(row) : row
  }

  uniq(fn) { return new Set(this.map(fn)) }

  count() {
    let i = 0
    for (const row of this)
      ++i
    return i
  }

  groupBy(colname) {
    const uniques = this[colname].uniq()
    let hash = {}
    for (const val of uniques) {
      hash[val] = this[colname].eq(val)
    }
    return new PerspectiveGroup(hash)
  }
}

class PerspectiveGroup {
  constructor(hash, prop, args) {
    this.hash = hash instanceof PerspectiveGroup ? hash.hash : hash

    if (prop)
      for (const [key, perspective] of this)
        this.hash[key] = args ? perspective[prop](...args) : perspective[prop]

    if (this[first] instanceof Perspective) {

      let desc = {}
      for (let colname of Object.keys(this[first].array.index))
        desc[colname] = {get: () => new PerspectiveGroup(this, colname)}
      Object.defineProperties(this, desc)

    } else {

      // still not sure about this part
      this.hash[Symbol.iterator] = function*() {
        for (const [key, iter] of Object.entries(this))
          yield [key, [...iter]]
      }
      return this.hash

    }
  }

  *[Symbol.iterator]() { yield* Object.entries(this.hash) }

  get [first]() { return this[Symbol.iterator]().next().value[1] }
}

for (const method of Object.getOwnPropertyNames(Perspective.prototype))
  if (!(method in PerspectiveGroup.prototype))
    PerspectiveGroup.prototype[method] = function(...args) {
      return new PerspectiveGroup(this, method, args)
    }
