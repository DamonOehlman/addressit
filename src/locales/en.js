(function(_locales) {

    /* internals */

    var parser = new AddressParser(),
    
        // these are the regexes for determining whether or not a string is a street
        // it is important to note that they are parsed through the reStreetCleaner
        // regex to become more strict
        streetRegexes = parser.compile([
            'ST(REET)?',
            '(RD|ROAD)',
            '(CT|COURT)',
            'AV(ENUE)?',
            'PL(ACE)?',
            '(LN|LANE)',
            'DR(IVE)?',
            '(WY|WAY)'
        ]);

    /* exports */
    
    _locales.EN = function(text) {
        return parser
            .accept(text)
            
            // clean the address
            .clean([
                // remove trailing dots from two letter abbreviations
                function(input) {
                    return input.replace(/(\w{2})\./g, '$1');
                },
        
                // convert shop to a unit format 
                function(input) {
                    return input.replace(/^\s*SHOP\s?(\d*)\,?\s*/, '$1/');
                }
            ])
            
            // split the address
            .split(/\s/)
            
            // extract the unit
            .extract('unit', [
                (/^(?:\#|APT|APARTMENT)\s?(\d+)/),
                (/^(\d+)\/(.*)/)
            ])
            
            // extract the country
            .extract('country', {
                AU: /^AUSTRAL/,
                US: /(^UNITED\sSTATES|^U\.?S\.?A?$)/
            })
            
            // extract the street
            .extractStreet(streetRegexes)
            
            // finalize the address
            .finalize();
    }; // EN parser
})(typeof locales != 'undefined' ? locales : (typeof module != 'undefined' ? module.exports : {}));