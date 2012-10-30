var addressit = require('../../addressit'),
    expect = require('expect.js');

var streetType = function(locale) {
    return function(type) {
        it('supports street type: ' + type, function() {
            var input = '15 FOO ' + type + ' BARVILLE',
                address = addressit(input, locale);
                
            expect(address.number).to.equal(15);
            expect(address.street).to.equal('FOO ' + type.toUpperCase());
            expect(address.regions).to.eql(['BARVILLE']);
        });
    };
};

if (typeof module != 'undefined') {
    module.exports = streetType;
}