var test = require('tape');

function expect(expected) {
  return require('./helpers/expect')(expected, {
    locale: require('../locale/en-AU.js')
  });
}

test('2649 Logan Road, Eight Mile Plains, QLD 4113', expect({
  number: '2649',
  street: 'Logan Road',
  regions: ['Eight Mile Plains', 'QLD'],
  postalcode: '4113'
}));

test('2649 Logan Road Eight Mile Plains, QLD 4113', expect({
  number: '2649',
  street: 'Logan Road',
  regions: ['Eight Mile Plains', 'QLD'],
  postalcode: '4113'
}));

test('1 Queen Street, Brisbane 4000', expect({
  "number": '1',
  "street": "Queen Street",
  "regions": ["Brisbane"],
  postalcode: '4000'
}));

test('754 Robinson Rd West, Aspley, QLD 4035', expect({
  number: '754',
  street: 'Robinson Rd West',
  regions: ['Aspley', 'QLD'],
  postalcode: '4035'
}));

test('Sydney 2000', expect({
  "regions": ["Sydney"],
  postalcode: '2000'
}));

test('Perth', expect({
  "regions": ["Perth"]
}));

test('1/135 Ferny Way, Ferny Grove 4054', expect({
  "unit": '1',
  "number": '135',
  "street": "Ferny Way",
  "regions": ["Ferny Grove"],
  postalcode: '4054'
}));

test('Eight Mile Plains 4113', expect({
  "regions": ["Eight Mile Plains"],
  postalcode: '4113'
}));

test('8/437 St Kilda Road Melbourne, VIC ', expect({
  "unit": '8',
  "number": '437',
  "street": "St Kilda Road",
  "regions": ["Melbourne", "VIC"]
}));

// Check behavior with a failing address
test('BOOM', expect({
  "regions": ["BOOM"],
  postalcode: undefined
}));

// 9999 is not a valid Australian postal code.
// If we don't recognize the postal code, it goes in the region field.
test('Eight Mile Plains 9999', expect({
  "regions": ["Eight Mile Plains 9999"],
  postalcode: undefined
}));
