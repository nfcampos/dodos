import invariant from 'invariant'
import zip from 'lodash/zip'
import zipObject from 'lodash/zipObject'
import unzip from 'lodash/unzip'

const MAP_ACTION = 'MAP_ACTION'
const FILTER_ACTION = 'FILTER_ACTION'
const SLICE_ACTION = 'SLICE_ACTION'

const action = Symbol('action')
const index = Symbol('index')
const names = Symbol('names')
const meta = Symbol('meta')
const dispatchReduce = Symbol('dispatchReduce')
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

  get [names]() {
    const I = this[index]
    return Object.keys(I).sort((a, b) => I[a] > I[b] ? 1 : -1)
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
      let rowIndex

      const firstNonMap = this.actions
        .filter(act => act.type != MAP_ACTION)
        .slice(0, 1)

      if (firstNonMap.type == SLICE_ACTION)
        rowIndex = firstNonMap.start - 1
      else
        rowIndex = -1

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
    fn.I = zipObject(names, [...names.keys()])
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

  [dispatchReduce](args) {
    if (this[index] == Arrays.get(this).index)
      return this.reduce(...args())
    else
      return this._reduceEach(args)
  }

  reduce(fn, init, final=identity) {
    invariant(init != null, `Dodo#reduce(fn, init, final) - init is required`)
    invariant(fn && typeof fn == 'function',
      `Dodo#reduce(fn, init, final) — fn not a function`)
    for (const row of this)
      init = fn(init, row)
    return final === identity ? init : final(init)
  }

  _reduceEach(args) {
    const [fns, inits, finals] = unzip(this[names].map(() => args()))
    return zipObject(
      this[names],
      this.reduce(combineReducers(fns, true), inits, spread(finals))
    )
  }

  stats(...methods) {
    const args = () => {
      const [fns, inits, finals] = zip(...methods.map(m => REDUCERS[m]()))
      return [combineReducers(fns), inits, spread(finals)]
    }
    return this[dispatchReduce](args)
  }

  count() { return this[dispatchReduce](REDUCERS.count) }

  sum() { return this[dispatchReduce](REDUCERS.sum) }

  min() { return this[dispatchReduce](REDUCERS.min) }

  max() { return this[dispatchReduce](REDUCERS.max) }

  countUniq() { return this[dispatchReduce](REDUCERS.countUniq) }

  mean() { return this[dispatchReduce](REDUCERS.mean) }

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

const spread = (fns) => {
  const len = fns.length
  return value => {
    let i = len
    while (i--) {
      value[i] = fns[i](value[i])
    }
    return value
  }
}

const combineReducers = (fns, spread) => {
  const len = fns.length
  if (spread) {
    return (accs, row) => {
      let i = len
      while (i--) {
        accs[i] = fns[i](accs[i], row[i])
      }
      return accs
    }
  } else {
    return (accs, row) => {
      let i = len
      while (i--) {
        accs[i] = fns[i](accs[i], row)
      }
      return accs
    }
  }
}

const identity = a => a

const REDUCERS = {
  max: () => [(max, el) => max > el ? max : el, -Infinity, identity],
  min: () => [(min, el) => min < el ? min : el, Infinity, identity],
  sum: () => [(sum, el) => sum + el, 0, identity],
  mean: () => [
    ([count, sum], el) => [++count, sum + el],
    [0, 0],
    ([count, sum]) => sum / count
  ],
  count: () => [count => ++count, 0, identity],
  countUniq: () => [(set, el) => set.add(el), new Set(), set => set.size],
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

const dodoMethods = Object.getOwnPropertyNames(Dodo.prototype)
dodoMethods.filter(method => method != 'constructor')

function Flock(map, method, args) {
  map = new Map(map)

  // if called with method arg call that method on all Dodos
  if (method)
    for (const [key, dodo] of map.entries())
      map.set(key, dodo[method](...args))

  // if the values are Dodos add the Dodo methods to the returned Map
  if (map.values().next().value instanceof Dodo)
    for (const method of dodoMethods)
      map[method] = (...args) => Flock(map, method, args)

  // mapEntries method with same signature as native Map#forEach()
  map.mapEntries = mapEntries

  return map
}

function mapEntries(fn) {
  const entries = [...this.entries()]
  let i = this.size
  while (i--) {
    let entry = entries[i]
    entries[i] = fn(entry[1], entry[0], this)
  }
  return entries
}
