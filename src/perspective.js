import PerspectiveGroup from './perspective-group'
import {or} from './util'

const filter = Symbol('filter')

class Perspective {
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

export default Perspective
