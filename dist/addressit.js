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
proto._extractStreetParts = function(startIndex, streetPartsLength) {
  var index = startIndex;
  var streetParts = [];
  var numberParts;
  var parts = this.parts;
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
proto.extractStreet = function(regexes, reSplitStreet, reNoStreet) {
  var reNumericesque = /^(\d*|\d*\w)$/;
  var parts = this.parts;
  var streetPartsLength = 2;

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
          streetPartsLength = 3;
          startIndex += 1;
        }

        if (reNoStreet.test(parts[startIndex])) {
          streetPartsLength = 1;
        }

        this._extractStreetParts(startIndex, streetPartsLength);
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
  'T(ERRA)?CE|TER?R',     // TERRACE / TER / TERR / TCE
  '(THOROUGHFARE|TFRE)',  // THOROUGHFARE / TFRE
  'TRACK?',               // TRACK / TRAC
  'TR(AI)?L',             // TRAIL / TRL
  'T(RUNK)?WAY',          // TRUNKWAY / TWAY
  // 'VIEW',                 // VIEW
  'VI?STA',               // VISTA / VSTA
  'WALK',                 // WALK
  'WA?Y',                 // WAY / WY
  'W(ALK)?WAY',           // WALKWAY / WWAY
  'YARD',                 // YARD
  'BROADWAY'
]);

