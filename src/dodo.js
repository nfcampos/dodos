import invariant from 'invariant'
import zip from 'lodash/zip'

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

export default class Dodo {
  constructor(array, actions=noActions) {
    invariant(array, `new Dodo(array) - array is required`)
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

  filter(fn) {
    invariant(fn && typeof fn == 'function',
      `Dodo#filter(fn) — fn not a function`)
    fn.type = FILTER_ACTION
    return this[action](fn)
  }

  filterBy(col, fn) {
    invariant(col, `Dodo#filterBy(col, fn) - col is required`)
    invariant(fn, `Dodo#filterBy(col, fn) - fn is required`)
    return this.filter( (row, I) => fn(row[I[col]]) )
  }

  map(fn) {
    invariant(fn && typeof fn == 'function', `Dodo#map(fn) — fn not a function`)
    fn.type = MAP_ACTION
    return this[action](fn)
  }

  col(name) {
    invariant(name, `Dodo#col(name) - name is required`)
    invariant(this[meta].columns.has(name),
      `Dodo#col(name) — name ${name} not in index`)
    const col = this[index][name]
    return this.map(row => row[col])
  }

  cols(names) {
    invariant(names, `Dodo#cols(names) - names is required`)
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

  skip(amount) {
    invariant(amount, `Dodo#skip(amount) - amount is required`)
    invariant(amount > 0, `Dodo#skip(amount) — amount smaller than 0`)
    return this.slice(amount)
  }

  take(amount) {
    invariant(amount, `Dodo#take(amount) - amount is required`)
    invariant(amount > 0, `Dodo#take(amount) — amount smaller than 0`)
    return this.slice(0, amount)
  }

  reduce(fn, init) {
    invariant(init != null, `Dodo#reduce(fn, init) - init is required`)
    invariant(fn && typeof fn == 'function',
      `Dodo#reduce(fn) — fn not a function`)
    for (const row of this)
      init = fn(init, row)
    return init
  }

  reduceEach(...args) {
    //TODO: make this not ridiculously slow
    //TODO: make this work for .stats()
    return Object.keys(this[index]).map(col => this.col(col).reduce(...args))
  }

  count() { return this[dispatch]('reduce', ...REDUCERS.count) }

  sum() { return this[dispatch]('reduce', ...REDUCERS.sum) }

  min() { return this[dispatch]('reduce', ...REDUCERS.min) }

  max() { return this[dispatch]('reduce', ...REDUCERS.max) }

  mean() {
    if (this[index] == Arrays.get(this).index) {
      const stats = this.stats('count', 'sum')
      return stats[1] / stats[0]
    } else {
      //TODO: this is still the slow version of mean
      const counts = this.count()
      return this.sum().map((sum, i) => sum / counts[i])
    }
  }

  stats(...methods) {
    const [fns, inits] = zip(...methods.map(m => REDUCERS[m]))
    return this.reduce(combineReducers(fns), inits)
  }

  groupBy(name, fn) {
    invariant(name, `Dodo#groupBy(name, fn) - name is required`)
    invariant(this[meta].columns.has(name),
      `Dodo#group(name) — name ${name} not in index`)
    const map = new Map()
    const grouper = createGrouper(map, fn, this[index][name])
    for (const row of this) grouper(row)
    map.forEach(arrayToDodo(this[index]))
    return Flock(map)
  }
}

const combineReducers = (fns) => {
  const len = fns.length
  return (accs, row) => {
    let i = -1
    while (++i < len) {
      accs[i] = fns[i](accs[i], row)
    }
    return accs
  }
}

const REDUCERS = {
  max: [(max, el) => max > el ? max : el, -Infinity],
  min: [(min, el) => min < el ? min : el, Infinity],
  sum: [(sum, el) => sum + el, 0],
  count: [count => ++count, 0],
}

function createGrouper(map, fn, col) {
  if (fn) {
    return function(row) {
      const key = fn(row[col])
      map.has(key)
        ? map.get(key).push(row)
        : map.set(key, [row])
    }
  } else {
    return function(row) {
      const key = row[col]
      map.has(key)
        ? map.get(key).push(row)
        : map.set(key, [row])
    }
  }
}

function arrayToDodo(Index) {
  return function(array, key, map) {
    array.index = Index
    map.set(key, new Dodo(array))
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

  map.mapEntries = fn => {
    const len = map.size
    const entries = [...map.entries()]
    let i = -1
    let entry
    while (++i < len) {
      entry = entries[i]
      entries[i] = fn(entry[1], entry[0], map)
    }
    return entries
  }

  return map
}
