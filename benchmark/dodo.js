import {Suite} from 'benchmark'
import table from 'table'

import Dodo from '../src/dodo'
import {data, index} from '../fixtures/kaggle'

const array = data.slice(0, 150000)
console.log('rows: ', array.length)
console.log('cols: ', array[0].length)

const I = index
const dodo = new Dodo(array, index)

const suite = new Suite()
  .on('complete', function() {
    console.log(table([
      ['', 'ops/sec'],
      ...this.map(b => [b.name, b.hz.toFixed(2)])
    ]))
  })

suite
  .add('Array #filter',
    () => array
      .filter(row => row[I['NumberOfDependents']] == 2))
  .add('Dodo  #filterBy',
    () => dodo
      .filterBy('NumberOfDependents', n => n == 2)
      .toArray())
  .add('Array #filter #map', () => {
    array
      .filter(row => row[I['NumberOfDependents']] == 2)
      .map(row => row[I['NumberOfDependents']])
  })
  .add('Dodo  #filterBy #col', () => {
    dodo
      .filterBy('NumberOfDependents', n => n == 2)
      .col('NumberOfDependents')
      .toArray()
  })
  .add('Dodo  #filterBy #col (spread)', () => {
    [...dodo
      .filterBy('NumberOfDependents', n => n == 2)
      .col('NumberOfDependents')]
  })
  .add('Array #filter #filter #map', () => {
    array
      .filter(row => row[I['NumberOfDependents']] == 2)
      .filter(row => row[I['age']] > 40)
      .map(row => row[I['NumberOfDependents']])
  })
  .add('Dodo  #filterBy #filterBy #col', () => {
    dodo
      .filterBy('NumberOfDependents', n => n == 2)
      .filterBy('age', a => a > 40)
      .col('NumberOfDependents')
      .toArray()
  })
  .add('Array #filter #filter #map #slice', () => {
    array
      .filter(row => row[I['NumberOfDependents']] == 2)
      .filter(row => row[I['age']] > 40)
      .map(row => row[I['NumberOfDependents']])
      .slice(100)
  })
  .add('Dodo  #filterBy #filterBy #col #skip', () => {
    dodo
      .filterBy('NumberOfDependents', n => n == 2)
      .filterBy('age', a => a > 40)
      .col('NumberOfDependents')
      .skip(100)
      .toArray()
  })
  .add('Array #map #reduce', () => {
    array
      .filter(row => row[I['age']] > 40)
      .map(row => row[I['NumberOfDependents']])
      .reduce((sum, el) => sum + el, 0)
  })
  .add('Dodo  #col #sum', () => {
    dodo
      .filterBy('age', a => a > 40)
      .col('NumberOfDependents')
      .sum()
  })
  .add('Array #filter #map #reduce', () => {
    array
      .filter(row => row[I['age']] > 40)
      .map(row => row[I['NumberOfDependents']])
      .reduce((sum, el) => sum + el, 0)
  })
  .add('Dodo  #filterBy #col #sum', () => {
    dodo
      .filterBy('age', a => a > 40)
      .col('NumberOfDependents')
      .sum()
  })
  .add('Dodo  #filter #col #sum', () => {
    dodo
      .filter((row, I) => row[I['age']] > 40)
      .col('NumberOfDependents')
      .sum()
  })
  .add('Dodo #groupBy()', () => {
    dodo
      .groupBy('NumberOfDependents')
      .toArray()
  })
  .add('Dodo #groupBy() #col() #sum()', () => {
    dodo
      .groupBy('NumberOfDependents')
      .col('age')
      .sum()
  })
  .add('Dodo #groupBy() #col() #stats()', () => {
    dodo
      .groupBy('NumberOfDependents')
      .col('age')
      .stats('count', 'mean', 'max')
  })
  .add('Dodo #groupBy() #cols() #sum()', () => {
    dodo
      .groupBy('NumberOfDependents')
      .cols(['age', 'MonthlyIncome', 'DebtRatio'])
      .sum()
  })
  .add('Dodo #groupBy() #cols() #stats()', () => {
    dodo
      .groupBy('NumberOfDependents')
      .cols(['age', 'MonthlyIncome', 'DebtRatio'])
      .stats('count', 'mean', 'max')
  })
  .add('Dodo #filterBy() #groupBy() #col() #sum()', () => {
    dodo
      .filterBy('age', a => a > 40)
      .groupBy('NumberOfDependents')
      .col('age')
      .sum()
  })


suite.run({async: true})
