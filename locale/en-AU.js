var parser = require('../parsers/en.js');

module.exports = function(input, opts) {
  // parse the base address
  var address = parser(input, opts);

  // look for any postcode parts amongst the remaining regions
  return address.finalize();
};