var reSplitStreet = /^(N|NTH|NORTH|E|EST|EAST|S|STH|SOUTH|W|WST|WEST)\,$/i;
var reNoStreet = compiler(['BROADWAY']).pop();

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
    .extractStreet(streetRegexes, reSplitStreet, reNoStreet);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImFkZHJlc3MuanMiLCJpbmRleC5qcyIsImxvY2FsZS9lbi1VUy5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvZXh0ZW5kLmpzIiwicGFyc2Vycy9jb21waWxlci5qcyIsInBhcnNlcnMvZW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVOdW1lcmljID0gL15cXGQrJC87XG5cbi8qKlxuICAjIyMgQWRkcmVzc1xuKiovXG5mdW5jdGlvbiBBZGRyZXNzKHRleHQsIG9wdHMpIHtcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBBZGRyZXNzKSkge1xuICAgIHJldHVybiBuZXcgQWRkcmVzcyh0ZXh0KTtcbiAgfVxuXG4gIHRoaXMudGV4dCA9IHRleHQ7XG4gIHRoaXMucGFydHMgPSBbXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBZGRyZXNzO1xudmFyIHByb3RvID0gQWRkcmVzcy5wcm90b3R5cGU7XG5cblxuLyoqXG4gICMjIyMgQWRkcmVzcyNfZXh0cmFjdFN0cmVldFBhcnRzKHN0YXJ0SW5kZXgpXG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGV4dHJhY3QgZnJvbSB0aGUgc3RyZWV0IHR5cGUgbWF0Y2hcbiAgaW5kZXggKmJhY2sgdG8qIHRoZSBzdHJlZXQgbnVtYmVyIGFuZCBwb3NzaWJseSB1bml0IG51bWJlciBmaWVsZHMuXG5cbiAgVGhlIGZ1bmN0aW9uIHdpbGwgc3RhcnQgd2l0aCB0aGUgc3RyZWV0IHR5cGUsIHRoZW4gYWxzbyBncmFiIHRoZSBwcmV2aW91c1xuICBmaWVsZCByZWdhcmRsZXNzIG9mIGNoZWNrcy4gIEZpZWxkcyB3aWxsIGNvbnRpbnVlIHRvIGJlIHB1bGxlZCBpbiB1bnRpbFxuICBmaWVsZHMgc3RhcnQgc2F0aXNmeWluZyBudW1lcmljIGNoZWNrcy4gIE9uY2UgcG9zaXRpdmUgbnVtZXJpYyBjaGVja3MgYXJlXG4gIGZpcmluZywgdGhvc2Ugd2lsbCBiZSBicm91Z2h0IGluIGFzIGJ1aWxkaW5nIC8gdW5pdCBudW1iZXJzIGFuZCBvbmNlIHRoZVxuICBzdGFydCBvZiB0aGUgcGFydHMgYXJyYXkgaXMgcmVhY2hlZCBvciB3ZSBmYWxsIGJhY2sgdG8gbm9uLW51bWVyaWMgZmllbGRzXG4gIHRoZW4gdGhlIGV4dHJhY3Rpb24gaXMgc3RvcHBlZC5cbioqL1xucHJvdG8uX2V4dHJhY3RTdHJlZXRQYXJ0cyA9IGZ1bmN0aW9uKHN0YXJ0SW5kZXgsIHN0cmVldFBhcnRzTGVuZ3RoKSB7XG4gIHZhciBpbmRleCA9IHN0YXJ0SW5kZXg7XG4gIHZhciBzdHJlZXRQYXJ0cyA9IFtdO1xuICB2YXIgbnVtYmVyUGFydHM7XG4gIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XG4gIHZhciB0ZXN0Rm4gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICB3aGlsZSAoaW5kZXggPj0gMCAmJiB0ZXN0Rm4oKSkge1xuICAgIHZhciBhbHBoYVBhcnQgPSBpc05hTihwYXJzZUludChwYXJ0c1tpbmRleF0sIDEwKSk7XG5cbiAgICBpZiAoc3RyZWV0UGFydHMubGVuZ3RoIDwgc3RyZWV0UGFydHNMZW5ndGggfHwgYWxwaGFQYXJ0KSB7XG4gICAgICAvLyBhZGQgdGhlIGN1cnJlbnQgcGFydCB0byB0aGUgc3RyZWV0IHBhcnRzXG4gICAgICBzdHJlZXRQYXJ0cy51bnNoaWZ0KHBhcnRzLnNwbGljZShpbmRleC0tLCAxKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKCEgbnVtYmVyUGFydHMpIHtcbiAgICAgICAgbnVtYmVyUGFydHMgPSBbXTtcbiAgICAgIH0gLy8gaWZcblxuICAgICAgLy8gYWRkIHRoZSBjdXJyZW50IHBhcnQgdG8gdGhlIGJ1aWxkaW5nIHBhcnRzXG4gICAgICBudW1iZXJQYXJ0cy51bnNoaWZ0KHBhcnRzLnNwbGljZShpbmRleC0tLCAxKSk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgdGVzdCBmdW5jdGlvblxuICAgICAgdGVzdEZuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpc0FscGhhID0gaXNOYU4ocGFyc2VJbnQocGFydHNbaW5kZXhdLCAxMCkpO1xuXG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYnVpbGRpbmcgcGFydHMsIHRoZW4gd2UgYXJlIGxvb2tpbmdcbiAgICAgICAgLy8gZm9yIG5vbi1hbHBoYSB2YWx1ZXMsIG90aGVyd2lzZSBhbHBoYVxuICAgICAgICByZXR1cm4gbnVtYmVyUGFydHMgPyAoISBpc0FscGhhKSA6IGlzQWxwaGE7XG4gICAgICB9O1xuICAgIH0gLy8gaWYuLmVsc2VcbiAgfSAvLyB3aGlsZVxuXG4gIHRoaXMubnVtYmVyID0gbnVtYmVyUGFydHMgPyBudW1iZXJQYXJ0cy5qb2luKCcvJykgOiAnJztcbiAgdGhpcy5zdHJlZXQgPSBzdHJlZXRQYXJ0cy5qb2luKCcgJykucmVwbGFjZSgvXFwsL2csICcnKTtcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjY2xlYW5cblxuICBUaGUgY2xlYW4gZnVuY3Rpb24gaXMgdXNlZCB0byBjbGVhbiB1cCBhbiBhZGRyZXNzIHN0cmluZy4gIEl0IGlzIGRlc2lnbmVkXG4gIHRvIHJlbW92ZSBhbnkgcGFydHMgb2YgdGhlIHRleHQgdGhhdCBwcmV2ZW4gZWZmZWN0aXZlIHBhcnNpbmcgb2YgdGhlXG4gIGFkZHJlc3Mgc3RyaW5nLlxuKiovXG5wcm90by5jbGVhbiA9IGZ1bmN0aW9uKGNsZWFuZXJzKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGNsZWFuZXJzXG4gIGNsZWFuZXJzID0gY2xlYW5lcnMgfHwgW107XG5cbiAgLy8gYXBwbHkgdGhlIGNsZWFuZXJzXG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBjbGVhbmVycy5sZW5ndGg7IGlpKyspIHtcbiAgICBpZiAodHlwZW9mIGNsZWFuZXJzW2lpXSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnRleHQgPSBjbGVhbmVyc1tpaV0uY2FsbChudWxsLCB0aGlzLnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmIChjbGVhbmVyc1tpaV0gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHRoaXMudGV4dCA9IHRoaXMudGV4dC5yZXBsYWNlKGNsZWFuZXJzW2lpXSwgJycpO1xuICAgIH1cbiAgfSAvLyBmb3JcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZXh0cmFjdChmaWVsZE5hbWUsIHJlZ2V4ZXMpXG5cbiAgVGhlIGV4dHJhY3QgZnVuY3Rpb24gaXMgdXNlZCB0byBleHRyYWN0IHRoZSBzcGVjaWZpZWQgZmllbGQgZnJvbSB0aGUgcmF3XG4gIHBhcnRzIHRoYXQgaGF2ZSBwcmV2aW91c2x5IGJlZW4gc3BsaXQgZnJvbSB0aGUgaW5wdXQgdGV4dC4gIElmIHN1Y2Nlc3NmdWxseVxuICBsb2NhdGVkIHRoZW4gdGhlIGZpZWxkIHdpbGwgYmUgdXBkYXRlZCBmcm9tIHRoZSBwYXJ0cyBhbmQgdGhhdCBwYXJ0IHJlbW92ZWRcbiAgZnJvbSB0aGUgcGFydHMgbGlzdC5cbioqL1xucHJvdG8uZXh0cmFjdCA9IGZ1bmN0aW9uKGZpZWxkTmFtZSwgcmVnZXhlcykge1xuICB2YXIgbWF0Y2g7XG4gIHZhciByZ3hJZHg7XG4gIHZhciBpaTtcbiAgdmFyIHZhbHVlO1xuICB2YXIgbG9va3VwcyA9IFtdO1xuXG4gIC8vIGlmIHRoZSByZWdleGVzIGhhdmUgYmVlbiBwYXNzZWQgaW4gYXMgb2JqZWN0cywgdGhlbiBjb252ZXJ0IHRvIGFuIGFycmF5XG4gIGlmICh0eXBlb2YgcmVnZXhlcyA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgcmVnZXhlcy5zcGxpY2UgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2YXIgbmV3UmVnZXhlcyA9IFtdO1xuXG4gICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBrZXlzIGluIHRoZSByZWdleGVzXG4gICAgZm9yICh2YXIga2V5IGluIHJlZ2V4ZXMpIHtcbiAgICAgIG5ld1JlZ2V4ZXNbbmV3UmVnZXhlcy5sZW5ndGhdID0gcmVnZXhlc1trZXldO1xuICAgICAgbG9va3Vwc1tuZXdSZWdleGVzLmxlbmd0aCAtIDFdID0ga2V5O1xuICAgIH1cblxuICAgIC8vIHVwZGF0ZSB0aGUgcmVnZXhlcyB0byBwb2ludCB0byB0aGUgbmV3IHJlZ2V4ZXNcbiAgICByZWdleGVzID0gbmV3UmVnZXhlcztcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgb3ZlciB0aGUgdW5pdCByZWdleGVzIGFuZCB0ZXN0IHRoZW0gYWdhaW5zdCB0aGUgdmFyaW91cyBwYXJ0c1xuICBmb3IgKHJneElkeCA9IDA7IHJneElkeCA8IHJlZ2V4ZXMubGVuZ3RoOyByZ3hJZHgrKykge1xuICAgIGZvciAoaWkgPSB0aGlzLnBhcnRzLmxlbmd0aDsgaWkgPj0gMDsgaWktLSApIHtcbiAgICAgIG1hdGNoID0gcmVnZXhlc1tyZ3hJZHhdLmV4ZWModGhpcy5wYXJ0c1tpaV0pO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSAybmQgY2FwdHVyZSBncm91cCwgdGhlbiByZXBsYWNlIHRoZSBpdGVtIHdpdGhcbiAgICAgICAgLy8gdGhlIHRleHQgb2YgdGhhdCBncm91cFxuICAgICAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSwgMSwgbWF0Y2hbMl0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIG90aGVyd2lzZSwganVzdCByZW1vdmUgdGhlIGVsZW1lbnRcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5wYXJ0cy5zcGxpY2UoaWksIDEpO1xuICAgICAgICB9IC8vIGlmLi5lbHNlXG5cbiAgICAgICAgdmFsdWUgPSBsb29rdXBzW3JneElkeF0gfHwgbWF0Y2hbMV07XG4gICAgICB9IGVsc2UgaWYgKGZpZWxkTmFtZSA9PT0gJ3N0YXRlJyAmJiB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciBtYXRjaE11bHRpcGxlUGFydCA9IGZhbHNlO1xuICAgICAgICB2YXIgc3BhY2VzSW5NYXRjaCA9IHJlZ2V4ZXNbcmd4SWR4XS5zb3VyY2Uuc3BsaXQoJ1xcXFxzJykubGVuZ3RoO1xuICAgICAgICBpZiAoc3BhY2VzSW5NYXRjaCA+IDEpIHtcbiAgICAgICAgICB2YXIgbXVsdGlwbGVQYXJ0ID0gW107XG4gICAgICAgICAgZm9yICh2YXIgcGFydEpvaW4gPSBpaTsgcGFydEpvaW4gPiBpaSAtIHNwYWNlc0luTWF0Y2ggJiYgcGFydEpvaW4gPj0gMDsgcGFydEpvaW4tLSkge1xuICAgICAgICAgICAgbXVsdGlwbGVQYXJ0LnB1c2godGhpcy5wYXJ0c1twYXJ0Sm9pbl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtdWx0aXBsZVBhcnQucmV2ZXJzZSgpO1xuICAgICAgICAgIG11bHRpcGxlUGFydCA9IG11bHRpcGxlUGFydC5qb2luKCcgJyk7XG4gICAgICAgICAgbWF0Y2hNdWx0aXBsZVBhcnQgPSByZWdleGVzW3JneElkeF0uZXhlYyhtdWx0aXBsZVBhcnQpO1xuXG4gICAgICAgICAgaWYgKG1hdGNoTXVsdGlwbGVQYXJ0KSB7XG4gICAgICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgMm5kIGNhcHR1cmUgZ3JvdXAsIHRoZW4gcmVwbGFjZSB0aGUgaXRlbSB3aXRoXG4gICAgICAgICAgICAvLyB0aGUgdGV4dCBvZiB0aGF0IGdyb3VwXG4gICAgICAgICAgICBpZiAobWF0Y2hNdWx0aXBsZVBhcnRbMl0pIHtcbiAgICAgICAgICAgICAgdGhpcy5wYXJ0cy5zcGxpY2UoaWkgLSBzcGFjZXNJbk1hdGNoICsgMSwgc3BhY2VzSW5NYXRjaCwgbWF0Y2hNdWx0aXBsZVBhcnRbMl0pO1xuICAgICAgICAgICAgICBpaSAtPSBzcGFjZXNJbk1hdGNoICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwganVzdCByZW1vdmUgdGhlIGVsZW1lbnRcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSAtIHNwYWNlc0luTWF0Y2ggKyAxLCBzcGFjZXNJbk1hdGNoKTtcbiAgICAgICAgICAgICAgaWkgLT0gc3BhY2VzSW5NYXRjaCArIDE7XG4gICAgICAgICAgICB9IC8vIGlmLi5lbHNlXG5cbiAgICAgICAgICAgIHZhbHVlID0gbG9va3Vwc1tyZ3hJZHhdIHx8IG1hdGNoTXVsdGlwbGVQYXJ0WzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSAvLyBpZlxuICAgIH0gLy8gZm9yXG4gIH0gLy8gZm9yXG5cbiAgLy8gdXBkYXRlIHRoZSBmaWVsZCB2YWx1ZVxuICB0aGlzW2ZpZWxkTmFtZV0gPSB2YWx1ZTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZXh0cmFjdFN0cmVldFxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBwYXJzZSB0aGUgYWRkcmVzcyBwYXJ0cyBhbmQgbG9jYXRlIGFueSBwYXJ0c1xuICB0aGF0IGxvb2sgdG8gYmUgcmVsYXRlZCB0byBhIHN0cmVldCBhZGRyZXNzLlxuKiovXG5wcm90by5leHRyYWN0U3RyZWV0ID0gZnVuY3Rpb24ocmVnZXhlcywgcmVTcGxpdFN0cmVldCwgcmVOb1N0cmVldCkge1xuICB2YXIgcmVOdW1lcmljZXNxdWUgPSAvXihcXGQqfFxcZCpcXHcpJC87XG4gIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XG4gIHZhciBzdHJlZXRQYXJ0c0xlbmd0aCA9IDI7XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgcmVnZXhlc1xuICByZWdleGVzID0gcmVnZXhlcyB8fCBbXTtcblxuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gbG9jYXRlIHRoZSBcImJlc3RcIiBzdHJlZXQgcGFydCBpbiBhbiBhZGRyZXNzXG4gIC8vIHN0cmluZy4gIEl0IGlzIGNhbGxlZCBvbmNlIGEgc3RyZWV0IHJlZ2V4IGhhcyBtYXRjaGVkIGFnYWluc3QgYSBwYXJ0XG4gIC8vIHN0YXJ0aW5nIGZyb20gdGhlIGxhc3QgcGFydCBhbmQgd29ya2luZyB0b3dhcmRzIHRoZSBmcm9udC4gSW4gdGVybXMgb2ZcbiAgLy8gd2hhdCBpcyBjb25zaWRlcmVkIHRoZSBiZXN0LCB3ZSBhcmUgbG9va2luZyBmb3IgdGhlIHBhcnQgY2xvc2VzdCB0byB0aGVcbiAgLy8gc3RhcnQgb2YgdGhlIHN0cmluZyB0aGF0IGlzIG5vdCBpbW1lZGlhdGVseSBwcmVmaXhlZCBieSBhIG51bWVyaWNlc3F1ZVxuICAvLyBwYXJ0IChlZy4gMTIzLCA0MkEsIGV0YykuXG4gIGZ1bmN0aW9uIGxvY2F0ZUJlc3RTdHJlZXRQYXJ0KHN0YXJ0SW5kZXgpIHtcbiAgICB2YXIgYmVzdEluZGV4ID0gc3RhcnRJbmRleDtcblxuICAgIC8vIGlmIHRoZSBzdGFydCBpbmRleCBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gMCwgdGhlbiByZXR1cm5cbiAgICBmb3IgKHZhciBpaSA9IHN0YXJ0SW5kZXgtMTsgaWkgPj0gMDsgaWktLSkge1xuICAgICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdHJlZXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgICAgIGZvciAodmFyIHJneElkeCA9IDA7IHJneElkeCA8IHJlZ2V4ZXMubGVuZ3RoOyByZ3hJZHgrKykge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgICBpZiAocmVnZXhlc1tyZ3hJZHhdLnRlc3QocGFydHNbaWldKSAmJiBwYXJ0c1tpaS0xXSAmJiAoISByZU51bWVyaWNlc3F1ZS50ZXN0KHBhcnRzW2lpLTFdKSkpIHtcbiAgICAgICAgICAvLyB1cGRhdGUgdGhlIGJlc3QgaW5kZXggYW5kIGJyZWFrIGZyb20gdGhlIGlubmVyIGxvb3BcbiAgICAgICAgICBiZXN0SW5kZXggPSBpaTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSAvLyBpZlxuICAgICAgfSAvLyBmb3JcbiAgICB9IC8vIGZvclxuXG4gICAgcmV0dXJuIGJlc3RJbmRleDtcbiAgfSAvLyBsb2NhdGVCZXN0U3RyZWV0UGFydFxuXG4gIC8vIGl0ZXJhdGUgb3ZlciB0aGUgc3RyZWV0IHJlZ2V4ZXMgYW5kIHRlc3QgdGhlbSBhZ2FpbnN0IHRoZSB2YXJpb3VzIHBhcnRzXG4gIGZvciAodmFyIHBhcnRJZHggPSBwYXJ0cy5sZW5ndGg7IHBhcnRJZHgtLTsgKSB7XG4gICAgZm9yICh2YXIgcmd4SWR4ID0gMDsgcmd4SWR4IDwgcmVnZXhlcy5sZW5ndGg7IHJneElkeCsrKSB7XG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgLy8gaWYgdGhlIG1hdGNoIGlzIG9uIHRoZSBmaXJzdCBwYXJ0IHRob3VnaCwgcmVqZWN0IGl0IGFzIHdlXG4gICAgICAvLyBhcmUgcHJvYmFibHkgZGVhbGluZyB3aXRoIGEgdG93biBuYW1lIG9yIHNvbWV0aGluZyAoZS5nLiBTdCBHZW9yZ2UpXG4gICAgICBpZiAocmVnZXhlc1tyZ3hJZHhdLnRlc3QocGFydHNbcGFydElkeF0pICYmIHBhcnRJZHggPiAwKSB7XG4gICAgICAgIHZhciBzdGFydEluZGV4ID0gbG9jYXRlQmVzdFN0cmVldFBhcnQocGFydElkeCk7XG5cbiAgICAgICAgLy8gaWYgd2UgYXJlIGRlYWxpbmcgd2l0aCBhIHNwbGl0IHN0cmVldCAoaS5lLiBmb28gcmQgd2VzdCkgYW5kIHRoZVxuICAgICAgICAvLyBhZGRyZXNzIHBhcnRzIGFyZSBhcHByb3ByaWF0ZWx5IGRlbGltaXRlZCwgdGhlbiBncmFiIHRoZSBuZXh0IHBhcnRcbiAgICAgICAgLy8gYWxzb1xuICAgICAgICBpZiAocmVTcGxpdFN0cmVldC50ZXN0KHBhcnRzW3N0YXJ0SW5kZXggKyAxXSkpIHtcbiAgICAgICAgICBzdHJlZXRQYXJ0c0xlbmd0aCA9IDM7XG4gICAgICAgICAgc3RhcnRJbmRleCArPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlTm9TdHJlZXQudGVzdChwYXJ0c1tzdGFydEluZGV4XSkpIHtcbiAgICAgICAgICBzdHJlZXRQYXJ0c0xlbmd0aCA9IDE7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9leHRyYWN0U3RyZWV0UGFydHMoc3RhcnRJbmRleCwgc3RyZWV0UGFydHNMZW5ndGgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gLy8gaWZcbiAgICB9IC8vIGZvclxuICB9IC8vIGZvclxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNmaW5hbGl6ZVxuXG4gIFRoZSBmaW5hbGl6ZSBmdW5jdGlvbiB0YWtlcyBhbnkgcmVtYWluaW5nIHBhcnRzIHRoYXQgaGF2ZSBub3QgYmVlbiBleHRyYWN0ZWRcbiAgYXMgb3RoZXIgaW5mb3JtYXRpb24sIGFuZCBwdXNoZXMgdGhvc2UgZmllbGRzIGludG8gYSBnZW5lcmljIGByZWdpb25zYCBmaWVsZC5cbioqL1xucHJvdG8uZmluYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgLy8gdXBkYXRlIHRoZSByZWdpb25zLCBkaXNjYXJkaW5nIGFueSBlbXB0eSBzdHJpbmdzLlxuICB0aGlzLnJlZ2lvbnMgPSB0aGlzLnBhcnRzLmpvaW4oJyAnKS5zcGxpdCgvXFwsXFxzPy8pLmZpbHRlcihmdW5jdGlvbiAocmVnaW9uKSB7XG4gICAgICByZXR1cm4gcmVnaW9uLmxlbmd0aDtcbiAgfSk7XG5cbiAgLy8gcmVzZXQgdGhlIHBhcnRzXG4gIHRoaXMucGFydHMgPSBbXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3Mjc3BsaXRcblxuICBTcGxpdCB0aGUgYWRkcmVzcyBpbnRvIGl0J3MgY29tcG9uZW50IHBhcnRzLCBhbmQgcmVtb3ZlIGFueSBlbXB0eSBwYXJ0c1xuKiovXG5wcm90by5zcGxpdCA9IGZ1bmN0aW9uKHNlcGFyYXRvcikge1xuICAvLyBzcGxpdCB0aGUgc3RyaW5nXG4gIHZhciBuZXdQYXJ0cyA9IHRoaXMudGV4dC5zcGxpdChzZXBhcmF0b3IgfHwgJyAnKTtcblxuICB0aGlzLnBhcnRzID0gW107XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBuZXdQYXJ0cy5sZW5ndGg7IGlpKyspIHtcbiAgICBpZiAobmV3UGFydHNbaWldKSB7XG4gICAgICB0aGlzLnBhcnRzW3RoaXMucGFydHMubGVuZ3RoXSA9IG5ld1BhcnRzW2lpXTtcbiAgICB9IC8vIGlmXG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI3RvU3RyaW5nXG5cbiAgQ29udmVydCB0aGUgYWRkcmVzcyB0byBhIHN0cmluZyByZXByZXNlbnRhdGlvblxuKiovXG5wcm90by50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgb3V0cHV0ID0gJyc7XG5cbiAgaWYgKHRoaXMuYnVpbGRpbmcpIHtcbiAgICBvdXRwdXQgKz0gdGhpcy5idWlsZGluZyArICdcXG4nO1xuICB9IC8vIGlmXG5cbiAgaWYgKHRoaXMuc3RyZWV0KSB7XG4gICAgb3V0cHV0ICs9IHRoaXMubnVtYmVyID8gdGhpcy5udW1iZXIgKyAnICcgOiAnJztcbiAgICBvdXRwdXQgKz0gdGhpcy5zdHJlZXQgKyAnXFxuJztcbiAgfVxuXG4gIG91dHB1dCArPSB0aGlzLnJlZ2lvbnMuam9pbignLCAnKSArICdcXG4nO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMgYWRkcmVzc2l0XG5cbiAgQWRkcmVzc0l0IGlzIGEgZnJlZWZvcm0gc3RyZWV0IGFkZHJlc3MgcGFyc2VyLCB0aGF0IGlzIGRlc2lnbmVkIHRvIHRha2UgYVxuICBwaWVjZSBvZiB0ZXh0IGFuZCBjb252ZXJ0IHRoYXQgaW50byBhIHN0cnVjdHVyZWQgYWRkcmVzcyB0aGF0IGNhbiBiZVxuICBwcm9jZXNzZWQgaW4gZGlmZmVyZW50IHN5c3RlbXMuXG5cbiAgVGhlIGZvY2FsIHBvaW50IG9mIGBhZGRyZXNzaXRgIGlzIG9uIHRoZSBzdHJlZXQgcGFyc2luZyBjb21wb25lbnQsIHJhdGhlclxuICB0aGFuIGF0dGVtcHRpbmcgdG8gYXBwcm9wcmlhdGVseSBpZGVudGlmeSB2YXJpb3VzIHN0YXRlcywgY291bnRpZXMsIHRvd25zLFxuICBldGMsIGFzIHRoZXNlIHZhcnkgZnJvbSBjb3VudHJ5IHRvIGNvdW50cnkgZmFpcmx5IGRyYW1hdGljYWxseS4gVGhlc2VcbiAgZGV0YWlscyBhcmUgaW5zdGVhZCBwdXQgaW50byBhIGdlbmVyaWMgcmVnaW9ucyBhcnJheSB0aGF0IGNhbiBiZSBmdXJ0aGVyXG4gIHBhcnNlZCBiYXNlZCBvbiB5b3VyIGFwcGxpY2F0aW9uIG5lZWRzLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBUaGUgZm9sbG93aW5nIGlzIGEgc2ltcGxlIGV4YW1wbGUgb2YgaG93IGFkZHJlc3MgaXQgY2FuIGJlIHVzZWQ6XG5cbiAgYGBganNcbiAgdmFyIGFkZHJlc3NpdCA9IHJlcXVpcmUoJ2FkZHJlc3NpdCcpO1xuXG4gIC8vIHBhcnNlIGEgbWFkZSB1cCBhZGRyZXNzLCB3aXRoIHNvbWUgc2xpZ2h0bHkgdHJpY2t5IHBhcnRzXG4gIHZhciBhZGRyZXNzID0gYWRkcmVzc2l0KCdTaG9wIDgsIDQzMSBTdCBLaWxkYSBSZCBNZWxib3VybmUnKTtcbiAgYGBgXG5cbiAgVGhlIGBhZGRyZXNzYCBvYmplY3Qgd291bGQgbm93IGNvbnRhaW4gdGhlIGZvbGxvd2luZyBpbmZvcm1hdGlvbjpcblxuICBgYGBcbiAgeyB0ZXh0OiAnOC80MzEgU1QgS0lMREEgUkQgTUVMQk9VUk5FJyxcbiAgICBwYXJ0czogW10sXG4gICAgdW5pdDogOCxcbiAgICBjb3VudHJ5OiB1bmRlZmluZWQsXG4gICAgbnVtYmVyOiA0MzEsXG4gICAgc3RyZWV0OiAnU1QgS0lMREEgUkQnLFxuICAgIHJlZ2lvbnM6IFsgJ01FTEJPVVJORScgXSB9XG4gIGBgYFxuXG4gIEZvciBtb3JlIGV4YW1wbGVzLCBzZWUgdGhlIHRlc3RzLlxuXG4gICMjIFJlZmVyZW5jZVxuXG4qKi9cblxuLyoqXG4gICMjIyBhZGRyZXNzaXQoaW5wdXQsIG9wdHM/KVxuXG4gIFJ1biB0aGUgYWRkcmVzcyBwYXJzZXIgZm9yIHRoZSBnaXZlbiBpbnB1dC4gIE9wdGlvbmFsIGBvcHRzYCBjYW4gYmVcbiAgc3VwcGxpZWQgaWYgeW91IHdhbnQgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgKEVOKSBwYXJzZXIuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICAvLyBpZiBubyBsb2NhbGUgaGFzIGJlZW4gc3BlY2lmaWVkLCB0aGVuIHVzZSB0aGUgZGVmYXVsdCB2YW5pbGxhIGVuIGxvY2FsZVxuICB2YXIgcGFyc2UgPSAob3B0cyB8fCB7fSkubG9jYWxlIHx8IHJlcXVpcmUoJy4vbG9jYWxlL2VuLVVTJyk7XG5cbiAgLy8gcGFyc2UgdGhlIGFkZHJlc3NcbiAgcmV0dXJuIHBhcnNlKGlucHV0LCBvcHRzKTtcbn07XG4iLCJ2YXIgcGFyc2VyID0gcmVxdWlyZSgnLi4vcGFyc2Vycy9lbi5qcycpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICAvLyBwYXJzZSB0aGUgYmFzZSBhZGRyZXNzXG4gIHJldHVybiBwYXJzZXIoaW5wdXQsIGV4dGVuZCh7IFxuICBcdHN0YXRlOiB7XG5cdCAgICBBTDogLyheYWxhYmFtYXxeQUwkKS9pLFxuXHQgICAgQUs6IC8oXmFsYXNrYXxeQUskKS9pLFxuXHQgICAgQVM6IC8oXmFtZXJpY2FuXFxzc2Ftb2F8XkFTJCkvaSxcblx0ICAgIEFaOiAvKF5hcml6b25hfF5BWiQpL2ksXG5cdCAgICBBUjogLyheYXJrYW5zYXN8XkFSJCkvaSxcblx0ICAgIENBOiAvKF5jYWxpZm9ybmlhfF5DQSQpL2ksXG5cdCAgICBDTzogLyheY29sb3JhZG98XkNPJCkvaSxcblx0ICAgIENUOiAvKF5jb25uZWN0aWN1dHxeQ1QkKS9pLFxuXHQgICAgREU6IC8oXmRlbGF3YXJlfF5ERSQpL2ksXG5cdCAgICBEQzogLyheZGlzdHJpY3RcXHNvZlxcc2NvbHVtYmlhfF5EQyQpL2ksXG5cdCAgICBGTTogLyheZmVkZXJhdGVkXFxzc3RhdGVzXFxzb2ZcXHNtaWNyb25lc2lhfF5GTSQpL2ksXG5cdCAgICBGTDogLyheZmxvcmlkYXxeRkwkKS9pLFxuXHQgICAgR0E6IC8oXmdlb3JnaWF8XkdBJCkvaSxcblx0ICAgIEdVOiAvKF5ndWFtfF5HVSQpL2ksXG5cdCAgICBISTogLyheaGF3YWlpfF5ISSQpL2ksXG5cdCAgICBJRDogLyheaWRhaG98XklEJCkvaSxcblx0ICAgIElMOiAvKF5pbGxpbm9pc3xeSUwkKS9pLFxuXHQgICAgSU46IC8oXmluZGlhbmF8XklOJCkvaSxcblx0ICAgIElBOiAvKF5pb3dhfF5JQSQpL2ksXG5cdCAgICBLUzogLyhea2Fuc2FzfF5LUyQpL2ksXG5cdCAgICBLWTogLyhea2VudHVja3l8XktZJCkvaSxcblx0ICAgIExBOiAvKF5sb3Vpc2lhbmF8XkxBJCkvaSxcblx0ICAgIE1FOiAvKF5tYWluZXxeTUUkKS9pLFxuXHQgICAgTUg6IC8oXm1hcnNoYWxsXFxzaXNsYW5kc3xeTUgkKS9pLFxuXHQgICAgTUQ6IC8oXm1hcnlsYW5kfF5NRCQpL2ksXG5cdCAgICBNQTogLyhebWFzc2FjaHVzZXR0c3xeTUEkKS9pLFxuXHQgICAgTUk6IC8oXm1pY2hpZ2FufF5NSSQpL2ksXG5cdCAgICBNTjogLyhebWlubmVzb3RhfF5NTiQpL2ksXG5cdCAgICBNUzogLyhebWlzc2lzc2lwcGl8Xk1TJCkvaSxcblx0ICAgIE1POiAvKF5taXNzb3VyaXxeTU8kKS9pLFxuXHQgICAgTVQ6IC8oXm1vbnRhbmF8Xk1UJCkvaSxcblx0ICAgIE5FOiAvKF5uZWJyYXNrYXxeTkUkKS9pLFxuXHQgICAgTlY6IC8oXm5ldmFkYXxeTlYkKS9pLFxuXHQgICAgTkg6IC8oXm5ld1xcc2hhbXBzaGlyZXxeTkgkKS9pLFxuXHQgICAgTko6IC8oXm5ld1xcc2plcnNleXxeTkokKS9pLFxuXHQgICAgTk06IC8oXm5ld1xcc21leGljb3xeTk0kKS9pLFxuXHQgICAgTlk6IC8oXm5ld1xcc3lvcmt8Xk5ZJCkvaSxcblx0ICAgIE5DOiAvKF5ub3J0aFxcc2Nhcm9saW5hfF5OQyQpL2ksXG5cdCAgICBORDogLyhebm9ydGhcXHNkYWtvdGF8Xk5EJCkvaSxcblx0ICAgIE1QOiAvKF5ub3J0aGVyblxcc21hcmlhbmFcXHNpc2xhbmRzfF5NUCQpL2ksXG5cdCAgICBPSDogLyheb2hpb3xeT0gkKS9pLFxuXHQgICAgT0s6IC8oXm9rbGFob21hfF5PSyQpL2ksXG5cdCAgICBPUjogLyheb3JlZ29ufF5PUiQpL2ksXG5cdCAgICBQVzogLyhecGFsYXV8XlBXJCkvaSxcblx0ICAgIFBBOiAvKF5wZW5uc3lsdmFuaWF8XlBBJCkvaSxcblx0ICAgIFBSOiAvKF5wdWVydG9cXHNyaWNvfF5QUiQpL2ksXG5cdCAgICBSSTogLyhecmhvZGVcXHNpc2xhbmR8XlJJJCkvaSxcblx0ICAgIFNDOiAvKF5zb3V0aFxcc2Nhcm9saW5hfF5TQyQpL2ksXG5cdCAgICBTRDogLyhec291dGhcXHNkYWtvdGF8XlNEJCkvaSxcblx0ICAgIFROOiAvKF50ZW5uZXNzZWV8XlROJCkvaSxcblx0ICAgIFRYOiAvKF50ZXhhc3xeVFgkKS9pLFxuXHQgICAgVVQ6IC8oXnV0YWh8XlVUJCkvaSxcblx0ICAgIFZUOiAvKF52ZXJtb250fF5WVCQpL2ksXG5cdCAgICBWSTogLyhedmlyZ2luXFxzaXNsYW5kc3xeVkkkKS9pLFxuXHQgICAgVkE6IC8oXnZpcmdpbmlhfF5WQSQpL2ksXG5cdCAgICBXQTogLyhed2FzaGluZ3RvbnxeV0EkKS9pLFxuXHQgICAgV1Y6IC8oXndlc3RcXHN2aXJnaW5pYXxeV1YkKS9pLFxuXHQgICAgV0k6IC8oXndpc2NvbnNpbnxeV0kkKS9pLFxuXHQgICAgV1k6IC8oXnd5b21pbmd8XldZJCkvaVxuICBcdH0sXG4gIFx0Y291bnRyeToge1xuICAgICAgICBVU0E6IC8oXlVOSVRFRFxcc1NUQVRFU3xeVVxcLj9TXFwuP0E/JCkvaVxuICAgIH0sXG4gICAgcmVQb3N0YWxDb2RlOiAvKF5cXGR7NX0kKXwoXlxcZHs1fS1cXGR7NH0kKS8gfSwgb3B0cykpO1xuICAgICAgICAgICAgICAgLy8gUG9zdGFsIGNvZGVzIG9mIHRoZSBmb3JtICdERERERC1EREREJyBvciBqdXN0ICdERERERCdcbiAgICAgICAgICAgICAgIC8vIDEwMDEwIGlzIHZhbGlkIGFuZCBzbyBpcyAxMDAxMC0xMjM0XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4jIyBjb2cvZXh0ZW5kXG5cbmBgYGpzXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuYGBgXG5cbiMjIyBleHRlbmQodGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQ6XG5cbmBgYGpzXG5leHRlbmQoeyBhOiAxLCBiOiAyIH0sIHsgYzogMyB9LCB7IGQ6IDQgfSwgeyBiOiA1IH0pKTtcbmBgYFxuXG5TZWUgYW4gZXhhbXBsZSBvbiBbcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwNzk0NzUpLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0UmVnZXhlcykge1xuICB2YXIgcmVnZXhlcyA9IFtdO1xuICB2YXIgcmVTdHJlZXRDbGVhbmVyID0gL15cXF4/KC4qKVxcLD9cXCQ/JC87XG4gIHZhciBpaTtcblxuICBmb3IgKGlpID0gdGV4dFJlZ2V4ZXMubGVuZ3RoOyBpaS0tOyApIHtcbiAgICByZWdleGVzW2lpXSA9IG5ldyBSZWdFeHAoXG4gICAgICB0ZXh0UmVnZXhlc1tpaV0ucmVwbGFjZShyZVN0cmVldENsZWFuZXIsICdeJDFcXCw/JCcpLFxuICAgICAgJ2knXG4gICAgKTtcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gcmVnZXhlcztcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEFkZHJlc3MgPSByZXF1aXJlKCcuLi9hZGRyZXNzJyk7XG52YXIgY29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbXBpbGVyJyk7XG5cbi8vIGluaXRpYWxpc2UgdGhlIHN0cmVldCByZWdleGVzXG4vLyB0aGVzZSBhcmUgdGhlIHJlZ2V4ZXMgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgb3Igbm90IGEgc3RyaW5nIGlzIGEgc3RyZWV0XG4vLyBpdCBpcyBpbXBvcnRhbnQgdG8gbm90ZSB0aGF0IHRoZXkgYXJlIHBhcnNlZCB0aHJvdWdoIHRoZSByZVN0cmVldENsZWFuZXJcbi8vIHJlZ2V4IHRvIGJlY29tZSBtb3JlIHN0cmljdFxuLy8gdGhpcyBsaXN0IGhhcyBiZWVuIHNvdXJjZWQgZnJvbTpcbi8vIGh0dHBzOi8vd3d3LnByb3BlcnR5YXNzaXN0LnNhLmdvdi5hdS9wYS9xaGVscC5waHRtbD9jbWQ9c3RyZWV0dHlwZVxuLy9cbi8vIF9fTk9URTpfXyBTb21lIG9mIHRoZSBzdHJlZXQgdHlwZXMgaGF2ZSBiZWVuIGRpc2FibGVkIGR1ZSB0byBjb2xsaXNpb25zXG4vLyB3aXRoIGNvbW1vbiBwYXJ0cyBvZiBzdWJ1cmIgbmFtZXMuICBBdCBzb21lIHBvaW50IHRoZSBzdHJlZXQgcGFyc2VyIG1heSBiZVxuLy8gaW1wcm92ZWQgdG8gZGVhbCB3aXRoIHRoZXNlIGNhc2VzLCBidXQgZm9yIG5vdyB0aGlzIGhhcyBiZWVuIGRlZW1lZFxuLy8gc3VpdGFibGUuXG5cbnZhciBzdHJlZXRSZWdleGVzID0gY29tcGlsZXIoW1xuICAnQUxMRT9ZJywgICAgICAgICAgICAgICAvLyBBTExFWSAvIEFMTFlcbiAgJ0FQUChST0FDSCk/JywgICAgICAgICAgLy8gQVBQUk9BQ0ggLyBBUFBcbiAgJ0FSQyhBREUpPycsICAgICAgICAgICAgLy8gQVJDQURFIC8gQVJDXG4gICdBVihFfEVOVUUpPycsICAgICAgICAgIC8vIEFWRU5VRSAvIEFWIC8gQVZFXG4gICcoQk9VTEVWQVJEfEJMVkQpJywgICAgIC8vIEJPVUxFVkFSRCAvIEJMVkRcbiAgJ0JST1cnLCAgICAgICAgICAgICAgICAgLy8gQlJPV1xuICAnQllQQShTUyk/JywgICAgICAgICAgICAvLyBCWVBBU1MgLyBCWVBBXG4gICdDKEFVU0UpP1dBWScsICAgICAgICAgIC8vIENBVVNFV0FZIC8gQ1dBWVxuICAnKENJUkNVSVR8Q0NUKScsICAgICAgICAvLyBDSVJDVUlUIC8gQ0NUXG4gICdDSVJDKFVTKT8nLCAgICAgICAgICAgIC8vIENJUkNVUyAvIENJUkNcbiAgJ0NMKE9TRSk/JywgICAgICAgICAgICAgLy8gQ0xPU0UgLyBDTFxuICAnQ08/UFNFJywgICAgICAgICAgICAgICAvLyBDT1BTRSAvIENQU0VcbiAgJyhDT1JORVJ8Q05SKScsICAgICAgICAgLy8gQ09STkVSIC8gQ05SXG4gIC8vICdDT1ZFJywgICAgICAgICAgICAgICAgIC8vIENPVkVcbiAgJyhDKChPVVIpfFIpP1R8Q1JUKScsICAgLy8gQ09VUlQgLyBDVCAvQ1JUXG4gICdDUkVTKENFTlQpPycsICAgICAgICAgIC8vIENSRVNDRU5UIC8gQ1JFU1xuICAnRFIoSVZFKT8nLCAgICAgICAgICAgICAvLyBEUklWRSAvIERSXG4gIC8vICdFTkQnLCAgICAgICAgICAgICAgICAgIC8vIEVORFxuICAnRVNQKExBTkFOREUpPycsICAgICAgICAvLyBFU1BMQU5BREUgLyBFU1BcbiAgLy8gJ0ZMQVQnLCAgICAgICAgICAgICAgICAgLy8gRkxBVFxuICAnRihSRUUpP1dBWScsICAgICAgICAgICAvLyBGUkVFV0FZIC8gRldBWVxuICAnKEZST05UQUdFfEZSTlQpJywgICAgICAvLyBGUk9OVEFHRSAvIEZSTlRcbiAgLy8gJyhHQVJERU5TfEdETlMpJywgICAgICAgLy8gR0FSREVOUyAvIEdETlNcbiAgJyhHTEFERXxHTEQpJywgICAgICAgICAgLy8gR0xBREUgLyBHTERcbiAgLy8gJ0dMRU4nLCAgICAgICAgICAgICAgICAgLy8gR0xFTlxuICAnR1IoRUUpP04nLCAgICAgICAgICAgICAvLyBHUkVFTiAvIEdSTlxuICAvLyAnR1IoT1ZFKT8nLCAgICAgICAgICAgICAvLyBHUk9WRSAvIEdSXG4gIC8vICdIKEVJR0gpP1RTJywgICAgICAgICAgIC8vIEhFSUdIVFMgLyBIVFNcbiAgJyhISUdIV0FZfEhXWSknLCAgICAgICAgLy8gSElHSFdBWSAvIEhXWVxuICAnKExBTkV8TE4pJywgICAgICAgICAgICAvLyBMQU5FIC8gTE5cbiAgJ0xJTksnLCAgICAgICAgICAgICAgICAgLy8gTElOS1xuICAnTE9PUCcsICAgICAgICAgICAgICAgICAvLyBMT09QXG4gICdNQUxMJywgICAgICAgICAgICAgICAgIC8vIE1BTExcbiAgJ01FV1MnLCAgICAgICAgICAgICAgICAgLy8gTUVXU1xuICAnKFBBQ0tFVHxQQ0tUKScsICAgICAgICAvLyBQQUNLRVQgLyBQQ0tUXG4gICdQKEFSQSk/REUnLCAgICAgICAgICAgIC8vIFBBUkFERSAvIFBERVxuICAvLyAnUEFSSycsICAgICAgICAgICAgICAgICAvLyBQQVJLXG4gICcoUEFSS1dBWXxQS1dZKScsICAgICAgIC8vIFBBUktXQVkgLyBQS1dZXG4gICdQTChBQ0UpPycsICAgICAgICAgICAgIC8vIFBMQUNFIC8gUExcbiAgJ1BST00oRU5BREUpPycsICAgICAgICAgLy8gUFJPTUVOQURFIC8gUFJPTVxuICAnUkVTKEVSVkUpPycsICAgICAgICAgICAvLyBSRVNFUlZFIC8gUkVTXG4gIC8vICdSST9ER0UnLCAgICAgICAgICAgICAgIC8vIFJJREdFIC8gUkRHRVxuICAnUklTRScsICAgICAgICAgICAgICAgICAvLyBSSVNFXG4gICdSKE9BKT9EJywgICAgICAgICAgICAgIC8vIFJPQUQgLyBSRFxuICAnUk9XJywgICAgICAgICAgICAgICAgICAvLyBST1dcbiAgJ1NRKFVBUkUpPycsICAgICAgICAgICAgLy8gU1FVQVJFIC8gU1FcbiAgJ1NUKFJFRVQpPycsICAgICAgICAgICAgLy8gU1RSRUVUIC8gU1RcbiAgJ1NUUkk/UCcsICAgICAgICAgICAgICAgLy8gU1RSSVAgLyBTVFJQXG4gICdUQVJOJywgICAgICAgICAgICAgICAgIC8vIFRBUk5cbiAgJ1QoRVJSQSk/Q0V8VEVSP1InLCAgICAgLy8gVEVSUkFDRSAvIFRFUiAvIFRFUlIgLyBUQ0VcbiAgJyhUSE9ST1VHSEZBUkV8VEZSRSknLCAgLy8gVEhPUk9VR0hGQVJFIC8gVEZSRVxuICAnVFJBQ0s/JywgICAgICAgICAgICAgICAvLyBUUkFDSyAvIFRSQUNcbiAgJ1RSKEFJKT9MJywgICAgICAgICAgICAgLy8gVFJBSUwgLyBUUkxcbiAgJ1QoUlVOSyk/V0FZJywgICAgICAgICAgLy8gVFJVTktXQVkgLyBUV0FZXG4gIC8vICdWSUVXJywgICAgICAgICAgICAgICAgIC8vIFZJRVdcbiAgJ1ZJP1NUQScsICAgICAgICAgICAgICAgLy8gVklTVEEgLyBWU1RBXG4gICdXQUxLJywgICAgICAgICAgICAgICAgIC8vIFdBTEtcbiAgJ1dBP1knLCAgICAgICAgICAgICAgICAgLy8gV0FZIC8gV1lcbiAgJ1coQUxLKT9XQVknLCAgICAgICAgICAgLy8gV0FMS1dBWSAvIFdXQVlcbiAgJ1lBUkQnLCAgICAgICAgICAgICAgICAgLy8gWUFSRFxuICAnQlJPQURXQVknXG5dKTtcblxudmFyIHJlU3BsaXRTdHJlZXQgPSAvXihOfE5USHxOT1JUSHxFfEVTVHxFQVNUfFN8U1RIfFNPVVRIfFd8V1NUfFdFU1QpXFwsJC9pO1xudmFyIHJlTm9TdHJlZXQgPSBjb21waWxlcihbJ0JST0FEV0FZJ10pLnBvcCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRleHQsIG9wdHMpIHtcbiAgdmFyIGFkZHJlc3MgPSBuZXcgQWRkcmVzcyh0ZXh0LCBvcHRzKTtcblxuICAvLyBjbGVhbiB0aGUgYWRkcmVzc1xuICBhZGRyZXNzXG4gICAgLmNsZWFuKFtcbiAgICAgICAgLy8gcmVtb3ZlIHRyYWlsaW5nIGRvdHMgZnJvbSB0d28gbGV0dGVyIGFiYnJldmlhdGlvbnNcbiAgICAgICAgZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dC5yZXBsYWNlKC8oXFx3ezJ9KVxcLi9nLCAnJDEnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBjb252ZXJ0IHNob3AgdG8gYSB1bml0IGZvcm1hdFxuICAgICAgICBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXHMqU0hPUFxccz8oXFxkKilcXCw/XFxzKi9pLCAnJDEvJyk7XG4gICAgICAgIH1cbiAgICBdKVxuXG4gICAgLy8gc3BsaXQgdGhlIGFkZHJlc3NcbiAgICAuc3BsaXQoL1xccy8pXG5cbiAgICAvLyBleHRyYWN0IHRoZSB1bml0XG4gICAgLmV4dHJhY3QoJ3VuaXQnLCBbXG4gICAgICAgICgvXig/OlxcI3xBUFR8QVBBUlRNRU5UKVxccz8oXFxkKykvKSxcbiAgICAgICAgKC9eKFxcZCspXFwvKC4qKS8pXG4gICAgXSlcblxuICAgIC8vIGV4dHJhY3QgdGhlIHN0cmVldFxuICAgIC5leHRyYWN0U3RyZWV0KHN0cmVldFJlZ2V4ZXMsIHJlU3BsaXRTdHJlZXQsIHJlTm9TdHJlZXQpO1xuXG4gIGlmIChvcHRzICYmIG9wdHMuc3RhdGUpIHtcbiAgICBhZGRyZXNzLmV4dHJhY3QoJ3N0YXRlJywgb3B0cy5zdGF0ZSApO1xuICB9XG5cbiAgaWYgKG9wdHMgJiYgb3B0cy5jb3VudHJ5KSB7XG4gICAgYWRkcmVzcy5leHRyYWN0KCdjb3VudHJ5Jywgb3B0cy5jb3VudHJ5ICk7XG4gIH1cblxuICBpZiAob3B0cyAmJiBvcHRzLnJlUG9zdGFsQ29kZSkge1xuICAgIGFkZHJlc3MuZXh0cmFjdCgncG9zdGFsY29kZScsIFsgb3B0cy5yZVBvc3RhbENvZGUgXSk7XG4gIH1cblxuICAgLy8gdGFrZSByZW1haW5pbmcgdW5rbm93biBwYXJ0cyBhbmQgcHVzaCB0aGVtXG4gICByZXR1cm4gYWRkcmVzcy5maW5hbGl6ZSgpO1xufTtcbiJdfQ==
