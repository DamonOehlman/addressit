var parser = require('../parsers/en.js');
var extend = require('cog/extend');

module.exports = function(input, opts) {
  // parse the base address
  return parser(input, extend({ 
  	country: {
        AUS: /^AUSTRALIA|^A\.?U\.?S?$/i
    },
    rePostalCode: /((?:[1-8][0-9]|9[0-7]|0?[28]|0?9(?=09))(?:[0-9]{2}))\s*$/ }, opts));
               // Postal codes of the form 'DDDD', with the first
               // two digits 02, 08 or 20-97. Leading 0 may be omitted.
               // 909 and 0909 are valid as well - but no other postal
               // codes starting with 9 or 09.
};
