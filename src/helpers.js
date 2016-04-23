import zipObject from 'lodash/zipObject'

export const identity = a => a

export const REDUCERS = {
  max: [(max, el) => max > el ? max : el, () => -Infinity, identity],
  min: [(min, el) => min < el ? min : el, () => Infinity, identity],
  sum: [(sum, el) => sum + el, () => 0, identity],
  mean: [
    (stats, el) => {
      ++stats[0]
      stats[1] += el
      return stats
    },
    () => [0, 0],
    ([count, sum]) => sum / count
  ],
  count: [count => ++count, () => 0, identity],
  countUniq: [(set, el) => set.add(el), () => new Set(), set => set.size],
}

export function compose(funcs) {
  var len = funcs.length
  return function(r) {
    var value = r
    var i = len
    while (i--) {
      value = funcs[i](value)
    }
    return value
  }
}

export function push(arr, v) {
  arr.push(v)
  return arr
}

export function transduceNoBreak(coll, xform, reducer, init) {
  xform = xform(reducer)
  var result = init;
  var index = -1;
  var len = coll.length;
  while(++index < len) {
    result = xform['@@transducer/step'](result, coll[index]);
  }
  return xform['@@transducer/result'](result);
}

export function combineReducers(fns, spread) {
  const len = fns.length
  if (spread) {
    return function(accs, row) {
      let i = -1
      while (++i < len) {
        accs[i] = fns[i](accs[i], row[i])
      }
      return accs
    }
  } else {
    return function(accs, row) {
      let i = -1
      while (++i < len) {
        accs[i] = fns[i](accs[i], row)
      }
      return accs
    }
  }
}

export function spread(fns) {
  const len = fns.length
  return function(value) {
    let i = -1
    while (++i < len) {
      value[i] = fns[i](value[i])
    }
    return value
  }
}

export function createGrouper(fn, col) {
  if (fn) {
    if (col == undefined) {
      return function(map, row) {
        const key = fn(row)
        map.has(key)
          ? map.get(key).push(row)
          : map.set(key, [row])
        return map
      }
    } else {
      return function(map, row) {
        const key = fn(row[col])
        map.has(key)
          ? map.get(key).push(row)
          : map.set(key, [row])
        return map
      }
    }
  } else {
    if (col == undefined) {
      return function(map, row) {
        const key = row
        map.has(key)
          ? map.get(key).push(row)
          : map.set(key, [row])
        return map
      }
    } else {
      return function(map, row) {
        const key = row[col]
        map.has(key)
          ? map.get(key).push(row)
          : map.set(key, [row])
        return map
      }
    }
  }
}

export const isfunc = fn => fn && typeof fn == 'function'

export const arrayToIndex = arr => zipObject(arr, [...arr.keys()])

export const needSlowCase = a =>
  a.toString().includes('new Take') || a.toString().includes('new Drop')

export function dispatchReduce(fn, initFactory, final) {
  if (this.index)
    return this.reduceEach(fn, initFactory, final)
  else
    return this.reduce(fn, initFactory(), final)
}
