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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5ub2RlbnYvdmVyc2lvbnMvdjUuNC4wL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYWRkcmVzcy5qcyIsImluZGV4LmpzIiwibG9jYWxlL2VuLVVTLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9leHRlbmQuanMiLCJwYXJzZXJzL2NvbXBpbGVyLmpzIiwicGFyc2Vycy9lbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciByZU51bWVyaWMgPSAvXlxcZCskLztcblxuLyoqXG4gICMjIyBBZGRyZXNzXG4qKi9cbmZ1bmN0aW9uIEFkZHJlc3ModGV4dCwgb3B0cykge1xuICBpZiAoISAodGhpcyBpbnN0YW5jZW9mIEFkZHJlc3MpKSB7XG4gICAgcmV0dXJuIG5ldyBBZGRyZXNzKHRleHQpO1xuICB9XG5cbiAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgdGhpcy5wYXJ0cyA9IFtdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFkZHJlc3M7XG52YXIgcHJvdG8gPSBBZGRyZXNzLnByb3RvdHlwZTtcblxuXG4vKipcbiAgIyMjIyBBZGRyZXNzI19leHRyYWN0U3RyZWV0UGFydHMoc3RhcnRJbmRleClcblxuICBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gZXh0cmFjdCBmcm9tIHRoZSBzdHJlZXQgdHlwZSBtYXRjaFxuICBpbmRleCAqYmFjayB0byogdGhlIHN0cmVldCBudW1iZXIgYW5kIHBvc3NpYmx5IHVuaXQgbnVtYmVyIGZpZWxkcy5cblxuICBUaGUgZnVuY3Rpb24gd2lsbCBzdGFydCB3aXRoIHRoZSBzdHJlZXQgdHlwZSwgdGhlbiBhbHNvIGdyYWIgdGhlIHByZXZpb3VzXG4gIGZpZWxkIHJlZ2FyZGxlc3Mgb2YgY2hlY2tzLiAgRmllbGRzIHdpbGwgY29udGludWUgdG8gYmUgcHVsbGVkIGluIHVudGlsXG4gIGZpZWxkcyBzdGFydCBzYXRpc2Z5aW5nIG51bWVyaWMgY2hlY2tzLiAgT25jZSBwb3NpdGl2ZSBudW1lcmljIGNoZWNrcyBhcmVcbiAgZmlyaW5nLCB0aG9zZSB3aWxsIGJlIGJyb3VnaHQgaW4gYXMgYnVpbGRpbmcgLyB1bml0IG51bWJlcnMgYW5kIG9uY2UgdGhlXG4gIHN0YXJ0IG9mIHRoZSBwYXJ0cyBhcnJheSBpcyByZWFjaGVkIG9yIHdlIGZhbGwgYmFjayB0byBub24tbnVtZXJpYyBmaWVsZHNcbiAgdGhlbiB0aGUgZXh0cmFjdGlvbiBpcyBzdG9wcGVkLlxuKiovXG5wcm90by5fZXh0cmFjdFN0cmVldFBhcnRzID0gZnVuY3Rpb24oc3RhcnRJbmRleCwgc3BsaXRTdHJlZXQpIHtcbiAgdmFyIGluZGV4ID0gc3RhcnRJbmRleDtcbiAgdmFyIHN0cmVldFBhcnRzID0gW107XG4gIHZhciBudW1iZXJQYXJ0cztcbiAgdmFyIHBhcnRzID0gdGhpcy5wYXJ0cztcbiAgdmFyIHN0cmVldFBhcnRzTGVuZ3RoID0gKHNwbGl0U3RyZWV0KSA/IDMgOiAyO1xuICB2YXIgdGVzdEZuID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgd2hpbGUgKGluZGV4ID49IDAgJiYgdGVzdEZuKCkpIHtcbiAgICB2YXIgYWxwaGFQYXJ0ID0gaXNOYU4ocGFyc2VJbnQocGFydHNbaW5kZXhdLCAxMCkpO1xuXG4gICAgaWYgKHN0cmVldFBhcnRzLmxlbmd0aCA8IHN0cmVldFBhcnRzTGVuZ3RoIHx8IGFscGhhUGFydCkge1xuICAgICAgLy8gYWRkIHRoZSBjdXJyZW50IHBhcnQgdG8gdGhlIHN0cmVldCBwYXJ0c1xuICAgICAgc3RyZWV0UGFydHMudW5zaGlmdChwYXJ0cy5zcGxpY2UoaW5kZXgtLSwgMSkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICghIG51bWJlclBhcnRzKSB7XG4gICAgICAgIG51bWJlclBhcnRzID0gW107XG4gICAgICB9IC8vIGlmXG5cbiAgICAgIC8vIGFkZCB0aGUgY3VycmVudCBwYXJ0IHRvIHRoZSBidWlsZGluZyBwYXJ0c1xuICAgICAgbnVtYmVyUGFydHMudW5zaGlmdChwYXJ0cy5zcGxpY2UoaW5kZXgtLSwgMSkpO1xuXG4gICAgICAvLyB1cGRhdGUgdGhlIHRlc3QgZnVuY3Rpb25cbiAgICAgIHRlc3RGbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaXNBbHBoYSA9IGlzTmFOKHBhcnNlSW50KHBhcnRzW2luZGV4XSwgMTApKTtcblxuICAgICAgICAvLyBpZiB3ZSBoYXZlIGJ1aWxkaW5nIHBhcnRzLCB0aGVuIHdlIGFyZSBsb29raW5nXG4gICAgICAgIC8vIGZvciBub24tYWxwaGEgdmFsdWVzLCBvdGhlcndpc2UgYWxwaGFcbiAgICAgICAgcmV0dXJuIG51bWJlclBhcnRzID8gKCEgaXNBbHBoYSkgOiBpc0FscGhhO1xuICAgICAgfTtcbiAgICB9IC8vIGlmLi5lbHNlXG4gIH0gLy8gd2hpbGVcblxuICB0aGlzLm51bWJlciA9IG51bWJlclBhcnRzID8gbnVtYmVyUGFydHMuam9pbignLycpIDogJyc7XG4gIHRoaXMuc3RyZWV0ID0gc3RyZWV0UGFydHMuam9pbignICcpLnJlcGxhY2UoL1xcLC9nLCAnJyk7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI2NsZWFuXG5cbiAgVGhlIGNsZWFuIGZ1bmN0aW9uIGlzIHVzZWQgdG8gY2xlYW4gdXAgYW4gYWRkcmVzcyBzdHJpbmcuICBJdCBpcyBkZXNpZ25lZFxuICB0byByZW1vdmUgYW55IHBhcnRzIG9mIHRoZSB0ZXh0IHRoYXQgcHJldmVuIGVmZmVjdGl2ZSBwYXJzaW5nIG9mIHRoZVxuICBhZGRyZXNzIHN0cmluZy5cbioqL1xucHJvdG8uY2xlYW4gPSBmdW5jdGlvbihjbGVhbmVycykge1xuICAvLyBlbnN1cmUgd2UgaGF2ZSBjbGVhbmVyc1xuICBjbGVhbmVycyA9IGNsZWFuZXJzIHx8IFtdO1xuXG4gIC8vIGFwcGx5IHRoZSBjbGVhbmVyc1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgY2xlYW5lcnMubGVuZ3RoOyBpaSsrKSB7XG4gICAgaWYgKHR5cGVvZiBjbGVhbmVyc1tpaV0gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy50ZXh0ID0gY2xlYW5lcnNbaWldLmNhbGwobnVsbCwgdGhpcy50ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoY2xlYW5lcnNbaWldIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICB0aGlzLnRleHQgPSB0aGlzLnRleHQucmVwbGFjZShjbGVhbmVyc1tpaV0sICcnKTtcbiAgICB9XG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI2V4dHJhY3QoZmllbGROYW1lLCByZWdleGVzKVxuXG4gIFRoZSBleHRyYWN0IGZ1bmN0aW9uIGlzIHVzZWQgdG8gZXh0cmFjdCB0aGUgc3BlY2lmaWVkIGZpZWxkIGZyb20gdGhlIHJhd1xuICBwYXJ0cyB0aGF0IGhhdmUgcHJldmlvdXNseSBiZWVuIHNwbGl0IGZyb20gdGhlIGlucHV0IHRleHQuICBJZiBzdWNjZXNzZnVsbHlcbiAgbG9jYXRlZCB0aGVuIHRoZSBmaWVsZCB3aWxsIGJlIHVwZGF0ZWQgZnJvbSB0aGUgcGFydHMgYW5kIHRoYXQgcGFydCByZW1vdmVkXG4gIGZyb20gdGhlIHBhcnRzIGxpc3QuXG4qKi9cbnByb3RvLmV4dHJhY3QgPSBmdW5jdGlvbihmaWVsZE5hbWUsIHJlZ2V4ZXMpIHtcbiAgdmFyIG1hdGNoO1xuICB2YXIgcmd4SWR4O1xuICB2YXIgaWk7XG4gIHZhciB2YWx1ZTtcbiAgdmFyIGxvb2t1cHMgPSBbXTtcblxuICAvLyBpZiB0aGUgcmVnZXhlcyBoYXZlIGJlZW4gcGFzc2VkIGluIGFzIG9iamVjdHMsIHRoZW4gY29udmVydCB0byBhbiBhcnJheVxuICBpZiAodHlwZW9mIHJlZ2V4ZXMgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHJlZ2V4ZXMuc3BsaWNlID09ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIG5ld1JlZ2V4ZXMgPSBbXTtcblxuICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUga2V5cyBpbiB0aGUgcmVnZXhlc1xuICAgIGZvciAodmFyIGtleSBpbiByZWdleGVzKSB7XG4gICAgICBuZXdSZWdleGVzW25ld1JlZ2V4ZXMubGVuZ3RoXSA9IHJlZ2V4ZXNba2V5XTtcbiAgICAgIGxvb2t1cHNbbmV3UmVnZXhlcy5sZW5ndGggLSAxXSA9IGtleTtcbiAgICB9XG5cbiAgICAvLyB1cGRhdGUgdGhlIHJlZ2V4ZXMgdG8gcG9pbnQgdG8gdGhlIG5ldyByZWdleGVzXG4gICAgcmVnZXhlcyA9IG5ld1JlZ2V4ZXM7XG4gIH1cblxuICAvLyBpdGVyYXRlIG92ZXIgdGhlIHVuaXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgZm9yIChyZ3hJZHggPSAwOyByZ3hJZHggPCByZWdleGVzLmxlbmd0aDsgcmd4SWR4KyspIHtcbiAgICBmb3IgKGlpID0gdGhpcy5wYXJ0cy5sZW5ndGg7IGlpID49IDA7IGlpLS0gKSB7XG4gICAgICBtYXRjaCA9IHJlZ2V4ZXNbcmd4SWR4XS5leGVjKHRoaXMucGFydHNbaWldKTtcblxuICAgICAgLy8gaWYgd2UgaGF2ZSBhIG1hdGNoLCB0aGVuIHByb2Nlc3NcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgMm5kIGNhcHR1cmUgZ3JvdXAsIHRoZW4gcmVwbGFjZSB0aGUgaXRlbSB3aXRoXG4gICAgICAgIC8vIHRoZSB0ZXh0IG9mIHRoYXQgZ3JvdXBcbiAgICAgICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICAgICAgdGhpcy5wYXJ0cy5zcGxpY2UoaWksIDEsIG1hdGNoWzJdKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBvdGhlcndpc2UsIGp1c3QgcmVtb3ZlIHRoZSBlbGVtZW50XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMucGFydHMuc3BsaWNlKGlpLCAxKTtcbiAgICAgICAgfSAvLyBpZi4uZWxzZVxuXG4gICAgICAgIHZhbHVlID0gbG9va3Vwc1tyZ3hJZHhdIHx8IG1hdGNoWzFdO1xuICAgICAgfSBlbHNlIGlmIChmaWVsZE5hbWUgPT09ICdzdGF0ZScgJiYgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgbWF0Y2hNdWx0aXBsZVBhcnQgPSBmYWxzZTtcbiAgICAgICAgdmFyIHNwYWNlc0luTWF0Y2ggPSByZWdleGVzW3JneElkeF0uc291cmNlLnNwbGl0KCdcXFxccycpLmxlbmd0aDtcbiAgICAgICAgaWYgKHNwYWNlc0luTWF0Y2ggPiAxKSB7XG4gICAgICAgICAgdmFyIG11bHRpcGxlUGFydCA9IFtdO1xuICAgICAgICAgIGZvciAodmFyIHBhcnRKb2luID0gaWk7IHBhcnRKb2luID4gaWkgLSBzcGFjZXNJbk1hdGNoICYmIHBhcnRKb2luID49IDA7IHBhcnRKb2luLS0pIHtcbiAgICAgICAgICAgIG11bHRpcGxlUGFydC5wdXNoKHRoaXMucGFydHNbcGFydEpvaW5dKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbXVsdGlwbGVQYXJ0LnJldmVyc2UoKTtcbiAgICAgICAgICBtdWx0aXBsZVBhcnQgPSBtdWx0aXBsZVBhcnQuam9pbignICcpO1xuICAgICAgICAgIG1hdGNoTXVsdGlwbGVQYXJ0ID0gcmVnZXhlc1tyZ3hJZHhdLmV4ZWMobXVsdGlwbGVQYXJ0KTtcblxuICAgICAgICAgIGlmIChtYXRjaE11bHRpcGxlUGFydCkge1xuICAgICAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIDJuZCBjYXB0dXJlIGdyb3VwLCB0aGVuIHJlcGxhY2UgdGhlIGl0ZW0gd2l0aFxuICAgICAgICAgICAgLy8gdGhlIHRleHQgb2YgdGhhdCBncm91cFxuICAgICAgICAgICAgaWYgKG1hdGNoTXVsdGlwbGVQYXJ0WzJdKSB7XG4gICAgICAgICAgICAgIHRoaXMucGFydHMuc3BsaWNlKGlpIC0gc3BhY2VzSW5NYXRjaCArIDEsIHNwYWNlc0luTWF0Y2gsIG1hdGNoTXVsdGlwbGVQYXJ0WzJdKTtcbiAgICAgICAgICAgICAgaWkgLT0gc3BhY2VzSW5NYXRjaCArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGp1c3QgcmVtb3ZlIHRoZSBlbGVtZW50XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5wYXJ0cy5zcGxpY2UoaWkgLSBzcGFjZXNJbk1hdGNoICsgMSwgc3BhY2VzSW5NYXRjaCk7XG4gICAgICAgICAgICAgIGlpIC09IHNwYWNlc0luTWF0Y2ggKyAxO1xuICAgICAgICAgICAgfSAvLyBpZi4uZWxzZVxuXG4gICAgICAgICAgICB2YWx1ZSA9IGxvb2t1cHNbcmd4SWR4XSB8fCBtYXRjaE11bHRpcGxlUGFydFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gLy8gaWZcbiAgICB9IC8vIGZvclxuICB9IC8vIGZvclxuXG4gIC8vIHVwZGF0ZSB0aGUgZmllbGQgdmFsdWVcbiAgdGhpc1tmaWVsZE5hbWVdID0gdmFsdWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI2V4dHJhY3RTdHJlZXRcblxuICBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gcGFyc2UgdGhlIGFkZHJlc3MgcGFydHMgYW5kIGxvY2F0ZSBhbnkgcGFydHNcbiAgdGhhdCBsb29rIHRvIGJlIHJlbGF0ZWQgdG8gYSBzdHJlZXQgYWRkcmVzcy5cbioqL1xucHJvdG8uZXh0cmFjdFN0cmVldCA9IGZ1bmN0aW9uKHJlZ2V4ZXMsIHJlU3BsaXRTdHJlZXQpIHtcbiAgdmFyIHJlTnVtZXJpY2VzcXVlID0gL14oXFxkKnxcXGQqXFx3KSQvO1xuICB2YXIgcGFydHMgPSB0aGlzLnBhcnRzO1xuICB2YXIgc3BsaXRTdHJlZXQgPSBmYWxzZTtcblxuICAvLyBlbnN1cmUgd2UgaGF2ZSByZWdleGVzXG4gIHJlZ2V4ZXMgPSByZWdleGVzIHx8IFtdO1xuXG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBsb2NhdGUgdGhlIFwiYmVzdFwiIHN0cmVldCBwYXJ0IGluIGFuIGFkZHJlc3NcbiAgLy8gc3RyaW5nLiAgSXQgaXMgY2FsbGVkIG9uY2UgYSBzdHJlZXQgcmVnZXggaGFzIG1hdGNoZWQgYWdhaW5zdCBhIHBhcnRcbiAgLy8gc3RhcnRpbmcgZnJvbSB0aGUgbGFzdCBwYXJ0IGFuZCB3b3JraW5nIHRvd2FyZHMgdGhlIGZyb250LiBJbiB0ZXJtcyBvZlxuICAvLyB3aGF0IGlzIGNvbnNpZGVyZWQgdGhlIGJlc3QsIHdlIGFyZSBsb29raW5nIGZvciB0aGUgcGFydCBjbG9zZXN0IHRvIHRoZVxuICAvLyBzdGFydCBvZiB0aGUgc3RyaW5nIHRoYXQgaXMgbm90IGltbWVkaWF0ZWx5IHByZWZpeGVkIGJ5IGEgbnVtZXJpY2VzcXVlXG4gIC8vIHBhcnQgKGVnLiAxMjMsIDQyQSwgZXRjKS5cbiAgZnVuY3Rpb24gbG9jYXRlQmVzdFN0cmVldFBhcnQoc3RhcnRJbmRleCkge1xuICAgIHZhciBiZXN0SW5kZXggPSBzdGFydEluZGV4O1xuXG4gICAgLy8gaWYgdGhlIHN0YXJ0IGluZGV4IGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byAwLCB0aGVuIHJldHVyblxuICAgIGZvciAodmFyIGlpID0gc3RhcnRJbmRleC0xOyBpaSA+PSAwOyBpaS0tKSB7XG4gICAgICAvLyBpdGVyYXRlIG92ZXIgdGhlIHN0cmVldCByZWdleGVzIGFuZCB0ZXN0IHRoZW0gYWdhaW5zdCB0aGUgdmFyaW91cyBwYXJ0c1xuICAgICAgZm9yICh2YXIgcmd4SWR4ID0gMDsgcmd4SWR4IDwgcmVnZXhlcy5sZW5ndGg7IHJneElkeCsrKSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBtYXRjaCwgdGhlbiBwcm9jZXNzXG4gICAgICAgIGlmIChyZWdleGVzW3JneElkeF0udGVzdChwYXJ0c1tpaV0pICYmIHBhcnRzW2lpLTFdICYmICghIHJlTnVtZXJpY2VzcXVlLnRlc3QocGFydHNbaWktMV0pKSkge1xuICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgYmVzdCBpbmRleCBhbmQgYnJlYWsgZnJvbSB0aGUgaW5uZXIgbG9vcFxuICAgICAgICAgIGJlc3RJbmRleCA9IGlpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IC8vIGlmXG4gICAgICB9IC8vIGZvclxuICAgIH0gLy8gZm9yXG5cbiAgICByZXR1cm4gYmVzdEluZGV4O1xuICB9IC8vIGxvY2F0ZUJlc3RTdHJlZXRQYXJ0XG5cbiAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdHJlZXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgZm9yICh2YXIgcGFydElkeCA9IHBhcnRzLmxlbmd0aDsgcGFydElkeC0tOyApIHtcbiAgICBmb3IgKHZhciByZ3hJZHggPSAwOyByZ3hJZHggPCByZWdleGVzLmxlbmd0aDsgcmd4SWR4KyspIHtcbiAgICAgIC8vIGlmIHdlIGhhdmUgYSBtYXRjaCwgdGhlbiBwcm9jZXNzXG4gICAgICAvLyBpZiB0aGUgbWF0Y2ggaXMgb24gdGhlIGZpcnN0IHBhcnQgdGhvdWdoLCByZWplY3QgaXQgYXMgd2VcbiAgICAgIC8vIGFyZSBwcm9iYWJseSBkZWFsaW5nIHdpdGggYSB0b3duIG5hbWUgb3Igc29tZXRoaW5nIChlLmcuIFN0IEdlb3JnZSlcbiAgICAgIGlmIChyZWdleGVzW3JneElkeF0udGVzdChwYXJ0c1twYXJ0SWR4XSkgJiYgcGFydElkeCA+IDApIHtcbiAgICAgICAgdmFyIHN0YXJ0SW5kZXggPSBsb2NhdGVCZXN0U3RyZWV0UGFydChwYXJ0SWR4KTtcblxuICAgICAgICAvLyBpZiB3ZSBhcmUgZGVhbGluZyB3aXRoIGEgc3BsaXQgc3RyZWV0IChpLmUuIGZvbyByZCB3ZXN0KSBhbmQgdGhlXG4gICAgICAgIC8vIGFkZHJlc3MgcGFydHMgYXJlIGFwcHJvcHJpYXRlbHkgZGVsaW1pdGVkLCB0aGVuIGdyYWIgdGhlIG5leHQgcGFydFxuICAgICAgICAvLyBhbHNvXG4gICAgICAgIGlmIChyZVNwbGl0U3RyZWV0LnRlc3QocGFydHNbc3RhcnRJbmRleCArIDFdKSkge1xuICAgICAgICAgIHNwbGl0U3RyZWV0ID0gdHJ1ZTtcbiAgICAgICAgICBzdGFydEluZGV4ICs9IDE7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9leHRyYWN0U3RyZWV0UGFydHMoc3RhcnRJbmRleCwgc3BsaXRTdHJlZXQpO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gLy8gaWZcbiAgICB9IC8vIGZvclxuICB9IC8vIGZvclxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNmaW5hbGl6ZVxuXG4gIFRoZSBmaW5hbGl6ZSBmdW5jdGlvbiB0YWtlcyBhbnkgcmVtYWluaW5nIHBhcnRzIHRoYXQgaGF2ZSBub3QgYmVlbiBleHRyYWN0ZWRcbiAgYXMgb3RoZXIgaW5mb3JtYXRpb24sIGFuZCBwdXNoZXMgdGhvc2UgZmllbGRzIGludG8gYSBnZW5lcmljIGByZWdpb25zYCBmaWVsZC5cbioqL1xucHJvdG8uZmluYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgLy8gdXBkYXRlIHRoZSByZWdpb25zLCBkaXNjYXJkaW5nIGFueSBlbXB0eSBzdHJpbmdzLlxuICB0aGlzLnJlZ2lvbnMgPSB0aGlzLnBhcnRzLmpvaW4oJyAnKS5zcGxpdCgvXFwsXFxzPy8pLmZpbHRlcihmdW5jdGlvbiAocmVnaW9uKSB7XG4gICAgICByZXR1cm4gcmVnaW9uLmxlbmd0aDtcbiAgfSk7XG5cbiAgLy8gcmVzZXQgdGhlIHBhcnRzXG4gIHRoaXMucGFydHMgPSBbXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3Mjc3BsaXRcblxuICBTcGxpdCB0aGUgYWRkcmVzcyBpbnRvIGl0J3MgY29tcG9uZW50IHBhcnRzLCBhbmQgcmVtb3ZlIGFueSBlbXB0eSBwYXJ0c1xuKiovXG5wcm90by5zcGxpdCA9IGZ1bmN0aW9uKHNlcGFyYXRvcikge1xuICAvLyBzcGxpdCB0aGUgc3RyaW5nXG4gIHZhciBuZXdQYXJ0cyA9IHRoaXMudGV4dC5zcGxpdChzZXBhcmF0b3IgfHwgJyAnKTtcblxuICB0aGlzLnBhcnRzID0gW107XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBuZXdQYXJ0cy5sZW5ndGg7IGlpKyspIHtcbiAgICBpZiAobmV3UGFydHNbaWldKSB7XG4gICAgICB0aGlzLnBhcnRzW3RoaXMucGFydHMubGVuZ3RoXSA9IG5ld1BhcnRzW2lpXTtcbiAgICB9IC8vIGlmXG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI3RvU3RyaW5nXG5cbiAgQ29udmVydCB0aGUgYWRkcmVzcyB0byBhIHN0cmluZyByZXByZXNlbnRhdGlvblxuKiovXG5wcm90by50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgb3V0cHV0ID0gJyc7XG5cbiAgaWYgKHRoaXMuYnVpbGRpbmcpIHtcbiAgICBvdXRwdXQgKz0gdGhpcy5idWlsZGluZyArICdcXG4nO1xuICB9IC8vIGlmXG5cbiAgaWYgKHRoaXMuc3RyZWV0KSB7XG4gICAgb3V0cHV0ICs9IHRoaXMubnVtYmVyID8gdGhpcy5udW1iZXIgKyAnICcgOiAnJztcbiAgICBvdXRwdXQgKz0gdGhpcy5zdHJlZXQgKyAnXFxuJztcbiAgfVxuXG4gIG91dHB1dCArPSB0aGlzLnJlZ2lvbnMuam9pbignLCAnKSArICdcXG4nO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMgYWRkcmVzc2l0XG5cbiAgQWRkcmVzc0l0IGlzIGEgZnJlZWZvcm0gc3RyZWV0IGFkZHJlc3MgcGFyc2VyLCB0aGF0IGlzIGRlc2lnbmVkIHRvIHRha2UgYVxuICBwaWVjZSBvZiB0ZXh0IGFuZCBjb252ZXJ0IHRoYXQgaW50byBhIHN0cnVjdHVyZWQgYWRkcmVzcyB0aGF0IGNhbiBiZVxuICBwcm9jZXNzZWQgaW4gZGlmZmVyZW50IHN5c3RlbXMuXG5cbiAgVGhlIGZvY2FsIHBvaW50IG9mIGBhZGRyZXNzaXRgIGlzIG9uIHRoZSBzdHJlZXQgcGFyc2luZyBjb21wb25lbnQsIHJhdGhlclxuICB0aGFuIGF0dGVtcHRpbmcgdG8gYXBwcm9wcmlhdGVseSBpZGVudGlmeSB2YXJpb3VzIHN0YXRlcywgY291bnRpZXMsIHRvd25zLFxuICBldGMsIGFzIHRoZXNlIHZhcnkgZnJvbSBjb3VudHJ5IHRvIGNvdW50cnkgZmFpcmx5IGRyYW1hdGljYWxseS4gVGhlc2VcbiAgZGV0YWlscyBhcmUgaW5zdGVhZCBwdXQgaW50byBhIGdlbmVyaWMgcmVnaW9ucyBhcnJheSB0aGF0IGNhbiBiZSBmdXJ0aGVyXG4gIHBhcnNlZCBiYXNlZCBvbiB5b3VyIGFwcGxpY2F0aW9uIG5lZWRzLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBUaGUgZm9sbG93aW5nIGlzIGEgc2ltcGxlIGV4YW1wbGUgb2YgaG93IGFkZHJlc3MgaXQgY2FuIGJlIHVzZWQ6XG5cbiAgYGBganNcbiAgdmFyIGFkZHJlc3NpdCA9IHJlcXVpcmUoJ2FkZHJlc3NpdCcpO1xuXG4gIC8vIHBhcnNlIGEgbWFkZSB1cCBhZGRyZXNzLCB3aXRoIHNvbWUgc2xpZ2h0bHkgdHJpY2t5IHBhcnRzXG4gIHZhciBhZGRyZXNzID0gYWRkcmVzc2l0KCdTaG9wIDgsIDQzMSBTdCBLaWxkYSBSZCBNZWxib3VybmUnKTtcbiAgYGBgXG5cbiAgVGhlIGBhZGRyZXNzYCBvYmplY3Qgd291bGQgbm93IGNvbnRhaW4gdGhlIGZvbGxvd2luZyBpbmZvcm1hdGlvbjpcblxuICBgYGBcbiAgeyB0ZXh0OiAnOC80MzEgU1QgS0lMREEgUkQgTUVMQk9VUk5FJyxcbiAgICBwYXJ0czogW10sXG4gICAgdW5pdDogOCxcbiAgICBjb3VudHJ5OiB1bmRlZmluZWQsXG4gICAgbnVtYmVyOiA0MzEsXG4gICAgc3RyZWV0OiAnU1QgS0lMREEgUkQnLFxuICAgIHJlZ2lvbnM6IFsgJ01FTEJPVVJORScgXSB9XG4gIGBgYFxuXG4gIEZvciBtb3JlIGV4YW1wbGVzLCBzZWUgdGhlIHRlc3RzLlxuXG4gICMjIFJlZmVyZW5jZVxuXG4qKi9cblxuLyoqXG4gICMjIyBhZGRyZXNzaXQoaW5wdXQsIG9wdHM/KVxuXG4gIFJ1biB0aGUgYWRkcmVzcyBwYXJzZXIgZm9yIHRoZSBnaXZlbiBpbnB1dC4gIE9wdGlvbmFsIGBvcHRzYCBjYW4gYmVcbiAgc3VwcGxpZWQgaWYgeW91IHdhbnQgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgKEVOKSBwYXJzZXIuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICAvLyBpZiBubyBsb2NhbGUgaGFzIGJlZW4gc3BlY2lmaWVkLCB0aGVuIHVzZSB0aGUgZGVmYXVsdCB2YW5pbGxhIGVuIGxvY2FsZVxuICB2YXIgcGFyc2UgPSAob3B0cyB8fCB7fSkubG9jYWxlIHx8IHJlcXVpcmUoJy4vbG9jYWxlL2VuLVVTJyk7XG5cbiAgLy8gcGFyc2UgdGhlIGFkZHJlc3NcbiAgcmV0dXJuIHBhcnNlKGlucHV0LCBvcHRzKTtcbn07XG4iLCJ2YXIgcGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy9lbi5qcycpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICAvLyBwYXJzZSB0aGUgYmFzZSBhZGRyZXNzXG4gIHJldHVybiBwYXJzZXIoaW5wdXQsIGV4dGVuZCh7IFxuICBcdHN0YXRlOiB7XG5cdCAgICBBTDogLyheYWxhYmFtYXxeQUwkKS9pLFxuXHQgICAgQUs6IC8oXmFsYXNrYXxeQUskKS9pLFxuXHQgICAgQVM6IC8oXmFtZXJpY2FuXFxzc2Ftb2F8XkFTJCkvaSxcblx0ICAgIEFaOiAvKF5hcml6b25hfF5BWiQpL2ksXG5cdCAgICBBUjogLyheYXJrYW5zYXN8XkFSJCkvaSxcblx0ICAgIENBOiAvKF5jYWxpZm9ybmlhfF5DQSQpL2ksXG5cdCAgICBDTzogLyheY29sb3JhZG98XkNPJCkvaSxcblx0ICAgIENUOiAvKF5jb25uZWN0aWN1dHxeQ1QkKS9pLFxuXHQgICAgREU6IC8oXmRlbGF3YXJlfF5ERSQpL2ksXG5cdCAgICBEQzogLyheZGlzdHJpY3RcXHNvZlxcc2NvbHVtYmlhfF5EQyQpL2ksXG5cdCAgICBGTTogLyheZmVkZXJhdGVkXFxzc3RhdGVzXFxzb2ZcXHNtaWNyb25lc2lhfF5GTSQpL2ksXG5cdCAgICBGTDogLyheZmxvcmlkYXxeRkwkKS9pLFxuXHQgICAgR0E6IC8oXmdlb3JnaWF8XkdBJCkvaSxcblx0ICAgIEdVOiAvKF5ndWFtfF5HVSQpL2ksXG5cdCAgICBISTogLyheaGF3YWlpfF5ISSQpL2ksXG5cdCAgICBJRDogLyheaWRhaG98XklEJCkvaSxcblx0ICAgIElMOiAvKF5pbGxpbm9pc3xeSUwkKS9pLFxuXHQgICAgSU46IC8oXmluZGlhbmF8XklOJCkvaSxcblx0ICAgIElBOiAvKF5pb3dhfF5JQSQpL2ksXG5cdCAgICBLUzogLyhea2Fuc2FzfF5LUyQpL2ksXG5cdCAgICBLWTogLyhea2VudHVja3l8XktZJCkvaSxcblx0ICAgIExBOiAvKF5sb3Vpc2lhbmF8XkxBJCkvaSxcblx0ICAgIE1FOiAvKF5tYWluZXxeTUUkKS9pLFxuXHQgICAgTUg6IC8oXm1hcnNoYWxsXFxzaXNsYW5kc3xeTUgkKS9pLFxuXHQgICAgTUQ6IC8oXm1hcnlsYW5kfF5NRCQpL2ksXG5cdCAgICBNQTogLyhebWFzc2FjaHVzZXR0c3xeTUEkKS9pLFxuXHQgICAgTUk6IC8oXm1pY2hpZ2FufF5NSSQpL2ksXG5cdCAgICBNTjogLyhebWlubmVzb3RhfF5NTiQpL2ksXG5cdCAgICBNUzogLyhebWlzc2lzc2lwcGl8Xk1TJCkvaSxcblx0ICAgIE1POiAvKF5taXNzb3VyaXxeTU8kKS9pLFxuXHQgICAgTVQ6IC8oXm1vbnRhbmF8Xk1UJCkvaSxcblx0ICAgIE5FOiAvKF5uZWJyYXNrYXxeTkUkKS9pLFxuXHQgICAgTlY6IC8oXm5ldmFkYXxeTlYkKS9pLFxuXHQgICAgTkg6IC8oXm5ld1xcc2hhbXBzaGlyZXxeTkgkKS9pLFxuXHQgICAgTko6IC8oXm5ld1xcc2plcnNleXxeTkokKS9pLFxuXHQgICAgTk06IC8oXm5ld1xcc21leGljb3xeTk0kKS9pLFxuXHQgICAgTlk6IC8oXm5ld1xcc3lvcmt8Xk5ZJCkvaSxcblx0ICAgIE5DOiAvKF5ub3J0aFxcc2Nhcm9saW5hfF5OQyQpL2ksXG5cdCAgICBORDogLyhebm9ydGhcXHNkYWtvdGF8Xk5EJCkvaSxcblx0ICAgIE1QOiAvKF5ub3J0aGVyblxcc21hcmlhbmFcXHNpc2xhbmRzfF5NUCQpL2ksXG5cdCAgICBPSDogLyheb2hpb3xeT0gkKS9pLFxuXHQgICAgT0s6IC8oXm9rbGFob21hfF5PSyQpL2ksXG5cdCAgICBPUjogLyheb3JlZ29ufF5PUiQpL2ksXG5cdCAgICBQVzogLyhecGFsYXV8XlBXJCkvaSxcblx0ICAgIFBBOiAvKF5wZW5uc3lsdmFuaWF8XlBBJCkvaSxcblx0ICAgIFBSOiAvKF5wdWVydG9cXHNyaWNvfF5QUiQpL2ksXG5cdCAgICBSSTogLyhecmhvZGVcXHNpc2xhbmR8XlJJJCkvaSxcblx0ICAgIFNDOiAvKF5zb3V0aFxcc2Nhcm9saW5hfF5TQyQpL2ksXG5cdCAgICBTRDogLyhec291dGhcXHNkYWtvdGF8XlNEJCkvaSxcblx0ICAgIFROOiAvKF50ZW5uZXNzZWV8XlROJCkvaSxcblx0ICAgIFRYOiAvKF50ZXhhc3xeVFgkKS9pLFxuXHQgICAgVVQ6IC8oXnV0YWh8XlVUJCkvaSxcblx0ICAgIFZUOiAvKF52ZXJtb250fF5WVCQpL2ksXG5cdCAgICBWSTogLyhedmlyZ2luXFxzaXNsYW5kc3xeVkkkKS9pLFxuXHQgICAgVkE6IC8oXnZpcmdpbmlhfF5WQSQpL2ksXG5cdCAgICBXQTogLyhed2FzaGluZ3RvbnxeV0EkKS9pLFxuXHQgICAgV1Y6IC8oXndlc3RcXHN2aXJnaW5pYXxeV1YkKS9pLFxuXHQgICAgV0k6IC8oXndpc2NvbnNpbnxeV0kkKS9pLFxuXHQgICAgV1k6IC8oXnd5b21pbmd8XldZJCkvaVxuICBcdH0sXG4gIFx0Y291bnRyeToge1xuICAgICAgICBVU0E6IC8oXlVOSVRFRFxcc1NUQVRFU3xeVVxcLj9TXFwuP0E/JCkvaVxuICAgIH0sXG4gICAgcmVQb3N0YWxDb2RlOiAvKF5cXGR7NX0kKXwoXlxcZHs1fS1cXGR7NH0kKS8gfSwgb3B0cykpO1xuICAgICAgICAgICAgICAgLy8gUG9zdGFsIGNvZGVzIG9mIHRoZSBmb3JtICdERERERC1EREREJyBvciBqdXN0ICdERERERCdcbiAgICAgICAgICAgICAgIC8vIDEwMDEwIGlzIHZhbGlkIGFuZCBzbyBpcyAxMDAxMC0xMjM0XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4jIyBjb2cvZXh0ZW5kXG5cbmBgYGpzXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuYGBgXG5cbiMjIyBleHRlbmQodGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQ6XG5cbmBgYGpzXG5leHRlbmQoeyBhOiAxLCBiOiAyIH0sIHsgYzogMyB9LCB7IGQ6IDQgfSwgeyBiOiA1IH0pKTtcbmBgYFxuXG5TZWUgYW4gZXhhbXBsZSBvbiBbcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwNzk0NzUpLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0UmVnZXhlcykge1xuICB2YXIgcmVnZXhlcyA9IFtdO1xuICB2YXIgcmVTdHJlZXRDbGVhbmVyID0gL15cXF4/KC4qKVxcLD9cXCQ/JC87XG4gIHZhciBpaTtcblxuICBmb3IgKGlpID0gdGV4dFJlZ2V4ZXMubGVuZ3RoOyBpaS0tOyApIHtcbiAgICByZWdleGVzW2lpXSA9IG5ldyBSZWdFeHAoXG4gICAgICB0ZXh0UmVnZXhlc1tpaV0ucmVwbGFjZShyZVN0cmVldENsZWFuZXIsICdeJDFcXCw/JCcpLFxuICAgICAgJ2knXG4gICAgKTtcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gcmVnZXhlcztcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEFkZHJlc3MgPSByZXF1aXJlKCcuLi9hZGRyZXNzJyk7XG52YXIgY29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbXBpbGVyJyk7XG5cbi8vIGluaXRpYWxpc2UgdGhlIHN0cmVldCByZWdleGVzXG4vLyB0aGVzZSBhcmUgdGhlIHJlZ2V4ZXMgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgb3Igbm90IGEgc3RyaW5nIGlzIGEgc3RyZWV0XG4vLyBpdCBpcyBpbXBvcnRhbnQgdG8gbm90ZSB0aGF0IHRoZXkgYXJlIHBhcnNlZCB0aHJvdWdoIHRoZSByZVN0cmVldENsZWFuZXJcbi8vIHJlZ2V4IHRvIGJlY29tZSBtb3JlIHN0cmljdFxuLy8gdGhpcyBsaXN0IGhhcyBiZWVuIHNvdXJjZWQgZnJvbTpcbi8vIGh0dHBzOi8vd3d3LnByb3BlcnR5YXNzaXN0LnNhLmdvdi5hdS9wYS9xaGVscC5waHRtbD9jbWQ9c3RyZWV0dHlwZVxuLy9cbi8vIF9fTk9URTpfXyBTb21lIG9mIHRoZSBzdHJlZXQgdHlwZXMgaGF2ZSBiZWVuIGRpc2FibGVkIGR1ZSB0byBjb2xsaXNpb25zXG4vLyB3aXRoIGNvbW1vbiBwYXJ0cyBvZiBzdWJ1cmIgbmFtZXMuICBBdCBzb21lIHBvaW50IHRoZSBzdHJlZXQgcGFyc2VyIG1heSBiZVxuLy8gaW1wcm92ZWQgdG8gZGVhbCB3aXRoIHRoZXNlIGNhc2VzLCBidXQgZm9yIG5vdyB0aGlzIGhhcyBiZWVuIGRlZW1lZFxuLy8gc3VpdGFibGUuXG5cbnZhciBzdHJlZXRSZWdleGVzID0gY29tcGlsZXIoW1xuICAnQUxMRT9ZJywgICAgICAgICAgICAgICAvLyBBTExFWSAvIEFMTFlcbiAgJ0FQUChST0FDSCk/JywgICAgICAgICAgLy8gQVBQUk9BQ0ggLyBBUFBcbiAgJ0FSQyhBREUpPycsICAgICAgICAgICAgLy8gQVJDQURFIC8gQVJDXG4gICdBVihFfEVOVUUpPycsICAgICAgICAgIC8vIEFWRU5VRSAvIEFWIC8gQVZFXG4gICcoQk9VTEVWQVJEfEJMVkQpJywgICAgIC8vIEJPVUxFVkFSRCAvIEJMVkRcbiAgJ0JST1cnLCAgICAgICAgICAgICAgICAgLy8gQlJPV1xuICAnQllQQShTUyk/JywgICAgICAgICAgICAvLyBCWVBBU1MgLyBCWVBBXG4gICdDKEFVU0UpP1dBWScsICAgICAgICAgIC8vIENBVVNFV0FZIC8gQ1dBWVxuICAnKENJUkNVSVR8Q0NUKScsICAgICAgICAvLyBDSVJDVUlUIC8gQ0NUXG4gICdDSVJDKFVTKT8nLCAgICAgICAgICAgIC8vIENJUkNVUyAvIENJUkNcbiAgJ0NMKE9TRSk/JywgICAgICAgICAgICAgLy8gQ0xPU0UgLyBDTFxuICAnQ08/UFNFJywgICAgICAgICAgICAgICAvLyBDT1BTRSAvIENQU0VcbiAgJyhDT1JORVJ8Q05SKScsICAgICAgICAgLy8gQ09STkVSIC8gQ05SXG4gIC8vICdDT1ZFJywgICAgICAgICAgICAgICAgIC8vIENPVkVcbiAgJyhDKChPVVIpfFIpP1R8Q1JUKScsICAgLy8gQ09VUlQgLyBDVCAvQ1JUXG4gICdDUkVTKENFTlQpPycsICAgICAgICAgIC8vIENSRVNDRU5UIC8gQ1JFU1xuICAnRFIoSVZFKT8nLCAgICAgICAgICAgICAvLyBEUklWRSAvIERSXG4gIC8vICdFTkQnLCAgICAgICAgICAgICAgICAgIC8vIEVORFxuICAnRVNQKExBTkFOREUpPycsICAgICAgICAvLyBFU1BMQU5BREUgLyBFU1BcbiAgLy8gJ0ZMQVQnLCAgICAgICAgICAgICAgICAgLy8gRkxBVFxuICAnRihSRUUpP1dBWScsICAgICAgICAgICAvLyBGUkVFV0FZIC8gRldBWVxuICAnKEZST05UQUdFfEZSTlQpJywgICAgICAvLyBGUk9OVEFHRSAvIEZSTlRcbiAgLy8gJyhHQVJERU5TfEdETlMpJywgICAgICAgLy8gR0FSREVOUyAvIEdETlNcbiAgJyhHTEFERXxHTEQpJywgICAgICAgICAgLy8gR0xBREUgLyBHTERcbiAgLy8gJ0dMRU4nLCAgICAgICAgICAgICAgICAgLy8gR0xFTlxuICAnR1IoRUUpP04nLCAgICAgICAgICAgICAvLyBHUkVFTiAvIEdSTlxuICAvLyAnR1IoT1ZFKT8nLCAgICAgICAgICAgICAvLyBHUk9WRSAvIEdSXG4gIC8vICdIKEVJR0gpP1RTJywgICAgICAgICAgIC8vIEhFSUdIVFMgLyBIVFNcbiAgJyhISUdIV0FZfEhXWSknLCAgICAgICAgLy8gSElHSFdBWSAvIEhXWVxuICAnKExBTkV8TE4pJywgICAgICAgICAgICAvLyBMQU5FIC8gTE5cbiAgJ0xJTksnLCAgICAgICAgICAgICAgICAgLy8gTElOS1xuICAnTE9PUCcsICAgICAgICAgICAgICAgICAvLyBMT09QXG4gICdNQUxMJywgICAgICAgICAgICAgICAgIC8vIE1BTExcbiAgJ01FV1MnLCAgICAgICAgICAgICAgICAgLy8gTUVXU1xuICAnKFBBQ0tFVHxQQ0tUKScsICAgICAgICAvLyBQQUNLRVQgLyBQQ0tUXG4gICdQKEFSQSk/REUnLCAgICAgICAgICAgIC8vIFBBUkFERSAvIFBERVxuICAvLyAnUEFSSycsICAgICAgICAgICAgICAgICAvLyBQQVJLXG4gICcoUEFSS1dBWXxQS1dZKScsICAgICAgIC8vIFBBUktXQVkgLyBQS1dZXG4gICdQTChBQ0UpPycsICAgICAgICAgICAgIC8vIFBMQUNFIC8gUExcbiAgJ1BST00oRU5BREUpPycsICAgICAgICAgLy8gUFJPTUVOQURFIC8gUFJPTVxuICAnUkVTKEVSVkUpPycsICAgICAgICAgICAvLyBSRVNFUlZFIC8gUkVTXG4gIC8vICdSST9ER0UnLCAgICAgICAgICAgICAgIC8vIFJJREdFIC8gUkRHRVxuICAnUklTRScsICAgICAgICAgICAgICAgICAvLyBSSVNFXG4gICdSKE9BKT9EJywgICAgICAgICAgICAgIC8vIFJPQUQgLyBSRFxuICAnUk9XJywgICAgICAgICAgICAgICAgICAvLyBST1dcbiAgJ1NRKFVBUkUpPycsICAgICAgICAgICAgLy8gU1FVQVJFIC8gU1FcbiAgJ1NUKFJFRVQpPycsICAgICAgICAgICAgLy8gU1RSRUVUIC8gU1RcbiAgJ1NUUkk/UCcsICAgICAgICAgICAgICAgLy8gU1RSSVAgLyBTVFJQXG4gICdUQVJOJywgICAgICAgICAgICAgICAgIC8vIFRBUk5cbiAgJ1QoRVJSQSk/Q0UnLCAgICAgICAgICAgLy8gVEVSUkFDRSAvIFRDRVxuICAnKFRIT1JPVUdIRkFSRXxURlJFKScsICAvLyBUSE9ST1VHSEZBUkUgLyBURlJFXG4gICdUUkFDSz8nLCAgICAgICAgICAgICAgIC8vIFRSQUNLIC8gVFJBQ1xuICAnVChSVU5LKT9XQVknLCAgICAgICAgICAvLyBUUlVOS1dBWSAvIFRXQVlcbiAgLy8gJ1ZJRVcnLCAgICAgICAgICAgICAgICAgLy8gVklFV1xuICAnVkk/U1RBJywgICAgICAgICAgICAgICAvLyBWSVNUQSAvIFZTVEFcbiAgJ1dBTEsnLCAgICAgICAgICAgICAgICAgLy8gV0FMS1xuICAnV0E/WScsICAgICAgICAgICAgICAgICAvLyBXQVkgLyBXWVxuICAnVyhBTEspP1dBWScsICAgICAgICAgICAvLyBXQUxLV0FZIC8gV1dBWVxuICAnWUFSRCcgICAgICAgICAgICAgICAgICAvLyBZQVJEXG5dKTtcblxudmFyIHJlU3BsaXRTdHJlZXQgPSAvXihOfE5USHxOT1JUSHxFfEVTVHxFQVNUfFN8U1RIfFNPVVRIfFd8V1NUfFdFU1QpXFwsJC9pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRleHQsIG9wdHMpIHtcbiAgdmFyIGFkZHJlc3MgPSBuZXcgQWRkcmVzcyh0ZXh0LCBvcHRzKTtcblxuICAvLyBjbGVhbiB0aGUgYWRkcmVzc1xuICBhZGRyZXNzXG4gICAgLmNsZWFuKFtcbiAgICAgICAgLy8gcmVtb3ZlIHRyYWlsaW5nIGRvdHMgZnJvbSB0d28gbGV0dGVyIGFiYnJldmlhdGlvbnNcbiAgICAgICAgZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dC5yZXBsYWNlKC8oXFx3ezJ9KVxcLi9nLCAnJDEnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBjb252ZXJ0IHNob3AgdG8gYSB1bml0IGZvcm1hdFxuICAgICAgICBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXHMqU0hPUFxccz8oXFxkKilcXCw/XFxzKi9pLCAnJDEvJyk7XG4gICAgICAgIH1cbiAgICBdKVxuXG4gICAgLy8gc3BsaXQgdGhlIGFkZHJlc3NcbiAgICAuc3BsaXQoL1xccy8pXG5cbiAgICAvLyBleHRyYWN0IHRoZSB1bml0XG4gICAgLmV4dHJhY3QoJ3VuaXQnLCBbXG4gICAgICAgICgvXig/OlxcI3xBUFR8QVBBUlRNRU5UKVxccz8oXFxkKykvKSxcbiAgICAgICAgKC9eKFxcZCspXFwvKC4qKS8pXG4gICAgXSlcblxuICAgIC8vIGV4dHJhY3QgdGhlIHN0cmVldFxuICAgIC5leHRyYWN0U3RyZWV0KHN0cmVldFJlZ2V4ZXMsIHJlU3BsaXRTdHJlZXQpO1xuXG4gIGlmIChvcHRzICYmIG9wdHMuc3RhdGUpIHtcbiAgICBhZGRyZXNzLmV4dHJhY3QoJ3N0YXRlJywgb3B0cy5zdGF0ZSApO1xuICB9XG5cbiAgaWYgKG9wdHMgJiYgb3B0cy5jb3VudHJ5KSB7XG4gICAgYWRkcmVzcy5leHRyYWN0KCdjb3VudHJ5Jywgb3B0cy5jb3VudHJ5ICk7XG4gIH1cblxuICBpZiAob3B0cyAmJiBvcHRzLnJlUG9zdGFsQ29kZSkge1xuICAgIGFkZHJlc3MuZXh0cmFjdCgncG9zdGFsY29kZScsIFsgb3B0cy5yZVBvc3RhbENvZGUgXSk7XG4gIH1cblxuICAgLy8gdGFrZSByZW1haW5pbmcgdW5rbm93biBwYXJ0cyBhbmQgcHVzaCB0aGVtXG4gICByZXR1cm4gYWRkcmVzcy5maW5hbGl6ZSgpO1xufTtcbiJdfQ==
