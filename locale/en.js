var parser = require('../parsers/en.js');

module.exports = function(input, opts) {
  return parser(input, opts).finalize();
};
