import Perspective from './perspective'

const first = Symbol('first')

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

export default PerspectiveGroup
