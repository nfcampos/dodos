import invariant from 'invariant'
import zip from 'lodash/zip'
import zipObject from 'lodash/zipObject'
import unzip from 'lodash/unzip'
import flatten from 'lodash/flatten'
import {map, filter, drop, take, seq, transduce} from 'transducers.js'

import {
  identity, combineReducers, REDUCERS, spread, createGrouper, isfunc,
  arrayToIndex, compose
} from './helpers'

const action = Symbol('action')
const index = Symbol('index')
const names = Symbol('names')
const meta = Symbol('meta')
const dispatchReduce = Symbol('dispatchReduce')
const noActions = []

const Arrays = new WeakMap()
const Metadata = new WeakMap()

export default class Dodo {
  constructor(array, index, actions=noActions) {
    if (Array.isArray(index))
      index = arrayToIndex(index)

    invariant(Array.isArray(array), `new Dodo(arr, index) - arr is required`)
    invariant(index && Object.keys(index).length == array[0].length,
      `new Dodo(arr, index) - index is missing or malformed`)

    Arrays.set(this, array)
    if (!Metadata.has(array))
      Metadata.set(array, {
        index: index,
        columns: new Set(Object.keys(index)),
      })
    this.actions = actions
  }

  get [meta]() { return Metadata.get(Arrays.get(this)) }

  get [index]() {
    const lastMapWithIndex = this.actions.filter(act => !!act.I).slice(-1)

    if (lastMapWithIndex.length)
      return lastMapWithIndex[0].I
    else
      return this[meta].index
  }

  get [names]() {
    const I = this[index]
    return Object.keys(I).sort((a, b) => I[a] - I[b])
  }

  [Symbol.iterator]() { return this.toArray().values() }

  toArray() {
    if (this.actions.length)
      return seq(Arrays.get(this), compose(this.actions))
    else
      return Arrays.get(this)
  }

  get length() { return this.toArray().length }

  uniq() { return [...new Set(this)] }

  [action](action) {
    return new Dodo(
      Arrays.get(this), this[meta].index, [...this.actions, action])
  }

  filter(fn) {
    invariant(isfunc(fn), `Dodo#filter(fn) — fn not a function`)
    if (this[names].length == 1) {
      return this[action](filter(fn))
    } else {
      const I = this[index]
      return this[action](filter(row => fn(row, I)))
    }
  }

  filterBy(name, fn) {
    invariant(name, `Dodo#filterBy(name, fn) - col is required`)
    invariant(isfunc(fn), `Dodo#filterBy(name, fn) - fn not a function`)
    const col = this[index][name]
    return this[action]( filter(row => fn(row[col])) )
  }

  map(fn) {
    invariant(isfunc(fn), `Dodo#map(fn) — fn not a function`)
    if (this[names].length == 1) {
      return this[action](map(fn))
    } else {
      const I = this[index]
      return this[action](map(row => fn(row, I)))
    }
  }

  col(name) {
    invariant(name, `Dodo#filterBy(name, fn) - col is required`)
    invariant(this[meta].columns.has(name),
      `Dodo#col(name) — name ${name} not in index`)
    const col = this[index][name]
    const fn = map(row => row[col])
    fn.I = arrayToIndex([name])
    return this[action](fn)
  }

  cols(...names) {
    names = names.length ? flatten(names) : undefined
    invariant(names, `Dodo#cols(names) - names is required`)
    names.forEach(n => invariant(
      this[meta].columns.has(n), `Dodo#cols(names) - name ${n} not in index`))

    const indices = names.map(name => this[index][name])
    const inner = new Function('row', `
      return [${indices.map(i => `row[${i}]`).join(',')}]
    `)
    const fn = map(inner)
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

  [dispatchReduce](fn, initFactory, final) {
    if (this[names].length == 1)
      return this.reduce(fn, initFactory(), final)
    else
      return this.reduceEach(fn, initFactory, final)
  }

  reduce(fn, init, final=identity) {
    invariant(init != null, `Dodo#reduce(fn, init, final) - init is required`)
    invariant(isfunc(fn), `Dodo#reduce(fn, init, final) — fn not a function`)
    invariant(isfunc(final),
      `Dodo#reduce(fn, init, final) — final not a function`)
    return transduce(
      Arrays.get(this),
      compose(this.actions),
      {
        ['@@transducer/step']: fn,
        ['@@transducer/result']: final
      },
      init
    )
  }

  reduceEach(fn, initFactory, final=identity) {
    invariant(isfunc(initFactory),
      `Dodo#reduceEach(fn, initFactory, final) - initFactory not a function`)
    invariant(isfunc(fn),
      `Dodo#reduceEach(fn, init, final) — fn not a function`)
    invariant(isfunc(final),
      `Dodo#reduceEach(fn, init, final) — final not a function`)
    const [fns, inits, finals] = unzip(
      this[names].map(() => [fn, initFactory(), final])
    )
    return zipObject(
      this[names],
      this.reduce(combineReducers(fns, true), inits, spread(finals))
    )
  }

  stats(...methods) {
    const [fns, inits, finals] = zip(...methods.map(m => REDUCERS[m]))
    return this[dispatchReduce](
      combineReducers(fns),
      () => inits.map(i => i()),
      spread(finals)
    )
  }

  count() { return this[dispatchReduce](...REDUCERS.count) }

  sum() { return this[dispatchReduce](...REDUCERS.sum) }

  min() { return this[dispatchReduce](...REDUCERS.min) }

  max() { return this[dispatchReduce](...REDUCERS.max) }

  countUniq() { return this[dispatchReduce](...REDUCERS.countUniq) }

  mean() { return this[dispatchReduce](...REDUCERS.mean) }

  groupBy(name, fn) {
    invariant(name, `Dodo#groupBy(name, fn) - name is required`)
    invariant(this[meta].columns.has(name),
      `Dodo#group(name) — name ${name} not in index`)

    const map = new Map()
    const grouper = createGrouper(map, fn, this[index][name])
    const array = this.toArray()
    const len = array.length
    let i = -1
    while (++i < len) {
      grouper(array[i])
    }
    map.forEach(arrayToDodo(this[index]))
    return Flock(map)
  }
}

function arrayToDodo(Index) {
  return function(array, key, map) {
    map.set(key, new Dodo(array, Index))
  }
}

Dodo.prototype.drop = Dodo.prototype.skip

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
