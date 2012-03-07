var addressit = require('../addressit'),
    expect = require('expect.js');

function canParse(input, expected) {
    it('can parse: ' + input, function() {
        var address = addressit(input);
        
        for (var key in expected) {
            expect(address[key]).to.eql(expected[key]);
        }
    });
}

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
});