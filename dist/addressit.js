(function(e){if("function"==typeof bootstrap)bootstrap("addressit",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeAddressit=e}else"undefined"!=typeof window?window.addressit=e():global.addressit=e()})(function(){var define,ses,bootstrap,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* jshint node: true */
'use strict';

var reNumeric = /^\d+$/;

/**
  ### Address
**/
function Address(text) {
  if (! (this instanceof Address)) {
    return new Address(text);
  }

  this.text = text;
  this.parts = [];
}

module.exports = Address;
var proto = Address.prototype;


/**
  #### Address#_extractStreetParts(startIndex)

  This function is used to extract from the street type match
  index *back to* the street number and possibly unit number fields.

  The function will start with the street type, then also grab the previous
  field regardless of checks.  Fields will continue to be pulled in until
  fields start satisfying numeric checks.  Once positive numeric checks are
  firing, those will be brought in as building / unit numbers and once the
  start of the parts array is reached or we fall back to non-numeric fields
  then the extraction is stopped.
**/
proto._extractStreetParts = function(startIndex) {
  var index = startIndex;
  var streetParts = [];
  var numberParts;
  var parts = this.parts;
  var testFn = function() {
    return true;
  };

  while (index >= 0 && testFn()) {
    var alphaPart = isNaN(parseInt(parts[index], 10));

    if (streetParts.length < 2 || alphaPart) {
      // add the current part to the street parts
      streetParts.unshift(parts.splice(index--, 1));
    }
    else {
      if (! numberParts) {
        numberParts = [];
      } // if

      // add the current part to the building parts
      numberParts.unshift(parts.splice(index--, 1));

      // update the test function
      testFn = function() {
        var isAlpha = isNaN(parseInt(parts[index], 10));

        // if we have building parts, then we are looking
        // for non-alpha values, otherwise alpha
        return numberParts ? (! isAlpha) : isAlpha;
      };
    } // if..else
  } // while

  this.number = numberParts ? numberParts.join('/') : '';
  this.street = streetParts.join(' ').replace(/\,/g, '');

  // parse the number as an integer
  this.number = reNumeric.test(this.number) ? parseInt(this.number, 10) : this.number;
};

/**
  #### Address#clean

  The clean function is used to clean up an address string.  It is designed
  to remove any parts of the text that preven effective parsing of the
  address string.
*/
proto.clean = function(cleaners) {
  // ensure we have cleaners
  cleaners = cleaners || [];

  // convert the text to upper case
  this.text = this.text.toUpperCase();

  // apply the cleaners
  for (var ii = 0; ii < cleaners.length; ii++) {
    if (typeof cleaners[ii] == 'function') {
      this.text = cleaners[ii].call(null, this.text);
    }
    else if (cleaners[ii] instanceof RegExp) {
      this.text = this.text.replace(cleaners[ii], '');
    }
  } // for

  return this;
};

/**
  #### Address#extract(fieldName, regexes)

  The extract function is used to extract the specified field from the raw
  parts that have previously been split from the input text.  If successfully
  located then the field will be updated from the parts and that part removed
  from the parts list.
*/
proto.extract = function(fieldName, regexes) {
  var match;
  var rgxIdx;
  var ii;
  var value;
  var lookups = [];

  // if the regexes have been passed in as objects, then convert to an array
  if (typeof regexes == 'object' && typeof regexes.splice == 'undefined') {
    var newRegexes = [];

    // iterate through the keys in the regexes
    for (var key in regexes) {
      newRegexes[newRegexes.length] = regexes[key];
      lookups[newRegexes.length - 1] = key;
    }

    // update the regexes to point to the new regexes
    regexes = newRegexes;
  }

  // iterate over the unit regexes and test them against the various parts
  for (rgxIdx = 0; rgxIdx < regexes.length; rgxIdx++) {
    for (ii = this.parts.length; ii--; ) {
      match = regexes[rgxIdx].exec(this.parts[ii]);

      // if we have a match, then process
      if (match) {
        // if we have a 2nd capture group, then replace the item with
        // the text of that group
        if (match[2]) {
          this.parts.splice(ii, 1, match[2]);
        }
        // otherwise, just remove the element
        else {
          this.parts.splice(ii, 1);
        } // if..else

        value = lookups[rgxIdx] || match[1];
      } // if
    } // for
  } // for

  // update the field value
  this[fieldName] = parseInt(value, 10) || value;

  return this;
};

/**
  #### Address#extractStreet

  This function is used to parse the address parts and locate any parts
  that look to be related to a street address.
*/
proto.extractStreet = function(regexes, reSplitStreet) {
  var reNumericesque = /^(\d*|\d*\w)$/;
  var parts = this.parts;

  // ensure we have regexes
  regexes = regexes || [];

  // This function is used to locate the "best" street part in an address
  // string.  It is called once a street regex has matched against a part
  // starting from the last part and working towards the front. In terms of
  // what is considered the best, we are looking for the part closest to the
  // start of the string that is not immediately prefixed by a numericesque
  // part (eg. 123, 42A, etc).
  function locateBestStreetPart(startIndex) {
    var bestIndex = startIndex;

    // if the start index is less than or equal to 0, then return
    for (var ii = startIndex-1; ii >= 0; ii--) {
      // iterate over the street regexes and test them against the various parts
      for (var rgxIdx = 0; rgxIdx < regexes.length; rgxIdx++) {
        // if we have a match, then process
        if (regexes[rgxIdx].test(parts[ii]) && parts[ii-1] && (! reNumericesque.test(parts[ii-1]))) {
          // update the best index and break from the inner loop
          bestIndex = ii;
          break;
        } // if
      } // for
    } // for

    return bestIndex;
  } // locateBestStreetPart

  // iterate over the street regexes and test them against the various parts
  for (var partIdx = parts.length; partIdx--; ) {
    for (var rgxIdx = 0; rgxIdx < regexes.length; rgxIdx++) {
      // if we have a match, then process
      // if the match is on the first part though, reject it as we
      // are probably dealing with a town name or something (e.g. St George)
      if (regexes[rgxIdx].test(parts[partIdx]) && partIdx > 0) {
        var startIndex = locateBestStreetPart(partIdx);

        // if we are dealing with a split street (i.e. foo rd west) and the
        // address parts are appropriately delimited, then grab the next part
        // also
        if (reSplitStreet.test(parts[startIndex + 1])) {
          startIndex += 1;
        }

        this._extractStreetParts(startIndex);
        break;
      } // if
    } // for
  } // for

  return this;
};

/**
  #### Address#finalize

  The finalize function takes any remaining parts that have not been extracted
  as other information, and pushes those fields into a generic `regions` field.
*/
proto.finalize = function() {
  // update the regions
  this.regions = this.parts.join(' ').split(/\,\s?/);

  // reset the parts
  this.parts = [];

  return this;
};

/**
  #### Address#split

  Split the address into it's component parts, and remove any empty parts
*/
proto.split = function(separator) {
  // split the string
  var newParts = this.text.split(separator || ' ');

  this.parts = [];
  for (var ii = 0; ii < newParts.length; ii++) {
    if (newParts[ii]) {
      this.parts[this.parts.length] = newParts[ii];
    } // if
  } // for

  return this;
};

/**
  #### Address#toString

  Convert the address to a string representation
*/
proto.toString = function() {
  var output = '';

  if (this.building) {
    output += this.building + '\n';
  } // if

  if (this.street) {
    output += this.number ? this.number + ' ' : '';
    output += this.street + '\n';
  }

  output += this.regions.join(', ') + '\n';

  return output;
};
},{}],2:[function(require,module,exports){
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
**/

/*
## Built for Node and the Browser

The addressit module is designed to work both in the browser and in node.
If you do wish to use it in a node environment, simply install the package
into your project:

For the browser, simply download either
[addressit.js](/DamonOehlman/addressit/master/addressit.js) or
[addressit.min.js](/DamonOehlman/addressit/master/addressit.min.js) and
include it in your page.
*/

module.exports = function(input, opts) {
  var parser = (opts || {}).parser || require('./parsers/en');

  // parse the address
  return parser(input);
};
},{"./parsers/en":4}],3:[function(require,module,exports){
/* jshint node: true */
'use strict';

module.exports = function(textRegexes) {
  var regexes = [];
  var reStreetCleaner = /^\^?(.*)\,?\$?$/;
  var ii;

  for (ii = textRegexes.length; ii--; ) {
    regexes[ii] = new RegExp(
      textRegexes[ii].replace(reStreetCleaner, '^$1\,?$')
    );
  } // for

  return regexes;
};
},{}],4:[function(require,module,exports){
/* jshint node: true */
'use strict';

var Address = require('../address');
var compiler = require('./compiler');

// initialise the street regexes
// these are the regexes for determining whether or not a string is a street
// it is important to note that they are parsed through the reStreetCleaner
// regex to become more strict
// this list has been sourced from:
// https://www.propertyassist.sa.gov.au/pa/qhelp.phtml?cmd=streettype
//
// __NOTE:__ Some of the street types have been disabled due to collisions
// with common parts of suburb names.  At some point the street parser may be
// improved to deal with these cases, but for now this has been deemed
// suitable.

var streetRegexes = compiler([
  'ALLE?Y',               // ALLEY / ALLY
  'APP(ROACH)?',          // APPROACH / APP
  'ARC(ADE)?',            // ARCADE / ARC
  'AV(E|ENUE)?',          // AVENUE / AV / AVE
  '(BOULEVARD|BLVD)',     // BOULEVARD / BLVD
  'BROW',                 // BROW
  'BYPA(SS)?',            // BYPASS / BYPA
  'C(AUSE)?WAY',          // CAUSEWAY / CWAY
  '(CIRCUIT|CCT)',        // CIRCUIT / CCT
  'CIRC(US)?',            // CIRCUS / CIRC
  'CL(OSE)?',             // CLOSE / CL
  'CO?PSE',               // COPSE / CPSE
  '(CORNER|CNR)',         // CORNER / CNR
  // 'COVE',                 // COVE
  'C(OUR)?T',             // COURT / CT
  'CRES(CENT)?',          // CRESCENT / CRES
  'DR(IVE)?',             // DRIVE / DR
  // 'END',                  // END
  'ESP(LANANDE)?',        // ESPLANADE / ESP
  // 'FLAT',                 // FLAT
  'F(REE)?WAY',           // FREEWAY / FWAY
  '(FRONTAGE|FRNT)',      // FRONTAGE / FRNT
  // '(GARDENS|GDNS)',       // GARDENS / GDNS
  '(GLADE|GLD)',          // GLADE / GLD
  // 'GLEN',                 // GLEN
  'GR(EE)?N',             // GREEN / GRN
  // 'GR(OVE)?',             // GROVE / GR
  // 'H(EIGH)?TS',           // HEIGHTS / HTS
  '(HIGHWAY|HWY)',        // HIGHWAY / HWY
  '(LANE|LN)',            // LANE / LN
  'LINK',                 // LINK
  'LOOP',                 // LOOP
  'MALL',                 // MALL
  'MEWS',                 // MEWS
  '(PACKET|PCKT)',        // PACKET / PCKT
  'P(ARA)?DE',            // PARADE / PDE
  // 'PARK',                 // PARK
  '(PARKWAY|PKWY)',       // PARKWAY / PKWY
  'PL(ACE)?',             // PLACE / PL
  'PROM(ENADE)?',         // PROMENADE / PROM
  'RES(ERVE)?',           // RESERVE / RES
  // 'RI?DGE',               // RIDGE / RDGE
  'RISE',                 // RISE
  'R(OA)?D',              // ROAD / RD
  'ROW',                  // ROW
  'SQ(UARE)?',            // SQUARE / SQ
  'ST(REET)?',            // STREET / ST
  'STRI?P',               // STRIP / STRP
  'TARN',                 // TARN
  'T(ERRA)?CE',           // TERRACE / TCE
  '(THOROUGHFARE|TFRE)',  // THOROUGHFARE / TFRE
  'TRACK?',               // TRACK / TRAC
  'T(RUNK)?WAY',          // TRUNKWAY / TWAY
  // 'VIEW',                 // VIEW
  'VI?STA',               // VISTA / VSTA
  'WALK',                 // WALK
  'WA?Y',                 // WAY / WY
  'W(ALK)?WAY',           // WALKWAY / WWAY
  'YARD'                  // YARD
]);

var reSplitStreet = /^(N|NTH|NORTH|E|EST|EAST|S|STH|SOUTH|W|WST|WEST)\,$/i;

module.exports = function(text) {
  return new Address(text)
    // clean the address
    .clean([
        // remove trailing dots from two letter abbreviations
        function(input) {
            return input.replace(/(\w{2})\./g, '$1');
        },

        // convert shop to a unit format
        function(input) {
            return input.replace(/^\s*SHOP\s?(\d*)\,?\s*/, '$1/');
        }
    ])

    // split the address
    .split(/\s/)

    // extract the unit
    .extract('unit', [
        (/^(?:\#|APT|APARTMENT)\s?(\d+)/),
        (/^(\d+)\/(.*)/)
    ])

    // extract the country
    .extract('country', {
        AU: /^AUSTRAL/,
        US: /(^UNITED\sSTATES|^U\.?S\.?A?$)/
    })

    // extract the street
    .extractStreet(streetRegexes, reSplitStreet)

    // finalize the address
    .finalize();
};
},{"../address":1,"./compiler":3}]},{},[2])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi9jb2RlL0RhbW9uT2VobG1hbi9hZGRyZXNzaXQvYWRkcmVzcy5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvRGFtb25PZWhsbWFuL2FkZHJlc3NpdC9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvRGFtb25PZWhsbWFuL2FkZHJlc3NpdC9wYXJzZXJzL2NvbXBpbGVyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9EYW1vbk9laGxtYW4vYWRkcmVzc2l0L3BhcnNlcnMvZW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVOdW1lcmljID0gL15cXGQrJC87XG5cbi8qKlxuICAjIyMgQWRkcmVzc1xuKiovXG5mdW5jdGlvbiBBZGRyZXNzKHRleHQpIHtcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBBZGRyZXNzKSkge1xuICAgIHJldHVybiBuZXcgQWRkcmVzcyh0ZXh0KTtcbiAgfVxuXG4gIHRoaXMudGV4dCA9IHRleHQ7XG4gIHRoaXMucGFydHMgPSBbXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBZGRyZXNzO1xudmFyIHByb3RvID0gQWRkcmVzcy5wcm90b3R5cGU7XG5cblxuLyoqXG4gICMjIyMgQWRkcmVzcyNfZXh0cmFjdFN0cmVldFBhcnRzKHN0YXJ0SW5kZXgpXG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGV4dHJhY3QgZnJvbSB0aGUgc3RyZWV0IHR5cGUgbWF0Y2hcbiAgaW5kZXggKmJhY2sgdG8qIHRoZSBzdHJlZXQgbnVtYmVyIGFuZCBwb3NzaWJseSB1bml0IG51bWJlciBmaWVsZHMuXG5cbiAgVGhlIGZ1bmN0aW9uIHdpbGwgc3RhcnQgd2l0aCB0aGUgc3RyZWV0IHR5cGUsIHRoZW4gYWxzbyBncmFiIHRoZSBwcmV2aW91c1xuICBmaWVsZCByZWdhcmRsZXNzIG9mIGNoZWNrcy4gIEZpZWxkcyB3aWxsIGNvbnRpbnVlIHRvIGJlIHB1bGxlZCBpbiB1bnRpbFxuICBmaWVsZHMgc3RhcnQgc2F0aXNmeWluZyBudW1lcmljIGNoZWNrcy4gIE9uY2UgcG9zaXRpdmUgbnVtZXJpYyBjaGVja3MgYXJlXG4gIGZpcmluZywgdGhvc2Ugd2lsbCBiZSBicm91Z2h0IGluIGFzIGJ1aWxkaW5nIC8gdW5pdCBudW1iZXJzIGFuZCBvbmNlIHRoZVxuICBzdGFydCBvZiB0aGUgcGFydHMgYXJyYXkgaXMgcmVhY2hlZCBvciB3ZSBmYWxsIGJhY2sgdG8gbm9uLW51bWVyaWMgZmllbGRzXG4gIHRoZW4gdGhlIGV4dHJhY3Rpb24gaXMgc3RvcHBlZC5cbioqL1xucHJvdG8uX2V4dHJhY3RTdHJlZXRQYXJ0cyA9IGZ1bmN0aW9uKHN0YXJ0SW5kZXgpIHtcbiAgdmFyIGluZGV4ID0gc3RhcnRJbmRleDtcbiAgdmFyIHN0cmVldFBhcnRzID0gW107XG4gIHZhciBudW1iZXJQYXJ0cztcbiAgdmFyIHBhcnRzID0gdGhpcy5wYXJ0cztcbiAgdmFyIHRlc3RGbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIHdoaWxlIChpbmRleCA+PSAwICYmIHRlc3RGbigpKSB7XG4gICAgdmFyIGFscGhhUGFydCA9IGlzTmFOKHBhcnNlSW50KHBhcnRzW2luZGV4XSwgMTApKTtcblxuICAgIGlmIChzdHJlZXRQYXJ0cy5sZW5ndGggPCAyIHx8IGFscGhhUGFydCkge1xuICAgICAgLy8gYWRkIHRoZSBjdXJyZW50IHBhcnQgdG8gdGhlIHN0cmVldCBwYXJ0c1xuICAgICAgc3RyZWV0UGFydHMudW5zaGlmdChwYXJ0cy5zcGxpY2UoaW5kZXgtLSwgMSkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICghIG51bWJlclBhcnRzKSB7XG4gICAgICAgIG51bWJlclBhcnRzID0gW107XG4gICAgICB9IC8vIGlmXG5cbiAgICAgIC8vIGFkZCB0aGUgY3VycmVudCBwYXJ0IHRvIHRoZSBidWlsZGluZyBwYXJ0c1xuICAgICAgbnVtYmVyUGFydHMudW5zaGlmdChwYXJ0cy5zcGxpY2UoaW5kZXgtLSwgMSkpO1xuXG4gICAgICAvLyB1cGRhdGUgdGhlIHRlc3QgZnVuY3Rpb25cbiAgICAgIHRlc3RGbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaXNBbHBoYSA9IGlzTmFOKHBhcnNlSW50KHBhcnRzW2luZGV4XSwgMTApKTtcblxuICAgICAgICAvLyBpZiB3ZSBoYXZlIGJ1aWxkaW5nIHBhcnRzLCB0aGVuIHdlIGFyZSBsb29raW5nXG4gICAgICAgIC8vIGZvciBub24tYWxwaGEgdmFsdWVzLCBvdGhlcndpc2UgYWxwaGFcbiAgICAgICAgcmV0dXJuIG51bWJlclBhcnRzID8gKCEgaXNBbHBoYSkgOiBpc0FscGhhO1xuICAgICAgfTtcbiAgICB9IC8vIGlmLi5lbHNlXG4gIH0gLy8gd2hpbGVcblxuICB0aGlzLm51bWJlciA9IG51bWJlclBhcnRzID8gbnVtYmVyUGFydHMuam9pbignLycpIDogJyc7XG4gIHRoaXMuc3RyZWV0ID0gc3RyZWV0UGFydHMuam9pbignICcpLnJlcGxhY2UoL1xcLC9nLCAnJyk7XG5cbiAgLy8gcGFyc2UgdGhlIG51bWJlciBhcyBhbiBpbnRlZ2VyXG4gIHRoaXMubnVtYmVyID0gcmVOdW1lcmljLnRlc3QodGhpcy5udW1iZXIpID8gcGFyc2VJbnQodGhpcy5udW1iZXIsIDEwKSA6IHRoaXMubnVtYmVyO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNjbGVhblxuXG4gIFRoZSBjbGVhbiBmdW5jdGlvbiBpcyB1c2VkIHRvIGNsZWFuIHVwIGFuIGFkZHJlc3Mgc3RyaW5nLiAgSXQgaXMgZGVzaWduZWRcbiAgdG8gcmVtb3ZlIGFueSBwYXJ0cyBvZiB0aGUgdGV4dCB0aGF0IHByZXZlbiBlZmZlY3RpdmUgcGFyc2luZyBvZiB0aGVcbiAgYWRkcmVzcyBzdHJpbmcuXG4qL1xucHJvdG8uY2xlYW4gPSBmdW5jdGlvbihjbGVhbmVycykge1xuICAvLyBlbnN1cmUgd2UgaGF2ZSBjbGVhbmVyc1xuICBjbGVhbmVycyA9IGNsZWFuZXJzIHx8IFtdO1xuXG4gIC8vIGNvbnZlcnQgdGhlIHRleHQgdG8gdXBwZXIgY2FzZVxuICB0aGlzLnRleHQgPSB0aGlzLnRleHQudG9VcHBlckNhc2UoKTtcblxuICAvLyBhcHBseSB0aGUgY2xlYW5lcnNcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGNsZWFuZXJzLmxlbmd0aDsgaWkrKykge1xuICAgIGlmICh0eXBlb2YgY2xlYW5lcnNbaWldID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMudGV4dCA9IGNsZWFuZXJzW2lpXS5jYWxsKG51bGwsIHRoaXMudGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNsZWFuZXJzW2lpXSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgdGhpcy50ZXh0ID0gdGhpcy50ZXh0LnJlcGxhY2UoY2xlYW5lcnNbaWldLCAnJyk7XG4gICAgfVxuICB9IC8vIGZvclxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNleHRyYWN0KGZpZWxkTmFtZSwgcmVnZXhlcylcblxuICBUaGUgZXh0cmFjdCBmdW5jdGlvbiBpcyB1c2VkIHRvIGV4dHJhY3QgdGhlIHNwZWNpZmllZCBmaWVsZCBmcm9tIHRoZSByYXdcbiAgcGFydHMgdGhhdCBoYXZlIHByZXZpb3VzbHkgYmVlbiBzcGxpdCBmcm9tIHRoZSBpbnB1dCB0ZXh0LiAgSWYgc3VjY2Vzc2Z1bGx5XG4gIGxvY2F0ZWQgdGhlbiB0aGUgZmllbGQgd2lsbCBiZSB1cGRhdGVkIGZyb20gdGhlIHBhcnRzIGFuZCB0aGF0IHBhcnQgcmVtb3ZlZFxuICBmcm9tIHRoZSBwYXJ0cyBsaXN0LlxuKi9cbnByb3RvLmV4dHJhY3QgPSBmdW5jdGlvbihmaWVsZE5hbWUsIHJlZ2V4ZXMpIHtcbiAgdmFyIG1hdGNoO1xuICB2YXIgcmd4SWR4O1xuICB2YXIgaWk7XG4gIHZhciB2YWx1ZTtcbiAgdmFyIGxvb2t1cHMgPSBbXTtcblxuICAvLyBpZiB0aGUgcmVnZXhlcyBoYXZlIGJlZW4gcGFzc2VkIGluIGFzIG9iamVjdHMsIHRoZW4gY29udmVydCB0byBhbiBhcnJheVxuICBpZiAodHlwZW9mIHJlZ2V4ZXMgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHJlZ2V4ZXMuc3BsaWNlID09ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIG5ld1JlZ2V4ZXMgPSBbXTtcblxuICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUga2V5cyBpbiB0aGUgcmVnZXhlc1xuICAgIGZvciAodmFyIGtleSBpbiByZWdleGVzKSB7XG4gICAgICBuZXdSZWdleGVzW25ld1JlZ2V4ZXMubGVuZ3RoXSA9IHJlZ2V4ZXNba2V5XTtcbiAgICAgIGxvb2t1cHNbbmV3UmVnZXhlcy5sZW5ndGggLSAxXSA9IGtleTtcbiAgICB9XG5cbiAgICAvLyB1cGRhdGUgdGhlIHJlZ2V4ZXMgdG8gcG9pbnQgdG8gdGhlIG5ldyByZWdleGVzXG4gICAgcmVnZXhlcyA9IG5ld1JlZ2V4ZXM7XG4gIH1cblxuICAvLyBpdGVyYXRlIG92ZXIgdGhlIHVuaXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgZm9yIChyZ3hJZHggPSAwOyByZ3hJZHggPCByZWdleGVzLmxlbmd0aDsgcmd4SWR4KyspIHtcbiAgICBmb3IgKGlpID0gdGhpcy5wYXJ0cy5sZW5ndGg7IGlpLS07ICkge1xuICAgICAgbWF0Y2ggPSByZWdleGVzW3JneElkeF0uZXhlYyh0aGlzLnBhcnRzW2lpXSk7XG5cbiAgICAgIC8vIGlmIHdlIGhhdmUgYSBtYXRjaCwgdGhlbiBwcm9jZXNzXG4gICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIDJuZCBjYXB0dXJlIGdyb3VwLCB0aGVuIHJlcGxhY2UgdGhlIGl0ZW0gd2l0aFxuICAgICAgICAvLyB0aGUgdGV4dCBvZiB0aGF0IGdyb3VwXG4gICAgICAgIGlmIChtYXRjaFsyXSkge1xuICAgICAgICAgIHRoaXMucGFydHMuc3BsaWNlKGlpLCAxLCBtYXRjaFsyXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSB0aGUgZWxlbWVudFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSwgMSk7XG4gICAgICAgIH0gLy8gaWYuLmVsc2VcblxuICAgICAgICB2YWx1ZSA9IGxvb2t1cHNbcmd4SWR4XSB8fCBtYXRjaFsxXTtcbiAgICAgIH0gLy8gaWZcbiAgICB9IC8vIGZvclxuICB9IC8vIGZvclxuXG4gIC8vIHVwZGF0ZSB0aGUgZmllbGQgdmFsdWVcbiAgdGhpc1tmaWVsZE5hbWVdID0gcGFyc2VJbnQodmFsdWUsIDEwKSB8fCB2YWx1ZTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZXh0cmFjdFN0cmVldFxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBwYXJzZSB0aGUgYWRkcmVzcyBwYXJ0cyBhbmQgbG9jYXRlIGFueSBwYXJ0c1xuICB0aGF0IGxvb2sgdG8gYmUgcmVsYXRlZCB0byBhIHN0cmVldCBhZGRyZXNzLlxuKi9cbnByb3RvLmV4dHJhY3RTdHJlZXQgPSBmdW5jdGlvbihyZWdleGVzLCByZVNwbGl0U3RyZWV0KSB7XG4gIHZhciByZU51bWVyaWNlc3F1ZSA9IC9eKFxcZCp8XFxkKlxcdykkLztcbiAgdmFyIHBhcnRzID0gdGhpcy5wYXJ0cztcblxuICAvLyBlbnN1cmUgd2UgaGF2ZSByZWdleGVzXG4gIHJlZ2V4ZXMgPSByZWdleGVzIHx8IFtdO1xuXG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBsb2NhdGUgdGhlIFwiYmVzdFwiIHN0cmVldCBwYXJ0IGluIGFuIGFkZHJlc3NcbiAgLy8gc3RyaW5nLiAgSXQgaXMgY2FsbGVkIG9uY2UgYSBzdHJlZXQgcmVnZXggaGFzIG1hdGNoZWQgYWdhaW5zdCBhIHBhcnRcbiAgLy8gc3RhcnRpbmcgZnJvbSB0aGUgbGFzdCBwYXJ0IGFuZCB3b3JraW5nIHRvd2FyZHMgdGhlIGZyb250LiBJbiB0ZXJtcyBvZlxuICAvLyB3aGF0IGlzIGNvbnNpZGVyZWQgdGhlIGJlc3QsIHdlIGFyZSBsb29raW5nIGZvciB0aGUgcGFydCBjbG9zZXN0IHRvIHRoZVxuICAvLyBzdGFydCBvZiB0aGUgc3RyaW5nIHRoYXQgaXMgbm90IGltbWVkaWF0ZWx5IHByZWZpeGVkIGJ5IGEgbnVtZXJpY2VzcXVlXG4gIC8vIHBhcnQgKGVnLiAxMjMsIDQyQSwgZXRjKS5cbiAgZnVuY3Rpb24gbG9jYXRlQmVzdFN0cmVldFBhcnQoc3RhcnRJbmRleCkge1xuICAgIHZhciBiZXN0SW5kZXggPSBzdGFydEluZGV4O1xuXG4gICAgLy8gaWYgdGhlIHN0YXJ0IGluZGV4IGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byAwLCB0aGVuIHJldHVyblxuICAgIGZvciAodmFyIGlpID0gc3RhcnRJbmRleC0xOyBpaSA+PSAwOyBpaS0tKSB7XG4gICAgICAvLyBpdGVyYXRlIG92ZXIgdGhlIHN0cmVldCByZWdleGVzIGFuZCB0ZXN0IHRoZW0gYWdhaW5zdCB0aGUgdmFyaW91cyBwYXJ0c1xuICAgICAgZm9yICh2YXIgcmd4SWR4ID0gMDsgcmd4SWR4IDwgcmVnZXhlcy5sZW5ndGg7IHJneElkeCsrKSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBtYXRjaCwgdGhlbiBwcm9jZXNzXG4gICAgICAgIGlmIChyZWdleGVzW3JneElkeF0udGVzdChwYXJ0c1tpaV0pICYmIHBhcnRzW2lpLTFdICYmICghIHJlTnVtZXJpY2VzcXVlLnRlc3QocGFydHNbaWktMV0pKSkge1xuICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgYmVzdCBpbmRleCBhbmQgYnJlYWsgZnJvbSB0aGUgaW5uZXIgbG9vcFxuICAgICAgICAgIGJlc3RJbmRleCA9IGlpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IC8vIGlmXG4gICAgICB9IC8vIGZvclxuICAgIH0gLy8gZm9yXG5cbiAgICByZXR1cm4gYmVzdEluZGV4O1xuICB9IC8vIGxvY2F0ZUJlc3RTdHJlZXRQYXJ0XG5cbiAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdHJlZXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgZm9yICh2YXIgcGFydElkeCA9IHBhcnRzLmxlbmd0aDsgcGFydElkeC0tOyApIHtcbiAgICBmb3IgKHZhciByZ3hJZHggPSAwOyByZ3hJZHggPCByZWdleGVzLmxlbmd0aDsgcmd4SWR4KyspIHtcbiAgICAgIC8vIGlmIHdlIGhhdmUgYSBtYXRjaCwgdGhlbiBwcm9jZXNzXG4gICAgICAvLyBpZiB0aGUgbWF0Y2ggaXMgb24gdGhlIGZpcnN0IHBhcnQgdGhvdWdoLCByZWplY3QgaXQgYXMgd2VcbiAgICAgIC8vIGFyZSBwcm9iYWJseSBkZWFsaW5nIHdpdGggYSB0b3duIG5hbWUgb3Igc29tZXRoaW5nIChlLmcuIFN0IEdlb3JnZSlcbiAgICAgIGlmIChyZWdleGVzW3JneElkeF0udGVzdChwYXJ0c1twYXJ0SWR4XSkgJiYgcGFydElkeCA+IDApIHtcbiAgICAgICAgdmFyIHN0YXJ0SW5kZXggPSBsb2NhdGVCZXN0U3RyZWV0UGFydChwYXJ0SWR4KTtcblxuICAgICAgICAvLyBpZiB3ZSBhcmUgZGVhbGluZyB3aXRoIGEgc3BsaXQgc3RyZWV0IChpLmUuIGZvbyByZCB3ZXN0KSBhbmQgdGhlXG4gICAgICAgIC8vIGFkZHJlc3MgcGFydHMgYXJlIGFwcHJvcHJpYXRlbHkgZGVsaW1pdGVkLCB0aGVuIGdyYWIgdGhlIG5leHQgcGFydFxuICAgICAgICAvLyBhbHNvXG4gICAgICAgIGlmIChyZVNwbGl0U3RyZWV0LnRlc3QocGFydHNbc3RhcnRJbmRleCArIDFdKSkge1xuICAgICAgICAgIHN0YXJ0SW5kZXggKz0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2V4dHJhY3RTdHJlZXRQYXJ0cyhzdGFydEluZGV4KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IC8vIGlmXG4gICAgfSAvLyBmb3JcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZmluYWxpemVcblxuICBUaGUgZmluYWxpemUgZnVuY3Rpb24gdGFrZXMgYW55IHJlbWFpbmluZyBwYXJ0cyB0aGF0IGhhdmUgbm90IGJlZW4gZXh0cmFjdGVkXG4gIGFzIG90aGVyIGluZm9ybWF0aW9uLCBhbmQgcHVzaGVzIHRob3NlIGZpZWxkcyBpbnRvIGEgZ2VuZXJpYyBgcmVnaW9uc2AgZmllbGQuXG4qL1xucHJvdG8uZmluYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgLy8gdXBkYXRlIHRoZSByZWdpb25zXG4gIHRoaXMucmVnaW9ucyA9IHRoaXMucGFydHMuam9pbignICcpLnNwbGl0KC9cXCxcXHM/Lyk7XG5cbiAgLy8gcmVzZXQgdGhlIHBhcnRzXG4gIHRoaXMucGFydHMgPSBbXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3Mjc3BsaXRcblxuICBTcGxpdCB0aGUgYWRkcmVzcyBpbnRvIGl0J3MgY29tcG9uZW50IHBhcnRzLCBhbmQgcmVtb3ZlIGFueSBlbXB0eSBwYXJ0c1xuKi9cbnByb3RvLnNwbGl0ID0gZnVuY3Rpb24oc2VwYXJhdG9yKSB7XG4gIC8vIHNwbGl0IHRoZSBzdHJpbmdcbiAgdmFyIG5ld1BhcnRzID0gdGhpcy50ZXh0LnNwbGl0KHNlcGFyYXRvciB8fCAnICcpO1xuXG4gIHRoaXMucGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5ld1BhcnRzLmxlbmd0aDsgaWkrKykge1xuICAgIGlmIChuZXdQYXJ0c1tpaV0pIHtcbiAgICAgIHRoaXMucGFydHNbdGhpcy5wYXJ0cy5sZW5ndGhdID0gbmV3UGFydHNbaWldO1xuICAgIH0gLy8gaWZcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjdG9TdHJpbmdcblxuICBDb252ZXJ0IHRoZSBhZGRyZXNzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4qL1xucHJvdG8udG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG91dHB1dCA9ICcnO1xuXG4gIGlmICh0aGlzLmJ1aWxkaW5nKSB7XG4gICAgb3V0cHV0ICs9IHRoaXMuYnVpbGRpbmcgKyAnXFxuJztcbiAgfSAvLyBpZlxuXG4gIGlmICh0aGlzLnN0cmVldCkge1xuICAgIG91dHB1dCArPSB0aGlzLm51bWJlciA/IHRoaXMubnVtYmVyICsgJyAnIDogJyc7XG4gICAgb3V0cHV0ICs9IHRoaXMuc3RyZWV0ICsgJ1xcbic7XG4gIH1cblxuICBvdXRwdXQgKz0gdGhpcy5yZWdpb25zLmpvaW4oJywgJykgKyAnXFxuJztcblxuICByZXR1cm4gb3V0cHV0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyBhZGRyZXNzaXRcblxuICBBZGRyZXNzSXQgaXMgYSBmcmVlZm9ybSBzdHJlZXQgYWRkcmVzcyBwYXJzZXIsIHRoYXQgaXMgZGVzaWduZWQgdG8gdGFrZSBhXG4gIHBpZWNlIG9mIHRleHQgYW5kIGNvbnZlcnQgdGhhdCBpbnRvIGEgc3RydWN0dXJlZCBhZGRyZXNzIHRoYXQgY2FuIGJlXG4gIHByb2Nlc3NlZCBpbiBkaWZmZXJlbnQgc3lzdGVtcy5cblxuICBUaGUgZm9jYWwgcG9pbnQgb2YgYGFkZHJlc3NpdGAgaXMgb24gdGhlIHN0cmVldCBwYXJzaW5nIGNvbXBvbmVudCwgcmF0aGVyXG4gIHRoYW4gYXR0ZW1wdGluZyB0byBhcHByb3ByaWF0ZWx5IGlkZW50aWZ5IHZhcmlvdXMgc3RhdGVzLCBjb3VudGllcywgdG93bnMsXG4gIGV0YywgYXMgdGhlc2UgdmFyeSBmcm9tIGNvdW50cnkgdG8gY291bnRyeSBmYWlybHkgZHJhbWF0aWNhbGx5LiBUaGVzZVxuICBkZXRhaWxzIGFyZSBpbnN0ZWFkIHB1dCBpbnRvIGEgZ2VuZXJpYyByZWdpb25zIGFycmF5IHRoYXQgY2FuIGJlIGZ1cnRoZXJcbiAgcGFyc2VkIGJhc2VkIG9uIHlvdXIgYXBwbGljYXRpb24gbmVlZHMuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIFRoZSBmb2xsb3dpbmcgaXMgYSBzaW1wbGUgZXhhbXBsZSBvZiBob3cgYWRkcmVzcyBpdCBjYW4gYmUgdXNlZDpcblxuICBgYGBqc1xuICAvLyBwYXJzZSBhIG1hZGUgdXAgYWRkcmVzcywgd2l0aCBzb21lIHNsaWdodGx5IHRyaWNreSBwYXJ0c1xuICB2YXIgYWRkcmVzcyA9IGFkZHJlc3NpdCgnU2hvcCA4LCA0MzEgU3QgS2lsZGEgUmQgTWVsYm91cm5lJyk7XG4gIGBgYFxuXG4gIFRoZSBgYWRkcmVzc2Agb2JqZWN0IHdvdWxkIG5vdyBjb250YWluIHRoZSBmb2xsb3dpbmcgaW5mb3JtYXRpb246XG5cbiAgYGBgXG4gIHsgdGV4dDogJzgvNDMxIFNUIEtJTERBIFJEIE1FTEJPVVJORScsXG4gICAgcGFydHM6IFtdLFxuICAgIHVuaXQ6IDgsXG4gICAgY291bnRyeTogdW5kZWZpbmVkLFxuICAgIG51bWJlcjogNDMxLFxuICAgIHN0cmVldDogJ1NUIEtJTERBIFJEJyxcbiAgICByZWdpb25zOiBbICdNRUxCT1VSTkUnIF0gfVxuICBgYGBcblxuICBGb3IgbW9yZSBleGFtcGxlcywgc2VlIHRoZSB0ZXN0cy5cbioqL1xuXG4vKlxuIyMgQnVpbHQgZm9yIE5vZGUgYW5kIHRoZSBCcm93c2VyXG5cblRoZSBhZGRyZXNzaXQgbW9kdWxlIGlzIGRlc2lnbmVkIHRvIHdvcmsgYm90aCBpbiB0aGUgYnJvd3NlciBhbmQgaW4gbm9kZS5cbklmIHlvdSBkbyB3aXNoIHRvIHVzZSBpdCBpbiBhIG5vZGUgZW52aXJvbm1lbnQsIHNpbXBseSBpbnN0YWxsIHRoZSBwYWNrYWdlXG5pbnRvIHlvdXIgcHJvamVjdDpcblxuRm9yIHRoZSBicm93c2VyLCBzaW1wbHkgZG93bmxvYWQgZWl0aGVyXG5bYWRkcmVzc2l0LmpzXSgvRGFtb25PZWhsbWFuL2FkZHJlc3NpdC9tYXN0ZXIvYWRkcmVzc2l0LmpzKSBvclxuW2FkZHJlc3NpdC5taW4uanNdKC9EYW1vbk9laGxtYW4vYWRkcmVzc2l0L21hc3Rlci9hZGRyZXNzaXQubWluLmpzKSBhbmRcbmluY2x1ZGUgaXQgaW4geW91ciBwYWdlLlxuKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICB2YXIgcGFyc2VyID0gKG9wdHMgfHwge30pLnBhcnNlciB8fCByZXF1aXJlKCcuL3BhcnNlcnMvZW4nKTtcblxuICAvLyBwYXJzZSB0aGUgYWRkcmVzc1xuICByZXR1cm4gcGFyc2VyKGlucHV0KTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0UmVnZXhlcykge1xuICB2YXIgcmVnZXhlcyA9IFtdO1xuICB2YXIgcmVTdHJlZXRDbGVhbmVyID0gL15cXF4/KC4qKVxcLD9cXCQ/JC87XG4gIHZhciBpaTtcblxuICBmb3IgKGlpID0gdGV4dFJlZ2V4ZXMubGVuZ3RoOyBpaS0tOyApIHtcbiAgICByZWdleGVzW2lpXSA9IG5ldyBSZWdFeHAoXG4gICAgICB0ZXh0UmVnZXhlc1tpaV0ucmVwbGFjZShyZVN0cmVldENsZWFuZXIsICdeJDFcXCw/JCcpXG4gICAgKTtcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gcmVnZXhlcztcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEFkZHJlc3MgPSByZXF1aXJlKCcuLi9hZGRyZXNzJyk7XG52YXIgY29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbXBpbGVyJyk7XG5cbi8vIGluaXRpYWxpc2UgdGhlIHN0cmVldCByZWdleGVzXG4vLyB0aGVzZSBhcmUgdGhlIHJlZ2V4ZXMgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgb3Igbm90IGEgc3RyaW5nIGlzIGEgc3RyZWV0XG4vLyBpdCBpcyBpbXBvcnRhbnQgdG8gbm90ZSB0aGF0IHRoZXkgYXJlIHBhcnNlZCB0aHJvdWdoIHRoZSByZVN0cmVldENsZWFuZXJcbi8vIHJlZ2V4IHRvIGJlY29tZSBtb3JlIHN0cmljdFxuLy8gdGhpcyBsaXN0IGhhcyBiZWVuIHNvdXJjZWQgZnJvbTpcbi8vIGh0dHBzOi8vd3d3LnByb3BlcnR5YXNzaXN0LnNhLmdvdi5hdS9wYS9xaGVscC5waHRtbD9jbWQ9c3RyZWV0dHlwZVxuLy9cbi8vIF9fTk9URTpfXyBTb21lIG9mIHRoZSBzdHJlZXQgdHlwZXMgaGF2ZSBiZWVuIGRpc2FibGVkIGR1ZSB0byBjb2xsaXNpb25zXG4vLyB3aXRoIGNvbW1vbiBwYXJ0cyBvZiBzdWJ1cmIgbmFtZXMuICBBdCBzb21lIHBvaW50IHRoZSBzdHJlZXQgcGFyc2VyIG1heSBiZVxuLy8gaW1wcm92ZWQgdG8gZGVhbCB3aXRoIHRoZXNlIGNhc2VzLCBidXQgZm9yIG5vdyB0aGlzIGhhcyBiZWVuIGRlZW1lZFxuLy8gc3VpdGFibGUuXG5cbnZhciBzdHJlZXRSZWdleGVzID0gY29tcGlsZXIoW1xuICAnQUxMRT9ZJywgICAgICAgICAgICAgICAvLyBBTExFWSAvIEFMTFlcbiAgJ0FQUChST0FDSCk/JywgICAgICAgICAgLy8gQVBQUk9BQ0ggLyBBUFBcbiAgJ0FSQyhBREUpPycsICAgICAgICAgICAgLy8gQVJDQURFIC8gQVJDXG4gICdBVihFfEVOVUUpPycsICAgICAgICAgIC8vIEFWRU5VRSAvIEFWIC8gQVZFXG4gICcoQk9VTEVWQVJEfEJMVkQpJywgICAgIC8vIEJPVUxFVkFSRCAvIEJMVkRcbiAgJ0JST1cnLCAgICAgICAgICAgICAgICAgLy8gQlJPV1xuICAnQllQQShTUyk/JywgICAgICAgICAgICAvLyBCWVBBU1MgLyBCWVBBXG4gICdDKEFVU0UpP1dBWScsICAgICAgICAgIC8vIENBVVNFV0FZIC8gQ1dBWVxuICAnKENJUkNVSVR8Q0NUKScsICAgICAgICAvLyBDSVJDVUlUIC8gQ0NUXG4gICdDSVJDKFVTKT8nLCAgICAgICAgICAgIC8vIENJUkNVUyAvIENJUkNcbiAgJ0NMKE9TRSk/JywgICAgICAgICAgICAgLy8gQ0xPU0UgLyBDTFxuICAnQ08/UFNFJywgICAgICAgICAgICAgICAvLyBDT1BTRSAvIENQU0VcbiAgJyhDT1JORVJ8Q05SKScsICAgICAgICAgLy8gQ09STkVSIC8gQ05SXG4gIC8vICdDT1ZFJywgICAgICAgICAgICAgICAgIC8vIENPVkVcbiAgJ0MoT1VSKT9UJywgICAgICAgICAgICAgLy8gQ09VUlQgLyBDVFxuICAnQ1JFUyhDRU5UKT8nLCAgICAgICAgICAvLyBDUkVTQ0VOVCAvIENSRVNcbiAgJ0RSKElWRSk/JywgICAgICAgICAgICAgLy8gRFJJVkUgLyBEUlxuICAvLyAnRU5EJywgICAgICAgICAgICAgICAgICAvLyBFTkRcbiAgJ0VTUChMQU5BTkRFKT8nLCAgICAgICAgLy8gRVNQTEFOQURFIC8gRVNQXG4gIC8vICdGTEFUJywgICAgICAgICAgICAgICAgIC8vIEZMQVRcbiAgJ0YoUkVFKT9XQVknLCAgICAgICAgICAgLy8gRlJFRVdBWSAvIEZXQVlcbiAgJyhGUk9OVEFHRXxGUk5UKScsICAgICAgLy8gRlJPTlRBR0UgLyBGUk5UXG4gIC8vICcoR0FSREVOU3xHRE5TKScsICAgICAgIC8vIEdBUkRFTlMgLyBHRE5TXG4gICcoR0xBREV8R0xEKScsICAgICAgICAgIC8vIEdMQURFIC8gR0xEXG4gIC8vICdHTEVOJywgICAgICAgICAgICAgICAgIC8vIEdMRU5cbiAgJ0dSKEVFKT9OJywgICAgICAgICAgICAgLy8gR1JFRU4gLyBHUk5cbiAgLy8gJ0dSKE9WRSk/JywgICAgICAgICAgICAgLy8gR1JPVkUgLyBHUlxuICAvLyAnSChFSUdIKT9UUycsICAgICAgICAgICAvLyBIRUlHSFRTIC8gSFRTXG4gICcoSElHSFdBWXxIV1kpJywgICAgICAgIC8vIEhJR0hXQVkgLyBIV1lcbiAgJyhMQU5FfExOKScsICAgICAgICAgICAgLy8gTEFORSAvIExOXG4gICdMSU5LJywgICAgICAgICAgICAgICAgIC8vIExJTktcbiAgJ0xPT1AnLCAgICAgICAgICAgICAgICAgLy8gTE9PUFxuICAnTUFMTCcsICAgICAgICAgICAgICAgICAvLyBNQUxMXG4gICdNRVdTJywgICAgICAgICAgICAgICAgIC8vIE1FV1NcbiAgJyhQQUNLRVR8UENLVCknLCAgICAgICAgLy8gUEFDS0VUIC8gUENLVFxuICAnUChBUkEpP0RFJywgICAgICAgICAgICAvLyBQQVJBREUgLyBQREVcbiAgLy8gJ1BBUksnLCAgICAgICAgICAgICAgICAgLy8gUEFSS1xuICAnKFBBUktXQVl8UEtXWSknLCAgICAgICAvLyBQQVJLV0FZIC8gUEtXWVxuICAnUEwoQUNFKT8nLCAgICAgICAgICAgICAvLyBQTEFDRSAvIFBMXG4gICdQUk9NKEVOQURFKT8nLCAgICAgICAgIC8vIFBST01FTkFERSAvIFBST01cbiAgJ1JFUyhFUlZFKT8nLCAgICAgICAgICAgLy8gUkVTRVJWRSAvIFJFU1xuICAvLyAnUkk/REdFJywgICAgICAgICAgICAgICAvLyBSSURHRSAvIFJER0VcbiAgJ1JJU0UnLCAgICAgICAgICAgICAgICAgLy8gUklTRVxuICAnUihPQSk/RCcsICAgICAgICAgICAgICAvLyBST0FEIC8gUkRcbiAgJ1JPVycsICAgICAgICAgICAgICAgICAgLy8gUk9XXG4gICdTUShVQVJFKT8nLCAgICAgICAgICAgIC8vIFNRVUFSRSAvIFNRXG4gICdTVChSRUVUKT8nLCAgICAgICAgICAgIC8vIFNUUkVFVCAvIFNUXG4gICdTVFJJP1AnLCAgICAgICAgICAgICAgIC8vIFNUUklQIC8gU1RSUFxuICAnVEFSTicsICAgICAgICAgICAgICAgICAvLyBUQVJOXG4gICdUKEVSUkEpP0NFJywgICAgICAgICAgIC8vIFRFUlJBQ0UgLyBUQ0VcbiAgJyhUSE9ST1VHSEZBUkV8VEZSRSknLCAgLy8gVEhPUk9VR0hGQVJFIC8gVEZSRVxuICAnVFJBQ0s/JywgICAgICAgICAgICAgICAvLyBUUkFDSyAvIFRSQUNcbiAgJ1QoUlVOSyk/V0FZJywgICAgICAgICAgLy8gVFJVTktXQVkgLyBUV0FZXG4gIC8vICdWSUVXJywgICAgICAgICAgICAgICAgIC8vIFZJRVdcbiAgJ1ZJP1NUQScsICAgICAgICAgICAgICAgLy8gVklTVEEgLyBWU1RBXG4gICdXQUxLJywgICAgICAgICAgICAgICAgIC8vIFdBTEtcbiAgJ1dBP1knLCAgICAgICAgICAgICAgICAgLy8gV0FZIC8gV1lcbiAgJ1coQUxLKT9XQVknLCAgICAgICAgICAgLy8gV0FMS1dBWSAvIFdXQVlcbiAgJ1lBUkQnICAgICAgICAgICAgICAgICAgLy8gWUFSRFxuXSk7XG5cbnZhciByZVNwbGl0U3RyZWV0ID0gL14oTnxOVEh8Tk9SVEh8RXxFU1R8RUFTVHxTfFNUSHxTT1VUSHxXfFdTVHxXRVNUKVxcLCQvaTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHJldHVybiBuZXcgQWRkcmVzcyh0ZXh0KVxuICAgIC8vIGNsZWFuIHRoZSBhZGRyZXNzXG4gICAgLmNsZWFuKFtcbiAgICAgICAgLy8gcmVtb3ZlIHRyYWlsaW5nIGRvdHMgZnJvbSB0d28gbGV0dGVyIGFiYnJldmlhdGlvbnNcbiAgICAgICAgZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dC5yZXBsYWNlKC8oXFx3ezJ9KVxcLi9nLCAnJDEnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBjb252ZXJ0IHNob3AgdG8gYSB1bml0IGZvcm1hdFxuICAgICAgICBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXHMqU0hPUFxccz8oXFxkKilcXCw/XFxzKi8sICckMS8nKTtcbiAgICAgICAgfVxuICAgIF0pXG5cbiAgICAvLyBzcGxpdCB0aGUgYWRkcmVzc1xuICAgIC5zcGxpdCgvXFxzLylcblxuICAgIC8vIGV4dHJhY3QgdGhlIHVuaXRcbiAgICAuZXh0cmFjdCgndW5pdCcsIFtcbiAgICAgICAgKC9eKD86XFwjfEFQVHxBUEFSVE1FTlQpXFxzPyhcXGQrKS8pLFxuICAgICAgICAoL14oXFxkKylcXC8oLiopLylcbiAgICBdKVxuXG4gICAgLy8gZXh0cmFjdCB0aGUgY291bnRyeVxuICAgIC5leHRyYWN0KCdjb3VudHJ5Jywge1xuICAgICAgICBBVTogL15BVVNUUkFMLyxcbiAgICAgICAgVVM6IC8oXlVOSVRFRFxcc1NUQVRFU3xeVVxcLj9TXFwuP0E/JCkvXG4gICAgfSlcblxuICAgIC8vIGV4dHJhY3QgdGhlIHN0cmVldFxuICAgIC5leHRyYWN0U3RyZWV0KHN0cmVldFJlZ2V4ZXMsIHJlU3BsaXRTdHJlZXQpXG5cbiAgICAvLyBmaW5hbGl6ZSB0aGUgYWRkcmVzc1xuICAgIC5maW5hbGl6ZSgpO1xufTsiXX0=
(2)
});
;