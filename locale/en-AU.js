var parser = require('../parsers/en.js');
var extend = require('cog/extend');

module.exports = function(input, opts) {
  // parse the base address
  return parser(input, extend({ rePostalCode: /(\d{4})\s*$/ }, opts));
};
