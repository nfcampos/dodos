'use strict'

require('babel-register')
require('regenerator/runtime')

const Dodo = require('../src/dodo').default
const table = require('./fixture/table').default

const tap = require('tap')

tap.test('With no filter returns original array', t => {
  const dodo = new Dodo(table)
  t.same([...dodo], [...table])
  t.end()
})
