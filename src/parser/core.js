function AddressParser() {
}

AddressParser.prototype.accept = function(text) {
    return new Address(text);
};

AddressParser.prototype.compile = function(textRegexes) {
    var regexes = [],
        reStreetCleaner = /^\^?(.*)\,?\$?$/;
    
    for (var ii = textRegexes.length; ii--; ) {
        regexes[ii] = new RegExp(textRegexes[ii].replace(reStreetCleaner, '^$1\,?$'));
    } // for
    
    return regexes;
};