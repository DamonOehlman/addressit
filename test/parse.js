var test = require('tape');
var expect = require('./helpers/expect');

test('2649 Logan Road, Eight Mile Plains, QLD', expect({
  number: 2649,
  street: 'LOGAN ROAD',
  regions: ['EIGHT MILE PLAINS', 'QLD']
}));

test('2649 Logan Road Eight Mile Plains, QLD', expect({
  number: 2649,
  street: 'LOGAN ROAD',
  regions: ['EIGHT MILE PLAINS', 'QLD']
}));

test('4 N 2nd St #950, San Jose, CA', expect({
  unit: 950,
  number: 4,
  street: "N 2ND ST",
  regions: ["SAN JOSE", "CA"]
}));

test('1 Queen Street, Brisbane', expect({
  "number": 1,
  "street": "QUEEN STREET",
  "regions": ["BRISBANE"]
}));

test('754 Robinson Rd West, Aspley, QLD', expect({
  number: 754,
  street: 'ROBINSON RD WEST',
  regions: ['ASPLEY', 'QLD']
}));

test('Sydney', expect({
  "regions": ["SYDNEY"]
}));

test('Perth', expect({
  "regions": ["PERTH"]
}));

test('1/135 Ferny Way, Ferny Grove', expect({
  "unit": 1,
  "number": 135,
  "street": "FERNY WAY",
  "regions": ["FERNY GROVE"]
}));

test('Shop 8, 431 St Kilda Rd Melbourne', expect({
  "unit": 8,
  "number": 431,
  "street": "ST KILDA RD",
  "regions": ["MELBOURNE"]
}));

test('Eight Mile Plains', expect({
  "regions": ["EIGHT MILE PLAINS"]
}));

test('St George', expect({
  "regions": ["ST GEORGE"]
}));

test('3N751 Hawthorn Dr., St. Charles, IL', expect({
  "number": "3N751",
  "street": "HAWTHORN DR",
  "regions": ["ST CHARLES", "IL"]
}));

test('8/437 St Kilda Road Melbourne, VIC', expect({
  "unit": 8,
  "number": 437,
  "street": "ST KILDA ROAD",
  "regions": ["MELBOURNE", "VIC"]
}));