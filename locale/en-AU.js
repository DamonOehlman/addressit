var parser = require('../parsers/en.js');
var rePostcode = /(\d{4})\s*$/;

module.exports = function(input, opts) {
  // parse the base address
  var address = parser(input, opts).finalize();

  // iterate through the regions and look for postcode parts
  address.regions = address.regions.map(function(part) {
    var match = rePostcode.exec(part);

    if (match) {
      part = part.slice(0, match.index).trim();
      address.postalcode = parseInt(match[1], 10);
    }

    return part;
  });


  // look for any postcode parts amongst the remaining regions
  return address;
};
