import test from 'ava'
import _ from 'lodash'

import Dodo from '../src/dodo'
import {table, index} from '../fixtures/table'
const array = table

test('no actions', t => {
  const dodo = new Dodo(table, index)
  t.truthy(dodo.actions.length === 0)
  t.deepEqual([...dodo], array)
})

test('accepts index as array', t => {
  const dodo = new Dodo(table, Object.keys(index))
  t.deepEqual(
    dodo.filterBy('Date', d => d == 4).toArray(),
    array.filter(row => row[index.Date] == 4)
  )
})

test('throws without an array or index', t => {
  t.throws(() => new Dodo(), undefined, 'no array')
  t.throws(() => new Dodo(table, {abc: 0}), undefined, 'object index, not enough keys')
  t.throws(() => new Dodo(table, Object.keys(index).slice(2)), undefined, 'array index, not enough keys')
})

test('non-array sources', t => {
  function* nums() {
    var i = 1
    while(i < 10) {
      yield i++
    }
  }

  const set = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])

  const expected = [2, 4, 6, 8, 10, 12, 14, 16, 18]

  t.deepEqual(
    new Dodo(nums()).map(a => a * 2).toArray(),
    expected
  )
  t.deepEqual(
    new Dodo(set).map(a => a * 2).toArray(),
    expected
  )
  t.deepEqual(
    new Dodo({a: 1, b: 2, c: 3}).map(a => (++a[1], a)).toArray(),
    [['a', 2], ['b', 3], ['c', 4]]
  )


})

test('take', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    dodo.take(10).toArray(),
    array.slice(0, 10)
  )
  t.deepEqual(dodo.take(0).toArray(), [])
  t.throws(() => dodo.take('boo'))
  t.throws(() => dodo.take(-1))
})

test('skip', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    dodo.skip(3).toArray(),
    array.slice(3)
  )
  t.deepEqual(dodo.skip(0).toArray(), array)
  t.truthy(dodo.skip(0) === dodo)
  t.throws(() => dodo.skip('boo'))
  t.throws(() => dodo.skip(-1))
})

test('filter', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    dodo.filter((row, I) => row[I.Date] == 4).toArray(),
    array.filter(row => row[index.Date] == 4)
  )
  t.deepEqual(
    dodo.filter((row, I) => row[I.Date] <= 4).toArray(),
    array.filter(row => row[index.Date] <= 4)
  )
  t.deepEqual(
    dodo.filter((row, I) => row[I.Age] <= 4 && row[I.Weight] == 2).toArray(),
    array.filter(row => row[index.Age] <= 4 && row[index.Weight] == 2)
  )
  t.throws(() => dodo.filter())
  t.throws(() => dodo.filter('not a function'))
})

test('filter shorthand: filterBy', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    dodo.filterBy('Date', d => d == 4).toArray(),
    array.filter(row => row[index.Date] == 4)
  )
  t.deepEqual(
    dodo.filterBy('Age', a => a <= 4).toArray(),
    array.filter(row => row[index.Age] <= 4)
  )
})

test('filter + filter', t => {
  const dodo = new Dodo(table, index)
  const expected = array
    .filter(row => row[index.Date] == 4)
    .filter(r => r[index.Weight] == 2)

  t.deepEqual(
    dodo
      .filter((r,I) => r[I.Date] == 4)
      .filter((r,I) => r[I.Weight] == 2)
      .toArray(),
    expected
  )
  t.deepEqual(
    dodo.filter((r, I) => r[I.Date] == 4 && r[I.Weight] == 2).toArray(),
    expected
  )
})

test('map', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    dodo.map((row, I) => row[I.Date]).toArray(),
    array.map(row => row[index.Date])
  )
  t.deepEqual(
    dodo.map((row, I) => row[I.Date] * 2).toArray(),
    array.map(row => row[index.Date] * 2)
  )
  t.deepEqual(
    dodo.map((row, I) => row[I.Date] + row[I.Age]).toArray(),
    array.map(row => row[index.Date] + row[index.Age])
  )
  t.throws(() => dodo.map())
  t.throws(() => dodo.map('not a function'))
})

test('map shorthand: col', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    dodo.col('Date').toArray(),
    array.map(row => row[index.Date])
  )
  t.throws(() => dodo.col('some column not in the index'))
  t.throws(() => dodo.col())
})

test('.col() returns a non-indexed dodo', t => {
  const dodo = new Dodo(table, index)
  t.true(dodo.col('Age').index === false)
  t.throws(() => dodo.col('Age').col('Date'))
  t.throws(() => dodo.col('Age').cols('Date', 'Age'))
  t.throws(() => dodo.col('Age').reduceEach((arr, a) => (arr.push(a), arr), []))
  t.throws(() => dodo.col('Age').filterBy('Date', a => a / 2))
})

