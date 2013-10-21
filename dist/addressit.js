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
**/
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
**/
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
**/
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
**/
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
**/
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
**/
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi9jb2RlL0RhbW9uT2VobG1hbi9hZGRyZXNzaXQvYWRkcmVzcy5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvRGFtb25PZWhsbWFuL2FkZHJlc3NpdC9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvRGFtb25PZWhsbWFuL2FkZHJlc3NpdC9wYXJzZXJzL2NvbXBpbGVyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9EYW1vbk9laGxtYW4vYWRkcmVzc2l0L3BhcnNlcnMvZW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlTnVtZXJpYyA9IC9eXFxkKyQvO1xuXG4vKipcbiAgIyMjIEFkZHJlc3NcbioqL1xuZnVuY3Rpb24gQWRkcmVzcyh0ZXh0KSB7XG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgQWRkcmVzcykpIHtcbiAgICByZXR1cm4gbmV3IEFkZHJlc3ModGV4dCk7XG4gIH1cblxuICB0aGlzLnRleHQgPSB0ZXh0O1xuICB0aGlzLnBhcnRzID0gW107XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQWRkcmVzcztcbnZhciBwcm90byA9IEFkZHJlc3MucHJvdG90eXBlO1xuXG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjX2V4dHJhY3RTdHJlZXRQYXJ0cyhzdGFydEluZGV4KVxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBleHRyYWN0IGZyb20gdGhlIHN0cmVldCB0eXBlIG1hdGNoXG4gIGluZGV4ICpiYWNrIHRvKiB0aGUgc3RyZWV0IG51bWJlciBhbmQgcG9zc2libHkgdW5pdCBudW1iZXIgZmllbGRzLlxuXG4gIFRoZSBmdW5jdGlvbiB3aWxsIHN0YXJ0IHdpdGggdGhlIHN0cmVldCB0eXBlLCB0aGVuIGFsc28gZ3JhYiB0aGUgcHJldmlvdXNcbiAgZmllbGQgcmVnYXJkbGVzcyBvZiBjaGVja3MuICBGaWVsZHMgd2lsbCBjb250aW51ZSB0byBiZSBwdWxsZWQgaW4gdW50aWxcbiAgZmllbGRzIHN0YXJ0IHNhdGlzZnlpbmcgbnVtZXJpYyBjaGVja3MuICBPbmNlIHBvc2l0aXZlIG51bWVyaWMgY2hlY2tzIGFyZVxuICBmaXJpbmcsIHRob3NlIHdpbGwgYmUgYnJvdWdodCBpbiBhcyBidWlsZGluZyAvIHVuaXQgbnVtYmVycyBhbmQgb25jZSB0aGVcbiAgc3RhcnQgb2YgdGhlIHBhcnRzIGFycmF5IGlzIHJlYWNoZWQgb3Igd2UgZmFsbCBiYWNrIHRvIG5vbi1udW1lcmljIGZpZWxkc1xuICB0aGVuIHRoZSBleHRyYWN0aW9uIGlzIHN0b3BwZWQuXG4qKi9cbnByb3RvLl9leHRyYWN0U3RyZWV0UGFydHMgPSBmdW5jdGlvbihzdGFydEluZGV4KSB7XG4gIHZhciBpbmRleCA9IHN0YXJ0SW5kZXg7XG4gIHZhciBzdHJlZXRQYXJ0cyA9IFtdO1xuICB2YXIgbnVtYmVyUGFydHM7XG4gIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XG4gIHZhciB0ZXN0Rm4gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICB3aGlsZSAoaW5kZXggPj0gMCAmJiB0ZXN0Rm4oKSkge1xuICAgIHZhciBhbHBoYVBhcnQgPSBpc05hTihwYXJzZUludChwYXJ0c1tpbmRleF0sIDEwKSk7XG5cbiAgICBpZiAoc3RyZWV0UGFydHMubGVuZ3RoIDwgMiB8fCBhbHBoYVBhcnQpIHtcbiAgICAgIC8vIGFkZCB0aGUgY3VycmVudCBwYXJ0IHRvIHRoZSBzdHJlZXQgcGFydHNcbiAgICAgIHN0cmVldFBhcnRzLnVuc2hpZnQocGFydHMuc3BsaWNlKGluZGV4LS0sIDEpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoISBudW1iZXJQYXJ0cykge1xuICAgICAgICBudW1iZXJQYXJ0cyA9IFtdO1xuICAgICAgfSAvLyBpZlxuXG4gICAgICAvLyBhZGQgdGhlIGN1cnJlbnQgcGFydCB0byB0aGUgYnVpbGRpbmcgcGFydHNcbiAgICAgIG51bWJlclBhcnRzLnVuc2hpZnQocGFydHMuc3BsaWNlKGluZGV4LS0sIDEpKTtcblxuICAgICAgLy8gdXBkYXRlIHRoZSB0ZXN0IGZ1bmN0aW9uXG4gICAgICB0ZXN0Rm4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGlzQWxwaGEgPSBpc05hTihwYXJzZUludChwYXJ0c1tpbmRleF0sIDEwKSk7XG5cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBidWlsZGluZyBwYXJ0cywgdGhlbiB3ZSBhcmUgbG9va2luZ1xuICAgICAgICAvLyBmb3Igbm9uLWFscGhhIHZhbHVlcywgb3RoZXJ3aXNlIGFscGhhXG4gICAgICAgIHJldHVybiBudW1iZXJQYXJ0cyA/ICghIGlzQWxwaGEpIDogaXNBbHBoYTtcbiAgICAgIH07XG4gICAgfSAvLyBpZi4uZWxzZVxuICB9IC8vIHdoaWxlXG5cbiAgdGhpcy5udW1iZXIgPSBudW1iZXJQYXJ0cyA/IG51bWJlclBhcnRzLmpvaW4oJy8nKSA6ICcnO1xuICB0aGlzLnN0cmVldCA9IHN0cmVldFBhcnRzLmpvaW4oJyAnKS5yZXBsYWNlKC9cXCwvZywgJycpO1xuXG4gIC8vIHBhcnNlIHRoZSBudW1iZXIgYXMgYW4gaW50ZWdlclxuICB0aGlzLm51bWJlciA9IHJlTnVtZXJpYy50ZXN0KHRoaXMubnVtYmVyKSA/IHBhcnNlSW50KHRoaXMubnVtYmVyLCAxMCkgOiB0aGlzLm51bWJlcjtcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjY2xlYW5cblxuICBUaGUgY2xlYW4gZnVuY3Rpb24gaXMgdXNlZCB0byBjbGVhbiB1cCBhbiBhZGRyZXNzIHN0cmluZy4gIEl0IGlzIGRlc2lnbmVkXG4gIHRvIHJlbW92ZSBhbnkgcGFydHMgb2YgdGhlIHRleHQgdGhhdCBwcmV2ZW4gZWZmZWN0aXZlIHBhcnNpbmcgb2YgdGhlXG4gIGFkZHJlc3Mgc3RyaW5nLlxuKiovXG5wcm90by5jbGVhbiA9IGZ1bmN0aW9uKGNsZWFuZXJzKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGNsZWFuZXJzXG4gIGNsZWFuZXJzID0gY2xlYW5lcnMgfHwgW107XG5cbiAgLy8gY29udmVydCB0aGUgdGV4dCB0byB1cHBlciBjYXNlXG4gIHRoaXMudGV4dCA9IHRoaXMudGV4dC50b1VwcGVyQ2FzZSgpO1xuXG4gIC8vIGFwcGx5IHRoZSBjbGVhbmVyc1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgY2xlYW5lcnMubGVuZ3RoOyBpaSsrKSB7XG4gICAgaWYgKHR5cGVvZiBjbGVhbmVyc1tpaV0gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy50ZXh0ID0gY2xlYW5lcnNbaWldLmNhbGwobnVsbCwgdGhpcy50ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoY2xlYW5lcnNbaWldIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICB0aGlzLnRleHQgPSB0aGlzLnRleHQucmVwbGFjZShjbGVhbmVyc1tpaV0sICcnKTtcbiAgICB9XG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI2V4dHJhY3QoZmllbGROYW1lLCByZWdleGVzKVxuXG4gIFRoZSBleHRyYWN0IGZ1bmN0aW9uIGlzIHVzZWQgdG8gZXh0cmFjdCB0aGUgc3BlY2lmaWVkIGZpZWxkIGZyb20gdGhlIHJhd1xuICBwYXJ0cyB0aGF0IGhhdmUgcHJldmlvdXNseSBiZWVuIHNwbGl0IGZyb20gdGhlIGlucHV0IHRleHQuICBJZiBzdWNjZXNzZnVsbHlcbiAgbG9jYXRlZCB0aGVuIHRoZSBmaWVsZCB3aWxsIGJlIHVwZGF0ZWQgZnJvbSB0aGUgcGFydHMgYW5kIHRoYXQgcGFydCByZW1vdmVkXG4gIGZyb20gdGhlIHBhcnRzIGxpc3QuXG4qKi9cbnByb3RvLmV4dHJhY3QgPSBmdW5jdGlvbihmaWVsZE5hbWUsIHJlZ2V4ZXMpIHtcbiAgdmFyIG1hdGNoO1xuICB2YXIgcmd4SWR4O1xuICB2YXIgaWk7XG4gIHZhciB2YWx1ZTtcbiAgdmFyIGxvb2t1cHMgPSBbXTtcblxuICAvLyBpZiB0aGUgcmVnZXhlcyBoYXZlIGJlZW4gcGFzc2VkIGluIGFzIG9iamVjdHMsIHRoZW4gY29udmVydCB0byBhbiBhcnJheVxuICBpZiAodHlwZW9mIHJlZ2V4ZXMgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHJlZ2V4ZXMuc3BsaWNlID09ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIG5ld1JlZ2V4ZXMgPSBbXTtcblxuICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUga2V5cyBpbiB0aGUgcmVnZXhlc1xuICAgIGZvciAodmFyIGtleSBpbiByZWdleGVzKSB7XG4gICAgICBuZXdSZWdleGVzW25ld1JlZ2V4ZXMubGVuZ3RoXSA9IHJlZ2V4ZXNba2V5XTtcbiAgICAgIGxvb2t1cHNbbmV3UmVnZXhlcy5sZW5ndGggLSAxXSA9IGtleTtcbiAgICB9XG5cbiAgICAvLyB1cGRhdGUgdGhlIHJlZ2V4ZXMgdG8gcG9pbnQgdG8gdGhlIG5ldyByZWdleGVzXG4gICAgcmVnZXhlcyA9IG5ld1JlZ2V4ZXM7XG4gIH1cblxuICAvLyBpdGVyYXRlIG92ZXIgdGhlIHVuaXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgZm9yIChyZ3hJZHggPSAwOyByZ3hJZHggPCByZWdleGVzLmxlbmd0aDsgcmd4SWR4KyspIHtcbiAgICBmb3IgKGlpID0gdGhpcy5wYXJ0cy5sZW5ndGg7IGlpLS07ICkge1xuICAgICAgbWF0Y2ggPSByZWdleGVzW3JneElkeF0uZXhlYyh0aGlzLnBhcnRzW2lpXSk7XG5cbiAgICAgIC8vIGlmIHdlIGhhdmUgYSBtYXRjaCwgdGhlbiBwcm9jZXNzXG4gICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIDJuZCBjYXB0dXJlIGdyb3VwLCB0aGVuIHJlcGxhY2UgdGhlIGl0ZW0gd2l0aFxuICAgICAgICAvLyB0aGUgdGV4dCBvZiB0aGF0IGdyb3VwXG4gICAgICAgIGlmIChtYXRjaFsyXSkge1xuICAgICAgICAgIHRoaXMucGFydHMuc3BsaWNlKGlpLCAxLCBtYXRjaFsyXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSB0aGUgZWxlbWVudFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSwgMSk7XG4gICAgICAgIH0gLy8gaWYuLmVsc2VcblxuICAgICAgICB2YWx1ZSA9IGxvb2t1cHNbcmd4SWR4XSB8fCBtYXRjaFsxXTtcbiAgICAgIH0gLy8gaWZcbiAgICB9IC8vIGZvclxuICB9IC8vIGZvclxuXG4gIC8vIHVwZGF0ZSB0aGUgZmllbGQgdmFsdWVcbiAgdGhpc1tmaWVsZE5hbWVdID0gcGFyc2VJbnQodmFsdWUsIDEwKSB8fCB2YWx1ZTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZXh0cmFjdFN0cmVldFxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBwYXJzZSB0aGUgYWRkcmVzcyBwYXJ0cyBhbmQgbG9jYXRlIGFueSBwYXJ0c1xuICB0aGF0IGxvb2sgdG8gYmUgcmVsYXRlZCB0byBhIHN0cmVldCBhZGRyZXNzLlxuKiovXG5wcm90by5leHRyYWN0U3RyZWV0ID0gZnVuY3Rpb24ocmVnZXhlcywgcmVTcGxpdFN0cmVldCkge1xuICB2YXIgcmVOdW1lcmljZXNxdWUgPSAvXihcXGQqfFxcZCpcXHcpJC87XG4gIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgcmVnZXhlc1xuICByZWdleGVzID0gcmVnZXhlcyB8fCBbXTtcblxuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gbG9jYXRlIHRoZSBcImJlc3RcIiBzdHJlZXQgcGFydCBpbiBhbiBhZGRyZXNzXG4gIC8vIHN0cmluZy4gIEl0IGlzIGNhbGxlZCBvbmNlIGEgc3RyZWV0IHJlZ2V4IGhhcyBtYXRjaGVkIGFnYWluc3QgYSBwYXJ0XG4gIC8vIHN0YXJ0aW5nIGZyb20gdGhlIGxhc3QgcGFydCBhbmQgd29ya2luZyB0b3dhcmRzIHRoZSBmcm9udC4gSW4gdGVybXMgb2ZcbiAgLy8gd2hhdCBpcyBjb25zaWRlcmVkIHRoZSBiZXN0LCB3ZSBhcmUgbG9va2luZyBmb3IgdGhlIHBhcnQgY2xvc2VzdCB0byB0aGVcbiAgLy8gc3RhcnQgb2YgdGhlIHN0cmluZyB0aGF0IGlzIG5vdCBpbW1lZGlhdGVseSBwcmVmaXhlZCBieSBhIG51bWVyaWNlc3F1ZVxuICAvLyBwYXJ0IChlZy4gMTIzLCA0MkEsIGV0YykuXG4gIGZ1bmN0aW9uIGxvY2F0ZUJlc3RTdHJlZXRQYXJ0KHN0YXJ0SW5kZXgpIHtcbiAgICB2YXIgYmVzdEluZGV4ID0gc3RhcnRJbmRleDtcblxuICAgIC8vIGlmIHRoZSBzdGFydCBpbmRleCBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gMCwgdGhlbiByZXR1cm5cbiAgICBmb3IgKHZhciBpaSA9IHN0YXJ0SW5kZXgtMTsgaWkgPj0gMDsgaWktLSkge1xuICAgICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdHJlZXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgICAgIGZvciAodmFyIHJneElkeCA9IDA7IHJneElkeCA8IHJlZ2V4ZXMubGVuZ3RoOyByZ3hJZHgrKykge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgICBpZiAocmVnZXhlc1tyZ3hJZHhdLnRlc3QocGFydHNbaWldKSAmJiBwYXJ0c1tpaS0xXSAmJiAoISByZU51bWVyaWNlc3F1ZS50ZXN0KHBhcnRzW2lpLTFdKSkpIHtcbiAgICAgICAgICAvLyB1cGRhdGUgdGhlIGJlc3QgaW5kZXggYW5kIGJyZWFrIGZyb20gdGhlIGlubmVyIGxvb3BcbiAgICAgICAgICBiZXN0SW5kZXggPSBpaTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSAvLyBpZlxuICAgICAgfSAvLyBmb3JcbiAgICB9IC8vIGZvclxuXG4gICAgcmV0dXJuIGJlc3RJbmRleDtcbiAgfSAvLyBsb2NhdGVCZXN0U3RyZWV0UGFydFxuXG4gIC8vIGl0ZXJhdGUgb3ZlciB0aGUgc3RyZWV0IHJlZ2V4ZXMgYW5kIHRlc3QgdGhlbSBhZ2FpbnN0IHRoZSB2YXJpb3VzIHBhcnRzXG4gIGZvciAodmFyIHBhcnRJZHggPSBwYXJ0cy5sZW5ndGg7IHBhcnRJZHgtLTsgKSB7XG4gICAgZm9yICh2YXIgcmd4SWR4ID0gMDsgcmd4SWR4IDwgcmVnZXhlcy5sZW5ndGg7IHJneElkeCsrKSB7XG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgLy8gaWYgdGhlIG1hdGNoIGlzIG9uIHRoZSBmaXJzdCBwYXJ0IHRob3VnaCwgcmVqZWN0IGl0IGFzIHdlXG4gICAgICAvLyBhcmUgcHJvYmFibHkgZGVhbGluZyB3aXRoIGEgdG93biBuYW1lIG9yIHNvbWV0aGluZyAoZS5nLiBTdCBHZW9yZ2UpXG4gICAgICBpZiAocmVnZXhlc1tyZ3hJZHhdLnRlc3QocGFydHNbcGFydElkeF0pICYmIHBhcnRJZHggPiAwKSB7XG4gICAgICAgIHZhciBzdGFydEluZGV4ID0gbG9jYXRlQmVzdFN0cmVldFBhcnQocGFydElkeCk7XG5cbiAgICAgICAgLy8gaWYgd2UgYXJlIGRlYWxpbmcgd2l0aCBhIHNwbGl0IHN0cmVldCAoaS5lLiBmb28gcmQgd2VzdCkgYW5kIHRoZVxuICAgICAgICAvLyBhZGRyZXNzIHBhcnRzIGFyZSBhcHByb3ByaWF0ZWx5IGRlbGltaXRlZCwgdGhlbiBncmFiIHRoZSBuZXh0IHBhcnRcbiAgICAgICAgLy8gYWxzb1xuICAgICAgICBpZiAocmVTcGxpdFN0cmVldC50ZXN0KHBhcnRzW3N0YXJ0SW5kZXggKyAxXSkpIHtcbiAgICAgICAgICBzdGFydEluZGV4ICs9IDE7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9leHRyYWN0U3RyZWV0UGFydHMoc3RhcnRJbmRleCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSAvLyBpZlxuICAgIH0gLy8gZm9yXG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI2ZpbmFsaXplXG5cbiAgVGhlIGZpbmFsaXplIGZ1bmN0aW9uIHRha2VzIGFueSByZW1haW5pbmcgcGFydHMgdGhhdCBoYXZlIG5vdCBiZWVuIGV4dHJhY3RlZFxuICBhcyBvdGhlciBpbmZvcm1hdGlvbiwgYW5kIHB1c2hlcyB0aG9zZSBmaWVsZHMgaW50byBhIGdlbmVyaWMgYHJlZ2lvbnNgIGZpZWxkLlxuKiovXG5wcm90by5maW5hbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAvLyB1cGRhdGUgdGhlIHJlZ2lvbnNcbiAgdGhpcy5yZWdpb25zID0gdGhpcy5wYXJ0cy5qb2luKCcgJykuc3BsaXQoL1xcLFxccz8vKTtcblxuICAvLyByZXNldCB0aGUgcGFydHNcbiAgdGhpcy5wYXJ0cyA9IFtdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNzcGxpdFxuXG4gIFNwbGl0IHRoZSBhZGRyZXNzIGludG8gaXQncyBjb21wb25lbnQgcGFydHMsIGFuZCByZW1vdmUgYW55IGVtcHR5IHBhcnRzXG4qKi9cbnByb3RvLnNwbGl0ID0gZnVuY3Rpb24oc2VwYXJhdG9yKSB7XG4gIC8vIHNwbGl0IHRoZSBzdHJpbmdcbiAgdmFyIG5ld1BhcnRzID0gdGhpcy50ZXh0LnNwbGl0KHNlcGFyYXRvciB8fCAnICcpO1xuXG4gIHRoaXMucGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5ld1BhcnRzLmxlbmd0aDsgaWkrKykge1xuICAgIGlmIChuZXdQYXJ0c1tpaV0pIHtcbiAgICAgIHRoaXMucGFydHNbdGhpcy5wYXJ0cy5sZW5ndGhdID0gbmV3UGFydHNbaWldO1xuICAgIH0gLy8gaWZcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjdG9TdHJpbmdcblxuICBDb252ZXJ0IHRoZSBhZGRyZXNzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4qKi9cbnByb3RvLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHZhciBvdXRwdXQgPSAnJztcblxuICBpZiAodGhpcy5idWlsZGluZykge1xuICAgIG91dHB1dCArPSB0aGlzLmJ1aWxkaW5nICsgJ1xcbic7XG4gIH0gLy8gaWZcblxuICBpZiAodGhpcy5zdHJlZXQpIHtcbiAgICBvdXRwdXQgKz0gdGhpcy5udW1iZXIgPyB0aGlzLm51bWJlciArICcgJyA6ICcnO1xuICAgIG91dHB1dCArPSB0aGlzLnN0cmVldCArICdcXG4nO1xuICB9XG5cbiAgb3V0cHV0ICs9IHRoaXMucmVnaW9ucy5qb2luKCcsICcpICsgJ1xcbic7XG5cbiAgcmV0dXJuIG91dHB1dDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMgYWRkcmVzc2l0XG5cbiAgQWRkcmVzc0l0IGlzIGEgZnJlZWZvcm0gc3RyZWV0IGFkZHJlc3MgcGFyc2VyLCB0aGF0IGlzIGRlc2lnbmVkIHRvIHRha2UgYVxuICBwaWVjZSBvZiB0ZXh0IGFuZCBjb252ZXJ0IHRoYXQgaW50byBhIHN0cnVjdHVyZWQgYWRkcmVzcyB0aGF0IGNhbiBiZVxuICBwcm9jZXNzZWQgaW4gZGlmZmVyZW50IHN5c3RlbXMuXG5cbiAgVGhlIGZvY2FsIHBvaW50IG9mIGBhZGRyZXNzaXRgIGlzIG9uIHRoZSBzdHJlZXQgcGFyc2luZyBjb21wb25lbnQsIHJhdGhlclxuICB0aGFuIGF0dGVtcHRpbmcgdG8gYXBwcm9wcmlhdGVseSBpZGVudGlmeSB2YXJpb3VzIHN0YXRlcywgY291bnRpZXMsIHRvd25zLFxuICBldGMsIGFzIHRoZXNlIHZhcnkgZnJvbSBjb3VudHJ5IHRvIGNvdW50cnkgZmFpcmx5IGRyYW1hdGljYWxseS4gVGhlc2VcbiAgZGV0YWlscyBhcmUgaW5zdGVhZCBwdXQgaW50byBhIGdlbmVyaWMgcmVnaW9ucyBhcnJheSB0aGF0IGNhbiBiZSBmdXJ0aGVyXG4gIHBhcnNlZCBiYXNlZCBvbiB5b3VyIGFwcGxpY2F0aW9uIG5lZWRzLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBUaGUgZm9sbG93aW5nIGlzIGEgc2ltcGxlIGV4YW1wbGUgb2YgaG93IGFkZHJlc3MgaXQgY2FuIGJlIHVzZWQ6XG5cbiAgYGBganNcbiAgdmFyIGFkZHJlc3NpdCA9IHJlcXVpcmUoJ2FkZHJlc3NpdCcpO1xuXG4gIC8vIHBhcnNlIGEgbWFkZSB1cCBhZGRyZXNzLCB3aXRoIHNvbWUgc2xpZ2h0bHkgdHJpY2t5IHBhcnRzXG4gIHZhciBhZGRyZXNzID0gYWRkcmVzc2l0KCdTaG9wIDgsIDQzMSBTdCBLaWxkYSBSZCBNZWxib3VybmUnKTtcbiAgYGBgXG5cbiAgVGhlIGBhZGRyZXNzYCBvYmplY3Qgd291bGQgbm93IGNvbnRhaW4gdGhlIGZvbGxvd2luZyBpbmZvcm1hdGlvbjpcblxuICBgYGBcbiAgeyB0ZXh0OiAnOC80MzEgU1QgS0lMREEgUkQgTUVMQk9VUk5FJyxcbiAgICBwYXJ0czogW10sXG4gICAgdW5pdDogOCxcbiAgICBjb3VudHJ5OiB1bmRlZmluZWQsXG4gICAgbnVtYmVyOiA0MzEsXG4gICAgc3RyZWV0OiAnU1QgS0lMREEgUkQnLFxuICAgIHJlZ2lvbnM6IFsgJ01FTEJPVVJORScgXSB9XG4gIGBgYFxuXG4gIEZvciBtb3JlIGV4YW1wbGVzLCBzZWUgdGhlIHRlc3RzLlxuXG4gICMjIFJlZmVyZW5jZVxuXG4qKi9cblxuLyoqXG4gICMjIyBhZGRyZXNzaXQoaW5wdXQsIG9wdHM/KVxuXG4gIFJ1biB0aGUgYWRkcmVzcyBwYXJzZXIgZm9yIHRoZSBnaXZlbiBpbnB1dC4gIE9wdGlvbmFsIGBvcHRzYCBjYW4gYmVcbiAgc3VwcGxpZWQgaWYgeW91IHdhbnQgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgKEVOKSBwYXJzZXIuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICB2YXIgcGFyc2VyID0gKG9wdHMgfHwge30pLnBhcnNlciB8fCByZXF1aXJlKCcuL3BhcnNlcnMvZW4nKTtcblxuICAvLyBwYXJzZSB0aGUgYWRkcmVzc1xuICByZXR1cm4gcGFyc2VyKGlucHV0KTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0UmVnZXhlcykge1xuICB2YXIgcmVnZXhlcyA9IFtdO1xuICB2YXIgcmVTdHJlZXRDbGVhbmVyID0gL15cXF4/KC4qKVxcLD9cXCQ/JC87XG4gIHZhciBpaTtcblxuICBmb3IgKGlpID0gdGV4dFJlZ2V4ZXMubGVuZ3RoOyBpaS0tOyApIHtcbiAgICByZWdleGVzW2lpXSA9IG5ldyBSZWdFeHAoXG4gICAgICB0ZXh0UmVnZXhlc1tpaV0ucmVwbGFjZShyZVN0cmVldENsZWFuZXIsICdeJDFcXCw/JCcpXG4gICAgKTtcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gcmVnZXhlcztcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEFkZHJlc3MgPSByZXF1aXJlKCcuLi9hZGRyZXNzJyk7XG52YXIgY29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbXBpbGVyJyk7XG5cbi8vIGluaXRpYWxpc2UgdGhlIHN0cmVldCByZWdleGVzXG4vLyB0aGVzZSBhcmUgdGhlIHJlZ2V4ZXMgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgb3Igbm90IGEgc3RyaW5nIGlzIGEgc3RyZWV0XG4vLyBpdCBpcyBpbXBvcnRhbnQgdG8gbm90ZSB0aGF0IHRoZXkgYXJlIHBhcnNlZCB0aHJvdWdoIHRoZSByZVN0cmVldENsZWFuZXJcbi8vIHJlZ2V4IHRvIGJlY29tZSBtb3JlIHN0cmljdFxuLy8gdGhpcyBsaXN0IGhhcyBiZWVuIHNvdXJjZWQgZnJvbTpcbi8vIGh0dHBzOi8vd3d3LnByb3BlcnR5YXNzaXN0LnNhLmdvdi5hdS9wYS9xaGVscC5waHRtbD9jbWQ9c3RyZWV0dHlwZVxuLy9cbi8vIF9fTk9URTpfXyBTb21lIG9mIHRoZSBzdHJlZXQgdHlwZXMgaGF2ZSBiZWVuIGRpc2FibGVkIGR1ZSB0byBjb2xsaXNpb25zXG4vLyB3aXRoIGNvbW1vbiBwYXJ0cyBvZiBzdWJ1cmIgbmFtZXMuICBBdCBzb21lIHBvaW50IHRoZSBzdHJlZXQgcGFyc2VyIG1heSBiZVxuLy8gaW1wcm92ZWQgdG8gZGVhbCB3aXRoIHRoZXNlIGNhc2VzLCBidXQgZm9yIG5vdyB0aGlzIGhhcyBiZWVuIGRlZW1lZFxuLy8gc3VpdGFibGUuXG5cbnZhciBzdHJlZXRSZWdleGVzID0gY29tcGlsZXIoW1xuICAnQUxMRT9ZJywgICAgICAgICAgICAgICAvLyBBTExFWSAvIEFMTFlcbiAgJ0FQUChST0FDSCk/JywgICAgICAgICAgLy8gQVBQUk9BQ0ggLyBBUFBcbiAgJ0FSQyhBREUpPycsICAgICAgICAgICAgLy8gQVJDQURFIC8gQVJDXG4gICdBVihFfEVOVUUpPycsICAgICAgICAgIC8vIEFWRU5VRSAvIEFWIC8gQVZFXG4gICcoQk9VTEVWQVJEfEJMVkQpJywgICAgIC8vIEJPVUxFVkFSRCAvIEJMVkRcbiAgJ0JST1cnLCAgICAgICAgICAgICAgICAgLy8gQlJPV1xuICAnQllQQShTUyk/JywgICAgICAgICAgICAvLyBCWVBBU1MgLyBCWVBBXG4gICdDKEFVU0UpP1dBWScsICAgICAgICAgIC8vIENBVVNFV0FZIC8gQ1dBWVxuICAnKENJUkNVSVR8Q0NUKScsICAgICAgICAvLyBDSVJDVUlUIC8gQ0NUXG4gICdDSVJDKFVTKT8nLCAgICAgICAgICAgIC8vIENJUkNVUyAvIENJUkNcbiAgJ0NMKE9TRSk/JywgICAgICAgICAgICAgLy8gQ0xPU0UgLyBDTFxuICAnQ08/UFNFJywgICAgICAgICAgICAgICAvLyBDT1BTRSAvIENQU0VcbiAgJyhDT1JORVJ8Q05SKScsICAgICAgICAgLy8gQ09STkVSIC8gQ05SXG4gIC8vICdDT1ZFJywgICAgICAgICAgICAgICAgIC8vIENPVkVcbiAgJ0MoT1VSKT9UJywgICAgICAgICAgICAgLy8gQ09VUlQgLyBDVFxuICAnQ1JFUyhDRU5UKT8nLCAgICAgICAgICAvLyBDUkVTQ0VOVCAvIENSRVNcbiAgJ0RSKElWRSk/JywgICAgICAgICAgICAgLy8gRFJJVkUgLyBEUlxuICAvLyAnRU5EJywgICAgICAgICAgICAgICAgICAvLyBFTkRcbiAgJ0VTUChMQU5BTkRFKT8nLCAgICAgICAgLy8gRVNQTEFOQURFIC8gRVNQXG4gIC8vICdGTEFUJywgICAgICAgICAgICAgICAgIC8vIEZMQVRcbiAgJ0YoUkVFKT9XQVknLCAgICAgICAgICAgLy8gRlJFRVdBWSAvIEZXQVlcbiAgJyhGUk9OVEFHRXxGUk5UKScsICAgICAgLy8gRlJPTlRBR0UgLyBGUk5UXG4gIC8vICcoR0FSREVOU3xHRE5TKScsICAgICAgIC8vIEdBUkRFTlMgLyBHRE5TXG4gICcoR0xBREV8R0xEKScsICAgICAgICAgIC8vIEdMQURFIC8gR0xEXG4gIC8vICdHTEVOJywgICAgICAgICAgICAgICAgIC8vIEdMRU5cbiAgJ0dSKEVFKT9OJywgICAgICAgICAgICAgLy8gR1JFRU4gLyBHUk5cbiAgLy8gJ0dSKE9WRSk/JywgICAgICAgICAgICAgLy8gR1JPVkUgLyBHUlxuICAvLyAnSChFSUdIKT9UUycsICAgICAgICAgICAvLyBIRUlHSFRTIC8gSFRTXG4gICcoSElHSFdBWXxIV1kpJywgICAgICAgIC8vIEhJR0hXQVkgLyBIV1lcbiAgJyhMQU5FfExOKScsICAgICAgICAgICAgLy8gTEFORSAvIExOXG4gICdMSU5LJywgICAgICAgICAgICAgICAgIC8vIExJTktcbiAgJ0xPT1AnLCAgICAgICAgICAgICAgICAgLy8gTE9PUFxuICAnTUFMTCcsICAgICAgICAgICAgICAgICAvLyBNQUxMXG4gICdNRVdTJywgICAgICAgICAgICAgICAgIC8vIE1FV1NcbiAgJyhQQUNLRVR8UENLVCknLCAgICAgICAgLy8gUEFDS0VUIC8gUENLVFxuICAnUChBUkEpP0RFJywgICAgICAgICAgICAvLyBQQVJBREUgLyBQREVcbiAgLy8gJ1BBUksnLCAgICAgICAgICAgICAgICAgLy8gUEFSS1xuICAnKFBBUktXQVl8UEtXWSknLCAgICAgICAvLyBQQVJLV0FZIC8gUEtXWVxuICAnUEwoQUNFKT8nLCAgICAgICAgICAgICAvLyBQTEFDRSAvIFBMXG4gICdQUk9NKEVOQURFKT8nLCAgICAgICAgIC8vIFBST01FTkFERSAvIFBST01cbiAgJ1JFUyhFUlZFKT8nLCAgICAgICAgICAgLy8gUkVTRVJWRSAvIFJFU1xuICAvLyAnUkk/REdFJywgICAgICAgICAgICAgICAvLyBSSURHRSAvIFJER0VcbiAgJ1JJU0UnLCAgICAgICAgICAgICAgICAgLy8gUklTRVxuICAnUihPQSk/RCcsICAgICAgICAgICAgICAvLyBST0FEIC8gUkRcbiAgJ1JPVycsICAgICAgICAgICAgICAgICAgLy8gUk9XXG4gICdTUShVQVJFKT8nLCAgICAgICAgICAgIC8vIFNRVUFSRSAvIFNRXG4gICdTVChSRUVUKT8nLCAgICAgICAgICAgIC8vIFNUUkVFVCAvIFNUXG4gICdTVFJJP1AnLCAgICAgICAgICAgICAgIC8vIFNUUklQIC8gU1RSUFxuICAnVEFSTicsICAgICAgICAgICAgICAgICAvLyBUQVJOXG4gICdUKEVSUkEpP0NFJywgICAgICAgICAgIC8vIFRFUlJBQ0UgLyBUQ0VcbiAgJyhUSE9ST1VHSEZBUkV8VEZSRSknLCAgLy8gVEhPUk9VR0hGQVJFIC8gVEZSRVxuICAnVFJBQ0s/JywgICAgICAgICAgICAgICAvLyBUUkFDSyAvIFRSQUNcbiAgJ1QoUlVOSyk/V0FZJywgICAgICAgICAgLy8gVFJVTktXQVkgLyBUV0FZXG4gIC8vICdWSUVXJywgICAgICAgICAgICAgICAgIC8vIFZJRVdcbiAgJ1ZJP1NUQScsICAgICAgICAgICAgICAgLy8gVklTVEEgLyBWU1RBXG4gICdXQUxLJywgICAgICAgICAgICAgICAgIC8vIFdBTEtcbiAgJ1dBP1knLCAgICAgICAgICAgICAgICAgLy8gV0FZIC8gV1lcbiAgJ1coQUxLKT9XQVknLCAgICAgICAgICAgLy8gV0FMS1dBWSAvIFdXQVlcbiAgJ1lBUkQnICAgICAgICAgICAgICAgICAgLy8gWUFSRFxuXSk7XG5cbnZhciByZVNwbGl0U3RyZWV0ID0gL14oTnxOVEh8Tk9SVEh8RXxFU1R8RUFTVHxTfFNUSHxTT1VUSHxXfFdTVHxXRVNUKVxcLCQvaTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHJldHVybiBuZXcgQWRkcmVzcyh0ZXh0KVxuICAgIC8vIGNsZWFuIHRoZSBhZGRyZXNzXG4gICAgLmNsZWFuKFtcbiAgICAgICAgLy8gcmVtb3ZlIHRyYWlsaW5nIGRvdHMgZnJvbSB0d28gbGV0dGVyIGFiYnJldmlhdGlvbnNcbiAgICAgICAgZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dC5yZXBsYWNlKC8oXFx3ezJ9KVxcLi9nLCAnJDEnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBjb252ZXJ0IHNob3AgdG8gYSB1bml0IGZvcm1hdFxuICAgICAgICBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXHMqU0hPUFxccz8oXFxkKilcXCw/XFxzKi8sICckMS8nKTtcbiAgICAgICAgfVxuICAgIF0pXG5cbiAgICAvLyBzcGxpdCB0aGUgYWRkcmVzc1xuICAgIC5zcGxpdCgvXFxzLylcblxuICAgIC8vIGV4dHJhY3QgdGhlIHVuaXRcbiAgICAuZXh0cmFjdCgndW5pdCcsIFtcbiAgICAgICAgKC9eKD86XFwjfEFQVHxBUEFSVE1FTlQpXFxzPyhcXGQrKS8pLFxuICAgICAgICAoL14oXFxkKylcXC8oLiopLylcbiAgICBdKVxuXG4gICAgLy8gZXh0cmFjdCB0aGUgY291bnRyeVxuICAgIC5leHRyYWN0KCdjb3VudHJ5Jywge1xuICAgICAgICBBVTogL15BVVNUUkFMLyxcbiAgICAgICAgVVM6IC8oXlVOSVRFRFxcc1NUQVRFU3xeVVxcLj9TXFwuP0E/JCkvXG4gICAgfSlcblxuICAgIC8vIGV4dHJhY3QgdGhlIHN0cmVldFxuICAgIC5leHRyYWN0U3RyZWV0KHN0cmVldFJlZ2V4ZXMsIHJlU3BsaXRTdHJlZXQpXG5cbiAgICAvLyBmaW5hbGl6ZSB0aGUgYWRkcmVzc1xuICAgIC5maW5hbGl6ZSgpO1xufTsiXX0=
(2)
});
;