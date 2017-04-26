var test = require('tape');

function expect(expected) {
  return require('./helpers/expect')(expected, {
    locale: require('../locale/en-US.js')
  });
}

test('123 Main St, New York, NY 10010', expect({
  number: '123',
  street: 'Main St',
  state: 'NY',
  regions: ['New York'],
  postalcode: '10010'
}));

test('123 Main St New York, NY 10010', expect({
  number: '123',
  street: 'Main St',
  state: 'NY',
  regions: ['New York'],
  postalcode: '10010'
}));

test('123 Main St New York NY 10010', expect({
  number: '123',
  street: 'Main St',
  state: 'NY',
  regions: ['New York'],
  postalcode: '10010'
}));

test('123 E 21st st, Brooklyn NY 11020', expect({
  "number": '123',
  "street": "E 21st st",
  "state": "NY",
  "regions": ["Brooklyn"],
  postalcode: '11020'
}));

test('754 Pharr Rd, Atlanta, Georgia 31035', expect({
  number: '754',
  street: 'Pharr Rd',
  state: 'GA',
  regions: ['Atlanta'],
  postalcode: '31035'
}));

test('601 21st Ave N, Myrtle Beach, South Carolina 29577', expect({
  number: '601',
  street: '21st Ave N',
  state: 'SC',
  regions: ['Myrtle Beach'],
  postalcode: '29577'
}));

test('425 W 23rd St, New York, NY 10011', expect({
  number: '425',
  street: 'W 23rd St',
  state: 'NY',
  regions: ['New York'],
  postalcode: '10011'
}));

test('1035 Comanchee Trl, West Columbia, South Carolina 29169', expect({
  number: '1035',
  street: 'Comanchee Trl',
  state: 'SC',
  regions: ['West Columbia'],
  postalcode: '29169'
}));

test('Texas 76013', expect({
  "state": "TX",
  "regions": [],
  postalcode: '76013'
}));

test('Dallas', expect({
  "regions": ["Dallas"]
}));

test('California', expect({
  "state": "CA"
}));

test('New York', expect({
  "state": "NY"
}));

test('New York, NY', expect({
  "state": "NY",
  "regions": ["New York"]
}));

test('New York, New York', expect({
  "state": "NY",
  "regions": ["New York"]
}));

test('northern mariana islands', expect({
  "state": "MP"
}));

test('Santa Monica, California 90407', expect({
  "state": "CA",
  "regions": ["Santa Monica"],
  postalcode: '90407'
}));


test('Grand canyon 86023', expect({
  "regions": ["Grand canyon"],
  postalcode: '86023'
}));

// don't strip leading 00's from zipcode, those are valid
test('CT, 06410', expect({
  "regions": ["CT"],
  postalcode: '06410'
}));

// Check behavior with a failing address
test('BOOM', expect({
  "regions": ["BOOM"],
  postalcode: undefined
}));

// 76B09 is not a valid US postal code.
// If we don't recognize the postal code, it goes in the region field.
test('Niagara Falls 76B09', expect({
  "regions": ["Niagara Falls 76B09"],
  postalcode: undefined
}));

// Broadway doesn't have a suffix like "Street" or "Road"
test('123 Broadway, New York, NY 10010', expect({
  number: '123',
  street: 'Broadway',
  state: 'NY',
  regions: ['New York'],
  postalcode: '10010'
}));
