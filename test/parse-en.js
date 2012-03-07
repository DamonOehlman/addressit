var canParse = require('./helpers/canparse')('en');

describe('street parsing (EN locale)', function() {
    canParse('2649 Logan Road, Eight Mile Plains, QLD', {
        number: 2649,
        street: 'LOGAN ROAD',
        regions: ['EIGHT MILE PLAINS', 'QLD']
    });
    
    canParse('2649 Logan Road Eight Mile Plains, QLD', {
        number: 2649,
        street: 'LOGAN ROAD',
        regions: ['EIGHT MILE PLAINS', 'QLD']
    });
    
    canParse('4 N 2nd St #950, San Jose, CA', {
        "unit": 950,
        "number": 4,
        "street": "N 2ND ST",
        "regions": ["SAN JOSE", "CA"]
    });
    
    canParse('1 Queen Street, Brisbane', {
        "number": 1,
        "street": "QUEEN STREET",
        "regions": ["BRISBANE"]
    });
    
    canParse('Sydney', {
        "regions": ["SYDNEY"]
    });
    
    canParse('Perth', {
        "regions": ["PERTH"]
    });
    
    canParse('1/135 Ferny Way, Ferny Hills', {
        "unit": 1,
        "number": 135,
        "street": "FERNY WAY",
        "regions": ["FERNY HILLS"]
    });
    
    canParse('Shop 8, 431 St Kilda Rd Melbourne', {
        "unit": 8,
        "number": 431,
        "street": "ST KILDA RD",
        "regions": ["MELBOURNE"]
    });
    
    canParse('Eight Mile Plains', {
        "regions": ["EIGHT MILE PLAINS"]
    });
    
    canParse('St George', {
        "regions": ["ST GEORGE"]
    });
    
    canParse('3N751 Hawthorn Dr., St. Charles, IL', {
        "number": "3N751",
        "street": "HAWTHORN DR",
        "regions": ["ST CHARLES", "IL"]
    });
    
    canParse('8/437 St Kilda Road Melbourne, VIC', {
        "unit": 8,
        "number": 437,
        "street": "ST KILDA ROAD",
        "regions": ["MELBOURNE", "VIC"]
    });
});