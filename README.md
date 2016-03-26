# Dodos
Pandas-inspired transducer-based data wrangling library for js

On npm: https://www.npmjs.com/package/dodos

NOTE: This is very much a work in progress for now

```js

array = [
  [1, 2, 3],
  [3, 4, 5],
]

index = ['columnA', 'columnB', 'columnC']

const dodo = new Dodo(array, index)

dodo.col('columnA').toArray() // [1, 3]

dodo.filterBy('columnB', b => b == 4).toArray() // [4]

dodo.col('columnA').sum() // 4

```

All methods return a new instance, leaving the original untouched.
All operations on the array are evaluated only when calling `.toArray()` or when calling a `.reduce()` method (eg. `.sum()`).

For now, please refer to the tests for more usage examples.
