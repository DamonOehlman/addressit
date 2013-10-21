var addressit = require('../..');

module.exports = function(expected) {
  var keys = Object.keys(expected);

  return function(t) {
    var address;

    t.plan(keys.length);

    // parse the address
    address = addressit(t.name);

    // check the equality of the parsed components
    keys.forEach(function(key) {
      t.deepEqual(address[key], expected[key], 'ok');
    });
  };
};