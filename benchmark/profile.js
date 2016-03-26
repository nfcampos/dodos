'use strict';

require('babel-register')

var _dodo = require('../src/dodo');

var _dodo2 = _interopRequireDefault(_dodo);

var _kaggle = require('../fixtures/kaggle');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var dodo = new _dodo2.default(_kaggle.data, _kaggle.index);

function profileDodo() {
  console.profile('dodo')
  dodo
    .cols(['age', 'MonthlyIncome', 'DebtRatio'])
    .stats('sum', 'count', 'mean');
  console.profileEnd('dodo')
}

profileDodo();
