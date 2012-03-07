var addressit = require('../../addressit'),
    expect = require('expect.js');

var canparse = function(locale) {
    return function(input, expected) {
        it('can parse: ' + input, function() {
            var address = addressit(input, locale);

            for (var key in expected) {
                var value = expected[key];

                if (typeof value == 'number') {
                    expect(address[key]).to.equal(value);
                }
                else {
                    expect(address[key]).to.eql(value);
                }
            }
        });
    };
};

if (typeof module != 'undefined') {
    module.exports = canparse;
}