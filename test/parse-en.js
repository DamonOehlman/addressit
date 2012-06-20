var canParse = require('./helpers/canparse')('en'),
    streetType = require('./helpers/streettype')('en');

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
    
    canParse('754 Robinson Rd West, Aspley, QLD', {
        number: 754,
        street: 'ROBINSON RD WEST',
        regions: ['ASPLEY', 'QLD']
    });
    
    canParse('Sydney', {
        "regions": ["SYDNEY"]
    });
    
    canParse('Perth', {
        "regions": ["PERTH"]
    });
    
    canParse('1/135 Ferny Way, Ferny Grove', {
        "unit": 1,
        "number": 135,
        "street": "FERNY WAY",
        "regions": ["FERNY GROVE"]
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

    streetType('ALLEY');
    streetType('ALLY');
    streetType('APPROACH');
    streetType('APP');
    streetType('ARCADE');
    streetType('ARC');
    streetType('AVENUE');
    streetType('AV');
    streetType('AVE');
    streetType('BOULEVARD');
    streetType('BLVD');
    streetType('BROW');
    streetType('BYPASS');
    streetType('BYPA');
    streetType('CAUSEWAY');
    streetType('CWAY');
    streetType('CIRCUIT');
    streetType('CCT');
    streetType('CIRCUS');
    streetType('CIRC');
    streetType('CLOSE');
    streetType('CL');
    streetType('COPSE');
    streetType('CPSE');
    streetType('CORNER');
    streetType('CNR');
    // streetType('COVE');
    streetType('COURT');
    streetType('CT');
    streetType('CRESCENT');
    streetType('CRES');
    streetType('DRIVE');
    streetType('DR');
    // streetType('END');
    streetType('ESPLANANDE');
    streetType('ESP');
    // streetType('FLAT');
    streetType('FREEWAY');
    streetType('FWAY');
    streetType('FRONTAGE');
    streetType('FRNT');
    // streetType('GARDENS');
    // streetType('GDNS');
    streetType('GLADE');
    streetType('GLD');
    // streetType('GLEN');
    streetType('GREEN');
    streetType('GRN');
    // streetType('GROVE');
    // streetType('GR');
    // streetType('HEIGHTS');
    // streetType('HTS');
    streetType('HIGHWAY');
    streetType('HWY');
    streetType('LANE');
    streetType('LN');
    streetType('LINK');
    streetType('LOOP');
    streetType('MALL');
    streetType('MEWS');
    streetType('PACKET');
    streetType('PCKT');
    streetType('PARADE');
    streetType('PDE');
    // streetType('PARK');
    streetType('PARKWAY');
    streetType('PKWY');
    streetType('PLACE');
    streetType('PL');
    streetType('PROMENADE');
    streetType('PROM');
    streetType('RESERVE');
    streetType('RES');
    // streetType('RIDGE');
    // streetType('RDGE');
    streetType('RISE');
    streetType('ROAD');
    streetType('RD');
    streetType('ROW');
    streetType('SQUARE');
    streetType('SQ');
    streetType('STREET');
    streetType('ST');
    streetType('STRIP');
    streetType('STRP');
    streetType('TARN');
    streetType('TERRACE');
    streetType('TCE');
    streetType('THOROUGHFARE');
    streetType('TFRE');
    streetType('TRACK');
    streetType('TRAC');
    streetType('TRUNKWAY');
    streetType('TWAY');
    // streetType('VIEW');
    streetType('VISTA');
    streetType('VSTA');
    streetType('WALK');
    streetType('WAY');
    streetType('WALKWAY');
    streetType('WWAY');
    streetType('YARD');
});