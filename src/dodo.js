import invariant from 'invariant'
import zip from 'lodash/zip'
import zipObject from 'lodash/zipObject'
import unzip from 'lodash/unzip'
import flatten from 'lodash/flatten'
import {map, filter, drop, take, transduce} from 'transducers.js'

import {
  identity, combineReducers, REDUCERS, spread, createGrouper, isfunc,
  arrayToIndex, compose, transduceNoBreak, arrayReducer, needSlowCase,
  dispatchReduce
} from './helpers'

const noActions = []

const Arrays = new WeakMap()

export default class Dodo {
  constructor(array, index, actions=noActions) {
    if (Array.isArray(index))
      index = arrayToIndex(index)

    invariant(Array.isArray(array), `new Dodo(arr, index) - arr is required`)
    invariant(index === false || actions !== noActions || Object.keys(index).length == array[0].length,
      `new Dodo(arr, index) - index length (${Object.keys(index).length}) != array[0].length (${array[0].length})`)

    this.index = index
    this.actions = actions
    Arrays.set(this, array)
  }

  get columns() {
    return Object.keys(this.index).sort((a, b) => this.index[a] - this.index[b])
  }

  [Symbol.iterator]() { return this.toArray().values() }

  toArray() {
    if (this.actions != noActions)
      return (this.actions.some(needSlowCase) ? transduce : transduceNoBreak)(
        Arrays.get(this),
        compose(this.actions),
        arrayReducer,
        []
      )
    else
      return Arrays.get(this)
  }

  get length() { return this.toArray().length }

  uniq() { return [...new Set(this)] }

  transform(transformer, index=this.index) {
    return new Dodo(Arrays.get(this), index, [...this.actions, transformer])
  }

  filter(fn) {
    invariant(isfunc(fn), `Dodo#filter(fn) — fn not a function`)
    if (this.index) {
      const I = this.index
      return this.transform(filter(row => fn(row, I)))
    } else {
      return this.transform(filter(fn))
    }
  }

  filterBy(name, fn) {
    invariant(this.index, `Dodo#filterBy(name, fn) — only available on indexed dodos`)
    invariant(name, `Dodo#filterBy(name, fn) - name is required`)
    invariant(isfunc(fn), `Dodo#filterBy(name, fn) - fn not a function`)
    const col = this.index[name]
    invariant(col != null, `Dodo#col(name) — name ${name} not in index`)
    return this.transform( filter(row => fn(row[col])) )
  }

  map(fn) {
    invariant(isfunc(fn), `Dodo#map(fn) — fn not a function`)
    if (this.index) {
      const I = this.index
      return this.transform(map(row => fn(row, I)))
    } else {
      return this.transform(map(fn))
    }
  }

  col(name) {
    invariant(this.index, `Dodo#col(name) — only available on indexed dodos`)
    invariant(name, `Dodo#col(name) - name is required`)

    const col = this.index[name]
    invariant(col != null, `Dodo#col(name) — name ${name} not in index`)

    return this.transform(map(row => row[col]), false)
  }

  cols(...names) {
    invariant(this.index, `Dodo#cols(...names) — only available on indexed dodos`)
    names = names.length ? flatten(names) : undefined
    invariant(names, `Dodo#cols(...names) - names is required`)

    const indices = names.map(name => this.index[name])
    indices.forEach(i => invariant(i != null, `Dodo#cols(...names) - name ${this.columns[i]} not in index`))

    const fn = map(new Function('row',`return [${indices.map(i => `row[${i}]`).join(',')}]`))
    return this.transform(fn, names)
  }

  skip(amount) {
    invariant(Number.isFinite(amount), `Dodo#skip(amount) - amount must be a number`)
    invariant(amount >= 0, `Dodo#skip(amount) — amount smaller than 0`)

    if (amount === 0)
      return this
    else
      return this.transform(drop(amount))
  }

  take(amount) {
    invariant(Number.isFinite(amount), `Dodo#take(amount) - amount must be a number`)
    invariant(amount >= 0, `Dodo#take(amount) — amount smaller than 0`)

    return this.transform(take(amount))
  }

  reduce(fn, init, final=identity) {
    invariant(init != null, `Dodo#reduce(fn, init, final) - init is required`)
    invariant(isfunc(fn), `Dodo#reduce(fn, init, final) — fn not a function`)
    invariant(isfunc(final), `Dodo#reduce(fn, init, final) — final not a function`)

    return (this.actions.some(needSlowCase) ? transduce : transduceNoBreak)(
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
    invariant(this.index, `Dodo#reduceEach(fn, initFactory, final?) - only available on indexed dodos`)
    invariant(isfunc(fn), `Dodo#reduceEach(fn, initFactory, final?) — fn not a function`)
    invariant(isfunc(initFactory), `Dodo#reduceEach(fn, initFactory, final?) - initFactory not a function`)
    invariant(isfunc(final), `Dodo#reduceEach(fn, ininitFactory, final?) — final not a function`)

    const [fns, inits, finals] = unzip(this.columns.map(() => [fn, initFactory(), final]))
    return zipObject(
      this.columns,
      this.reduce(combineReducers(fns, true), inits, spread(finals))
    )
  }

  stats(...methods) {
    invariant(methods && methods.length, `Dodo#stats(...methods) - at least one method is required`)
    methods.forEach(m => invariant(typeof m == 'string' && m in REDUCERS, `Dodo#stats(...methods) - method ${m} is not implemented`))

    const [fns, inits, finals] = zip(...methods.map(m => REDUCERS[m]))
    return dispatchReduce.call(this,
      combineReducers(fns),
      () => inits.map(i => i()),
      spread(finals)
    )
  }

  count() { return dispatchReduce.call(this, ...REDUCERS.count) }

  sum() { return dispatchReduce.call(this, ...REDUCERS.sum) }

  min() { return dispatchReduce.call(this, ...REDUCERS.min) }

  max() { return dispatchReduce.call(this, ...REDUCERS.max) }

  countUniq() { return dispatchReduce.call(this, ...REDUCERS.countUniq) }

  mean() { return dispatchReduce.call(this, ...REDUCERS.mean) }

  groupBy(name, fn) {
    if (isfunc(name)) {
      fn = name
      name = undefined
    }
    invariant(this.index ? name : !name, `Dodo#groupBy(name, fn?) — name is required on indexed dodos` )
    invariant(!name || this.columns.includes(name), `Dodo#groupBy(name?, fn?) — name ${name} not in index`)
    invariant(!fn || isfunc(fn), `Dodo#groupBy(name?, fn?) — fn not a function`)

    const grouper = createGrouper(fn, name ? this.index[name] : name)
    const toDodos = map => (map.forEach(arrayToDodo(this.index)), map)
    return Flock(this.reduce(grouper, new Map(), toDodos))
  }

  flock(fn) {
    invariant(isfunc(fn), `Dodo#flock(fn) — fn not a function`)
    return Flock(fn.call(this, this))
  }
}

export function arrayToDodo(index) {
  return function(array, key, map) {
    map.set(key, new Dodo(array, index))
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
  const len = this.size
  let i = -1
  while (++i < len) {
    let entry = entries[i]
    entries[i] = fn(entry[1], entry[0], this)
  }
  return entries
}