test('map shorthand: cols', t => {
  const dodo = new Dodo(table, index)
  const cols = ['Date', 'Age', 'Height']
  const expected = array.map(row => cols.map(col => row[index[col]]))
  t.deepEqual(
    dodo.cols(cols).toArray(),
    expected
  )
  t.deepEqual(
    dodo.cols(...cols).toArray(),
    expected
  )
  t.throws(() => dodo.cols())
  t.throws(() => dodo.cols([...cols, 'Column that does not exist']))
})

test('cols() with array of single element', t => {
  const dodo = new Dodo(table, index)
  const cols = ['Date']
  const expectedMin = dodo.col('Date').min()
  const expectedFromStats = {'Date': [expectedMin]}
  const expectedFromMin = {'Date': expectedMin}
  t.deepEqual(dodo.cols(cols).stats('min'), expectedFromStats)
  t.deepEqual(dodo.cols(cols).min(), expectedFromMin)
})

test('multiple maps', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    dodo.col('Date').map(d => d * 2).toArray(),
    array.map(row => row[index.Date]).map(d => d * 2)
  )
  const cols = ['Age', 'Date', 'Height', 'Weight']
  t.deepEqual(
    [...dodo.cols(cols).col('Date')],
    array.map(row => row[index.Date])
  )
  const colsAfter = ['Age', 'Date']
  t.deepEqual(
    [...dodo.cols(cols).cols(colsAfter)],
    array.map(row => colsAfter.map(col => row[index[col]]))
  )
})

test('map + filter', t => {
  const dodo = new Dodo(table, index)
  const expected = array
    .filter(row => row[index.Date] > 3)
    .map(row => row[index.Date])

  t.deepEqual(
    dodo.filterBy('Date', d => d > 3).col('Date').toArray(),
    expected
  )
  t.deepEqual(
    dodo.col('Date').filter(a => a > 3).toArray(),
    expected
  )
  t.deepEqual(
    [...dodo
      .col('Date')
      .filter(a => a > 3)
      .map(a => a * 2)
      .filter(a => a > 8)],
    array
      .map(row => row[index.Date])
      .filter(a => a > 3)
      .map(a => a * 2)
      .filter(a => a > 8)
  )
  const cols = ['Age', 'Date']
  t.deepEqual(
    [...dodo
      .cols(cols)
      .filter((row, I) => row[I.Date] == 7)],
    array
      .map(row => cols.map(col => row[index[col]]))
      .filter(row => row[1] == 7)
  )
  t.deepEqual(
    [...dodo
      .filter((row, I) => row[I.Height] == 7)
      .cols(cols)
      .filter((row, I) => row[I.Age] == 5)
      .col('Date')],
    array
      .filter(row => row[index.Height] == 7)
      .map(row => cols.map(col => row[index[col]]))
      .filter(row => row[cols.indexOf('Age')] == 5)
      .map(row => row[cols.indexOf('Date')])
  )
})

test('map + slice', t => {
  const dodo = new Dodo(table, index)
  const expected = array.map(row => row[index.Date] * 2).slice(2, 4)
  t.deepEqual(
    dodo.map((row, I) => row[I.Date] * 2).drop(2).take(2).toArray(),
    expected
  )
  t.deepEqual(
    dodo.drop(2).take(2).map((row, I) => row[I.Date] * 2).toArray(),
    expected
  )
})

test('filter + slice', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    [...dodo.filter((row, I) => row[I.Date] == 4).skip(1)],
    array.filter(row => row[index.Date] == 4).slice(1)
  )
  t.deepEqual(
    [...dodo.skip(1).filter((row, I) => row[I.Date] == 4)],
    array.slice(1).filter(row => row[index.Date] == 4)
  )
  t.deepEqual(
    dodo
      .filter((row, I) => row[I.Date] >= 4)
      .skip(1)
      .filter((row, I) => row[I.Height] == 7)
      .toArray(),
    array
      .filter(row => row[index.Date] >= 4)
      .slice(1)
      .filter(row => row[index.Height] == 7)
  )
  t.deepEqual(
    dodo
      .skip(1)
      .filter((row, I) => row[I.Date] >= 4)
      .skip(1)
      .filter((row, I) => row[I.Height] == 7)
      .toArray(),
    array
      .slice(1)
      .filter(row => row[index.Date] >= 4)
      .slice(1)
      .filter(row => row[index.Height] == 7)
  )
})

