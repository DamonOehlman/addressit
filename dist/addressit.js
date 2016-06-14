(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.addressit = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* jshint node: true */
'use strict';

var reNumeric = /^\d+$/;

/**
  ### Address
**/
function Address(text, opts) {
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
proto._extractStreetParts = function(startIndex, splitStreet) {
  var index = startIndex;
  var streetParts = [];
  var numberParts;
  var parts = this.parts;
  var streetPartsLength = (splitStreet) ? 3 : 2;
  var testFn = function() {
    return true;
  };

  while (index >= 0 && testFn()) {
    var alphaPart = isNaN(parseInt(parts[index], 10));

    if (streetParts.length < streetPartsLength || alphaPart) {
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
    for (ii = this.parts.length; ii >= 0; ii-- ) {
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
      } else if (fieldName === 'state' && value === undefined) {
        var matchMultiplePart = false;
        var spacesInMatch = regexes[rgxIdx].source.split('\\s').length;
        if (spacesInMatch > 1) {
          var multiplePart = [];
          for (var partJoin = ii; partJoin > ii - spacesInMatch && partJoin >= 0; partJoin--) {
            multiplePart.push(this.parts[partJoin]);
          }
          multiplePart.reverse();
          multiplePart = multiplePart.join(' ');
          matchMultiplePart = regexes[rgxIdx].exec(multiplePart);

          if (matchMultiplePart) {
            // if we have a 2nd capture group, then replace the item with
            // the text of that group
            if (matchMultiplePart[2]) {
              this.parts.splice(ii - spacesInMatch + 1, spacesInMatch, matchMultiplePart[2]);
              ii -= spacesInMatch + 1;
            }
            // otherwise, just remove the element
            else {
              this.parts.splice(ii - spacesInMatch + 1, spacesInMatch);
              ii -= spacesInMatch + 1;
            } // if..else

            value = lookups[rgxIdx] || matchMultiplePart[1];
          }
        }
      } // if
    } // for
  } // for

  // update the field value
  this[fieldName] = value;

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
  var splitStreet = false;

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
          splitStreet = true;
          startIndex += 1;
        }

        this._extractStreetParts(startIndex, splitStreet);
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
  // update the regions, discarding any empty strings.
  this.regions = this.parts.join(' ').split(/\,\s?/).filter(function (region) {
      return region.length;
  });

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
  // if no locale has been specified, then use the default vanilla en locale
  var parse = (opts || {}).locale || require('./locale/en-US');

  // parse the address
  return parse(input, opts);
};

},{"./locale/en-US":3}],3:[function(require,module,exports){
var parser = require('../parsers/en.js');
var extend = require('cog/extend');

module.exports = function(input, opts) {
  // parse the base address
  return parser(input, extend({ 
  	state: {
	    AL: /(^alabama|^AL$)/i,
	    AK: /(^alaska|^AK$)/i,
	    AS: /(^american\ssamoa|^AS$)/i,
	    AZ: /(^arizona|^AZ$)/i,
	    AR: /(^arkansas|^AR$)/i,
	    CA: /(^california|^CA$)/i,
	    CO: /(^colorado|^CO$)/i,
	    CT: /(^connecticut|^CT$)/i,
	    DE: /(^delaware|^DE$)/i,
	    DC: /(^district\sof\scolumbia|^DC$)/i,
	    FM: /(^federated\sstates\sof\smicronesia|^FM$)/i,
	    FL: /(^florida|^FL$)/i,
	    GA: /(^georgia|^GA$)/i,
	    GU: /(^guam|^GU$)/i,
	    HI: /(^hawaii|^HI$)/i,
	    ID: /(^idaho|^ID$)/i,
	    IL: /(^illinois|^IL$)/i,
	    IN: /(^indiana|^IN$)/i,
	    IA: /(^iowa|^IA$)/i,
	    KS: /(^kansas|^KS$)/i,
	    KY: /(^kentucky|^KY$)/i,
	    LA: /(^louisiana|^LA$)/i,
	    ME: /(^maine|^ME$)/i,
	    MH: /(^marshall\sislands|^MH$)/i,
	    MD: /(^maryland|^MD$)/i,
	    MA: /(^massachusetts|^MA$)/i,
	    MI: /(^michigan|^MI$)/i,
	    MN: /(^minnesota|^MN$)/i,
	    MS: /(^mississippi|^MS$)/i,
	    MO: /(^missouri|^MO$)/i,
	    MT: /(^montana|^MT$)/i,
	    NE: /(^nebraska|^NE$)/i,
	    NV: /(^nevada|^NV$)/i,
	    NH: /(^new\shampshire|^NH$)/i,
	    NJ: /(^new\sjersey|^NJ$)/i,
	    NM: /(^new\smexico|^NM$)/i,
	    NY: /(^new\syork|^NY$)/i,
	    NC: /(^north\scarolina|^NC$)/i,
	    ND: /(^north\sdakota|^ND$)/i,
	    MP: /(^northern\smariana\sislands|^MP$)/i,
	    OH: /(^ohio|^OH$)/i,
	    OK: /(^oklahoma|^OK$)/i,
	    OR: /(^oregon|^OR$)/i,
	    PW: /(^palau|^PW$)/i,
	    PA: /(^pennsylvania|^PA$)/i,
	    PR: /(^puerto\srico|^PR$)/i,
	    RI: /(^rhode\sisland|^RI$)/i,
	    SC: /(^south\scarolina|^SC$)/i,
	    SD: /(^south\sdakota|^SD$)/i,
	    TN: /(^tennessee|^TN$)/i,
	    TX: /(^texas|^TX$)/i,
	    UT: /(^utah|^UT$)/i,
	    VT: /(^vermont|^VT$)/i,
	    VI: /(^virgin\sislands|^VI$)/i,
	    VA: /(^virginia|^VA$)/i,
	    WA: /(^washington|^WA$)/i,
	    WV: /(^west\svirginia|^WV$)/i,
	    WI: /(^wisconsin|^WI$)/i,
	    WY: /(^wyoming|^WY$)/i
  	},
  	country: {
        USA: /(^UNITED\sSTATES|^U\.?S\.?A?$)/i
    },
    rePostalCode: /(^\d{5}$)|(^\d{5}-\d{4}$)/ }, opts));
               // Postal codes of the form 'DDDDD-DDDD' or just 'DDDDD'
               // 10010 is valid and so is 10010-1234
};

},{"../parsers/en.js":6,"cog/extend":4}],4:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
## cog/extend

```js
var extend = require('cog/extend');
```

### extend(target, *)

Shallow copy object properties from the supplied source objects (*) into
the target object, returning the target object once completed:

```js
extend({ a: 1, b: 2 }, { c: 3 }, { d: 4 }, { b: 5 }));
```

