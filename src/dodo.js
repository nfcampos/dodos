import invariant from 'invariant'

const MAP_ACTION = 'MAP_ACTION'
const FILTER_ACTION = 'FILTER_ACTION'
const SLICE_ACTION = 'SLICE_ACTION'

const action = Symbol('action')
const index = Symbol('index')
const meta = Symbol('meta')
const dispatch = Symbol('dispatch')
const noActions = []

const Arrays = new WeakMap()
const ArraysMetadata = new WeakMap()

const required = () => {
  throw new Error('Dodo - missing required argument')
}

export default class Dodo {
  constructor(array=required(), actions=noActions) {
    Arrays.set(this, array)
    if (!ArraysMetadata.has(array))
      ArraysMetadata.set(array, {
        length: array.length,
        columns: new Set(Object.keys(array.index)),
      })
    this.actions = actions
  }

  get [meta]() { return ArraysMetadata.get(Arrays.get(this)) }

  get [index]() {
    const lastMapWithIndex = this.actions
      .filter(act => act.type == MAP_ACTION && act.I)
      .slice(-1)

    if (lastMapWithIndex.length)
      return lastMapWithIndex[0].I
    else
      return Arrays.get(this).index
  }

  [dispatch](method, fn, init) {
    if (this[index] == Arrays.get(this).index)
      return this[method](fn, init)
    else
      return this[method + 'Each'](fn, init)
  }

  [action](action) {
    return new Dodo(Arrays.get(this), [...this.actions, action])
  }

  *[Symbol.iterator]() {
    const array = Arrays.get(this)
    const Index = array.index
    const nrOfActions = this.actions.length

    if (!nrOfActions) {

      yield* array

    } else {

      const lastActionIndex = this.actions.length - 1
      let lastRowIndex = ArraysMetadata.get(array).length - 1

      // TODO: if there is a slice before any filter
      // set rowIndex to slice.start - 1
      let rowIndex = -1
      while (rowIndex++ < lastRowIndex) {
        let row = array[rowIndex]
        let actionIndex = -1
        let I = Index
        while (actionIndex++ < lastActionIndex) {
          const action = this.actions[actionIndex]
          if (action.type == SLICE_ACTION) {
            if (++action.counter < action.first)
              break
            if (action.counter == action.last)
              lastRowIndex = rowIndex
          } if (action.type == FILTER_ACTION) {
            if (!action(row, I))
              break
          } if (action.type == MAP_ACTION) {
            row = action(row, I)
            I = action.I || I
          }
          if (actionIndex == lastActionIndex)
            yield row
        }
      }

    }
  }

  toArray() { return [...this] }

  uniq() { return [...new Set(this)] }

  filter(fn=required()) {
    invariant(typeof fn == 'function', `Dodo#filter(fn) — fn not a function`)
    fn.type = FILTER_ACTION
    return this[action](fn)
  }

  filterBy(col=required(), fn=required()) {
    return this.filter( (row, I) => fn(row[I[col]]) )
  }

  map(fn=required()) {
    invariant(typeof fn == 'function', `Dodo#map(fn) — fn not a function`)
    fn.type = MAP_ACTION
    return this[action](fn)
  }

  col(name=required()) {
    invariant(this[meta].columns.has(name),
      `Dodo#col(name) — name ${name} not in index`)
    const col = this[index][name]
    return this.map(row => row[col])
  }

  cols(names=required()) {
    names.forEach(name => invariant(
      this[meta].columns.has(name),
      `Dodo#cols(names) — name ${name} not in index`
    ))
    const fn = (row, I) => names.map(name => row[I[name]])
    fn.I = {}
    names.forEach((name, i) => fn.I[name] = i)
    return this.map(fn)
  }

  slice(start=0, end) {
    const len = this[meta].length
    if (typeof end != 'number')
      end = len
    if (end == len && start == 0)
      return this
    invariant(start >= 0, `Dodo#slice(start, end) — start smaller than 0`)
    invariant(end >= 0, `Dodo#slice(start, end) — end smaller than 0`)
    invariant(start < end, `Dodo#slice(start, end) — end larger than start`)
    return this[action]({
      type: SLICE_ACTION,
      counter: -1,
      first: start,
      last: end - 1,
    })
  }

  skip(amount=required()) {
    invariant(amount > 0, `Dodo#skip(amount) — amount smaller than 0`)
    return this.slice(amount)
  }

  take(amount=required()) {
    invariant(amount > 0, `Dodo#take(amount) — amount smaller than 0`)
    return this.slice(0, amount)
  }

  reduce(fn=required(), init=required()) {
    invariant(typeof fn == 'function', `Dodo#reduce(fn) — fn not a function`)
    for (const row of this)
      init = fn(init, row)
    return init
  }

  reduceEach(...args) {
    //TODO: this must be incredibly slow, same deal as groupBy
    return Object.keys(this[index]).map(col => this.col(col).reduce(...args))
  }

  count() {
    return this[dispatch]('reduce', count => ++count, 0)
  }

  sum() {
    return this[dispatch]('reduce', (sum, el) => sum + el, 0)
  }

  min() {
    return this[dispatch]('reduce', (min, el) => min < el ? min : el, Infinity)
  }

  max() {
    return this[dispatch]('reduce', (max, el) => max > el ? max : el, -Infinity)
  }

  mean() {
    if (this[index] == Arrays.get(this).index)
      return this.sum() / this.count()
    else {
      const counts = this.count()
      return this.sum().map((sum, i) => sum / counts[i])
    }
  }

  groupBy(name=required(), fn) {
    invariant(this[meta].columns.has(name),
      `Dodo#group(name) — name ${name} not in index`)
    let map = new Map()
    const I = this[index][name]
    for (const row of this) {
      const key = fn ? fn(row[I]) : row[I]
      map.has(key)
        ? map.get(key).push(row)
        : map.set(key, [row])
    }
    for (const [key, array] of map) {
      array.index = this[index]
      map.set(key, new Dodo(array))
    }
    return Flock( map )
  }
}

function Flock(map, method, args) {
  map = new Map(map)

  // if called with method arg call that method on all Dodos
  if (method)
    for (const [key, dodo] of map.entries())
      map.set(key, dodo[method](...args))

  // if the values are Dodos add the Dodo methods to the returned Map
  // otherwise just return a regular Map
  if (map.values().next().value instanceof Dodo)
    for (const method of Object.getOwnPropertyNames(Dodo.prototype))
      if (method != 'constructor')
        map[method] = (...args) => Flock(map, method, args)

  map.mapEntries = fn => [...map.entries()].map(fn)

  return map
}