test('uniq', t => {
  const dodo = new Dodo(table, index)
  t.true(Array.isArray(dodo.col('Date').uniq()))
  t.deepEqual(
    dodo.col('Date').uniq(),
    [...new Set(array.map(row => row[index.Date]))]
  )
})

test('length', t => {
  const dodo = new Dodo(table, index)
  t.truthy(dodo.col('Age').toArray().length == dodo.length)
  t.truthy(dodo.cols('Age', 'Date').toArray().length
    == dodo.cols('Age', 'Date').length)
  t.truthy(dodo.filterBy('Height', h => h >= 7).toArray().length
    == dodo.filterBy('Height', h => h >= 7).length)
})

test('reduce of single column', t => {
  const dodo = new Dodo(table, index)
  t.deepEqual(
    dodo.col('Age').reduce((acc, a) => acc * a, 1),
    array.map(row => row[index.Age]).reduce((acc, a) => acc * a, 1)
  )
  t.deepEqual(
    dodo.col('Age').skip(3).reduce((acc, a) => acc * a, 1),
    array.map(row => row[index.Age]).slice(3).reduce((acc, a) => acc * a, 1)
  )
})

test('reduce over multiple columns', t => {
  const dodo = new Dodo(table, index)
  const cols = Object.keys(index)
  t.deepEqual(
    dodo.reduceEach((acc, a) => acc + a, () => 0),
    _.zipObject(
      cols,
      Object.values(index)
        .map(i => array.reduce((arr, row) => [...arr, row[i]], []))
        .map(arr => arr.reduce((acc, a) => acc + a, 0))
    )
  )
})

test('reduce stats', t => {
  const dodo = new Dodo(table, index)
  const shorthands = [
    ['count', arr => arr.length],
    ['sum', arr => arr.reduce((a, b) => a + b, 0)],
    ['min', arr => Math.min(...arr)],
    ['max', arr => Math.max(...arr)],
    ['mean', arr => _.mean(arr)],
    ['countUniq', arr => new Set(arr).size],
  ]
  const col = 'Date'
  const cols = ['Date', 'Age']
  for (const s of shorthands) {
    t.deepEqual(
      dodo.col(col)[s[0]](),
      s[1](array.map(row => row[index.Date])),
      `${s[0]} over 1 column`
    )
    t.deepEqual(
      dodo.cols(cols)[s[0]](),
      _.zipObject(
        cols,
        cols.map(col => array.map(row => row[index[col]])).map(col => s[1](col))
      ),
      `${s[0]} over several columns`
    )
  }
  t.deepEqual(
    dodo.col(col).stats('sum', 'count', 'mean', 'countUniq'),
    [
      dodo.col(col).sum(),
      dodo.col(col).count(),
      dodo.col(col).mean(),
      dodo.col(col).countUniq()
    ]
  )
  t.deepEqual(
    dodo.cols(cols).stats('sum', 'count'),
    {
      Date: [dodo.col('Date').sum(), dodo.col('Date').count()],
      Age: [dodo.col('Age').sum(), dodo.col('Age').count()],
    }
  )
  t.deepEqual(
    dodo.cols(cols).stats(...shorthands.map(s => s[0])),
    _.zipObject(cols,
      cols.map(col => dodo.col(col).stats(...shorthands.map(s => s[0])))
    )
  )
  const all = Object.keys(index)
  t.deepEqual(
    dodo.stats(...shorthands.map(s => s[0])),
    _.zipObject(all,
      all.map(col => dodo.col(col).stats(...shorthands.map(s => s[0])))
    )
  )
})

test('stats sanity checking', t => {
  const dodo = new Dodo(table, index)
  t.throws(() => dodo.stats())
  t.throws(() => dodo.stats('median'))
  t.throws(() => dodo.stats(''))
  t.throws(() => dodo.stats(2))
  t.throws(() => dodo.stats('sum', 'median'))
})

test('groupBy sanity checking', t => {
  const dodo = new Dodo(table, index)
  t.throws(() => dodo.groupBy(), null,'indexed dodo throws without name')
  t.throws(() => dodo.groupBy('NotInIndex'), null,'indexed dodo throws with name not in index')
  t.throws(() => dodo.groupBy('Age', true), null,'indexed dodo throws without name')
  t.notThrows(() => dodo.col('Age').groupBy(), null, 'non-indexed dodo does not throw without name')
  t.throws(() => dodo.col('Age').groupBy('Age'), null,'non-indexed dodo throws with name')
})

