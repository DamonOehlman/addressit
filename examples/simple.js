const addressit = require('addressit');

// parse a made up address, with some slightly tricky parts
const address = addressit('Shop 8, 431 St Kilda Rd Melbourne');

// now log that address to the console
console.log(address)