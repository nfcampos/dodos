import {first} from './symbols'

export default class Dodo {
  constructor(array, masks, colname) {
    this.array = array
    this.masks = masks || []
    this.col = colname ? array.index[colname] : false
  }

  toArray() { return [...this] }

  *[Symbol.iterator]() {
    const rowObj = {}
    let descs = {}
    for (const colname of Object.keys(this.array.index))
      descs[colname] = {get: () => this.array[i][this.array.index[colname]]}
    Object.defineProperties(rowObj, descs)

    let i = -1
    const len = this.array.length
    while (++i < len) {
      let j = -1
      let bool = true
      let masksLen = this.masks.length
      while (bool && ++j < masksLen)
        bool = bool && this.masks[j](rowObj)
      if (bool)
        yield this.array[i]
    }
  }

  filter(fn) { return new Dodo(this.array, [...this.masks, fn]) }

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
    for (const row of this) // eslint-disable-line no-unused-vars
      ++i
    return i
  }

  groupBy(colname) {
    const uniques = this[colname].uniq()
    let hash = {}
    for (const val of uniques) {
      hash[val] = this[colname].eq(val)
    }
    return new Flock(hash)
  }
}

class Flock {
  constructor(hash, prop, args) {
    this.hash = hash instanceof Flock ? hash.hash : hash

    if (prop)
      for (const [key, perspective] of this)
        this.hash[key] = args ? perspective[prop](...args) : perspective[prop]

    if (this[first] instanceof Dodo) {

      let desc = {}
      for (let colname of Object.keys(this[first].array.index))
        desc[colname] = {get: () => new Flock(this, colname)}
      Object.defineProperties(this, desc)

    } else {

      // still unsure about this part
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

for (const method of Object.getOwnPropertyNames(Dodo.prototype))
  if (!(method in Flock.prototype))
    Flock.prototype[method] = function(...args) {
      return new Flock(this, method, args)
    }
