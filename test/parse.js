var test = require('tape');

function expect(expected) {
  return require('./helpers/expect')(expected);
}

test('2649 Logan Road, Eight Mile Plains, QLD', expect({
  number: '2649',
  street: 'Logan Road',
  regions: ['Eight Mile Plains', 'QLD']
}));

test('2649 Logan Road Eight Mile Plains, QLD', expect({
  number: '2649',
  street: 'Logan Road',
  regions: ['Eight Mile Plains', 'QLD']
}));

test('4 N 2nd St #950, San Jose, CA', expect({
  unit: '950',
  number: '4',
  street: "N 2nd St",
  regions: ["San Jose"]
}));

test('1 Queen Street, Brisbane', expect({
  "number": '1',
  "street": "Queen Street",
  "regions": ["Brisbane"]
}));

test('754 Robinson Rd West, Aspley, QLD', expect({
  number: '754',
  street: 'Robinson Rd West',
  regions: ['Aspley', 'QLD']
}));

test('Sydney', expect({
  "regions": ["Sydney"]
}));

test('Perth', expect({
  "regions": ["Perth"]
}));

test('1/135 Ferny Way, Ferny Grove', expect({
  "unit": '1',
  "number": '135',
  "street": "Ferny Way",
  "regions": ["Ferny Grove"]
}));

test('Shop 8, 431 St Kilda Rd Melbourne', expect({
  "unit": '8',
  "number": '431',
  "street": "St Kilda Rd",
  "regions": ["Melbourne"]
}));

test('Eight Mile Plains', expect({
  "regions": ["Eight Mile Plains"]
}));

test('St George', expect({
  "regions": ["St George"]
}));

test('3N751 Hawthorn Dr., St. Charles, IL', expect({
  "number": "3N751",
  "street": "Hawthorn Dr",
  "regions": ["St Charles"]
}));

test('8/437 St Kilda Road Melbourne, VIC', expect({
  "unit": '8',
  "number": '437',
  "street": "St Kilda Road",
  "regions": ["Melbourne", "VIC"]
}));

test('18 E. Main St.', expect({
  "number": '18',
  "street": "E. Main St",
  "regions": []
}));
