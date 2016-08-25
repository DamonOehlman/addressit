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
  'TR(AI)?L',             // TRAIL / TRL
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92Ni4zLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZGRyZXNzLmpzIiwiaW5kZXguanMiLCJsb2NhbGUvZW4tVVMuanMiLCJub2RlX21vZHVsZXMvY29nL2V4dGVuZC5qcyIsInBhcnNlcnMvY29tcGlsZXIuanMiLCJwYXJzZXJzL2VuLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVOdW1lcmljID0gL15cXGQrJC87XG5cbi8qKlxuICAjIyMgQWRkcmVzc1xuKiovXG5mdW5jdGlvbiBBZGRyZXNzKHRleHQsIG9wdHMpIHtcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBBZGRyZXNzKSkge1xuICAgIHJldHVybiBuZXcgQWRkcmVzcyh0ZXh0KTtcbiAgfVxuXG4gIHRoaXMudGV4dCA9IHRleHQ7XG4gIHRoaXMucGFydHMgPSBbXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBZGRyZXNzO1xudmFyIHByb3RvID0gQWRkcmVzcy5wcm90b3R5cGU7XG5cblxuLyoqXG4gICMjIyMgQWRkcmVzcyNfZXh0cmFjdFN0cmVldFBhcnRzKHN0YXJ0SW5kZXgpXG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGV4dHJhY3QgZnJvbSB0aGUgc3RyZWV0IHR5cGUgbWF0Y2hcbiAgaW5kZXggKmJhY2sgdG8qIHRoZSBzdHJlZXQgbnVtYmVyIGFuZCBwb3NzaWJseSB1bml0IG51bWJlciBmaWVsZHMuXG5cbiAgVGhlIGZ1bmN0aW9uIHdpbGwgc3RhcnQgd2l0aCB0aGUgc3RyZWV0IHR5cGUsIHRoZW4gYWxzbyBncmFiIHRoZSBwcmV2aW91c1xuICBmaWVsZCByZWdhcmRsZXNzIG9mIGNoZWNrcy4gIEZpZWxkcyB3aWxsIGNvbnRpbnVlIHRvIGJlIHB1bGxlZCBpbiB1bnRpbFxuICBmaWVsZHMgc3RhcnQgc2F0aXNmeWluZyBudW1lcmljIGNoZWNrcy4gIE9uY2UgcG9zaXRpdmUgbnVtZXJpYyBjaGVja3MgYXJlXG4gIGZpcmluZywgdGhvc2Ugd2lsbCBiZSBicm91Z2h0IGluIGFzIGJ1aWxkaW5nIC8gdW5pdCBudW1iZXJzIGFuZCBvbmNlIHRoZVxuICBzdGFydCBvZiB0aGUgcGFydHMgYXJyYXkgaXMgcmVhY2hlZCBvciB3ZSBmYWxsIGJhY2sgdG8gbm9uLW51bWVyaWMgZmllbGRzXG4gIHRoZW4gdGhlIGV4dHJhY3Rpb24gaXMgc3RvcHBlZC5cbioqL1xucHJvdG8uX2V4dHJhY3RTdHJlZXRQYXJ0cyA9IGZ1bmN0aW9uKHN0YXJ0SW5kZXgsIHNwbGl0U3RyZWV0KSB7XG4gIHZhciBpbmRleCA9IHN0YXJ0SW5kZXg7XG4gIHZhciBzdHJlZXRQYXJ0cyA9IFtdO1xuICB2YXIgbnVtYmVyUGFydHM7XG4gIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XG4gIHZhciBzdHJlZXRQYXJ0c0xlbmd0aCA9IChzcGxpdFN0cmVldCkgPyAzIDogMjtcbiAgdmFyIHRlc3RGbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIHdoaWxlIChpbmRleCA+PSAwICYmIHRlc3RGbigpKSB7XG4gICAgdmFyIGFscGhhUGFydCA9IGlzTmFOKHBhcnNlSW50KHBhcnRzW2luZGV4XSwgMTApKTtcblxuICAgIGlmIChzdHJlZXRQYXJ0cy5sZW5ndGggPCBzdHJlZXRQYXJ0c0xlbmd0aCB8fCBhbHBoYVBhcnQpIHtcbiAgICAgIC8vIGFkZCB0aGUgY3VycmVudCBwYXJ0IHRvIHRoZSBzdHJlZXQgcGFydHNcbiAgICAgIHN0cmVldFBhcnRzLnVuc2hpZnQocGFydHMuc3BsaWNlKGluZGV4LS0sIDEpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoISBudW1iZXJQYXJ0cykge1xuICAgICAgICBudW1iZXJQYXJ0cyA9IFtdO1xuICAgICAgfSAvLyBpZlxuXG4gICAgICAvLyBhZGQgdGhlIGN1cnJlbnQgcGFydCB0byB0aGUgYnVpbGRpbmcgcGFydHNcbiAgICAgIG51bWJlclBhcnRzLnVuc2hpZnQocGFydHMuc3BsaWNlKGluZGV4LS0sIDEpKTtcblxuICAgICAgLy8gdXBkYXRlIHRoZSB0ZXN0IGZ1bmN0aW9uXG4gICAgICB0ZXN0Rm4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGlzQWxwaGEgPSBpc05hTihwYXJzZUludChwYXJ0c1tpbmRleF0sIDEwKSk7XG5cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBidWlsZGluZyBwYXJ0cywgdGhlbiB3ZSBhcmUgbG9va2luZ1xuICAgICAgICAvLyBmb3Igbm9uLWFscGhhIHZhbHVlcywgb3RoZXJ3aXNlIGFscGhhXG4gICAgICAgIHJldHVybiBudW1iZXJQYXJ0cyA/ICghIGlzQWxwaGEpIDogaXNBbHBoYTtcbiAgICAgIH07XG4gICAgfSAvLyBpZi4uZWxzZVxuICB9IC8vIHdoaWxlXG5cbiAgdGhpcy5udW1iZXIgPSBudW1iZXJQYXJ0cyA/IG51bWJlclBhcnRzLmpvaW4oJy8nKSA6ICcnO1xuICB0aGlzLnN0cmVldCA9IHN0cmVldFBhcnRzLmpvaW4oJyAnKS5yZXBsYWNlKC9cXCwvZywgJycpO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNjbGVhblxuXG4gIFRoZSBjbGVhbiBmdW5jdGlvbiBpcyB1c2VkIHRvIGNsZWFuIHVwIGFuIGFkZHJlc3Mgc3RyaW5nLiAgSXQgaXMgZGVzaWduZWRcbiAgdG8gcmVtb3ZlIGFueSBwYXJ0cyBvZiB0aGUgdGV4dCB0aGF0IHByZXZlbiBlZmZlY3RpdmUgcGFyc2luZyBvZiB0aGVcbiAgYWRkcmVzcyBzdHJpbmcuXG4qKi9cbnByb3RvLmNsZWFuID0gZnVuY3Rpb24oY2xlYW5lcnMpIHtcbiAgLy8gZW5zdXJlIHdlIGhhdmUgY2xlYW5lcnNcbiAgY2xlYW5lcnMgPSBjbGVhbmVycyB8fCBbXTtcblxuICAvLyBhcHBseSB0aGUgY2xlYW5lcnNcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGNsZWFuZXJzLmxlbmd0aDsgaWkrKykge1xuICAgIGlmICh0eXBlb2YgY2xlYW5lcnNbaWldID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMudGV4dCA9IGNsZWFuZXJzW2lpXS5jYWxsKG51bGwsIHRoaXMudGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNsZWFuZXJzW2lpXSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgdGhpcy50ZXh0ID0gdGhpcy50ZXh0LnJlcGxhY2UoY2xlYW5lcnNbaWldLCAnJyk7XG4gICAgfVxuICB9IC8vIGZvclxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNleHRyYWN0KGZpZWxkTmFtZSwgcmVnZXhlcylcblxuICBUaGUgZXh0cmFjdCBmdW5jdGlvbiBpcyB1c2VkIHRvIGV4dHJhY3QgdGhlIHNwZWNpZmllZCBmaWVsZCBmcm9tIHRoZSByYXdcbiAgcGFydHMgdGhhdCBoYXZlIHByZXZpb3VzbHkgYmVlbiBzcGxpdCBmcm9tIHRoZSBpbnB1dCB0ZXh0LiAgSWYgc3VjY2Vzc2Z1bGx5XG4gIGxvY2F0ZWQgdGhlbiB0aGUgZmllbGQgd2lsbCBiZSB1cGRhdGVkIGZyb20gdGhlIHBhcnRzIGFuZCB0aGF0IHBhcnQgcmVtb3ZlZFxuICBmcm9tIHRoZSBwYXJ0cyBsaXN0LlxuKiovXG5wcm90by5leHRyYWN0ID0gZnVuY3Rpb24oZmllbGROYW1lLCByZWdleGVzKSB7XG4gIHZhciBtYXRjaDtcbiAgdmFyIHJneElkeDtcbiAgdmFyIGlpO1xuICB2YXIgdmFsdWU7XG4gIHZhciBsb29rdXBzID0gW107XG5cbiAgLy8gaWYgdGhlIHJlZ2V4ZXMgaGF2ZSBiZWVuIHBhc3NlZCBpbiBhcyBvYmplY3RzLCB0aGVuIGNvbnZlcnQgdG8gYW4gYXJyYXlcbiAgaWYgKHR5cGVvZiByZWdleGVzID09ICdvYmplY3QnICYmIHR5cGVvZiByZWdleGVzLnNwbGljZSA9PSAndW5kZWZpbmVkJykge1xuICAgIHZhciBuZXdSZWdleGVzID0gW107XG5cbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGtleXMgaW4gdGhlIHJlZ2V4ZXNcbiAgICBmb3IgKHZhciBrZXkgaW4gcmVnZXhlcykge1xuICAgICAgbmV3UmVnZXhlc1tuZXdSZWdleGVzLmxlbmd0aF0gPSByZWdleGVzW2tleV07XG4gICAgICBsb29rdXBzW25ld1JlZ2V4ZXMubGVuZ3RoIC0gMV0gPSBrZXk7XG4gICAgfVxuXG4gICAgLy8gdXBkYXRlIHRoZSByZWdleGVzIHRvIHBvaW50IHRvIHRoZSBuZXcgcmVnZXhlc1xuICAgIHJlZ2V4ZXMgPSBuZXdSZWdleGVzO1xuICB9XG5cbiAgLy8gaXRlcmF0ZSBvdmVyIHRoZSB1bml0IHJlZ2V4ZXMgYW5kIHRlc3QgdGhlbSBhZ2FpbnN0IHRoZSB2YXJpb3VzIHBhcnRzXG4gIGZvciAocmd4SWR4ID0gMDsgcmd4SWR4IDwgcmVnZXhlcy5sZW5ndGg7IHJneElkeCsrKSB7XG4gICAgZm9yIChpaSA9IHRoaXMucGFydHMubGVuZ3RoOyBpaSA+PSAwOyBpaS0tICkge1xuICAgICAgbWF0Y2ggPSByZWdleGVzW3JneElkeF0uZXhlYyh0aGlzLnBhcnRzW2lpXSk7XG5cbiAgICAgIC8vIGlmIHdlIGhhdmUgYSBtYXRjaCwgdGhlbiBwcm9jZXNzXG4gICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIDJuZCBjYXB0dXJlIGdyb3VwLCB0aGVuIHJlcGxhY2UgdGhlIGl0ZW0gd2l0aFxuICAgICAgICAvLyB0aGUgdGV4dCBvZiB0aGF0IGdyb3VwXG4gICAgICAgIGlmIChtYXRjaFsyXSkge1xuICAgICAgICAgIHRoaXMucGFydHMuc3BsaWNlKGlpLCAxLCBtYXRjaFsyXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSB0aGUgZWxlbWVudFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSwgMSk7XG4gICAgICAgIH0gLy8gaWYuLmVsc2VcblxuICAgICAgICB2YWx1ZSA9IGxvb2t1cHNbcmd4SWR4XSB8fCBtYXRjaFsxXTtcbiAgICAgIH0gZWxzZSBpZiAoZmllbGROYW1lID09PSAnc3RhdGUnICYmIHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFyIG1hdGNoTXVsdGlwbGVQYXJ0ID0gZmFsc2U7XG4gICAgICAgIHZhciBzcGFjZXNJbk1hdGNoID0gcmVnZXhlc1tyZ3hJZHhdLnNvdXJjZS5zcGxpdCgnXFxcXHMnKS5sZW5ndGg7XG4gICAgICAgIGlmIChzcGFjZXNJbk1hdGNoID4gMSkge1xuICAgICAgICAgIHZhciBtdWx0aXBsZVBhcnQgPSBbXTtcbiAgICAgICAgICBmb3IgKHZhciBwYXJ0Sm9pbiA9IGlpOyBwYXJ0Sm9pbiA+IGlpIC0gc3BhY2VzSW5NYXRjaCAmJiBwYXJ0Sm9pbiA+PSAwOyBwYXJ0Sm9pbi0tKSB7XG4gICAgICAgICAgICBtdWx0aXBsZVBhcnQucHVzaCh0aGlzLnBhcnRzW3BhcnRKb2luXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG11bHRpcGxlUGFydC5yZXZlcnNlKCk7XG4gICAgICAgICAgbXVsdGlwbGVQYXJ0ID0gbXVsdGlwbGVQYXJ0LmpvaW4oJyAnKTtcbiAgICAgICAgICBtYXRjaE11bHRpcGxlUGFydCA9IHJlZ2V4ZXNbcmd4SWR4XS5leGVjKG11bHRpcGxlUGFydCk7XG5cbiAgICAgICAgICBpZiAobWF0Y2hNdWx0aXBsZVBhcnQpIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIGhhdmUgYSAybmQgY2FwdHVyZSBncm91cCwgdGhlbiByZXBsYWNlIHRoZSBpdGVtIHdpdGhcbiAgICAgICAgICAgIC8vIHRoZSB0ZXh0IG9mIHRoYXQgZ3JvdXBcbiAgICAgICAgICAgIGlmIChtYXRjaE11bHRpcGxlUGFydFsyXSkge1xuICAgICAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSAtIHNwYWNlc0luTWF0Y2ggKyAxLCBzcGFjZXNJbk1hdGNoLCBtYXRjaE11bHRpcGxlUGFydFsyXSk7XG4gICAgICAgICAgICAgIGlpIC09IHNwYWNlc0luTWF0Y2ggKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSB0aGUgZWxlbWVudFxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMucGFydHMuc3BsaWNlKGlpIC0gc3BhY2VzSW5NYXRjaCArIDEsIHNwYWNlc0luTWF0Y2gpO1xuICAgICAgICAgICAgICBpaSAtPSBzcGFjZXNJbk1hdGNoICsgMTtcbiAgICAgICAgICAgIH0gLy8gaWYuLmVsc2VcblxuICAgICAgICAgICAgdmFsdWUgPSBsb29rdXBzW3JneElkeF0gfHwgbWF0Y2hNdWx0aXBsZVBhcnRbMV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IC8vIGlmXG4gICAgfSAvLyBmb3JcbiAgfSAvLyBmb3JcblxuICAvLyB1cGRhdGUgdGhlIGZpZWxkIHZhbHVlXG4gIHRoaXNbZmllbGROYW1lXSA9IHZhbHVlO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNleHRyYWN0U3RyZWV0XG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIHBhcnNlIHRoZSBhZGRyZXNzIHBhcnRzIGFuZCBsb2NhdGUgYW55IHBhcnRzXG4gIHRoYXQgbG9vayB0byBiZSByZWxhdGVkIHRvIGEgc3RyZWV0IGFkZHJlc3MuXG4qKi9cbnByb3RvLmV4dHJhY3RTdHJlZXQgPSBmdW5jdGlvbihyZWdleGVzLCByZVNwbGl0U3RyZWV0KSB7XG4gIHZhciByZU51bWVyaWNlc3F1ZSA9IC9eKFxcZCp8XFxkKlxcdykkLztcbiAgdmFyIHBhcnRzID0gdGhpcy5wYXJ0cztcbiAgdmFyIHNwbGl0U3RyZWV0ID0gZmFsc2U7XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgcmVnZXhlc1xuICByZWdleGVzID0gcmVnZXhlcyB8fCBbXTtcblxuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gbG9jYXRlIHRoZSBcImJlc3RcIiBzdHJlZXQgcGFydCBpbiBhbiBhZGRyZXNzXG4gIC8vIHN0cmluZy4gIEl0IGlzIGNhbGxlZCBvbmNlIGEgc3RyZWV0IHJlZ2V4IGhhcyBtYXRjaGVkIGFnYWluc3QgYSBwYXJ0XG4gIC8vIHN0YXJ0aW5nIGZyb20gdGhlIGxhc3QgcGFydCBhbmQgd29ya2luZyB0b3dhcmRzIHRoZSBmcm9udC4gSW4gdGVybXMgb2ZcbiAgLy8gd2hhdCBpcyBjb25zaWRlcmVkIHRoZSBiZXN0LCB3ZSBhcmUgbG9va2luZyBmb3IgdGhlIHBhcnQgY2xvc2VzdCB0byB0aGVcbiAgLy8gc3RhcnQgb2YgdGhlIHN0cmluZyB0aGF0IGlzIG5vdCBpbW1lZGlhdGVseSBwcmVmaXhlZCBieSBhIG51bWVyaWNlc3F1ZVxuICAvLyBwYXJ0IChlZy4gMTIzLCA0MkEsIGV0YykuXG4gIGZ1bmN0aW9uIGxvY2F0ZUJlc3RTdHJlZXRQYXJ0KHN0YXJ0SW5kZXgpIHtcbiAgICB2YXIgYmVzdEluZGV4ID0gc3RhcnRJbmRleDtcblxuICAgIC8vIGlmIHRoZSBzdGFydCBpbmRleCBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gMCwgdGhlbiByZXR1cm5cbiAgICBmb3IgKHZhciBpaSA9IHN0YXJ0SW5kZXgtMTsgaWkgPj0gMDsgaWktLSkge1xuICAgICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdHJlZXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgICAgIGZvciAodmFyIHJneElkeCA9IDA7IHJneElkeCA8IHJlZ2V4ZXMubGVuZ3RoOyByZ3hJZHgrKykge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgICBpZiAocmVnZXhlc1tyZ3hJZHhdLnRlc3QocGFydHNbaWldKSAmJiBwYXJ0c1tpaS0xXSAmJiAoISByZU51bWVyaWNlc3F1ZS50ZXN0KHBhcnRzW2lpLTFdKSkpIHtcbiAgICAgICAgICAvLyB1cGRhdGUgdGhlIGJlc3QgaW5kZXggYW5kIGJyZWFrIGZyb20gdGhlIGlubmVyIGxvb3BcbiAgICAgICAgICBiZXN0SW5kZXggPSBpaTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSAvLyBpZlxuICAgICAgfSAvLyBmb3JcbiAgICB9IC8vIGZvclxuXG4gICAgcmV0dXJuIGJlc3RJbmRleDtcbiAgfSAvLyBsb2NhdGVCZXN0U3RyZWV0UGFydFxuXG4gIC8vIGl0ZXJhdGUgb3ZlciB0aGUgc3RyZWV0IHJlZ2V4ZXMgYW5kIHRlc3QgdGhlbSBhZ2FpbnN0IHRoZSB2YXJpb3VzIHBhcnRzXG4gIGZvciAodmFyIHBhcnRJZHggPSBwYXJ0cy5sZW5ndGg7IHBhcnRJZHgtLTsgKSB7XG4gICAgZm9yICh2YXIgcmd4SWR4ID0gMDsgcmd4SWR4IDwgcmVnZXhlcy5sZW5ndGg7IHJneElkeCsrKSB7XG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgLy8gaWYgdGhlIG1hdGNoIGlzIG9uIHRoZSBmaXJzdCBwYXJ0IHRob3VnaCwgcmVqZWN0IGl0IGFzIHdlXG4gICAgICAvLyBhcmUgcHJvYmFibHkgZGVhbGluZyB3aXRoIGEgdG93biBuYW1lIG9yIHNvbWV0aGluZyAoZS5nLiBTdCBHZW9yZ2UpXG4gICAgICBpZiAocmVnZXhlc1tyZ3hJZHhdLnRlc3QocGFydHNbcGFydElkeF0pICYmIHBhcnRJZHggPiAwKSB7XG4gICAgICAgIHZhciBzdGFydEluZGV4ID0gbG9jYXRlQmVzdFN0cmVldFBhcnQocGFydElkeCk7XG5cbiAgICAgICAgLy8gaWYgd2UgYXJlIGRlYWxpbmcgd2l0aCBhIHNwbGl0IHN0cmVldCAoaS5lLiBmb28gcmQgd2VzdCkgYW5kIHRoZVxuICAgICAgICAvLyBhZGRyZXNzIHBhcnRzIGFyZSBhcHByb3ByaWF0ZWx5IGRlbGltaXRlZCwgdGhlbiBncmFiIHRoZSBuZXh0IHBhcnRcbiAgICAgICAgLy8gYWxzb1xuICAgICAgICBpZiAocmVTcGxpdFN0cmVldC50ZXN0KHBhcnRzW3N0YXJ0SW5kZXggKyAxXSkpIHtcbiAgICAgICAgICBzcGxpdFN0cmVldCA9IHRydWU7XG4gICAgICAgICAgc3RhcnRJbmRleCArPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZXh0cmFjdFN0cmVldFBhcnRzKHN0YXJ0SW5kZXgsIHNwbGl0U3RyZWV0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IC8vIGlmXG4gICAgfSAvLyBmb3JcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZmluYWxpemVcblxuICBUaGUgZmluYWxpemUgZnVuY3Rpb24gdGFrZXMgYW55IHJlbWFpbmluZyBwYXJ0cyB0aGF0IGhhdmUgbm90IGJlZW4gZXh0cmFjdGVkXG4gIGFzIG90aGVyIGluZm9ybWF0aW9uLCBhbmQgcHVzaGVzIHRob3NlIGZpZWxkcyBpbnRvIGEgZ2VuZXJpYyBgcmVnaW9uc2AgZmllbGQuXG4qKi9cbnByb3RvLmZpbmFsaXplID0gZnVuY3Rpb24oKSB7XG4gIC8vIHVwZGF0ZSB0aGUgcmVnaW9ucywgZGlzY2FyZGluZyBhbnkgZW1wdHkgc3RyaW5ncy5cbiAgdGhpcy5yZWdpb25zID0gdGhpcy5wYXJ0cy5qb2luKCcgJykuc3BsaXQoL1xcLFxccz8vKS5maWx0ZXIoZnVuY3Rpb24gKHJlZ2lvbikge1xuICAgICAgcmV0dXJuIHJlZ2lvbi5sZW5ndGg7XG4gIH0pO1xuXG4gIC8vIHJlc2V0IHRoZSBwYXJ0c1xuICB0aGlzLnBhcnRzID0gW107XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI3NwbGl0XG5cbiAgU3BsaXQgdGhlIGFkZHJlc3MgaW50byBpdCdzIGNvbXBvbmVudCBwYXJ0cywgYW5kIHJlbW92ZSBhbnkgZW1wdHkgcGFydHNcbioqL1xucHJvdG8uc3BsaXQgPSBmdW5jdGlvbihzZXBhcmF0b3IpIHtcbiAgLy8gc3BsaXQgdGhlIHN0cmluZ1xuICB2YXIgbmV3UGFydHMgPSB0aGlzLnRleHQuc3BsaXQoc2VwYXJhdG9yIHx8ICcgJyk7XG5cbiAgdGhpcy5wYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbmV3UGFydHMubGVuZ3RoOyBpaSsrKSB7XG4gICAgaWYgKG5ld1BhcnRzW2lpXSkge1xuICAgICAgdGhpcy5wYXJ0c1t0aGlzLnBhcnRzLmxlbmd0aF0gPSBuZXdQYXJ0c1tpaV07XG4gICAgfSAvLyBpZlxuICB9IC8vIGZvclxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyN0b1N0cmluZ1xuXG4gIENvbnZlcnQgdGhlIGFkZHJlc3MgdG8gYSBzdHJpbmcgcmVwcmVzZW50YXRpb25cbioqL1xucHJvdG8udG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG91dHB1dCA9ICcnO1xuXG4gIGlmICh0aGlzLmJ1aWxkaW5nKSB7XG4gICAgb3V0cHV0ICs9IHRoaXMuYnVpbGRpbmcgKyAnXFxuJztcbiAgfSAvLyBpZlxuXG4gIGlmICh0aGlzLnN0cmVldCkge1xuICAgIG91dHB1dCArPSB0aGlzLm51bWJlciA/IHRoaXMubnVtYmVyICsgJyAnIDogJyc7XG4gICAgb3V0cHV0ICs9IHRoaXMuc3RyZWV0ICsgJ1xcbic7XG4gIH1cblxuICBvdXRwdXQgKz0gdGhpcy5yZWdpb25zLmpvaW4oJywgJykgKyAnXFxuJztcblxuICByZXR1cm4gb3V0cHV0O1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIGFkZHJlc3NpdFxuXG4gIEFkZHJlc3NJdCBpcyBhIGZyZWVmb3JtIHN0cmVldCBhZGRyZXNzIHBhcnNlciwgdGhhdCBpcyBkZXNpZ25lZCB0byB0YWtlIGFcbiAgcGllY2Ugb2YgdGV4dCBhbmQgY29udmVydCB0aGF0IGludG8gYSBzdHJ1Y3R1cmVkIGFkZHJlc3MgdGhhdCBjYW4gYmVcbiAgcHJvY2Vzc2VkIGluIGRpZmZlcmVudCBzeXN0ZW1zLlxuXG4gIFRoZSBmb2NhbCBwb2ludCBvZiBgYWRkcmVzc2l0YCBpcyBvbiB0aGUgc3RyZWV0IHBhcnNpbmcgY29tcG9uZW50LCByYXRoZXJcbiAgdGhhbiBhdHRlbXB0aW5nIHRvIGFwcHJvcHJpYXRlbHkgaWRlbnRpZnkgdmFyaW91cyBzdGF0ZXMsIGNvdW50aWVzLCB0b3ducyxcbiAgZXRjLCBhcyB0aGVzZSB2YXJ5IGZyb20gY291bnRyeSB0byBjb3VudHJ5IGZhaXJseSBkcmFtYXRpY2FsbHkuIFRoZXNlXG4gIGRldGFpbHMgYXJlIGluc3RlYWQgcHV0IGludG8gYSBnZW5lcmljIHJlZ2lvbnMgYXJyYXkgdGhhdCBjYW4gYmUgZnVydGhlclxuICBwYXJzZWQgYmFzZWQgb24geW91ciBhcHBsaWNhdGlvbiBuZWVkcy5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgVGhlIGZvbGxvd2luZyBpcyBhIHNpbXBsZSBleGFtcGxlIG9mIGhvdyBhZGRyZXNzIGl0IGNhbiBiZSB1c2VkOlxuXG4gIGBgYGpzXG4gIHZhciBhZGRyZXNzaXQgPSByZXF1aXJlKCdhZGRyZXNzaXQnKTtcblxuICAvLyBwYXJzZSBhIG1hZGUgdXAgYWRkcmVzcywgd2l0aCBzb21lIHNsaWdodGx5IHRyaWNreSBwYXJ0c1xuICB2YXIgYWRkcmVzcyA9IGFkZHJlc3NpdCgnU2hvcCA4LCA0MzEgU3QgS2lsZGEgUmQgTWVsYm91cm5lJyk7XG4gIGBgYFxuXG4gIFRoZSBgYWRkcmVzc2Agb2JqZWN0IHdvdWxkIG5vdyBjb250YWluIHRoZSBmb2xsb3dpbmcgaW5mb3JtYXRpb246XG5cbiAgYGBgXG4gIHsgdGV4dDogJzgvNDMxIFNUIEtJTERBIFJEIE1FTEJPVVJORScsXG4gICAgcGFydHM6IFtdLFxuICAgIHVuaXQ6IDgsXG4gICAgY291bnRyeTogdW5kZWZpbmVkLFxuICAgIG51bWJlcjogNDMxLFxuICAgIHN0cmVldDogJ1NUIEtJTERBIFJEJyxcbiAgICByZWdpb25zOiBbICdNRUxCT1VSTkUnIF0gfVxuICBgYGBcblxuICBGb3IgbW9yZSBleGFtcGxlcywgc2VlIHRoZSB0ZXN0cy5cblxuICAjIyBSZWZlcmVuY2VcblxuKiovXG5cbi8qKlxuICAjIyMgYWRkcmVzc2l0KGlucHV0LCBvcHRzPylcblxuICBSdW4gdGhlIGFkZHJlc3MgcGFyc2VyIGZvciB0aGUgZ2l2ZW4gaW5wdXQuICBPcHRpb25hbCBgb3B0c2AgY2FuIGJlXG4gIHN1cHBsaWVkIGlmIHlvdSB3YW50IHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0IChFTikgcGFyc2VyLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQsIG9wdHMpIHtcbiAgLy8gaWYgbm8gbG9jYWxlIGhhcyBiZWVuIHNwZWNpZmllZCwgdGhlbiB1c2UgdGhlIGRlZmF1bHQgdmFuaWxsYSBlbiBsb2NhbGVcbiAgdmFyIHBhcnNlID0gKG9wdHMgfHwge30pLmxvY2FsZSB8fCByZXF1aXJlKCcuL2xvY2FsZS9lbi1VUycpO1xuXG4gIC8vIHBhcnNlIHRoZSBhZGRyZXNzXG4gIHJldHVybiBwYXJzZShpbnB1dCwgb3B0cyk7XG59O1xuIiwidmFyIHBhcnNlciA9IHJlcXVpcmUoJy4uL3BhcnNlcnMvZW4uanMnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQsIG9wdHMpIHtcbiAgLy8gcGFyc2UgdGhlIGJhc2UgYWRkcmVzc1xuICByZXR1cm4gcGFyc2VyKGlucHV0LCBleHRlbmQoeyBcbiAgXHRzdGF0ZToge1xuXHQgICAgQUw6IC8oXmFsYWJhbWF8XkFMJCkvaSxcblx0ICAgIEFLOiAvKF5hbGFza2F8XkFLJCkvaSxcblx0ICAgIEFTOiAvKF5hbWVyaWNhblxcc3NhbW9hfF5BUyQpL2ksXG5cdCAgICBBWjogLyheYXJpem9uYXxeQVokKS9pLFxuXHQgICAgQVI6IC8oXmFya2Fuc2FzfF5BUiQpL2ksXG5cdCAgICBDQTogLyheY2FsaWZvcm5pYXxeQ0EkKS9pLFxuXHQgICAgQ086IC8oXmNvbG9yYWRvfF5DTyQpL2ksXG5cdCAgICBDVDogLyheY29ubmVjdGljdXR8XkNUJCkvaSxcblx0ICAgIERFOiAvKF5kZWxhd2FyZXxeREUkKS9pLFxuXHQgICAgREM6IC8oXmRpc3RyaWN0XFxzb2ZcXHNjb2x1bWJpYXxeREMkKS9pLFxuXHQgICAgRk06IC8oXmZlZGVyYXRlZFxcc3N0YXRlc1xcc29mXFxzbWljcm9uZXNpYXxeRk0kKS9pLFxuXHQgICAgRkw6IC8oXmZsb3JpZGF8XkZMJCkvaSxcblx0ICAgIEdBOiAvKF5nZW9yZ2lhfF5HQSQpL2ksXG5cdCAgICBHVTogLyheZ3VhbXxeR1UkKS9pLFxuXHQgICAgSEk6IC8oXmhhd2FpaXxeSEkkKS9pLFxuXHQgICAgSUQ6IC8oXmlkYWhvfF5JRCQpL2ksXG5cdCAgICBJTDogLyheaWxsaW5vaXN8XklMJCkvaSxcblx0ICAgIElOOiAvKF5pbmRpYW5hfF5JTiQpL2ksXG5cdCAgICBJQTogLyheaW93YXxeSUEkKS9pLFxuXHQgICAgS1M6IC8oXmthbnNhc3xeS1MkKS9pLFxuXHQgICAgS1k6IC8oXmtlbnR1Y2t5fF5LWSQpL2ksXG5cdCAgICBMQTogLyhebG91aXNpYW5hfF5MQSQpL2ksXG5cdCAgICBNRTogLyhebWFpbmV8Xk1FJCkvaSxcblx0ICAgIE1IOiAvKF5tYXJzaGFsbFxcc2lzbGFuZHN8Xk1IJCkvaSxcblx0ICAgIE1EOiAvKF5tYXJ5bGFuZHxeTUQkKS9pLFxuXHQgICAgTUE6IC8oXm1hc3NhY2h1c2V0dHN8Xk1BJCkvaSxcblx0ICAgIE1JOiAvKF5taWNoaWdhbnxeTUkkKS9pLFxuXHQgICAgTU46IC8oXm1pbm5lc290YXxeTU4kKS9pLFxuXHQgICAgTVM6IC8oXm1pc3Npc3NpcHBpfF5NUyQpL2ksXG5cdCAgICBNTzogLyhebWlzc291cml8Xk1PJCkvaSxcblx0ICAgIE1UOiAvKF5tb250YW5hfF5NVCQpL2ksXG5cdCAgICBORTogLyhebmVicmFza2F8Xk5FJCkvaSxcblx0ICAgIE5WOiAvKF5uZXZhZGF8Xk5WJCkvaSxcblx0ICAgIE5IOiAvKF5uZXdcXHNoYW1wc2hpcmV8Xk5IJCkvaSxcblx0ICAgIE5KOiAvKF5uZXdcXHNqZXJzZXl8Xk5KJCkvaSxcblx0ICAgIE5NOiAvKF5uZXdcXHNtZXhpY298Xk5NJCkvaSxcblx0ICAgIE5ZOiAvKF5uZXdcXHN5b3JrfF5OWSQpL2ksXG5cdCAgICBOQzogLyhebm9ydGhcXHNjYXJvbGluYXxeTkMkKS9pLFxuXHQgICAgTkQ6IC8oXm5vcnRoXFxzZGFrb3RhfF5ORCQpL2ksXG5cdCAgICBNUDogLyhebm9ydGhlcm5cXHNtYXJpYW5hXFxzaXNsYW5kc3xeTVAkKS9pLFxuXHQgICAgT0g6IC8oXm9oaW98Xk9IJCkvaSxcblx0ICAgIE9LOiAvKF5va2xhaG9tYXxeT0skKS9pLFxuXHQgICAgT1I6IC8oXm9yZWdvbnxeT1IkKS9pLFxuXHQgICAgUFc6IC8oXnBhbGF1fF5QVyQpL2ksXG5cdCAgICBQQTogLyhecGVubnN5bHZhbmlhfF5QQSQpL2ksXG5cdCAgICBQUjogLyhecHVlcnRvXFxzcmljb3xeUFIkKS9pLFxuXHQgICAgUkk6IC8oXnJob2RlXFxzaXNsYW5kfF5SSSQpL2ksXG5cdCAgICBTQzogLyhec291dGhcXHNjYXJvbGluYXxeU0MkKS9pLFxuXHQgICAgU0Q6IC8oXnNvdXRoXFxzZGFrb3RhfF5TRCQpL2ksXG5cdCAgICBUTjogLyhedGVubmVzc2VlfF5UTiQpL2ksXG5cdCAgICBUWDogLyhedGV4YXN8XlRYJCkvaSxcblx0ICAgIFVUOiAvKF51dGFofF5VVCQpL2ksXG5cdCAgICBWVDogLyhedmVybW9udHxeVlQkKS9pLFxuXHQgICAgVkk6IC8oXnZpcmdpblxcc2lzbGFuZHN8XlZJJCkvaSxcblx0ICAgIFZBOiAvKF52aXJnaW5pYXxeVkEkKS9pLFxuXHQgICAgV0E6IC8oXndhc2hpbmd0b258XldBJCkvaSxcblx0ICAgIFdWOiAvKF53ZXN0XFxzdmlyZ2luaWF8XldWJCkvaSxcblx0ICAgIFdJOiAvKF53aXNjb25zaW58XldJJCkvaSxcblx0ICAgIFdZOiAvKF53eW9taW5nfF5XWSQpL2lcbiAgXHR9LFxuICBcdGNvdW50cnk6IHtcbiAgICAgICAgVVNBOiAvKF5VTklURURcXHNTVEFURVN8XlVcXC4/U1xcLj9BPyQpL2lcbiAgICB9LFxuICAgIHJlUG9zdGFsQ29kZTogLyheXFxkezV9JCl8KF5cXGR7NX0tXFxkezR9JCkvIH0sIG9wdHMpKTtcbiAgICAgICAgICAgICAgIC8vIFBvc3RhbCBjb2RlcyBvZiB0aGUgZm9ybSAnREREREQtRERERCcgb3IganVzdCAnREREREQnXG4gICAgICAgICAgICAgICAvLyAxMDAxMCBpcyB2YWxpZCBhbmQgc28gaXMgMTAwMTAtMTIzNFxufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGV4dFJlZ2V4ZXMpIHtcbiAgdmFyIHJlZ2V4ZXMgPSBbXTtcbiAgdmFyIHJlU3RyZWV0Q2xlYW5lciA9IC9eXFxePyguKilcXCw/XFwkPyQvO1xuICB2YXIgaWk7XG5cbiAgZm9yIChpaSA9IHRleHRSZWdleGVzLmxlbmd0aDsgaWktLTsgKSB7XG4gICAgcmVnZXhlc1tpaV0gPSBuZXcgUmVnRXhwKFxuICAgICAgdGV4dFJlZ2V4ZXNbaWldLnJlcGxhY2UocmVTdHJlZXRDbGVhbmVyLCAnXiQxXFwsPyQnKSxcbiAgICAgICdpJ1xuICAgICk7XG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIHJlZ2V4ZXM7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBBZGRyZXNzID0gcmVxdWlyZSgnLi4vYWRkcmVzcycpO1xudmFyIGNvbXBpbGVyID0gcmVxdWlyZSgnLi9jb21waWxlcicpO1xuXG4vLyBpbml0aWFsaXNlIHRoZSBzdHJlZXQgcmVnZXhlc1xuLy8gdGhlc2UgYXJlIHRoZSByZWdleGVzIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIG9yIG5vdCBhIHN0cmluZyBpcyBhIHN0cmVldFxuLy8gaXQgaXMgaW1wb3J0YW50IHRvIG5vdGUgdGhhdCB0aGV5IGFyZSBwYXJzZWQgdGhyb3VnaCB0aGUgcmVTdHJlZXRDbGVhbmVyXG4vLyByZWdleCB0byBiZWNvbWUgbW9yZSBzdHJpY3Rcbi8vIHRoaXMgbGlzdCBoYXMgYmVlbiBzb3VyY2VkIGZyb206XG4vLyBodHRwczovL3d3dy5wcm9wZXJ0eWFzc2lzdC5zYS5nb3YuYXUvcGEvcWhlbHAucGh0bWw/Y21kPXN0cmVldHR5cGVcbi8vXG4vLyBfX05PVEU6X18gU29tZSBvZiB0aGUgc3RyZWV0IHR5cGVzIGhhdmUgYmVlbiBkaXNhYmxlZCBkdWUgdG8gY29sbGlzaW9uc1xuLy8gd2l0aCBjb21tb24gcGFydHMgb2Ygc3VidXJiIG5hbWVzLiAgQXQgc29tZSBwb2ludCB0aGUgc3RyZWV0IHBhcnNlciBtYXkgYmVcbi8vIGltcHJvdmVkIHRvIGRlYWwgd2l0aCB0aGVzZSBjYXNlcywgYnV0IGZvciBub3cgdGhpcyBoYXMgYmVlbiBkZWVtZWRcbi8vIHN1aXRhYmxlLlxuXG52YXIgc3RyZWV0UmVnZXhlcyA9IGNvbXBpbGVyKFtcbiAgJ0FMTEU/WScsICAgICAgICAgICAgICAgLy8gQUxMRVkgLyBBTExZXG4gICdBUFAoUk9BQ0gpPycsICAgICAgICAgIC8vIEFQUFJPQUNIIC8gQVBQXG4gICdBUkMoQURFKT8nLCAgICAgICAgICAgIC8vIEFSQ0FERSAvIEFSQ1xuICAnQVYoRXxFTlVFKT8nLCAgICAgICAgICAvLyBBVkVOVUUgLyBBViAvIEFWRVxuICAnKEJPVUxFVkFSRHxCTFZEKScsICAgICAvLyBCT1VMRVZBUkQgLyBCTFZEXG4gICdCUk9XJywgICAgICAgICAgICAgICAgIC8vIEJST1dcbiAgJ0JZUEEoU1MpPycsICAgICAgICAgICAgLy8gQllQQVNTIC8gQllQQVxuICAnQyhBVVNFKT9XQVknLCAgICAgICAgICAvLyBDQVVTRVdBWSAvIENXQVlcbiAgJyhDSVJDVUlUfENDVCknLCAgICAgICAgLy8gQ0lSQ1VJVCAvIENDVFxuICAnQ0lSQyhVUyk/JywgICAgICAgICAgICAvLyBDSVJDVVMgLyBDSVJDXG4gICdDTChPU0UpPycsICAgICAgICAgICAgIC8vIENMT1NFIC8gQ0xcbiAgJ0NPP1BTRScsICAgICAgICAgICAgICAgLy8gQ09QU0UgLyBDUFNFXG4gICcoQ09STkVSfENOUiknLCAgICAgICAgIC8vIENPUk5FUiAvIENOUlxuICAvLyAnQ09WRScsICAgICAgICAgICAgICAgICAvLyBDT1ZFXG4gICcoQygoT1VSKXxSKT9UfENSVCknLCAgIC8vIENPVVJUIC8gQ1QgL0NSVFxuICAnQ1JFUyhDRU5UKT8nLCAgICAgICAgICAvLyBDUkVTQ0VOVCAvIENSRVNcbiAgJ0RSKElWRSk/JywgICAgICAgICAgICAgLy8gRFJJVkUgLyBEUlxuICAvLyAnRU5EJywgICAgICAgICAgICAgICAgICAvLyBFTkRcbiAgJ0VTUChMQU5BTkRFKT8nLCAgICAgICAgLy8gRVNQTEFOQURFIC8gRVNQXG4gIC8vICdGTEFUJywgICAgICAgICAgICAgICAgIC8vIEZMQVRcbiAgJ0YoUkVFKT9XQVknLCAgICAgICAgICAgLy8gRlJFRVdBWSAvIEZXQVlcbiAgJyhGUk9OVEFHRXxGUk5UKScsICAgICAgLy8gRlJPTlRBR0UgLyBGUk5UXG4gIC8vICcoR0FSREVOU3xHRE5TKScsICAgICAgIC8vIEdBUkRFTlMgLyBHRE5TXG4gICcoR0xBREV8R0xEKScsICAgICAgICAgIC8vIEdMQURFIC8gR0xEXG4gIC8vICdHTEVOJywgICAgICAgICAgICAgICAgIC8vIEdMRU5cbiAgJ0dSKEVFKT9OJywgICAgICAgICAgICAgLy8gR1JFRU4gLyBHUk5cbiAgLy8gJ0dSKE9WRSk/JywgICAgICAgICAgICAgLy8gR1JPVkUgLyBHUlxuICAvLyAnSChFSUdIKT9UUycsICAgICAgICAgICAvLyBIRUlHSFRTIC8gSFRTXG4gICcoSElHSFdBWXxIV1kpJywgICAgICAgIC8vIEhJR0hXQVkgLyBIV1lcbiAgJyhMQU5FfExOKScsICAgICAgICAgICAgLy8gTEFORSAvIExOXG4gICdMSU5LJywgICAgICAgICAgICAgICAgIC8vIExJTktcbiAgJ0xPT1AnLCAgICAgICAgICAgICAgICAgLy8gTE9PUFxuICAnTUFMTCcsICAgICAgICAgICAgICAgICAvLyBNQUxMXG4gICdNRVdTJywgICAgICAgICAgICAgICAgIC8vIE1FV1NcbiAgJyhQQUNLRVR8UENLVCknLCAgICAgICAgLy8gUEFDS0VUIC8gUENLVFxuICAnUChBUkEpP0RFJywgICAgICAgICAgICAvLyBQQVJBREUgLyBQREVcbiAgLy8gJ1BBUksnLCAgICAgICAgICAgICAgICAgLy8gUEFSS1xuICAnKFBBUktXQVl8UEtXWSknLCAgICAgICAvLyBQQVJLV0FZIC8gUEtXWVxuICAnUEwoQUNFKT8nLCAgICAgICAgICAgICAvLyBQTEFDRSAvIFBMXG4gICdQUk9NKEVOQURFKT8nLCAgICAgICAgIC8vIFBST01FTkFERSAvIFBST01cbiAgJ1JFUyhFUlZFKT8nLCAgICAgICAgICAgLy8gUkVTRVJWRSAvIFJFU1xuICAvLyAnUkk/REdFJywgICAgICAgICAgICAgICAvLyBSSURHRSAvIFJER0VcbiAgJ1JJU0UnLCAgICAgICAgICAgICAgICAgLy8gUklTRVxuICAnUihPQSk/RCcsICAgICAgICAgICAgICAvLyBST0FEIC8gUkRcbiAgJ1JPVycsICAgICAgICAgICAgICAgICAgLy8gUk9XXG4gICdTUShVQVJFKT8nLCAgICAgICAgICAgIC8vIFNRVUFSRSAvIFNRXG4gICdTVChSRUVUKT8nLCAgICAgICAgICAgIC8vIFNUUkVFVCAvIFNUXG4gICdTVFJJP1AnLCAgICAgICAgICAgICAgIC8vIFNUUklQIC8gU1RSUFxuICAnVEFSTicsICAgICAgICAgICAgICAgICAvLyBUQVJOXG4gICdUKEVSUkEpP0NFJywgICAgICAgICAgIC8vIFRFUlJBQ0UgLyBUQ0VcbiAgJyhUSE9ST1VHSEZBUkV8VEZSRSknLCAgLy8gVEhPUk9VR0hGQVJFIC8gVEZSRVxuICAnVFJBQ0s/JywgICAgICAgICAgICAgICAvLyBUUkFDSyAvIFRSQUNcbiAgJ1RSKEFJKT9MJywgICAgICAgICAgICAgLy8gVFJBSUwgLyBUUkxcbiAgJ1QoUlVOSyk/V0FZJywgICAgICAgICAgLy8gVFJVTktXQVkgLyBUV0FZXG4gIC8vICdWSUVXJywgICAgICAgICAgICAgICAgIC8vIFZJRVdcbiAgJ1ZJP1NUQScsICAgICAgICAgICAgICAgLy8gVklTVEEgLyBWU1RBXG4gICdXQUxLJywgICAgICAgICAgICAgICAgIC8vIFdBTEtcbiAgJ1dBP1knLCAgICAgICAgICAgICAgICAgLy8gV0FZIC8gV1lcbiAgJ1coQUxLKT9XQVknLCAgICAgICAgICAgLy8gV0FMS1dBWSAvIFdXQVlcbiAgJ1lBUkQnICAgICAgICAgICAgICAgICAgLy8gWUFSRFxuXSk7XG5cbnZhciByZVNwbGl0U3RyZWV0ID0gL14oTnxOVEh8Tk9SVEh8RXxFU1R8RUFTVHxTfFNUSHxTT1VUSHxXfFdTVHxXRVNUKVxcLCQvaTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0LCBvcHRzKSB7XG4gIHZhciBhZGRyZXNzID0gbmV3IEFkZHJlc3ModGV4dCwgb3B0cyk7XG5cbiAgLy8gY2xlYW4gdGhlIGFkZHJlc3NcbiAgYWRkcmVzc1xuICAgIC5jbGVhbihbXG4gICAgICAgIC8vIHJlbW92ZSB0cmFpbGluZyBkb3RzIGZyb20gdHdvIGxldHRlciBhYmJyZXZpYXRpb25zXG4gICAgICAgIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQucmVwbGFjZSgvKFxcd3syfSlcXC4vZywgJyQxJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gY29udmVydCBzaG9wIHRvIGEgdW5pdCBmb3JtYXRcbiAgICAgICAgZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dC5yZXBsYWNlKC9eXFxzKlNIT1BcXHM/KFxcZCopXFwsP1xccyovaSwgJyQxLycpO1xuICAgICAgICB9XG4gICAgXSlcblxuICAgIC8vIHNwbGl0IHRoZSBhZGRyZXNzXG4gICAgLnNwbGl0KC9cXHMvKVxuXG4gICAgLy8gZXh0cmFjdCB0aGUgdW5pdFxuICAgIC5leHRyYWN0KCd1bml0JywgW1xuICAgICAgICAoL14oPzpcXCN8QVBUfEFQQVJUTUVOVClcXHM/KFxcZCspLyksXG4gICAgICAgICgvXihcXGQrKVxcLyguKikvKVxuICAgIF0pXG5cbiAgICAvLyBleHRyYWN0IHRoZSBzdHJlZXRcbiAgICAuZXh0cmFjdFN0cmVldChzdHJlZXRSZWdleGVzLCByZVNwbGl0U3RyZWV0KTtcblxuICBpZiAob3B0cyAmJiBvcHRzLnN0YXRlKSB7XG4gICAgYWRkcmVzcy5leHRyYWN0KCdzdGF0ZScsIG9wdHMuc3RhdGUgKTtcbiAgfVxuXG4gIGlmIChvcHRzICYmIG9wdHMuY291bnRyeSkge1xuICAgIGFkZHJlc3MuZXh0cmFjdCgnY291bnRyeScsIG9wdHMuY291bnRyeSApO1xuICB9XG5cbiAgaWYgKG9wdHMgJiYgb3B0cy5yZVBvc3RhbENvZGUpIHtcbiAgICBhZGRyZXNzLmV4dHJhY3QoJ3Bvc3RhbGNvZGUnLCBbIG9wdHMucmVQb3N0YWxDb2RlIF0pO1xuICB9XG5cbiAgIC8vIHRha2UgcmVtYWluaW5nIHVua25vd24gcGFydHMgYW5kIHB1c2ggdGhlbVxuICAgcmV0dXJuIGFkZHJlc3MuZmluYWxpemUoKTtcbn07XG4iXX0=
