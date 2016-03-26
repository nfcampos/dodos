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
  .add('Dodo #filterBy',
    () => dodo
      .filterBy('NumberOfDependents', n => n == 2)
      .toArray())
  .add('Array #filter #map', () => {
    array
      .filter(row => row[I['NumberOfDependents']] == 2)
      .map(row => row[I['NumberOfDependents']])
  })
  .add('Dodo #filterBy #col', () => {
    dodo
      .filterBy('NumberOfDependents', n => n == 2)
      .col('NumberOfDependents')
      .toArray()
  })
  .add('Dodo #filterBy #col (spread)', () => {
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
  .add('Dodo #filterBy #filterBy #col', () => {
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
  .add('Dodo #filterBy #filterBy #col #skip', () => {
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
  .add('Dodo #col #sum', () => {
    dodo
      .filterBy('age', a => a > 40)
      .col('NumberOfDependents')
      .sum()
  })
  .add('Dodo #col()', () => {
    dodo
      .col('age')
      .toArray()
  })
  .add('Dodo #cols(1)', () => {
    dodo
      .cols(['age'])
      .toArray()
  })
  .add('Dodo #cols(3)', () => {
    dodo
      .cols(['age', 'MonthlyIncome', 'DebtRatio'])
      .toArray()
  })
  .add('Dodo #col() #sum()', () => {
    dodo
      .col('age')
      .sum()
  })
  .add('Dodo #cols(1) #sum()', () => {
    dodo
      .cols(['age'])
      .sum()
  })
  .add('Dodo #cols(3) #sum()', () => {
    dodo
      .cols(['age', 'MonthlyIncome', 'DebtRatio'])
      .sum()
  })
  .add('Dodo #filterBy #col #length', () => {
    dodo
      .filterBy('NumberOfDependents', n => n == 2)
      .col('NumberOfDependents')
      .length
  })
  .add('Dodo #col() #mean()', () => {
    dodo
      .col('age')
      .mean()
  })
  .add('Dodo #col() #stats(mean)', () => {
    dodo
      .col('age')
      .stats('mean')
  })
  .add('Dodo #col() #sum()', () => {
    dodo
      .col('age')
      .sum()
  })
  .add('Dodo #col() #stats(sum)', () => {
    dodo
      .col('age')
      .stats('sum')
  })
  .add('Dodo #col() #stats(sum, mean)', () => {
    dodo
      .col('age')
      .stats('sum', 'mean')
  })
  .add('Dodo #cols(3) #stats(count, mean, max)', () => {
    dodo
      .cols(['age', 'MonthlyIncome', 'DebtRatio'])
      .stats('count', 'mean', 'max')
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
  .add('Dodo #groupBy() #col() #stats(count, mean, max)', () => {
    dodo
      .groupBy('NumberOfDependents')
      .col('age')
      .stats('count', 'mean', 'max')
  })
  .add('Dodo #groupBy() #cols(3) #sum()', () => {
    dodo
      .groupBy('NumberOfDependents')
      .cols(['age', 'MonthlyIncome', 'DebtRatio'])
      .sum()
  })
  .add('Dodo #groupBy() #cols(3) #stats(count, mean, max)', () => {
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
