//@header
(function (glob) {
    
    var locales = {};

    //= parser/address
    //= parser/core
    
    function addressit(input, locale) {
        var parser;
        
        // update the locale
        locale = (locale || '').toUpperCase();

        // get the parser for the locale
        parser = locales[locale] || locales.EN;

        // parse the address
        return parser(input);
    }
    
    addressit.locales = locales;
    
    //= locales/en
    
    //@export addressit
})(this);