See an example on [requirebin](http://requirebin.com/?gist=6079475).
**/
module.exports = function(target) {
  [].slice.call(arguments, 1).forEach(function(source) {
    if (! source) {
      return;
    }

    for (var prop in source) {
      target[prop] = source[prop];
    }
  });

  return target;
};
},{}],5:[function(require,module,exports){
/* jshint node: true */
'use strict';

module.exports = function(textRegexes) {
  var regexes = [];
  var reStreetCleaner = /^\^?(.*)\,?\$?$/;
  var ii;

  for (ii = textRegexes.length; ii--; ) {
    regexes[ii] = new RegExp(
      textRegexes[ii].replace(reStreetCleaner, '^$1\,?$'),
      'i'
    );
  } // for

  return regexes;
};
},{}],6:[function(require,module,exports){
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
  '(C((OUR)|R)?T|CRT)',   // COURT / CT /CRT
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

module.exports = function(text, opts) {
  var address = new Address(text, opts);

  // clean the address
  address
    .clean([
        // remove trailing dots from two letter abbreviations
        function(input) {
            return input.replace(/(\w{2})\./g, '$1');
        },

        // convert shop to a unit format
        function(input) {
            return input.replace(/^\s*SHOP\s?(\d*)\,?\s*/i, '$1/');
        }
    ])

    // split the address
    .split(/\s/)

    // extract the unit
    .extract('unit', [
        (/^(?:\#|APT|APARTMENT)\s?(\d+)/),
        (/^(\d+)\/(.*)/)
    ])

    // extract the street
    .extractStreet(streetRegexes, reSplitStreet);

  if (opts && opts.state) {
    address.extract('state', opts.state );
  }

  if (opts && opts.country) {
    address.extract('country', opts.country );
  }

  if (opts && opts.rePostalCode) {
    address.extract('postalcode', [ opts.rePostalCode ]);
  }

   // take remaining unknown parts and push them
   return address.finalize();
};

},{"../address":1,"./compiler":5}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92Ni4yLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZGRyZXNzLmpzIiwiaW5kZXguanMiLCJsb2NhbGUvZW4tVVMuanMiLCJub2RlX21vZHVsZXMvY29nL2V4dGVuZC5qcyIsInBhcnNlcnMvY29tcGlsZXIuanMiLCJwYXJzZXJzL2VuLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlTnVtZXJpYyA9IC9eXFxkKyQvO1xuXG4vKipcbiAgIyMjIEFkZHJlc3NcbioqL1xuZnVuY3Rpb24gQWRkcmVzcyh0ZXh0LCBvcHRzKSB7XG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgQWRkcmVzcykpIHtcbiAgICByZXR1cm4gbmV3IEFkZHJlc3ModGV4dCk7XG4gIH1cblxuICB0aGlzLnRleHQgPSB0ZXh0O1xuICB0aGlzLnBhcnRzID0gW107XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQWRkcmVzcztcbnZhciBwcm90byA9IEFkZHJlc3MucHJvdG90eXBlO1xuXG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjX2V4dHJhY3RTdHJlZXRQYXJ0cyhzdGFydEluZGV4KVxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBleHRyYWN0IGZyb20gdGhlIHN0cmVldCB0eXBlIG1hdGNoXG4gIGluZGV4ICpiYWNrIHRvKiB0aGUgc3RyZWV0IG51bWJlciBhbmQgcG9zc2libHkgdW5pdCBudW1iZXIgZmllbGRzLlxuXG4gIFRoZSBmdW5jdGlvbiB3aWxsIHN0YXJ0IHdpdGggdGhlIHN0cmVldCB0eXBlLCB0aGVuIGFsc28gZ3JhYiB0aGUgcHJldmlvdXNcbiAgZmllbGQgcmVnYXJkbGVzcyBvZiBjaGVja3MuICBGaWVsZHMgd2lsbCBjb250aW51ZSB0byBiZSBwdWxsZWQgaW4gdW50aWxcbiAgZmllbGRzIHN0YXJ0IHNhdGlzZnlpbmcgbnVtZXJpYyBjaGVja3MuICBPbmNlIHBvc2l0aXZlIG51bWVyaWMgY2hlY2tzIGFyZVxuICBmaXJpbmcsIHRob3NlIHdpbGwgYmUgYnJvdWdodCBpbiBhcyBidWlsZGluZyAvIHVuaXQgbnVtYmVycyBhbmQgb25jZSB0aGVcbiAgc3RhcnQgb2YgdGhlIHBhcnRzIGFycmF5IGlzIHJlYWNoZWQgb3Igd2UgZmFsbCBiYWNrIHRvIG5vbi1udW1lcmljIGZpZWxkc1xuICB0aGVuIHRoZSBleHRyYWN0aW9uIGlzIHN0b3BwZWQuXG4qKi9cbnByb3RvLl9leHRyYWN0U3RyZWV0UGFydHMgPSBmdW5jdGlvbihzdGFydEluZGV4LCBzcGxpdFN0cmVldCkge1xuICB2YXIgaW5kZXggPSBzdGFydEluZGV4O1xuICB2YXIgc3RyZWV0UGFydHMgPSBbXTtcbiAgdmFyIG51bWJlclBhcnRzO1xuICB2YXIgcGFydHMgPSB0aGlzLnBhcnRzO1xuICB2YXIgc3RyZWV0UGFydHNMZW5ndGggPSAoc3BsaXRTdHJlZXQpID8gMyA6IDI7XG4gIHZhciB0ZXN0Rm4gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICB3aGlsZSAoaW5kZXggPj0gMCAmJiB0ZXN0Rm4oKSkge1xuICAgIHZhciBhbHBoYVBhcnQgPSBpc05hTihwYXJzZUludChwYXJ0c1tpbmRleF0sIDEwKSk7XG5cbiAgICBpZiAoc3RyZWV0UGFydHMubGVuZ3RoIDwgc3RyZWV0UGFydHNMZW5ndGggfHwgYWxwaGFQYXJ0KSB7XG4gICAgICAvLyBhZGQgdGhlIGN1cnJlbnQgcGFydCB0byB0aGUgc3RyZWV0IHBhcnRzXG4gICAgICBzdHJlZXRQYXJ0cy51bnNoaWZ0KHBhcnRzLnNwbGljZShpbmRleC0tLCAxKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKCEgbnVtYmVyUGFydHMpIHtcbiAgICAgICAgbnVtYmVyUGFydHMgPSBbXTtcbiAgICAgIH0gLy8gaWZcblxuICAgICAgLy8gYWRkIHRoZSBjdXJyZW50IHBhcnQgdG8gdGhlIGJ1aWxkaW5nIHBhcnRzXG4gICAgICBudW1iZXJQYXJ0cy51bnNoaWZ0KHBhcnRzLnNwbGljZShpbmRleC0tLCAxKSk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgdGVzdCBmdW5jdGlvblxuICAgICAgdGVzdEZuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpc0FscGhhID0gaXNOYU4ocGFyc2VJbnQocGFydHNbaW5kZXhdLCAxMCkpO1xuXG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYnVpbGRpbmcgcGFydHMsIHRoZW4gd2UgYXJlIGxvb2tpbmdcbiAgICAgICAgLy8gZm9yIG5vbi1hbHBoYSB2YWx1ZXMsIG90aGVyd2lzZSBhbHBoYVxuICAgICAgICByZXR1cm4gbnVtYmVyUGFydHMgPyAoISBpc0FscGhhKSA6IGlzQWxwaGE7XG4gICAgICB9O1xuICAgIH0gLy8gaWYuLmVsc2VcbiAgfSAvLyB3aGlsZVxuXG4gIHRoaXMubnVtYmVyID0gbnVtYmVyUGFydHMgPyBudW1iZXJQYXJ0cy5qb2luKCcvJykgOiAnJztcbiAgdGhpcy5zdHJlZXQgPSBzdHJlZXRQYXJ0cy5qb2luKCcgJykucmVwbGFjZSgvXFwsL2csICcnKTtcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjY2xlYW5cblxuICBUaGUgY2xlYW4gZnVuY3Rpb24gaXMgdXNlZCB0byBjbGVhbiB1cCBhbiBhZGRyZXNzIHN0cmluZy4gIEl0IGlzIGRlc2lnbmVkXG4gIHRvIHJlbW92ZSBhbnkgcGFydHMgb2YgdGhlIHRleHQgdGhhdCBwcmV2ZW4gZWZmZWN0aXZlIHBhcnNpbmcgb2YgdGhlXG4gIGFkZHJlc3Mgc3RyaW5nLlxuKiovXG5wcm90by5jbGVhbiA9IGZ1bmN0aW9uKGNsZWFuZXJzKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGNsZWFuZXJzXG4gIGNsZWFuZXJzID0gY2xlYW5lcnMgfHwgW107XG5cbiAgLy8gYXBwbHkgdGhlIGNsZWFuZXJzXG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBjbGVhbmVycy5sZW5ndGg7IGlpKyspIHtcbiAgICBpZiAodHlwZW9mIGNsZWFuZXJzW2lpXSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnRleHQgPSBjbGVhbmVyc1tpaV0uY2FsbChudWxsLCB0aGlzLnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmIChjbGVhbmVyc1tpaV0gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHRoaXMudGV4dCA9IHRoaXMudGV4dC5yZXBsYWNlKGNsZWFuZXJzW2lpXSwgJycpO1xuICAgIH1cbiAgfSAvLyBmb3JcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZXh0cmFjdChmaWVsZE5hbWUsIHJlZ2V4ZXMpXG5cbiAgVGhlIGV4dHJhY3QgZnVuY3Rpb24gaXMgdXNlZCB0byBleHRyYWN0IHRoZSBzcGVjaWZpZWQgZmllbGQgZnJvbSB0aGUgcmF3XG4gIHBhcnRzIHRoYXQgaGF2ZSBwcmV2aW91c2x5IGJlZW4gc3BsaXQgZnJvbSB0aGUgaW5wdXQgdGV4dC4gIElmIHN1Y2Nlc3NmdWxseVxuICBsb2NhdGVkIHRoZW4gdGhlIGZpZWxkIHdpbGwgYmUgdXBkYXRlZCBmcm9tIHRoZSBwYXJ0cyBhbmQgdGhhdCBwYXJ0IHJlbW92ZWRcbiAgZnJvbSB0aGUgcGFydHMgbGlzdC5cbioqL1xucHJvdG8uZXh0cmFjdCA9IGZ1bmN0aW9uKGZpZWxkTmFtZSwgcmVnZXhlcykge1xuICB2YXIgbWF0Y2g7XG4gIHZhciByZ3hJZHg7XG4gIHZhciBpaTtcbiAgdmFyIHZhbHVlO1xuICB2YXIgbG9va3VwcyA9IFtdO1xuXG4gIC8vIGlmIHRoZSByZWdleGVzIGhhdmUgYmVlbiBwYXNzZWQgaW4gYXMgb2JqZWN0cywgdGhlbiBjb252ZXJ0IHRvIGFuIGFycmF5XG4gIGlmICh0eXBlb2YgcmVnZXhlcyA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgcmVnZXhlcy5zcGxpY2UgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2YXIgbmV3UmVnZXhlcyA9IFtdO1xuXG4gICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBrZXlzIGluIHRoZSByZWdleGVzXG4gICAgZm9yICh2YXIga2V5IGluIHJlZ2V4ZXMpIHtcbiAgICAgIG5ld1JlZ2V4ZXNbbmV3UmVnZXhlcy5sZW5ndGhdID0gcmVnZXhlc1trZXldO1xuICAgICAgbG9va3Vwc1tuZXdSZWdleGVzLmxlbmd0aCAtIDFdID0ga2V5O1xuICAgIH1cblxuICAgIC8vIHVwZGF0ZSB0aGUgcmVnZXhlcyB0byBwb2ludCB0byB0aGUgbmV3IHJlZ2V4ZXNcbiAgICByZWdleGVzID0gbmV3UmVnZXhlcztcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgb3ZlciB0aGUgdW5pdCByZWdleGVzIGFuZCB0ZXN0IHRoZW0gYWdhaW5zdCB0aGUgdmFyaW91cyBwYXJ0c1xuICBmb3IgKHJneElkeCA9IDA7IHJneElkeCA8IHJlZ2V4ZXMubGVuZ3RoOyByZ3hJZHgrKykge1xuICAgIGZvciAoaWkgPSB0aGlzLnBhcnRzLmxlbmd0aDsgaWkgPj0gMDsgaWktLSApIHtcbiAgICAgIG1hdGNoID0gcmVnZXhlc1tyZ3hJZHhdLmV4ZWModGhpcy5wYXJ0c1tpaV0pO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSAybmQgY2FwdHVyZSBncm91cCwgdGhlbiByZXBsYWNlIHRoZSBpdGVtIHdpdGhcbiAgICAgICAgLy8gdGhlIHRleHQgb2YgdGhhdCBncm91cFxuICAgICAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSwgMSwgbWF0Y2hbMl0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIG90aGVyd2lzZSwganVzdCByZW1vdmUgdGhlIGVsZW1lbnRcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5wYXJ0cy5zcGxpY2UoaWksIDEpO1xuICAgICAgICB9IC8vIGlmLi5lbHNlXG5cbiAgICAgICAgdmFsdWUgPSBsb29rdXBzW3JneElkeF0gfHwgbWF0Y2hbMV07XG4gICAgICB9IGVsc2UgaWYgKGZpZWxkTmFtZSA9PT0gJ3N0YXRlJyAmJiB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciBtYXRjaE11bHRpcGxlUGFydCA9IGZhbHNlO1xuICAgICAgICB2YXIgc3BhY2VzSW5NYXRjaCA9IHJlZ2V4ZXNbcmd4SWR4XS5zb3VyY2Uuc3BsaXQoJ1xcXFxzJykubGVuZ3RoO1xuICAgICAgICBpZiAoc3BhY2VzSW5NYXRjaCA+IDEpIHtcbiAgICAgICAgICB2YXIgbXVsdGlwbGVQYXJ0ID0gW107XG4gICAgICAgICAgZm9yICh2YXIgcGFydEpvaW4gPSBpaTsgcGFydEpvaW4gPiBpaSAtIHNwYWNlc0luTWF0Y2ggJiYgcGFydEpvaW4gPj0gMDsgcGFydEpvaW4tLSkge1xuICAgICAgICAgICAgbXVsdGlwbGVQYXJ0LnB1c2godGhpcy5wYXJ0c1twYXJ0Sm9pbl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtdWx0aXBsZVBhcnQucmV2ZXJzZSgpO1xuICAgICAgICAgIG11bHRpcGxlUGFydCA9IG11bHRpcGxlUGFydC5qb2luKCcgJyk7XG4gICAgICAgICAgbWF0Y2hNdWx0aXBsZVBhcnQgPSByZWdleGVzW3JneElkeF0uZXhlYyhtdWx0aXBsZVBhcnQpO1xuXG4gICAgICAgICAgaWYgKG1hdGNoTXVsdGlwbGVQYXJ0KSB7XG4gICAgICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgMm5kIGNhcHR1cmUgZ3JvdXAsIHRoZW4gcmVwbGFjZSB0aGUgaXRlbSB3aXRoXG4gICAgICAgICAgICAvLyB0aGUgdGV4dCBvZiB0aGF0IGdyb3VwXG4gICAgICAgICAgICBpZiAobWF0Y2hNdWx0aXBsZVBhcnRbMl0pIHtcbiAgICAgICAgICAgICAgdGhpcy5wYXJ0cy5zcGxpY2UoaWkgLSBzcGFjZXNJbk1hdGNoICsgMSwgc3BhY2VzSW5NYXRjaCwgbWF0Y2hNdWx0aXBsZVBhcnRbMl0pO1xuICAgICAgICAgICAgICBpaSAtPSBzcGFjZXNJbk1hdGNoICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwganVzdCByZW1vdmUgdGhlIGVsZW1lbnRcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSAtIHNwYWNlc0luTWF0Y2ggKyAxLCBzcGFjZXNJbk1hdGNoKTtcbiAgICAgICAgICAgICAgaWkgLT0gc3BhY2VzSW5NYXRjaCArIDE7XG4gICAgICAgICAgICB9IC8vIGlmLi5lbHNlXG5cbiAgICAgICAgICAgIHZhbHVlID0gbG9va3Vwc1tyZ3hJZHhdIHx8IG1hdGNoTXVsdGlwbGVQYXJ0WzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSAvLyBpZlxuICAgIH0gLy8gZm9yXG4gIH0gLy8gZm9yXG5cbiAgLy8gdXBkYXRlIHRoZSBmaWVsZCB2YWx1ZVxuICB0aGlzW2ZpZWxkTmFtZV0gPSB2YWx1ZTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZXh0cmFjdFN0cmVldFxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBwYXJzZSB0aGUgYWRkcmVzcyBwYXJ0cyBhbmQgbG9jYXRlIGFueSBwYXJ0c1xuICB0aGF0IGxvb2sgdG8gYmUgcmVsYXRlZCB0byBhIHN0cmVldCBhZGRyZXNzLlxuKiovXG5wcm90by5leHRyYWN0U3RyZWV0ID0gZnVuY3Rpb24ocmVnZXhlcywgcmVTcGxpdFN0cmVldCkge1xuICB2YXIgcmVOdW1lcmljZXNxdWUgPSAvXihcXGQqfFxcZCpcXHcpJC87XG4gIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XG4gIHZhciBzcGxpdFN0cmVldCA9IGZhbHNlO1xuXG4gIC8vIGVuc3VyZSB3ZSBoYXZlIHJlZ2V4ZXNcbiAgcmVnZXhlcyA9IHJlZ2V4ZXMgfHwgW107XG5cbiAgLy8gVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGxvY2F0ZSB0aGUgXCJiZXN0XCIgc3RyZWV0IHBhcnQgaW4gYW4gYWRkcmVzc1xuICAvLyBzdHJpbmcuICBJdCBpcyBjYWxsZWQgb25jZSBhIHN0cmVldCByZWdleCBoYXMgbWF0Y2hlZCBhZ2FpbnN0IGEgcGFydFxuICAvLyBzdGFydGluZyBmcm9tIHRoZSBsYXN0IHBhcnQgYW5kIHdvcmtpbmcgdG93YXJkcyB0aGUgZnJvbnQuIEluIHRlcm1zIG9mXG4gIC8vIHdoYXQgaXMgY29uc2lkZXJlZCB0aGUgYmVzdCwgd2UgYXJlIGxvb2tpbmcgZm9yIHRoZSBwYXJ0IGNsb3Nlc3QgdG8gdGhlXG4gIC8vIHN0YXJ0IG9mIHRoZSBzdHJpbmcgdGhhdCBpcyBub3QgaW1tZWRpYXRlbHkgcHJlZml4ZWQgYnkgYSBudW1lcmljZXNxdWVcbiAgLy8gcGFydCAoZWcuIDEyMywgNDJBLCBldGMpLlxuICBmdW5jdGlvbiBsb2NhdGVCZXN0U3RyZWV0UGFydChzdGFydEluZGV4KSB7XG4gICAgdmFyIGJlc3RJbmRleCA9IHN0YXJ0SW5kZXg7XG5cbiAgICAvLyBpZiB0aGUgc3RhcnQgaW5kZXggaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIDAsIHRoZW4gcmV0dXJuXG4gICAgZm9yICh2YXIgaWkgPSBzdGFydEluZGV4LTE7IGlpID49IDA7IGlpLS0pIHtcbiAgICAgIC8vIGl0ZXJhdGUgb3ZlciB0aGUgc3RyZWV0IHJlZ2V4ZXMgYW5kIHRlc3QgdGhlbSBhZ2FpbnN0IHRoZSB2YXJpb3VzIHBhcnRzXG4gICAgICBmb3IgKHZhciByZ3hJZHggPSAwOyByZ3hJZHggPCByZWdleGVzLmxlbmd0aDsgcmd4SWR4KyspIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIG1hdGNoLCB0aGVuIHByb2Nlc3NcbiAgICAgICAgaWYgKHJlZ2V4ZXNbcmd4SWR4XS50ZXN0KHBhcnRzW2lpXSkgJiYgcGFydHNbaWktMV0gJiYgKCEgcmVOdW1lcmljZXNxdWUudGVzdChwYXJ0c1tpaS0xXSkpKSB7XG4gICAgICAgICAgLy8gdXBkYXRlIHRoZSBiZXN0IGluZGV4IGFuZCBicmVhayBmcm9tIHRoZSBpbm5lciBsb29wXG4gICAgICAgICAgYmVzdEluZGV4ID0gaWk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gLy8gaWZcbiAgICAgIH0gLy8gZm9yXG4gICAgfSAvLyBmb3JcblxuICAgIHJldHVybiBiZXN0SW5kZXg7XG4gIH0gLy8gbG9jYXRlQmVzdFN0cmVldFBhcnRcblxuICAvLyBpdGVyYXRlIG92ZXIgdGhlIHN0cmVldCByZWdleGVzIGFuZCB0ZXN0IHRoZW0gYWdhaW5zdCB0aGUgdmFyaW91cyBwYXJ0c1xuICBmb3IgKHZhciBwYXJ0SWR4ID0gcGFydHMubGVuZ3RoOyBwYXJ0SWR4LS07ICkge1xuICAgIGZvciAodmFyIHJneElkeCA9IDA7IHJneElkeCA8IHJlZ2V4ZXMubGVuZ3RoOyByZ3hJZHgrKykge1xuICAgICAgLy8gaWYgd2UgaGF2ZSBhIG1hdGNoLCB0aGVuIHByb2Nlc3NcbiAgICAgIC8vIGlmIHRoZSBtYXRjaCBpcyBvbiB0aGUgZmlyc3QgcGFydCB0aG91Z2gsIHJlamVjdCBpdCBhcyB3ZVxuICAgICAgLy8gYXJlIHByb2JhYmx5IGRlYWxpbmcgd2l0aCBhIHRvd24gbmFtZSBvciBzb21ldGhpbmcgKGUuZy4gU3QgR2VvcmdlKVxuICAgICAgaWYgKHJlZ2V4ZXNbcmd4SWR4XS50ZXN0KHBhcnRzW3BhcnRJZHhdKSAmJiBwYXJ0SWR4ID4gMCkge1xuICAgICAgICB2YXIgc3RhcnRJbmRleCA9IGxvY2F0ZUJlc3RTdHJlZXRQYXJ0KHBhcnRJZHgpO1xuXG4gICAgICAgIC8vIGlmIHdlIGFyZSBkZWFsaW5nIHdpdGggYSBzcGxpdCBzdHJlZXQgKGkuZS4gZm9vIHJkIHdlc3QpIGFuZCB0aGVcbiAgICAgICAgLy8gYWRkcmVzcyBwYXJ0cyBhcmUgYXBwcm9wcmlhdGVseSBkZWxpbWl0ZWQsIHRoZW4gZ3JhYiB0aGUgbmV4dCBwYXJ0XG4gICAgICAgIC8vIGFsc29cbiAgICAgICAgaWYgKHJlU3BsaXRTdHJlZXQudGVzdChwYXJ0c1tzdGFydEluZGV4ICsgMV0pKSB7XG4gICAgICAgICAgc3BsaXRTdHJlZXQgPSB0cnVlO1xuICAgICAgICAgIHN0YXJ0SW5kZXggKz0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2V4dHJhY3RTdHJlZXRQYXJ0cyhzdGFydEluZGV4LCBzcGxpdFN0cmVldCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSAvLyBpZlxuICAgIH0gLy8gZm9yXG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI2ZpbmFsaXplXG5cbiAgVGhlIGZpbmFsaXplIGZ1bmN0aW9uIHRha2VzIGFueSByZW1haW5pbmcgcGFydHMgdGhhdCBoYXZlIG5vdCBiZWVuIGV4dHJhY3RlZFxuICBhcyBvdGhlciBpbmZvcm1hdGlvbiwgYW5kIHB1c2hlcyB0aG9zZSBmaWVsZHMgaW50byBhIGdlbmVyaWMgYHJlZ2lvbnNgIGZpZWxkLlxuKiovXG5wcm90by5maW5hbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAvLyB1cGRhdGUgdGhlIHJlZ2lvbnMsIGRpc2NhcmRpbmcgYW55IGVtcHR5IHN0cmluZ3MuXG4gIHRoaXMucmVnaW9ucyA9IHRoaXMucGFydHMuam9pbignICcpLnNwbGl0KC9cXCxcXHM/LykuZmlsdGVyKGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgIHJldHVybiByZWdpb24ubGVuZ3RoO1xuICB9KTtcblxuICAvLyByZXNldCB0aGUgcGFydHNcbiAgdGhpcy5wYXJ0cyA9IFtdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNzcGxpdFxuXG4gIFNwbGl0IHRoZSBhZGRyZXNzIGludG8gaXQncyBjb21wb25lbnQgcGFydHMsIGFuZCByZW1vdmUgYW55IGVtcHR5IHBhcnRzXG4qKi9cbnByb3RvLnNwbGl0ID0gZnVuY3Rpb24oc2VwYXJhdG9yKSB7XG4gIC8vIHNwbGl0IHRoZSBzdHJpbmdcbiAgdmFyIG5ld1BhcnRzID0gdGhpcy50ZXh0LnNwbGl0KHNlcGFyYXRvciB8fCAnICcpO1xuXG4gIHRoaXMucGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5ld1BhcnRzLmxlbmd0aDsgaWkrKykge1xuICAgIGlmIChuZXdQYXJ0c1tpaV0pIHtcbiAgICAgIHRoaXMucGFydHNbdGhpcy5wYXJ0cy5sZW5ndGhdID0gbmV3UGFydHNbaWldO1xuICAgIH0gLy8gaWZcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjdG9TdHJpbmdcblxuICBDb252ZXJ0IHRoZSBhZGRyZXNzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4qKi9cbnByb3RvLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHZhciBvdXRwdXQgPSAnJztcblxuICBpZiAodGhpcy5idWlsZGluZykge1xuICAgIG91dHB1dCArPSB0aGlzLmJ1aWxkaW5nICsgJ1xcbic7XG4gIH0gLy8gaWZcblxuICBpZiAodGhpcy5zdHJlZXQpIHtcbiAgICBvdXRwdXQgKz0gdGhpcy5udW1iZXIgPyB0aGlzLm51bWJlciArICcgJyA6ICcnO1xuICAgIG91dHB1dCArPSB0aGlzLnN0cmVldCArICdcXG4nO1xuICB9XG5cbiAgb3V0cHV0ICs9IHRoaXMucmVnaW9ucy5qb2luKCcsICcpICsgJ1xcbic7XG5cbiAgcmV0dXJuIG91dHB1dDtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyBhZGRyZXNzaXRcblxuICBBZGRyZXNzSXQgaXMgYSBmcmVlZm9ybSBzdHJlZXQgYWRkcmVzcyBwYXJzZXIsIHRoYXQgaXMgZGVzaWduZWQgdG8gdGFrZSBhXG4gIHBpZWNlIG9mIHRleHQgYW5kIGNvbnZlcnQgdGhhdCBpbnRvIGEgc3RydWN0dXJlZCBhZGRyZXNzIHRoYXQgY2FuIGJlXG4gIHByb2Nlc3NlZCBpbiBkaWZmZXJlbnQgc3lzdGVtcy5cblxuICBUaGUgZm9jYWwgcG9pbnQgb2YgYGFkZHJlc3NpdGAgaXMgb24gdGhlIHN0cmVldCBwYXJzaW5nIGNvbXBvbmVudCwgcmF0aGVyXG4gIHRoYW4gYXR0ZW1wdGluZyB0byBhcHByb3ByaWF0ZWx5IGlkZW50aWZ5IHZhcmlvdXMgc3RhdGVzLCBjb3VudGllcywgdG93bnMsXG4gIGV0YywgYXMgdGhlc2UgdmFyeSBmcm9tIGNvdW50cnkgdG8gY291bnRyeSBmYWlybHkgZHJhbWF0aWNhbGx5LiBUaGVzZVxuICBkZXRhaWxzIGFyZSBpbnN0ZWFkIHB1dCBpbnRvIGEgZ2VuZXJpYyByZWdpb25zIGFycmF5IHRoYXQgY2FuIGJlIGZ1cnRoZXJcbiAgcGFyc2VkIGJhc2VkIG9uIHlvdXIgYXBwbGljYXRpb24gbmVlZHMuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIFRoZSBmb2xsb3dpbmcgaXMgYSBzaW1wbGUgZXhhbXBsZSBvZiBob3cgYWRkcmVzcyBpdCBjYW4gYmUgdXNlZDpcblxuICBgYGBqc1xuICB2YXIgYWRkcmVzc2l0ID0gcmVxdWlyZSgnYWRkcmVzc2l0Jyk7XG5cbiAgLy8gcGFyc2UgYSBtYWRlIHVwIGFkZHJlc3MsIHdpdGggc29tZSBzbGlnaHRseSB0cmlja3kgcGFydHNcbiAgdmFyIGFkZHJlc3MgPSBhZGRyZXNzaXQoJ1Nob3AgOCwgNDMxIFN0IEtpbGRhIFJkIE1lbGJvdXJuZScpO1xuICBgYGBcblxuICBUaGUgYGFkZHJlc3NgIG9iamVjdCB3b3VsZCBub3cgY29udGFpbiB0aGUgZm9sbG93aW5nIGluZm9ybWF0aW9uOlxuXG4gIGBgYFxuICB7IHRleHQ6ICc4LzQzMSBTVCBLSUxEQSBSRCBNRUxCT1VSTkUnLFxuICAgIHBhcnRzOiBbXSxcbiAgICB1bml0OiA4LFxuICAgIGNvdW50cnk6IHVuZGVmaW5lZCxcbiAgICBudW1iZXI6IDQzMSxcbiAgICBzdHJlZXQ6ICdTVCBLSUxEQSBSRCcsXG4gICAgcmVnaW9uczogWyAnTUVMQk9VUk5FJyBdIH1cbiAgYGBgXG5cbiAgRm9yIG1vcmUgZXhhbXBsZXMsIHNlZSB0aGUgdGVzdHMuXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG4vKipcbiAgIyMjIGFkZHJlc3NpdChpbnB1dCwgb3B0cz8pXG5cbiAgUnVuIHRoZSBhZGRyZXNzIHBhcnNlciBmb3IgdGhlIGdpdmVuIGlucHV0LiAgT3B0aW9uYWwgYG9wdHNgIGNhbiBiZVxuICBzdXBwbGllZCBpZiB5b3Ugd2FudCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdCAoRU4pIHBhcnNlci5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGlucHV0LCBvcHRzKSB7XG4gIC8vIGlmIG5vIGxvY2FsZSBoYXMgYmVlbiBzcGVjaWZpZWQsIHRoZW4gdXNlIHRoZSBkZWZhdWx0IHZhbmlsbGEgZW4gbG9jYWxlXG4gIHZhciBwYXJzZSA9IChvcHRzIHx8IHt9KS5sb2NhbGUgfHwgcmVxdWlyZSgnLi9sb2NhbGUvZW4tVVMnKTtcblxuICAvLyBwYXJzZSB0aGUgYWRkcmVzc1xuICByZXR1cm4gcGFyc2UoaW5wdXQsIG9wdHMpO1xufTtcbiIsInZhciBwYXJzZXIgPSByZXF1aXJlKCcuLi9wYXJzZXJzL2VuLmpzJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGlucHV0LCBvcHRzKSB7XG4gIC8vIHBhcnNlIHRoZSBiYXNlIGFkZHJlc3NcbiAgcmV0dXJuIHBhcnNlcihpbnB1dCwgZXh0ZW5kKHsgXG4gIFx0c3RhdGU6IHtcblx0ICAgIEFMOiAvKF5hbGFiYW1hfF5BTCQpL2ksXG5cdCAgICBBSzogLyheYWxhc2thfF5BSyQpL2ksXG5cdCAgICBBUzogLyheYW1lcmljYW5cXHNzYW1vYXxeQVMkKS9pLFxuXHQgICAgQVo6IC8oXmFyaXpvbmF8XkFaJCkvaSxcblx0ICAgIEFSOiAvKF5hcmthbnNhc3xeQVIkKS9pLFxuXHQgICAgQ0E6IC8oXmNhbGlmb3JuaWF8XkNBJCkvaSxcblx0ICAgIENPOiAvKF5jb2xvcmFkb3xeQ08kKS9pLFxuXHQgICAgQ1Q6IC8oXmNvbm5lY3RpY3V0fF5DVCQpL2ksXG5cdCAgICBERTogLyheZGVsYXdhcmV8XkRFJCkvaSxcblx0ICAgIERDOiAvKF5kaXN0cmljdFxcc29mXFxzY29sdW1iaWF8XkRDJCkvaSxcblx0ICAgIEZNOiAvKF5mZWRlcmF0ZWRcXHNzdGF0ZXNcXHNvZlxcc21pY3JvbmVzaWF8XkZNJCkvaSxcblx0ICAgIEZMOiAvKF5mbG9yaWRhfF5GTCQpL2ksXG5cdCAgICBHQTogLyheZ2VvcmdpYXxeR0EkKS9pLFxuXHQgICAgR1U6IC8oXmd1YW18XkdVJCkvaSxcblx0ICAgIEhJOiAvKF5oYXdhaWl8XkhJJCkvaSxcblx0ICAgIElEOiAvKF5pZGFob3xeSUQkKS9pLFxuXHQgICAgSUw6IC8oXmlsbGlub2lzfF5JTCQpL2ksXG5cdCAgICBJTjogLyheaW5kaWFuYXxeSU4kKS9pLFxuXHQgICAgSUE6IC8oXmlvd2F8XklBJCkvaSxcblx0ICAgIEtTOiAvKF5rYW5zYXN8XktTJCkvaSxcblx0ICAgIEtZOiAvKF5rZW50dWNreXxeS1kkKS9pLFxuXHQgICAgTEE6IC8oXmxvdWlzaWFuYXxeTEEkKS9pLFxuXHQgICAgTUU6IC8oXm1haW5lfF5NRSQpL2ksXG5cdCAgICBNSDogLyhebWFyc2hhbGxcXHNpc2xhbmRzfF5NSCQpL2ksXG5cdCAgICBNRDogLyhebWFyeWxhbmR8Xk1EJCkvaSxcblx0ICAgIE1BOiAvKF5tYXNzYWNodXNldHRzfF5NQSQpL2ksXG5cdCAgICBNSTogLyhebWljaGlnYW58Xk1JJCkvaSxcblx0ICAgIE1OOiAvKF5taW5uZXNvdGF8Xk1OJCkvaSxcblx0ICAgIE1TOiAvKF5taXNzaXNzaXBwaXxeTVMkKS9pLFxuXHQgICAgTU86IC8oXm1pc3NvdXJpfF5NTyQpL2ksXG5cdCAgICBNVDogLyhebW9udGFuYXxeTVQkKS9pLFxuXHQgICAgTkU6IC8oXm5lYnJhc2thfF5ORSQpL2ksXG5cdCAgICBOVjogLyhebmV2YWRhfF5OViQpL2ksXG5cdCAgICBOSDogLyhebmV3XFxzaGFtcHNoaXJlfF5OSCQpL2ksXG5cdCAgICBOSjogLyhebmV3XFxzamVyc2V5fF5OSiQpL2ksXG5cdCAgICBOTTogLyhebmV3XFxzbWV4aWNvfF5OTSQpL2ksXG5cdCAgICBOWTogLyhebmV3XFxzeW9ya3xeTlkkKS9pLFxuXHQgICAgTkM6IC8oXm5vcnRoXFxzY2Fyb2xpbmF8Xk5DJCkvaSxcblx0ICAgIE5EOiAvKF5ub3J0aFxcc2Rha290YXxeTkQkKS9pLFxuXHQgICAgTVA6IC8oXm5vcnRoZXJuXFxzbWFyaWFuYVxcc2lzbGFuZHN8Xk1QJCkvaSxcblx0ICAgIE9IOiAvKF5vaGlvfF5PSCQpL2ksXG5cdCAgICBPSzogLyheb2tsYWhvbWF8Xk9LJCkvaSxcblx0ICAgIE9SOiAvKF5vcmVnb258Xk9SJCkvaSxcblx0ICAgIFBXOiAvKF5wYWxhdXxeUFckKS9pLFxuXHQgICAgUEE6IC8oXnBlbm5zeWx2YW5pYXxeUEEkKS9pLFxuXHQgICAgUFI6IC8oXnB1ZXJ0b1xcc3JpY298XlBSJCkvaSxcblx0ICAgIFJJOiAvKF5yaG9kZVxcc2lzbGFuZHxeUkkkKS9pLFxuXHQgICAgU0M6IC8oXnNvdXRoXFxzY2Fyb2xpbmF8XlNDJCkvaSxcblx0ICAgIFNEOiAvKF5zb3V0aFxcc2Rha290YXxeU0QkKS9pLFxuXHQgICAgVE46IC8oXnRlbm5lc3NlZXxeVE4kKS9pLFxuXHQgICAgVFg6IC8oXnRleGFzfF5UWCQpL2ksXG5cdCAgICBVVDogLyhedXRhaHxeVVQkKS9pLFxuXHQgICAgVlQ6IC8oXnZlcm1vbnR8XlZUJCkvaSxcblx0ICAgIFZJOiAvKF52aXJnaW5cXHNpc2xhbmRzfF5WSSQpL2ksXG5cdCAgICBWQTogLyhedmlyZ2luaWF8XlZBJCkvaSxcblx0ICAgIFdBOiAvKF53YXNoaW5ndG9ufF5XQSQpL2ksXG5cdCAgICBXVjogLyhed2VzdFxcc3ZpcmdpbmlhfF5XViQpL2ksXG5cdCAgICBXSTogLyhed2lzY29uc2lufF5XSSQpL2ksXG5cdCAgICBXWTogLyhed3lvbWluZ3xeV1kkKS9pXG4gIFx0fSxcbiAgXHRjb3VudHJ5OiB7XG4gICAgICAgIFVTQTogLyheVU5JVEVEXFxzU1RBVEVTfF5VXFwuP1NcXC4/QT8kKS9pXG4gICAgfSxcbiAgICByZVBvc3RhbENvZGU6IC8oXlxcZHs1fSQpfCheXFxkezV9LVxcZHs0fSQpLyB9LCBvcHRzKSk7XG4gICAgICAgICAgICAgICAvLyBQb3N0YWwgY29kZXMgb2YgdGhlIGZvcm0gJ0RERERELUREREQnIG9yIGp1c3QgJ0REREREJ1xuICAgICAgICAgICAgICAgLy8gMTAwMTAgaXMgdmFsaWQgYW5kIHNvIGlzIDEwMDEwLTEyMzRcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiMjIGNvZy9leHRlbmRcblxuYGBganNcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5gYGBcblxuIyMjIGV4dGVuZCh0YXJnZXQsICopXG5cblNoYWxsb3cgY29weSBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRoZSBzdXBwbGllZCBzb3VyY2Ugb2JqZWN0cyAoKikgaW50b1xudGhlIHRhcmdldCBvYmplY3QsIHJldHVybmluZyB0aGUgdGFyZ2V0IG9iamVjdCBvbmNlIGNvbXBsZXRlZDpcblxuYGBganNcbmV4dGVuZCh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKS5mb3JFYWNoKGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmICghIHNvdXJjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gdGFyZ2V0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRleHRSZWdleGVzKSB7XG4gIHZhciByZWdleGVzID0gW107XG4gIHZhciByZVN0cmVldENsZWFuZXIgPSAvXlxcXj8oLiopXFwsP1xcJD8kLztcbiAgdmFyIGlpO1xuXG4gIGZvciAoaWkgPSB0ZXh0UmVnZXhlcy5sZW5ndGg7IGlpLS07ICkge1xuICAgIHJlZ2V4ZXNbaWldID0gbmV3IFJlZ0V4cChcbiAgICAgIHRleHRSZWdleGVzW2lpXS5yZXBsYWNlKHJlU3RyZWV0Q2xlYW5lciwgJ14kMVxcLD8kJyksXG4gICAgICAnaSdcbiAgICApO1xuICB9IC8vIGZvclxuXG4gIHJldHVybiByZWdleGVzO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQWRkcmVzcyA9IHJlcXVpcmUoJy4uL2FkZHJlc3MnKTtcbnZhciBjb21waWxlciA9IHJlcXVpcmUoJy4vY29tcGlsZXInKTtcblxuLy8gaW5pdGlhbGlzZSB0aGUgc3RyZWV0IHJlZ2V4ZXNcbi8vIHRoZXNlIGFyZSB0aGUgcmVnZXhlcyBmb3IgZGV0ZXJtaW5pbmcgd2hldGhlciBvciBub3QgYSBzdHJpbmcgaXMgYSBzdHJlZXRcbi8vIGl0IGlzIGltcG9ydGFudCB0byBub3RlIHRoYXQgdGhleSBhcmUgcGFyc2VkIHRocm91Z2ggdGhlIHJlU3RyZWV0Q2xlYW5lclxuLy8gcmVnZXggdG8gYmVjb21lIG1vcmUgc3RyaWN0XG4vLyB0aGlzIGxpc3QgaGFzIGJlZW4gc291cmNlZCBmcm9tOlxuLy8gaHR0cHM6Ly93d3cucHJvcGVydHlhc3Npc3Quc2EuZ292LmF1L3BhL3FoZWxwLnBodG1sP2NtZD1zdHJlZXR0eXBlXG4vL1xuLy8gX19OT1RFOl9fIFNvbWUgb2YgdGhlIHN0cmVldCB0eXBlcyBoYXZlIGJlZW4gZGlzYWJsZWQgZHVlIHRvIGNvbGxpc2lvbnNcbi8vIHdpdGggY29tbW9uIHBhcnRzIG9mIHN1YnVyYiBuYW1lcy4gIEF0IHNvbWUgcG9pbnQgdGhlIHN0cmVldCBwYXJzZXIgbWF5IGJlXG4vLyBpbXByb3ZlZCB0byBkZWFsIHdpdGggdGhlc2UgY2FzZXMsIGJ1dCBmb3Igbm93IHRoaXMgaGFzIGJlZW4gZGVlbWVkXG4vLyBzdWl0YWJsZS5cblxudmFyIHN0cmVldFJlZ2V4ZXMgPSBjb21waWxlcihbXG4gICdBTExFP1knLCAgICAgICAgICAgICAgIC8vIEFMTEVZIC8gQUxMWVxuICAnQVBQKFJPQUNIKT8nLCAgICAgICAgICAvLyBBUFBST0FDSCAvIEFQUFxuICAnQVJDKEFERSk/JywgICAgICAgICAgICAvLyBBUkNBREUgLyBBUkNcbiAgJ0FWKEV8RU5VRSk/JywgICAgICAgICAgLy8gQVZFTlVFIC8gQVYgLyBBVkVcbiAgJyhCT1VMRVZBUkR8QkxWRCknLCAgICAgLy8gQk9VTEVWQVJEIC8gQkxWRFxuICAnQlJPVycsICAgICAgICAgICAgICAgICAvLyBCUk9XXG4gICdCWVBBKFNTKT8nLCAgICAgICAgICAgIC8vIEJZUEFTUyAvIEJZUEFcbiAgJ0MoQVVTRSk/V0FZJywgICAgICAgICAgLy8gQ0FVU0VXQVkgLyBDV0FZXG4gICcoQ0lSQ1VJVHxDQ1QpJywgICAgICAgIC8vIENJUkNVSVQgLyBDQ1RcbiAgJ0NJUkMoVVMpPycsICAgICAgICAgICAgLy8gQ0lSQ1VTIC8gQ0lSQ1xuICAnQ0woT1NFKT8nLCAgICAgICAgICAgICAvLyBDTE9TRSAvIENMXG4gICdDTz9QU0UnLCAgICAgICAgICAgICAgIC8vIENPUFNFIC8gQ1BTRVxuICAnKENPUk5FUnxDTlIpJywgICAgICAgICAvLyBDT1JORVIgLyBDTlJcbiAgLy8gJ0NPVkUnLCAgICAgICAgICAgICAgICAgLy8gQ09WRVxuICAnKEMoKE9VUil8Uik/VHxDUlQpJywgICAvLyBDT1VSVCAvIENUIC9DUlRcbiAgJ0NSRVMoQ0VOVCk/JywgICAgICAgICAgLy8gQ1JFU0NFTlQgLyBDUkVTXG4gICdEUihJVkUpPycsICAgICAgICAgICAgIC8vIERSSVZFIC8gRFJcbiAgLy8gJ0VORCcsICAgICAgICAgICAgICAgICAgLy8gRU5EXG4gICdFU1AoTEFOQU5ERSk/JywgICAgICAgIC8vIEVTUExBTkFERSAvIEVTUFxuICAvLyAnRkxBVCcsICAgICAgICAgICAgICAgICAvLyBGTEFUXG4gICdGKFJFRSk/V0FZJywgICAgICAgICAgIC8vIEZSRUVXQVkgLyBGV0FZXG4gICcoRlJPTlRBR0V8RlJOVCknLCAgICAgIC8vIEZST05UQUdFIC8gRlJOVFxuICAvLyAnKEdBUkRFTlN8R0ROUyknLCAgICAgICAvLyBHQVJERU5TIC8gR0ROU1xuICAnKEdMQURFfEdMRCknLCAgICAgICAgICAvLyBHTEFERSAvIEdMRFxuICAvLyAnR0xFTicsICAgICAgICAgICAgICAgICAvLyBHTEVOXG4gICdHUihFRSk/TicsICAgICAgICAgICAgIC8vIEdSRUVOIC8gR1JOXG4gIC8vICdHUihPVkUpPycsICAgICAgICAgICAgIC8vIEdST1ZFIC8gR1JcbiAgLy8gJ0goRUlHSCk/VFMnLCAgICAgICAgICAgLy8gSEVJR0hUUyAvIEhUU1xuICAnKEhJR0hXQVl8SFdZKScsICAgICAgICAvLyBISUdIV0FZIC8gSFdZXG4gICcoTEFORXxMTiknLCAgICAgICAgICAgIC8vIExBTkUgLyBMTlxuICAnTElOSycsICAgICAgICAgICAgICAgICAvLyBMSU5LXG4gICdMT09QJywgICAgICAgICAgICAgICAgIC8vIExPT1BcbiAgJ01BTEwnLCAgICAgICAgICAgICAgICAgLy8gTUFMTFxuICAnTUVXUycsICAgICAgICAgICAgICAgICAvLyBNRVdTXG4gICcoUEFDS0VUfFBDS1QpJywgICAgICAgIC8vIFBBQ0tFVCAvIFBDS1RcbiAgJ1AoQVJBKT9ERScsICAgICAgICAgICAgLy8gUEFSQURFIC8gUERFXG4gIC8vICdQQVJLJywgICAgICAgICAgICAgICAgIC8vIFBBUktcbiAgJyhQQVJLV0FZfFBLV1kpJywgICAgICAgLy8gUEFSS1dBWSAvIFBLV1lcbiAgJ1BMKEFDRSk/JywgICAgICAgICAgICAgLy8gUExBQ0UgLyBQTFxuICAnUFJPTShFTkFERSk/JywgICAgICAgICAvLyBQUk9NRU5BREUgLyBQUk9NXG4gICdSRVMoRVJWRSk/JywgICAgICAgICAgIC8vIFJFU0VSVkUgLyBSRVNcbiAgLy8gJ1JJP0RHRScsICAgICAgICAgICAgICAgLy8gUklER0UgLyBSREdFXG4gICdSSVNFJywgICAgICAgICAgICAgICAgIC8vIFJJU0VcbiAgJ1IoT0EpP0QnLCAgICAgICAgICAgICAgLy8gUk9BRCAvIFJEXG4gICdST1cnLCAgICAgICAgICAgICAgICAgIC8vIFJPV1xuICAnU1EoVUFSRSk/JywgICAgICAgICAgICAvLyBTUVVBUkUgLyBTUVxuICAnU1QoUkVFVCk/JywgICAgICAgICAgICAvLyBTVFJFRVQgLyBTVFxuICAnU1RSST9QJywgICAgICAgICAgICAgICAvLyBTVFJJUCAvIFNUUlBcbiAgJ1RBUk4nLCAgICAgICAgICAgICAgICAgLy8gVEFSTlxuICAnVChFUlJBKT9DRScsICAgICAgICAgICAvLyBURVJSQUNFIC8gVENFXG4gICcoVEhPUk9VR0hGQVJFfFRGUkUpJywgIC8vIFRIT1JPVUdIRkFSRSAvIFRGUkVcbiAgJ1RSQUNLPycsICAgICAgICAgICAgICAgLy8gVFJBQ0sgLyBUUkFDXG4gICdUKFJVTkspP1dBWScsICAgICAgICAgIC8vIFRSVU5LV0FZIC8gVFdBWVxuICAvLyAnVklFVycsICAgICAgICAgICAgICAgICAvLyBWSUVXXG4gICdWST9TVEEnLCAgICAgICAgICAgICAgIC8vIFZJU1RBIC8gVlNUQVxuICAnV0FMSycsICAgICAgICAgICAgICAgICAvLyBXQUxLXG4gICdXQT9ZJywgICAgICAgICAgICAgICAgIC8vIFdBWSAvIFdZXG4gICdXKEFMSyk/V0FZJywgICAgICAgICAgIC8vIFdBTEtXQVkgLyBXV0FZXG4gICdZQVJEJyAgICAgICAgICAgICAgICAgIC8vIFlBUkRcbl0pO1xuXG52YXIgcmVTcGxpdFN0cmVldCA9IC9eKE58TlRIfE5PUlRIfEV8RVNUfEVBU1R8U3xTVEh8U09VVEh8V3xXU1R8V0VTVClcXCwkL2k7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGV4dCwgb3B0cykge1xuICB2YXIgYWRkcmVzcyA9IG5ldyBBZGRyZXNzKHRleHQsIG9wdHMpO1xuXG4gIC8vIGNsZWFuIHRoZSBhZGRyZXNzXG4gIGFkZHJlc3NcbiAgICAuY2xlYW4oW1xuICAgICAgICAvLyByZW1vdmUgdHJhaWxpbmcgZG90cyBmcm9tIHR3byBsZXR0ZXIgYWJicmV2aWF0aW9uc1xuICAgICAgICBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoLyhcXHd7Mn0pXFwuL2csICckMScpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGNvbnZlcnQgc2hvcCB0byBhIHVuaXQgZm9ybWF0XG4gICAgICAgIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQucmVwbGFjZSgvXlxccypTSE9QXFxzPyhcXGQqKVxcLD9cXHMqL2ksICckMS8nKTtcbiAgICAgICAgfVxuICAgIF0pXG5cbiAgICAvLyBzcGxpdCB0aGUgYWRkcmVzc1xuICAgIC5zcGxpdCgvXFxzLylcblxuICAgIC8vIGV4dHJhY3QgdGhlIHVuaXRcbiAgICAuZXh0cmFjdCgndW5pdCcsIFtcbiAgICAgICAgKC9eKD86XFwjfEFQVHxBUEFSVE1FTlQpXFxzPyhcXGQrKS8pLFxuICAgICAgICAoL14oXFxkKylcXC8oLiopLylcbiAgICBdKVxuXG4gICAgLy8gZXh0cmFjdCB0aGUgc3RyZWV0XG4gICAgLmV4dHJhY3RTdHJlZXQoc3RyZWV0UmVnZXhlcywgcmVTcGxpdFN0cmVldCk7XG5cbiAgaWYgKG9wdHMgJiYgb3B0cy5zdGF0ZSkge1xuICAgIGFkZHJlc3MuZXh0cmFjdCgnc3RhdGUnLCBvcHRzLnN0YXRlICk7XG4gIH1cblxuICBpZiAob3B0cyAmJiBvcHRzLmNvdW50cnkpIHtcbiAgICBhZGRyZXNzLmV4dHJhY3QoJ2NvdW50cnknLCBvcHRzLmNvdW50cnkgKTtcbiAgfVxuXG4gIGlmIChvcHRzICYmIG9wdHMucmVQb3N0YWxDb2RlKSB7XG4gICAgYWRkcmVzcy5leHRyYWN0KCdwb3N0YWxjb2RlJywgWyBvcHRzLnJlUG9zdGFsQ29kZSBdKTtcbiAgfVxuXG4gICAvLyB0YWtlIHJlbWFpbmluZyB1bmtub3duIHBhcnRzIGFuZCBwdXNoIHRoZW1cbiAgIHJldHVybiBhZGRyZXNzLmZpbmFsaXplKCk7XG59O1xuIl19
