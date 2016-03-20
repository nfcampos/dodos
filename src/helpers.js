import zipObject from 'lodash/zipObject'

export const spread = (fns) => {
  const len = fns.length
  return value => {
    let i = len
    while (i--) {
      value[i] = fns[i](value[i])
    }
    return value
  }
}

export const combineReducers = (fns, spread) => {
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

export const identity = a => a

export const REDUCERS = {
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

export function createGrouper(map, fn, col) {
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

export const isfunc = fn => fn && typeof fn == 'function'
export const arrayToIndex = arr => zipObject(arr, [...arr.keys()])
