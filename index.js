/* jshint node: true */
'use strict';

const {
  DefaultLocale
} = require('./lib/locale');

const {
  AddressBuilder
} = require('./lib/address');

const CLASSIFIERS = require('./lib/classifiers');

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
  var addressit = require('addressit');

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

  ## Reference

**/

/**
  ### addressit(input, opts?)

  Run the address parser for the given input.  Optional `opts` can be
  supplied if you want to override the default (EN) parser.

**/
module.exports = function(input, opts) {
  const locale = new DefaultLocale();
  const tokens = require('./lib/tokenizer')(input);

  // run the classifiers such that we can observe the history of the address changes
  // the final reverse statement means that the first item is the final parsed result
  const classifiedTokens = CLASSIFIERS.reduce((memo, classifier) => {
    const last = memo[memo.length - 1];
    return memo.concat([classifier(last, locale)]);
  }, [tokens]).reverse();

  console.log(classifiedTokens);


  // // if no locale has been specified, then use the default vanilla en locale
  // var parse = (opts || {}).locale || require('./locale/en-US');

  // // parse the address
  // return parse(input, opts);
  const address = AddressBuilder.fromParts(classifiedTokens[0]);
  console.log(address);
  return address;
};
