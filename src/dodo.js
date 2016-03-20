import invariant from 'invariant'
import zip from 'lodash/zip'
import zipObject from 'lodash/zipObject'
import unzip from 'lodash/unzip'

import {map, filter, drop, take, seq, compose} from 'transducers.js'

const action = Symbol('action')
const index = Symbol('index')
const names = Symbol('names')
const meta = Symbol('meta')
const dispatchReduce = Symbol('dispatchReduce')
const noActions = []

const Arrays = new WeakMap()
const ArraysMetadata = new WeakMap()

const isfunc = fn => fn && typeof fn == 'function'
const arrayToIndex = arr => zipObject(arr, [...arr.keys()])

export default class Dodo {
  constructor(array, index, actions=noActions) {
    if (Array.isArray(index))
      index = arrayToIndex(index)

    invariant(Array.isArray(array), `new Dodo(arr, index) - arr is required`)
    invariant(index && Object.keys(index).length == array[0].length,
      `new Dodo(arr, index) - index is missing or malformed`)

    Arrays.set(this, array)
    if (!ArraysMetadata.has(array))
      ArraysMetadata.set(array, {
        index: index,
        length: array.length,
        columns: new Set(Object.keys(index)),
      })
    this.actions = actions
  }

  get [meta]() { return ArraysMetadata.get(Arrays.get(this)) }

  get [index]() {
    const lastMapWithIndex = this.actions.filter(act => !!act.I).slice(-1)

    if (lastMapWithIndex.length)
      return lastMapWithIndex[0].I
    else
      return this[meta].index
  }

  get [names]() {
    const I = this[index]
    return Object.keys(I).sort((a, b) => I[a] > I[b] ? 1 : -1)
  }

  [Symbol.iterator]() { return this.toArray().values() }

  toArray() {
    if (this.actions.length)
      return seq(Arrays.get(this), compose(...this.actions))
    else
      return Arrays.get(this)
  }

  uniq() { return [...new Set(this)] }

  [action](action) {
    return new Dodo(
      Arrays.get(this), this[meta].index, [...this.actions, action])
  }

  filter(fn) {
    invariant(isfunc(fn), `Dodo#filter(fn) — fn not a function`)
    const I = this[index]
    return this[action](filter(row => fn(row, I)))
  }

  filterBy(name, fn) {
    invariant(name, `Dodo#filterBy(name, fn) - col is required`)
    invariant(isfunc(fn), `Dodo#filterBy(name, fn) - fn not a function`)
    const col = this[index][name]
    return this[action]( filter(row => fn(row[col])) )
  }

  map(fn) {
    invariant(isfunc(fn), `Dodo#map(fn) — fn not a function`)
    const I = this[index]
    return this[action](map(row => fn(row, I)))
  }

  col(name) {
    invariant(name, `Dodo#filterBy(name, fn) - col is required`)
    invariant(this[meta].columns.has(name),
      `Dodo#col(name) — name ${name} not in index`)
    const col = this[index][name]
    return this[action](map(row => row[col]))
  }

  cols(names) {
    invariant(Array.isArray(names), `Dodo#cols(names) - names is required`)
    names.forEach(name => invariant(
      this[meta].columns.has(name),
      `Dodo#cols(names) — name ${name} not in index`
    ))
    const indices = names.map(name => this[index][name])
    const fn = map(row => indices.map(i => row[i]))
    fn.I = arrayToIndex(names)
    return this[action](fn)
  }

  skip(amount) {
    invariant(amount, `Dodo#skip(amount) - amount is required`)
    invariant(amount > 0, `Dodo#skip(amount) — amount smaller than 0`)
    return this[action](drop(amount))
  }

  take(amount) {
    invariant(amount, `Dodo#take(amount) - amount is required`)
    invariant(amount > 0, `Dodo#take(amount) — amount smaller than 0`)
    return this[action](take(amount))
  }

  [dispatchReduce](args) {
    if (this[index] == this[meta].index)
      return this.reduce(...args())
    else
      return this._reduceEach(args)
  }

  reduce(fn, init, final=identity) {
    invariant(init != null, `Dodo#reduce(fn, init, final) - init is required`)
    invariant(isfunc(fn), `Dodo#reduce(fn, init, final) — fn not a function`)
    invariant(isfunc(final),
      `Dodo#reduce(fn, init, final) — final not a function`)
    const array = this.toArray()
    const len = array.length
    let i = -1
    while (++i < len) {
      init = fn(init, array[i])
    }
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

Dodo.prototype.drop = Dodo.prototype.skip

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
    map.set(key, new Dodo(array, Index))
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