test('groupBy on non-indexed dodo, without key function', t => {
  const dodo = new Dodo(table, index)
  const grouped = dodo.col('Age').groupBy()
  const ageUniques = dodo.col('Age').uniq()

  ageUniques.forEach(uniq => {
    t.true(grouped.has(uniq), `uniq ${uniq} is missing`)
    t.true(grouped.get(uniq) instanceof Dodo, `value of uniq ${uniq} is not a dodo`)
    t.true(grouped.get(uniq).index === false, `index of dodo is false`)
  })
})

test('groupBy on non-indexed dodo, with key function', t => {
  const dodo = new Dodo(table, index)
  const mapper = age => Math.ceil(age / 3)
  const grouped = dodo.col('Age').groupBy(mapper)
  const ageUniques = dodo.col('Age').map(mapper).uniq()

  ageUniques.forEach(uniq => {
    t.true(grouped.has(uniq), `uniq ${uniq} is missing`)
    t.true(grouped.get(uniq) instanceof Dodo, `value of uniq ${uniq} is not a dodo`)
    t.true(grouped.get(uniq).index === false, `index of dodo is false`)
  })
})

test('groupBy on indexed dodo, without key function', t => {
  const dodo = new Dodo(table, index)
  const grouped = dodo.groupBy('Age')
  const ageUniques = dodo.col('Age').uniq()

  ageUniques.forEach(uniq => {
    t.true(grouped.has(uniq), `uniq ${uniq} is missing`)
    t.true(grouped.get(uniq) instanceof Dodo, `value of uniq ${uniq} is not a dodo`)
    t.true(grouped.get(uniq).index === dodo.index, `index of dodo is index of original dodo`)
  })
})

test('groupBy on indexed dodo, with key function', t => {
  const dodo = new Dodo(table, index)
  const mapper = age => Math.ceil(age / 3)
  const grouped = dodo.groupBy('Age', mapper)

  const ageUniques = dodo.col('Age').map(mapper).uniq()
  ageUniques.forEach(uniq => {
    t.true(grouped.has(uniq), `uniq ${uniq} is missing`)
    t.true(grouped.get(uniq) instanceof Dodo, `value of uniq ${uniq} is not a dodo`)
    t.true(grouped.get(uniq).index === dodo.index, `index of dodo is index of original dodo`)
  })
})

function testFlockMethods(shouldHaveMethods, t, flock) {
  const methods = new Set(Object.getOwnPropertyNames(flock))
  for (const method of Object.getOwnPropertyNames(Dodo.prototype)) {
    if (method == 'constructor') continue
    if (shouldHaveMethods) {
      t.true(methods.has(method), method + ' not present')
      t.true(typeof flock[method] == 'function', method + ' not function')
    } else {
      t.false(methods.has(method), method + ' present')
    }
  }
}

test('groupBy(): Dodo prototype methods present', t => {
  const grouped = new Dodo(table, index).groupBy('Age')
  testFlockMethods(true, t, grouped)
})

test('groupBy().map()', t => {
  const dodo = new Dodo(table, index)
  const grouped = dodo.groupBy('Age')
  const ageUniques = dodo.col('Age').uniq()
  const mappedGrouped = grouped.col('Date')
  ageUniques.forEach(uniq => {
    t.true(mappedGrouped.has(uniq), `uniq ${uniq} is missing`)
    t.true(mappedGrouped.get(uniq) instanceof Dodo,
      `value of uniq ${uniq} is not a dodo`)

    const expected = dodo.filter((row, I) => row[I.Age] == uniq).col('Date')
    t.deepEqual(
      mappedGrouped.get(uniq).toArray(),
      expected.toArray()
    )
    t.deepEqual(
      mappedGrouped.toArray().get(uniq),
      expected.toArray()
    )
  })
})

test('groupBy(): Dodo prototype methods absent after toArray', t => {
  const grouped = new Dodo(table, index).groupBy('Age')
  const groupedToArray = grouped.toArray()
  testFlockMethods(false, t, groupedToArray)
})

test('groupBy().mapEntries()', t => {
  const grouped = new Dodo(table, index).groupBy('Age')
  const expected = []
  const mapper = (dodo, value) => dodo.toArray() + value
  grouped.forEach((dodo, value) => expected.push(mapper(dodo, value)))
  t.deepEqual(
    grouped.mapEntries(mapper),
    expected
  )
})

test('flock()', t => {
  const dodo = new Dodo(table, index)
  const flock = dodo.flock(dodo => [
    ['old', dodo.filterBy('Age', a => a > 10)],
    ['young', dodo.filterBy('Age', a => a <= 10)]
  ])
  t.truthy(flock.has('old'))
  t.truthy(flock.has('young'))
  t.truthy(flock.get('old') instanceof Dodo)
  t.truthy(flock.get('young') instanceof Dodo)
  testFlockMethods(true, t, flock)
})
