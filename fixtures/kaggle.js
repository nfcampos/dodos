import {readFileSync} from 'fs'
import {csvParse} from 'd3-dsv'
import {zipObject} from 'lodash'

export const data = csvParse(
  readFileSync(__dirname + '/cs-training.csv', 'utf8'),
  d => Object.keys(d).map(key => +d[key])
)

export const index = zipObject(data.columns, [...data.keys()])

delete data.columns
