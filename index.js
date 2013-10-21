/* jshint node: true */
'use strict';

/**
  # addressit

  AddressIt is a freeform street address parser, that is designed to take a 
  piece of text and convert that into a structured address that can be
  processed in different systems.

  The focal point of `addressit` is on the street parsing component, rather
  than attempting to appropriately identify various states, counties, towns,
  etc, as these vary from country to country fairly dramatically. These 
  details are instead put into a generic regions array that can be further
  parsed based on your application needs.

  ## Example Usage

  The following is a simple example of how address it can be used:

  ```js
  // parse a made up address, with some slightly tricky parts
  var address = addressit('Shop 8, 431 St Kilda Rd Melbourne');
  ```

  The `address` object would now contain the following information:

  ```
  { text: '8/431 ST KILDA RD MELBOURNE',
    parts: [],
    unit: 8,
    country: undefined,
    number: 431,
    street: 'ST KILDA RD',
    regions: [ 'MELBOURNE' ] }
  ```

  For more examples, see the tests.

  ## Built for Node and the Browser

  The addressit module is designed to work both in the browser and in node.
  If you do wish to use it in a node environment, simply install the package
  into your project:

  For the browser, simply download either
  [addressit.js](/DamonOehlman/addressit/master/addressit.js) or
  [addressit.min.js](/DamonOehlman/addressit/master/addressit.min.js) and
  include it in your page.
**/

exports.Address = require('./address');