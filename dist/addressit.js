(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.addressit = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
      }

      // add the current part to the building parts
      numberParts.unshift(parts.splice(index--, 1));

      // update the test function
      testFn = function() {
        var isAlpha = isNaN(parseInt(parts[index], 10));

        // if we have building parts, then we are looking
        // for non-alpha values, otherwise alpha
        return numberParts ? (! isAlpha) : isAlpha;
      };
    }
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
  }

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

  // skip fields which have already been parsed
  if (this[fieldName]) { return this; }

  var match;
  var rgxIdx;
  var ii;
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
  for (ii = this.parts.length-1; ii >= 0; ii--) {
    for (rgxIdx = 0; rgxIdx < regexes.length; rgxIdx++) {

      // skip fields which have already been parsed
      if (this[fieldName]){ continue; }

      // do not consider the first token for an abbreviated 'state' field
      if (ii === 0 && fieldName === 'state'){
        // only where there are more than one token and the first token
        // is less than or equal to three characters in length.
        if ( this.parts.length > 1 && this.parts[ii].length <= 3 ) {
          continue;
        }
      }

      // execute regex against part
      match = regexes[rgxIdx].exec(this.parts[ii]);

      // if we have a match, then process
      if (match) {
        if (match[2]) {
          // if we have a 2nd capture group, then replace the item with	
          // the text of that group
          this.parts.splice(ii, 1, match[2]);
        } else {
          // otherwise, just remove the element from parts
          this.parts.splice(ii, 1);
        }

        // set the field
        this[fieldName] = lookups[rgxIdx] || match[1];
      }

      // special case for states
      // @todo: add code comments
      else if (fieldName === 'state') {
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
            }

            // set the field
            this[fieldName] = lookups[rgxIdx] || matchMultiplePart[1];
          }
        }
      }
    }
  }

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
        }
      }
    }

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
      }
    }
  }

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
    }
  }

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
  }

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
  'ESP(LANADE)?',        // ESPLANADE / ESP
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92MTYuMTQuMC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImFkZHJlc3MuanMiLCJpbmRleC5qcyIsImxvY2FsZS9lbi1VUy5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvZXh0ZW5kLmpzIiwicGFyc2Vycy9jb21waWxlci5qcyIsInBhcnNlcnMvZW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlTnVtZXJpYyA9IC9eXFxkKyQvO1xuXG4vKipcbiAgIyMjIEFkZHJlc3NcbioqL1xuZnVuY3Rpb24gQWRkcmVzcyh0ZXh0LCBvcHRzKSB7XG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgQWRkcmVzcykpIHtcbiAgICByZXR1cm4gbmV3IEFkZHJlc3ModGV4dCk7XG4gIH1cblxuICB0aGlzLnRleHQgPSB0ZXh0O1xuICB0aGlzLnBhcnRzID0gW107XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQWRkcmVzcztcbnZhciBwcm90byA9IEFkZHJlc3MucHJvdG90eXBlO1xuXG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjX2V4dHJhY3RTdHJlZXRQYXJ0cyhzdGFydEluZGV4KVxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBleHRyYWN0IGZyb20gdGhlIHN0cmVldCB0eXBlIG1hdGNoXG4gIGluZGV4ICpiYWNrIHRvKiB0aGUgc3RyZWV0IG51bWJlciBhbmQgcG9zc2libHkgdW5pdCBudW1iZXIgZmllbGRzLlxuXG4gIFRoZSBmdW5jdGlvbiB3aWxsIHN0YXJ0IHdpdGggdGhlIHN0cmVldCB0eXBlLCB0aGVuIGFsc28gZ3JhYiB0aGUgcHJldmlvdXNcbiAgZmllbGQgcmVnYXJkbGVzcyBvZiBjaGVja3MuICBGaWVsZHMgd2lsbCBjb250aW51ZSB0byBiZSBwdWxsZWQgaW4gdW50aWxcbiAgZmllbGRzIHN0YXJ0IHNhdGlzZnlpbmcgbnVtZXJpYyBjaGVja3MuICBPbmNlIHBvc2l0aXZlIG51bWVyaWMgY2hlY2tzIGFyZVxuICBmaXJpbmcsIHRob3NlIHdpbGwgYmUgYnJvdWdodCBpbiBhcyBidWlsZGluZyAvIHVuaXQgbnVtYmVycyBhbmQgb25jZSB0aGVcbiAgc3RhcnQgb2YgdGhlIHBhcnRzIGFycmF5IGlzIHJlYWNoZWQgb3Igd2UgZmFsbCBiYWNrIHRvIG5vbi1udW1lcmljIGZpZWxkc1xuICB0aGVuIHRoZSBleHRyYWN0aW9uIGlzIHN0b3BwZWQuXG4qKi9cbnByb3RvLl9leHRyYWN0U3RyZWV0UGFydHMgPSBmdW5jdGlvbihzdGFydEluZGV4LCBzdHJlZXRQYXJ0c0xlbmd0aCkge1xuICB2YXIgaW5kZXggPSBzdGFydEluZGV4O1xuICB2YXIgc3RyZWV0UGFydHMgPSBbXTtcbiAgdmFyIG51bWJlclBhcnRzO1xuICB2YXIgcGFydHMgPSB0aGlzLnBhcnRzO1xuICB2YXIgdGVzdEZuID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgd2hpbGUgKGluZGV4ID49IDAgJiYgdGVzdEZuKCkpIHtcbiAgICB2YXIgYWxwaGFQYXJ0ID0gaXNOYU4ocGFyc2VJbnQocGFydHNbaW5kZXhdLCAxMCkpO1xuXG4gICAgaWYgKHN0cmVldFBhcnRzLmxlbmd0aCA8IHN0cmVldFBhcnRzTGVuZ3RoIHx8IGFscGhhUGFydCkge1xuICAgICAgLy8gYWRkIHRoZSBjdXJyZW50IHBhcnQgdG8gdGhlIHN0cmVldCBwYXJ0c1xuICAgICAgc3RyZWV0UGFydHMudW5zaGlmdChwYXJ0cy5zcGxpY2UoaW5kZXgtLSwgMSkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICghIG51bWJlclBhcnRzKSB7XG4gICAgICAgIG51bWJlclBhcnRzID0gW107XG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCB0aGUgY3VycmVudCBwYXJ0IHRvIHRoZSBidWlsZGluZyBwYXJ0c1xuICAgICAgbnVtYmVyUGFydHMudW5zaGlmdChwYXJ0cy5zcGxpY2UoaW5kZXgtLSwgMSkpO1xuXG4gICAgICAvLyB1cGRhdGUgdGhlIHRlc3QgZnVuY3Rpb25cbiAgICAgIHRlc3RGbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaXNBbHBoYSA9IGlzTmFOKHBhcnNlSW50KHBhcnRzW2luZGV4XSwgMTApKTtcblxuICAgICAgICAvLyBpZiB3ZSBoYXZlIGJ1aWxkaW5nIHBhcnRzLCB0aGVuIHdlIGFyZSBsb29raW5nXG4gICAgICAgIC8vIGZvciBub24tYWxwaGEgdmFsdWVzLCBvdGhlcndpc2UgYWxwaGFcbiAgICAgICAgcmV0dXJuIG51bWJlclBhcnRzID8gKCEgaXNBbHBoYSkgOiBpc0FscGhhO1xuICAgICAgfTtcbiAgICB9XG4gIH0gLy8gd2hpbGVcblxuICB0aGlzLm51bWJlciA9IG51bWJlclBhcnRzID8gbnVtYmVyUGFydHMuam9pbignLycpIDogJyc7XG4gIHRoaXMuc3RyZWV0ID0gc3RyZWV0UGFydHMuam9pbignICcpLnJlcGxhY2UoL1xcLC9nLCAnJyk7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI2NsZWFuXG5cbiAgVGhlIGNsZWFuIGZ1bmN0aW9uIGlzIHVzZWQgdG8gY2xlYW4gdXAgYW4gYWRkcmVzcyBzdHJpbmcuICBJdCBpcyBkZXNpZ25lZFxuICB0byByZW1vdmUgYW55IHBhcnRzIG9mIHRoZSB0ZXh0IHRoYXQgcHJldmVuIGVmZmVjdGl2ZSBwYXJzaW5nIG9mIHRoZVxuICBhZGRyZXNzIHN0cmluZy5cbioqL1xucHJvdG8uY2xlYW4gPSBmdW5jdGlvbihjbGVhbmVycykge1xuICAvLyBlbnN1cmUgd2UgaGF2ZSBjbGVhbmVyc1xuICBjbGVhbmVycyA9IGNsZWFuZXJzIHx8IFtdO1xuXG4gIC8vIGFwcGx5IHRoZSBjbGVhbmVyc1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgY2xlYW5lcnMubGVuZ3RoOyBpaSsrKSB7XG4gICAgaWYgKHR5cGVvZiBjbGVhbmVyc1tpaV0gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy50ZXh0ID0gY2xlYW5lcnNbaWldLmNhbGwobnVsbCwgdGhpcy50ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoY2xlYW5lcnNbaWldIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICB0aGlzLnRleHQgPSB0aGlzLnRleHQucmVwbGFjZShjbGVhbmVyc1tpaV0sICcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZXh0cmFjdChmaWVsZE5hbWUsIHJlZ2V4ZXMpXG5cbiAgVGhlIGV4dHJhY3QgZnVuY3Rpb24gaXMgdXNlZCB0byBleHRyYWN0IHRoZSBzcGVjaWZpZWQgZmllbGQgZnJvbSB0aGUgcmF3XG4gIHBhcnRzIHRoYXQgaGF2ZSBwcmV2aW91c2x5IGJlZW4gc3BsaXQgZnJvbSB0aGUgaW5wdXQgdGV4dC4gIElmIHN1Y2Nlc3NmdWxseVxuICBsb2NhdGVkIHRoZW4gdGhlIGZpZWxkIHdpbGwgYmUgdXBkYXRlZCBmcm9tIHRoZSBwYXJ0cyBhbmQgdGhhdCBwYXJ0IHJlbW92ZWRcbiAgZnJvbSB0aGUgcGFydHMgbGlzdC5cbioqL1xucHJvdG8uZXh0cmFjdCA9IGZ1bmN0aW9uKGZpZWxkTmFtZSwgcmVnZXhlcykge1xuXG4gIC8vIHNraXAgZmllbGRzIHdoaWNoIGhhdmUgYWxyZWFkeSBiZWVuIHBhcnNlZFxuICBpZiAodGhpc1tmaWVsZE5hbWVdKSB7IHJldHVybiB0aGlzOyB9XG5cbiAgdmFyIG1hdGNoO1xuICB2YXIgcmd4SWR4O1xuICB2YXIgaWk7XG4gIHZhciBsb29rdXBzID0gW107XG5cbiAgLy8gaWYgdGhlIHJlZ2V4ZXMgaGF2ZSBiZWVuIHBhc3NlZCBpbiBhcyBvYmplY3RzLCB0aGVuIGNvbnZlcnQgdG8gYW4gYXJyYXlcbiAgaWYgKHR5cGVvZiByZWdleGVzID09ICdvYmplY3QnICYmIHR5cGVvZiByZWdleGVzLnNwbGljZSA9PSAndW5kZWZpbmVkJykge1xuICAgIHZhciBuZXdSZWdleGVzID0gW107XG5cbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGtleXMgaW4gdGhlIHJlZ2V4ZXNcbiAgICBmb3IgKHZhciBrZXkgaW4gcmVnZXhlcykge1xuICAgICAgbmV3UmVnZXhlc1tuZXdSZWdleGVzLmxlbmd0aF0gPSByZWdleGVzW2tleV07XG4gICAgICBsb29rdXBzW25ld1JlZ2V4ZXMubGVuZ3RoIC0gMV0gPSBrZXk7XG4gICAgfVxuXG4gICAgLy8gdXBkYXRlIHRoZSByZWdleGVzIHRvIHBvaW50IHRvIHRoZSBuZXcgcmVnZXhlc1xuICAgIHJlZ2V4ZXMgPSBuZXdSZWdleGVzO1xuICB9XG5cbiAgLy8gaXRlcmF0ZSBvdmVyIHRoZSB1bml0IHJlZ2V4ZXMgYW5kIHRlc3QgdGhlbSBhZ2FpbnN0IHRoZSB2YXJpb3VzIHBhcnRzXG4gIGZvciAoaWkgPSB0aGlzLnBhcnRzLmxlbmd0aC0xOyBpaSA+PSAwOyBpaS0tKSB7XG4gICAgZm9yIChyZ3hJZHggPSAwOyByZ3hJZHggPCByZWdleGVzLmxlbmd0aDsgcmd4SWR4KyspIHtcblxuICAgICAgLy8gc2tpcCBmaWVsZHMgd2hpY2ggaGF2ZSBhbHJlYWR5IGJlZW4gcGFyc2VkXG4gICAgICBpZiAodGhpc1tmaWVsZE5hbWVdKXsgY29udGludWU7IH1cblxuICAgICAgLy8gZG8gbm90IGNvbnNpZGVyIHRoZSBmaXJzdCB0b2tlbiBmb3IgYW4gYWJicmV2aWF0ZWQgJ3N0YXRlJyBmaWVsZFxuICAgICAgaWYgKGlpID09PSAwICYmIGZpZWxkTmFtZSA9PT0gJ3N0YXRlJyl7XG4gICAgICAgIC8vIG9ubHkgd2hlcmUgdGhlcmUgYXJlIG1vcmUgdGhhbiBvbmUgdG9rZW4gYW5kIHRoZSBmaXJzdCB0b2tlblxuICAgICAgICAvLyBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gdGhyZWUgY2hhcmFjdGVycyBpbiBsZW5ndGguXG4gICAgICAgIGlmICggdGhpcy5wYXJ0cy5sZW5ndGggPiAxICYmIHRoaXMucGFydHNbaWldLmxlbmd0aCA8PSAzICkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGV4ZWN1dGUgcmVnZXggYWdhaW5zdCBwYXJ0XG4gICAgICBtYXRjaCA9IHJlZ2V4ZXNbcmd4SWR4XS5leGVjKHRoaXMucGFydHNbaWldKTtcblxuICAgICAgLy8gaWYgd2UgaGF2ZSBhIG1hdGNoLCB0aGVuIHByb2Nlc3NcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgMm5kIGNhcHR1cmUgZ3JvdXAsIHRoZW4gcmVwbGFjZSB0aGUgaXRlbSB3aXRoXHRcbiAgICAgICAgICAvLyB0aGUgdGV4dCBvZiB0aGF0IGdyb3VwXG4gICAgICAgICAgdGhpcy5wYXJ0cy5zcGxpY2UoaWksIDEsIG1hdGNoWzJdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBvdGhlcndpc2UsIGp1c3QgcmVtb3ZlIHRoZSBlbGVtZW50IGZyb20gcGFydHNcbiAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzZXQgdGhlIGZpZWxkXG4gICAgICAgIHRoaXNbZmllbGROYW1lXSA9IGxvb2t1cHNbcmd4SWR4XSB8fCBtYXRjaFsxXTtcbiAgICAgIH1cblxuICAgICAgLy8gc3BlY2lhbCBjYXNlIGZvciBzdGF0ZXNcbiAgICAgIC8vIEB0b2RvOiBhZGQgY29kZSBjb21tZW50c1xuICAgICAgZWxzZSBpZiAoZmllbGROYW1lID09PSAnc3RhdGUnKSB7XG4gICAgICAgIHZhciBtYXRjaE11bHRpcGxlUGFydCA9IGZhbHNlO1xuICAgICAgICB2YXIgc3BhY2VzSW5NYXRjaCA9IHJlZ2V4ZXNbcmd4SWR4XS5zb3VyY2Uuc3BsaXQoJ1xcXFxzJykubGVuZ3RoO1xuICAgICAgICBpZiAoc3BhY2VzSW5NYXRjaCA+IDEpIHtcbiAgICAgICAgICB2YXIgbXVsdGlwbGVQYXJ0ID0gW107XG4gICAgICAgICAgZm9yICh2YXIgcGFydEpvaW4gPSBpaTsgcGFydEpvaW4gPiBpaSAtIHNwYWNlc0luTWF0Y2ggJiYgcGFydEpvaW4gPj0gMDsgcGFydEpvaW4tLSkge1xuICAgICAgICAgICAgbXVsdGlwbGVQYXJ0LnB1c2godGhpcy5wYXJ0c1twYXJ0Sm9pbl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtdWx0aXBsZVBhcnQucmV2ZXJzZSgpO1xuICAgICAgICAgIG11bHRpcGxlUGFydCA9IG11bHRpcGxlUGFydC5qb2luKCcgJyk7XG4gICAgICAgICAgbWF0Y2hNdWx0aXBsZVBhcnQgPSByZWdleGVzW3JneElkeF0uZXhlYyhtdWx0aXBsZVBhcnQpO1xuXG4gICAgICAgICAgaWYgKG1hdGNoTXVsdGlwbGVQYXJ0KSB7XG4gICAgICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgMm5kIGNhcHR1cmUgZ3JvdXAsIHRoZW4gcmVwbGFjZSB0aGUgaXRlbSB3aXRoXG4gICAgICAgICAgICAvLyB0aGUgdGV4dCBvZiB0aGF0IGdyb3VwXG4gICAgICAgICAgICBpZiAobWF0Y2hNdWx0aXBsZVBhcnRbMl0pIHtcbiAgICAgICAgICAgICAgdGhpcy5wYXJ0cy5zcGxpY2UoaWkgLSBzcGFjZXNJbk1hdGNoICsgMSwgc3BhY2VzSW5NYXRjaCwgbWF0Y2hNdWx0aXBsZVBhcnRbMl0pO1xuICAgICAgICAgICAgICBpaSAtPSBzcGFjZXNJbk1hdGNoICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwganVzdCByZW1vdmUgdGhlIGVsZW1lbnRcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLnBhcnRzLnNwbGljZShpaSAtIHNwYWNlc0luTWF0Y2ggKyAxLCBzcGFjZXNJbk1hdGNoKTtcbiAgICAgICAgICAgICAgaWkgLT0gc3BhY2VzSW5NYXRjaCArIDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNldCB0aGUgZmllbGRcbiAgICAgICAgICAgIHRoaXNbZmllbGROYW1lXSA9IGxvb2t1cHNbcmd4SWR4XSB8fCBtYXRjaE11bHRpcGxlUGFydFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICAjIyMjIEFkZHJlc3MjZXh0cmFjdFN0cmVldFxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBwYXJzZSB0aGUgYWRkcmVzcyBwYXJ0cyBhbmQgbG9jYXRlIGFueSBwYXJ0c1xuICB0aGF0IGxvb2sgdG8gYmUgcmVsYXRlZCB0byBhIHN0cmVldCBhZGRyZXNzLlxuKiovXG5wcm90by5leHRyYWN0U3RyZWV0ID0gZnVuY3Rpb24ocmVnZXhlcywgcmVTcGxpdFN0cmVldCwgcmVOb1N0cmVldCkge1xuICB2YXIgcmVOdW1lcmljZXNxdWUgPSAvXihcXGQqfFxcZCpcXHcpJC87XG4gIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XG4gIHZhciBzdHJlZXRQYXJ0c0xlbmd0aCA9IDI7XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgcmVnZXhlc1xuICByZWdleGVzID0gcmVnZXhlcyB8fCBbXTtcblxuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gbG9jYXRlIHRoZSBcImJlc3RcIiBzdHJlZXQgcGFydCBpbiBhbiBhZGRyZXNzXG4gIC8vIHN0cmluZy4gIEl0IGlzIGNhbGxlZCBvbmNlIGEgc3RyZWV0IHJlZ2V4IGhhcyBtYXRjaGVkIGFnYWluc3QgYSBwYXJ0XG4gIC8vIHN0YXJ0aW5nIGZyb20gdGhlIGxhc3QgcGFydCBhbmQgd29ya2luZyB0b3dhcmRzIHRoZSBmcm9udC4gSW4gdGVybXMgb2ZcbiAgLy8gd2hhdCBpcyBjb25zaWRlcmVkIHRoZSBiZXN0LCB3ZSBhcmUgbG9va2luZyBmb3IgdGhlIHBhcnQgY2xvc2VzdCB0byB0aGVcbiAgLy8gc3RhcnQgb2YgdGhlIHN0cmluZyB0aGF0IGlzIG5vdCBpbW1lZGlhdGVseSBwcmVmaXhlZCBieSBhIG51bWVyaWNlc3F1ZVxuICAvLyBwYXJ0IChlZy4gMTIzLCA0MkEsIGV0YykuXG4gIGZ1bmN0aW9uIGxvY2F0ZUJlc3RTdHJlZXRQYXJ0KHN0YXJ0SW5kZXgpIHtcbiAgICB2YXIgYmVzdEluZGV4ID0gc3RhcnRJbmRleDtcblxuICAgIC8vIGlmIHRoZSBzdGFydCBpbmRleCBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gMCwgdGhlbiByZXR1cm5cbiAgICBmb3IgKHZhciBpaSA9IHN0YXJ0SW5kZXgtMTsgaWkgPj0gMDsgaWktLSkge1xuICAgICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdHJlZXQgcmVnZXhlcyBhbmQgdGVzdCB0aGVtIGFnYWluc3QgdGhlIHZhcmlvdXMgcGFydHNcbiAgICAgIGZvciAodmFyIHJneElkeCA9IDA7IHJneElkeCA8IHJlZ2V4ZXMubGVuZ3RoOyByZ3hJZHgrKykge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgbWF0Y2gsIHRoZW4gcHJvY2Vzc1xuICAgICAgICBpZiAocmVnZXhlc1tyZ3hJZHhdLnRlc3QocGFydHNbaWldKSAmJiBwYXJ0c1tpaS0xXSAmJiAoISByZU51bWVyaWNlc3F1ZS50ZXN0KHBhcnRzW2lpLTFdKSkpIHtcbiAgICAgICAgICAvLyB1cGRhdGUgdGhlIGJlc3QgaW5kZXggYW5kIGJyZWFrIGZyb20gdGhlIGlubmVyIGxvb3BcbiAgICAgICAgICBiZXN0SW5kZXggPSBpaTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBiZXN0SW5kZXg7XG4gIH0gLy8gbG9jYXRlQmVzdFN0cmVldFBhcnRcblxuICAvLyBpdGVyYXRlIG92ZXIgdGhlIHN0cmVldCByZWdleGVzIGFuZCB0ZXN0IHRoZW0gYWdhaW5zdCB0aGUgdmFyaW91cyBwYXJ0c1xuICBmb3IgKHZhciBwYXJ0SWR4ID0gcGFydHMubGVuZ3RoOyBwYXJ0SWR4LS07ICkge1xuICAgIGZvciAodmFyIHJneElkeCA9IDA7IHJneElkeCA8IHJlZ2V4ZXMubGVuZ3RoOyByZ3hJZHgrKykge1xuICAgICAgLy8gaWYgd2UgaGF2ZSBhIG1hdGNoLCB0aGVuIHByb2Nlc3NcbiAgICAgIC8vIGlmIHRoZSBtYXRjaCBpcyBvbiB0aGUgZmlyc3QgcGFydCB0aG91Z2gsIHJlamVjdCBpdCBhcyB3ZVxuICAgICAgLy8gYXJlIHByb2JhYmx5IGRlYWxpbmcgd2l0aCBhIHRvd24gbmFtZSBvciBzb21ldGhpbmcgKGUuZy4gU3QgR2VvcmdlKVxuICAgICAgaWYgKHJlZ2V4ZXNbcmd4SWR4XS50ZXN0KHBhcnRzW3BhcnRJZHhdKSAmJiBwYXJ0SWR4ID4gMCkge1xuICAgICAgICB2YXIgc3RhcnRJbmRleCA9IGxvY2F0ZUJlc3RTdHJlZXRQYXJ0KHBhcnRJZHgpO1xuXG4gICAgICAgIC8vIGlmIHdlIGFyZSBkZWFsaW5nIHdpdGggYSBzcGxpdCBzdHJlZXQgKGkuZS4gZm9vIHJkIHdlc3QpIGFuZCB0aGVcbiAgICAgICAgLy8gYWRkcmVzcyBwYXJ0cyBhcmUgYXBwcm9wcmlhdGVseSBkZWxpbWl0ZWQsIHRoZW4gZ3JhYiB0aGUgbmV4dCBwYXJ0XG4gICAgICAgIC8vIGFsc29cbiAgICAgICAgaWYgKHJlU3BsaXRTdHJlZXQudGVzdChwYXJ0c1tzdGFydEluZGV4ICsgMV0pKSB7XG4gICAgICAgICAgc3RyZWV0UGFydHNMZW5ndGggPSAzO1xuICAgICAgICAgIHN0YXJ0SW5kZXggKz0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZU5vU3RyZWV0LnRlc3QocGFydHNbc3RhcnRJbmRleF0pKSB7XG4gICAgICAgICAgc3RyZWV0UGFydHNMZW5ndGggPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZXh0cmFjdFN0cmVldFBhcnRzKHN0YXJ0SW5kZXgsIHN0cmVldFBhcnRzTGVuZ3RoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAgIyMjIyBBZGRyZXNzI2ZpbmFsaXplXG5cbiAgVGhlIGZpbmFsaXplIGZ1bmN0aW9uIHRha2VzIGFueSByZW1haW5pbmcgcGFydHMgdGhhdCBoYXZlIG5vdCBiZWVuIGV4dHJhY3RlZFxuICBhcyBvdGhlciBpbmZvcm1hdGlvbiwgYW5kIHB1c2hlcyB0aG9zZSBmaWVsZHMgaW50byBhIGdlbmVyaWMgYHJlZ2lvbnNgIGZpZWxkLlxuKiovXG5wcm90by5maW5hbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAvLyB1cGRhdGUgdGhlIHJlZ2lvbnMsIGRpc2NhcmRpbmcgYW55IGVtcHR5IHN0cmluZ3MuXG4gIHRoaXMucmVnaW9ucyA9IHRoaXMucGFydHMuam9pbignICcpLnNwbGl0KC9cXCxcXHM/LykuZmlsdGVyKGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgIHJldHVybiByZWdpb24ubGVuZ3RoO1xuICB9KTtcblxuICAvLyByZXNldCB0aGUgcGFydHNcbiAgdGhpcy5wYXJ0cyA9IFtdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyNzcGxpdFxuXG4gIFNwbGl0IHRoZSBhZGRyZXNzIGludG8gaXQncyBjb21wb25lbnQgcGFydHMsIGFuZCByZW1vdmUgYW55IGVtcHR5IHBhcnRzXG4qKi9cbnByb3RvLnNwbGl0ID0gZnVuY3Rpb24oc2VwYXJhdG9yKSB7XG4gIC8vIHNwbGl0IHRoZSBzdHJpbmdcbiAgdmFyIG5ld1BhcnRzID0gdGhpcy50ZXh0LnNwbGl0KHNlcGFyYXRvciB8fCAnICcpO1xuXG4gIHRoaXMucGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5ld1BhcnRzLmxlbmd0aDsgaWkrKykge1xuICAgIGlmIChuZXdQYXJ0c1tpaV0pIHtcbiAgICAgIHRoaXMucGFydHNbdGhpcy5wYXJ0cy5sZW5ndGhdID0gbmV3UGFydHNbaWldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gICMjIyMgQWRkcmVzcyN0b1N0cmluZ1xuXG4gIENvbnZlcnQgdGhlIGFkZHJlc3MgdG8gYSBzdHJpbmcgcmVwcmVzZW50YXRpb25cbioqL1xucHJvdG8udG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG91dHB1dCA9ICcnO1xuXG4gIGlmICh0aGlzLmJ1aWxkaW5nKSB7XG4gICAgb3V0cHV0ICs9IHRoaXMuYnVpbGRpbmcgKyAnXFxuJztcbiAgfVxuXG4gIGlmICh0aGlzLnN0cmVldCkge1xuICAgIG91dHB1dCArPSB0aGlzLm51bWJlciA/IHRoaXMubnVtYmVyICsgJyAnIDogJyc7XG4gICAgb3V0cHV0ICs9IHRoaXMuc3RyZWV0ICsgJ1xcbic7XG4gIH1cblxuICBvdXRwdXQgKz0gdGhpcy5yZWdpb25zLmpvaW4oJywgJykgKyAnXFxuJztcblxuICByZXR1cm4gb3V0cHV0O1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIGFkZHJlc3NpdFxuXG4gIEFkZHJlc3NJdCBpcyBhIGZyZWVmb3JtIHN0cmVldCBhZGRyZXNzIHBhcnNlciwgdGhhdCBpcyBkZXNpZ25lZCB0byB0YWtlIGFcbiAgcGllY2Ugb2YgdGV4dCBhbmQgY29udmVydCB0aGF0IGludG8gYSBzdHJ1Y3R1cmVkIGFkZHJlc3MgdGhhdCBjYW4gYmVcbiAgcHJvY2Vzc2VkIGluIGRpZmZlcmVudCBzeXN0ZW1zLlxuXG4gIFRoZSBmb2NhbCBwb2ludCBvZiBgYWRkcmVzc2l0YCBpcyBvbiB0aGUgc3RyZWV0IHBhcnNpbmcgY29tcG9uZW50LCByYXRoZXJcbiAgdGhhbiBhdHRlbXB0aW5nIHRvIGFwcHJvcHJpYXRlbHkgaWRlbnRpZnkgdmFyaW91cyBzdGF0ZXMsIGNvdW50aWVzLCB0b3ducyxcbiAgZXRjLCBhcyB0aGVzZSB2YXJ5IGZyb20gY291bnRyeSB0byBjb3VudHJ5IGZhaXJseSBkcmFtYXRpY2FsbHkuIFRoZXNlXG4gIGRldGFpbHMgYXJlIGluc3RlYWQgcHV0IGludG8gYSBnZW5lcmljIHJlZ2lvbnMgYXJyYXkgdGhhdCBjYW4gYmUgZnVydGhlclxuICBwYXJzZWQgYmFzZWQgb24geW91ciBhcHBsaWNhdGlvbiBuZWVkcy5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgVGhlIGZvbGxvd2luZyBpcyBhIHNpbXBsZSBleGFtcGxlIG9mIGhvdyBhZGRyZXNzIGl0IGNhbiBiZSB1c2VkOlxuXG4gIGBgYGpzXG4gIHZhciBhZGRyZXNzaXQgPSByZXF1aXJlKCdhZGRyZXNzaXQnKTtcblxuICAvLyBwYXJzZSBhIG1hZGUgdXAgYWRkcmVzcywgd2l0aCBzb21lIHNsaWdodGx5IHRyaWNreSBwYXJ0c1xuICB2YXIgYWRkcmVzcyA9IGFkZHJlc3NpdCgnU2hvcCA4LCA0MzEgU3QgS2lsZGEgUmQgTWVsYm91cm5lJyk7XG4gIGBgYFxuXG4gIFRoZSBgYWRkcmVzc2Agb2JqZWN0IHdvdWxkIG5vdyBjb250YWluIHRoZSBmb2xsb3dpbmcgaW5mb3JtYXRpb246XG5cbiAgYGBgXG4gIHsgdGV4dDogJzgvNDMxIFNUIEtJTERBIFJEIE1FTEJPVVJORScsXG4gICAgcGFydHM6IFtdLFxuICAgIHVuaXQ6IDgsXG4gICAgY291bnRyeTogdW5kZWZpbmVkLFxuICAgIG51bWJlcjogNDMxLFxuICAgIHN0cmVldDogJ1NUIEtJTERBIFJEJyxcbiAgICByZWdpb25zOiBbICdNRUxCT1VSTkUnIF0gfVxuICBgYGBcblxuICBGb3IgbW9yZSBleGFtcGxlcywgc2VlIHRoZSB0ZXN0cy5cblxuICAjIyBSZWZlcmVuY2VcblxuKiovXG5cbi8qKlxuICAjIyMgYWRkcmVzc2l0KGlucHV0LCBvcHRzPylcblxuICBSdW4gdGhlIGFkZHJlc3MgcGFyc2VyIGZvciB0aGUgZ2l2ZW4gaW5wdXQuICBPcHRpb25hbCBgb3B0c2AgY2FuIGJlXG4gIHN1cHBsaWVkIGlmIHlvdSB3YW50IHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0IChFTikgcGFyc2VyLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQsIG9wdHMpIHtcbiAgLy8gaWYgbm8gbG9jYWxlIGhhcyBiZWVuIHNwZWNpZmllZCwgdGhlbiB1c2UgdGhlIGRlZmF1bHQgdmFuaWxsYSBlbiBsb2NhbGVcbiAgdmFyIHBhcnNlID0gKG9wdHMgfHwge30pLmxvY2FsZSB8fCByZXF1aXJlKCcuL2xvY2FsZS9lbi1VUycpO1xuXG4gIC8vIHBhcnNlIHRoZSBhZGRyZXNzXG4gIHJldHVybiBwYXJzZShpbnB1dCwgb3B0cyk7XG59O1xuIiwidmFyIHBhcnNlciA9IHJlcXVpcmUoJy4uL3BhcnNlcnMvZW4uanMnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQsIG9wdHMpIHtcbiAgLy8gcGFyc2UgdGhlIGJhc2UgYWRkcmVzc1xuICByZXR1cm4gcGFyc2VyKGlucHV0LCBleHRlbmQoeyBcbiAgXHRzdGF0ZToge1xuXHQgICAgQUw6IC8oXmFsYWJhbWF8XkFMJCkvaSxcblx0ICAgIEFLOiAvKF5hbGFza2F8XkFLJCkvaSxcblx0ICAgIEFTOiAvKF5hbWVyaWNhblxcc3NhbW9hfF5BUyQpL2ksXG5cdCAgICBBWjogLyheYXJpem9uYXxeQVokKS9pLFxuXHQgICAgQVI6IC8oXmFya2Fuc2FzfF5BUiQpL2ksXG5cdCAgICBDQTogLyheY2FsaWZvcm5pYXxeQ0EkKS9pLFxuXHQgICAgQ086IC8oXmNvbG9yYWRvfF5DTyQpL2ksXG5cdCAgICBDVDogLyheY29ubmVjdGljdXR8XkNUJCkvaSxcblx0ICAgIERFOiAvKF5kZWxhd2FyZXxeREUkKS9pLFxuXHQgICAgREM6IC8oXmRpc3RyaWN0XFxzb2ZcXHNjb2x1bWJpYXxeREMkKS9pLFxuXHQgICAgRk06IC8oXmZlZGVyYXRlZFxcc3N0YXRlc1xcc29mXFxzbWljcm9uZXNpYXxeRk0kKS9pLFxuXHQgICAgRkw6IC8oXmZsb3JpZGF8XkZMJCkvaSxcblx0ICAgIEdBOiAvKF5nZW9yZ2lhfF5HQSQpL2ksXG5cdCAgICBHVTogLyheZ3VhbXxeR1UkKS9pLFxuXHQgICAgSEk6IC8oXmhhd2FpaXxeSEkkKS9pLFxuXHQgICAgSUQ6IC8oXmlkYWhvfF5JRCQpL2ksXG5cdCAgICBJTDogLyheaWxsaW5vaXN8XklMJCkvaSxcblx0ICAgIElOOiAvKF5pbmRpYW5hfF5JTiQpL2ksXG5cdCAgICBJQTogLyheaW93YXxeSUEkKS9pLFxuXHQgICAgS1M6IC8oXmthbnNhc3xeS1MkKS9pLFxuXHQgICAgS1k6IC8oXmtlbnR1Y2t5fF5LWSQpL2ksXG5cdCAgICBMQTogLyhebG91aXNpYW5hfF5MQSQpL2ksXG5cdCAgICBNRTogLyhebWFpbmV8Xk1FJCkvaSxcblx0ICAgIE1IOiAvKF5tYXJzaGFsbFxcc2lzbGFuZHN8Xk1IJCkvaSxcblx0ICAgIE1EOiAvKF5tYXJ5bGFuZHxeTUQkKS9pLFxuXHQgICAgTUE6IC8oXm1hc3NhY2h1c2V0dHN8Xk1BJCkvaSxcblx0ICAgIE1JOiAvKF5taWNoaWdhbnxeTUkkKS9pLFxuXHQgICAgTU46IC8oXm1pbm5lc290YXxeTU4kKS9pLFxuXHQgICAgTVM6IC8oXm1pc3Npc3NpcHBpfF5NUyQpL2ksXG5cdCAgICBNTzogLyhebWlzc291cml8Xk1PJCkvaSxcblx0ICAgIE1UOiAvKF5tb250YW5hfF5NVCQpL2ksXG5cdCAgICBORTogLyhebmVicmFza2F8Xk5FJCkvaSxcblx0ICAgIE5WOiAvKF5uZXZhZGF8Xk5WJCkvaSxcblx0ICAgIE5IOiAvKF5uZXdcXHNoYW1wc2hpcmV8Xk5IJCkvaSxcblx0ICAgIE5KOiAvKF5uZXdcXHNqZXJzZXl8Xk5KJCkvaSxcblx0ICAgIE5NOiAvKF5uZXdcXHNtZXhpY298Xk5NJCkvaSxcblx0ICAgIE5ZOiAvKF5uZXdcXHN5b3JrfF5OWSQpL2ksXG5cdCAgICBOQzogLyhebm9ydGhcXHNjYXJvbGluYXxeTkMkKS9pLFxuXHQgICAgTkQ6IC8oXm5vcnRoXFxzZGFrb3RhfF5ORCQpL2ksXG5cdCAgICBNUDogLyhebm9ydGhlcm5cXHNtYXJpYW5hXFxzaXNsYW5kc3xeTVAkKS9pLFxuXHQgICAgT0g6IC8oXm9oaW98Xk9IJCkvaSxcblx0ICAgIE9LOiAvKF5va2xhaG9tYXxeT0skKS9pLFxuXHQgICAgT1I6IC8oXm9yZWdvbnxeT1IkKS9pLFxuXHQgICAgUFc6IC8oXnBhbGF1fF5QVyQpL2ksXG5cdCAgICBQQTogLyhecGVubnN5bHZhbmlhfF5QQSQpL2ksXG5cdCAgICBQUjogLyhecHVlcnRvXFxzcmljb3xeUFIkKS9pLFxuXHQgICAgUkk6IC8oXnJob2RlXFxzaXNsYW5kfF5SSSQpL2ksXG5cdCAgICBTQzogLyhec291dGhcXHNjYXJvbGluYXxeU0MkKS9pLFxuXHQgICAgU0Q6IC8oXnNvdXRoXFxzZGFrb3RhfF5TRCQpL2ksXG5cdCAgICBUTjogLyhedGVubmVzc2VlfF5UTiQpL2ksXG5cdCAgICBUWDogLyhedGV4YXN8XlRYJCkvaSxcblx0ICAgIFVUOiAvKF51dGFofF5VVCQpL2ksXG5cdCAgICBWVDogLyhedmVybW9udHxeVlQkKS9pLFxuXHQgICAgVkk6IC8oXnZpcmdpblxcc2lzbGFuZHN8XlZJJCkvaSxcblx0ICAgIFZBOiAvKF52aXJnaW5pYXxeVkEkKS9pLFxuXHQgICAgV0E6IC8oXndhc2hpbmd0b258XldBJCkvaSxcblx0ICAgIFdWOiAvKF53ZXN0XFxzdmlyZ2luaWF8XldWJCkvaSxcblx0ICAgIFdJOiAvKF53aXNjb25zaW58XldJJCkvaSxcblx0ICAgIFdZOiAvKF53eW9taW5nfF5XWSQpL2lcbiAgXHR9LFxuICBcdGNvdW50cnk6IHtcbiAgICAgICAgVVNBOiAvKF5VTklURURcXHNTVEFURVN8XlVcXC4/U1xcLj9BPyQpL2lcbiAgICB9LFxuICAgIHJlUG9zdGFsQ29kZTogLyheXFxkezV9JCl8KF5cXGR7NX0tXFxkezR9JCkvIH0sIG9wdHMpKTtcbiAgICAgICAgICAgICAgIC8vIFBvc3RhbCBjb2RlcyBvZiB0aGUgZm9ybSAnREREREQtRERERCcgb3IganVzdCAnREREREQnXG4gICAgICAgICAgICAgICAvLyAxMDAxMCBpcyB2YWxpZCBhbmQgc28gaXMgMTAwMTAtMTIzNFxufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGV4dFJlZ2V4ZXMpIHtcbiAgdmFyIHJlZ2V4ZXMgPSBbXTtcbiAgdmFyIHJlU3RyZWV0Q2xlYW5lciA9IC9eXFxePyguKilcXCw/XFwkPyQvO1xuICB2YXIgaWk7XG5cbiAgZm9yIChpaSA9IHRleHRSZWdleGVzLmxlbmd0aDsgaWktLTsgKSB7XG4gICAgcmVnZXhlc1tpaV0gPSBuZXcgUmVnRXhwKFxuICAgICAgdGV4dFJlZ2V4ZXNbaWldLnJlcGxhY2UocmVTdHJlZXRDbGVhbmVyLCAnXiQxXFwsPyQnKSxcbiAgICAgICdpJ1xuICAgICk7XG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIHJlZ2V4ZXM7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBBZGRyZXNzID0gcmVxdWlyZSgnLi4vYWRkcmVzcycpO1xudmFyIGNvbXBpbGVyID0gcmVxdWlyZSgnLi9jb21waWxlcicpO1xuXG4vLyBpbml0aWFsaXNlIHRoZSBzdHJlZXQgcmVnZXhlc1xuLy8gdGhlc2UgYXJlIHRoZSByZWdleGVzIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIG9yIG5vdCBhIHN0cmluZyBpcyBhIHN0cmVldFxuLy8gaXQgaXMgaW1wb3J0YW50IHRvIG5vdGUgdGhhdCB0aGV5IGFyZSBwYXJzZWQgdGhyb3VnaCB0aGUgcmVTdHJlZXRDbGVhbmVyXG4vLyByZWdleCB0byBiZWNvbWUgbW9yZSBzdHJpY3Rcbi8vIHRoaXMgbGlzdCBoYXMgYmVlbiBzb3VyY2VkIGZyb206XG4vLyBodHRwczovL3d3dy5wcm9wZXJ0eWFzc2lzdC5zYS5nb3YuYXUvcGEvcWhlbHAucGh0bWw/Y21kPXN0cmVldHR5cGVcbi8vXG4vLyBfX05PVEU6X18gU29tZSBvZiB0aGUgc3RyZWV0IHR5cGVzIGhhdmUgYmVlbiBkaXNhYmxlZCBkdWUgdG8gY29sbGlzaW9uc1xuLy8gd2l0aCBjb21tb24gcGFydHMgb2Ygc3VidXJiIG5hbWVzLiAgQXQgc29tZSBwb2ludCB0aGUgc3RyZWV0IHBhcnNlciBtYXkgYmVcbi8vIGltcHJvdmVkIHRvIGRlYWwgd2l0aCB0aGVzZSBjYXNlcywgYnV0IGZvciBub3cgdGhpcyBoYXMgYmVlbiBkZWVtZWRcbi8vIHN1aXRhYmxlLlxuXG52YXIgc3RyZWV0UmVnZXhlcyA9IGNvbXBpbGVyKFtcbiAgJ0FMTEU/WScsICAgICAgICAgICAgICAgLy8gQUxMRVkgLyBBTExZXG4gICdBUFAoUk9BQ0gpPycsICAgICAgICAgIC8vIEFQUFJPQUNIIC8gQVBQXG4gICdBUkMoQURFKT8nLCAgICAgICAgICAgIC8vIEFSQ0FERSAvIEFSQ1xuICAnQVYoRXxFTlVFKT8nLCAgICAgICAgICAvLyBBVkVOVUUgLyBBViAvIEFWRVxuICAnKEJPVUxFVkFSRHxCTFZEKScsICAgICAvLyBCT1VMRVZBUkQgLyBCTFZEXG4gICdCUk9XJywgICAgICAgICAgICAgICAgIC8vIEJST1dcbiAgJ0JZUEEoU1MpPycsICAgICAgICAgICAgLy8gQllQQVNTIC8gQllQQVxuICAnQyhBVVNFKT9XQVknLCAgICAgICAgICAvLyBDQVVTRVdBWSAvIENXQVlcbiAgJyhDSVJDVUlUfENDVCknLCAgICAgICAgLy8gQ0lSQ1VJVCAvIENDVFxuICAnQ0lSQyhVUyk/JywgICAgICAgICAgICAvLyBDSVJDVVMgLyBDSVJDXG4gICdDTChPU0UpPycsICAgICAgICAgICAgIC8vIENMT1NFIC8gQ0xcbiAgJ0NPP1BTRScsICAgICAgICAgICAgICAgLy8gQ09QU0UgLyBDUFNFXG4gICcoQ09STkVSfENOUiknLCAgICAgICAgIC8vIENPUk5FUiAvIENOUlxuICAvLyAnQ09WRScsICAgICAgICAgICAgICAgICAvLyBDT1ZFXG4gICcoQygoT1VSKXxSKT9UfENSVCknLCAgIC8vIENPVVJUIC8gQ1QgL0NSVFxuICAnQ1JFUyhDRU5UKT8nLCAgICAgICAgICAvLyBDUkVTQ0VOVCAvIENSRVNcbiAgJ0RSKElWRSk/JywgICAgICAgICAgICAgLy8gRFJJVkUgLyBEUlxuICAvLyAnRU5EJywgICAgICAgICAgICAgICAgICAvLyBFTkRcbiAgJ0VTUChMQU5BREUpPycsICAgICAgICAvLyBFU1BMQU5BREUgLyBFU1BcbiAgLy8gJ0ZMQVQnLCAgICAgICAgICAgICAgICAgLy8gRkxBVFxuICAnRihSRUUpP1dBWScsICAgICAgICAgICAvLyBGUkVFV0FZIC8gRldBWVxuICAnKEZST05UQUdFfEZSTlQpJywgICAgICAvLyBGUk9OVEFHRSAvIEZSTlRcbiAgLy8gJyhHQVJERU5TfEdETlMpJywgICAgICAgLy8gR0FSREVOUyAvIEdETlNcbiAgJyhHTEFERXxHTEQpJywgICAgICAgICAgLy8gR0xBREUgLyBHTERcbiAgLy8gJ0dMRU4nLCAgICAgICAgICAgICAgICAgLy8gR0xFTlxuICAnR1IoRUUpP04nLCAgICAgICAgICAgICAvLyBHUkVFTiAvIEdSTlxuICAvLyAnR1IoT1ZFKT8nLCAgICAgICAgICAgICAvLyBHUk9WRSAvIEdSXG4gIC8vICdIKEVJR0gpP1RTJywgICAgICAgICAgIC8vIEhFSUdIVFMgLyBIVFNcbiAgJyhISUdIV0FZfEhXWSknLCAgICAgICAgLy8gSElHSFdBWSAvIEhXWVxuICAnKExBTkV8TE4pJywgICAgICAgICAgICAvLyBMQU5FIC8gTE5cbiAgJ0xJTksnLCAgICAgICAgICAgICAgICAgLy8gTElOS1xuICAnTE9PUCcsICAgICAgICAgICAgICAgICAvLyBMT09QXG4gICdNQUxMJywgICAgICAgICAgICAgICAgIC8vIE1BTExcbiAgJ01FV1MnLCAgICAgICAgICAgICAgICAgLy8gTUVXU1xuICAnKFBBQ0tFVHxQQ0tUKScsICAgICAgICAvLyBQQUNLRVQgLyBQQ0tUXG4gICdQKEFSQSk/REUnLCAgICAgICAgICAgIC8vIFBBUkFERSAvIFBERVxuICAvLyAnUEFSSycsICAgICAgICAgICAgICAgICAvLyBQQVJLXG4gICcoUEFSS1dBWXxQS1dZKScsICAgICAgIC8vIFBBUktXQVkgLyBQS1dZXG4gICdQTChBQ0UpPycsICAgICAgICAgICAgIC8vIFBMQUNFIC8gUExcbiAgJ1BST00oRU5BREUpPycsICAgICAgICAgLy8gUFJPTUVOQURFIC8gUFJPTVxuICAnUkVTKEVSVkUpPycsICAgICAgICAgICAvLyBSRVNFUlZFIC8gUkVTXG4gIC8vICdSST9ER0UnLCAgICAgICAgICAgICAgIC8vIFJJREdFIC8gUkRHRVxuICAnUklTRScsICAgICAgICAgICAgICAgICAvLyBSSVNFXG4gICdSKE9BKT9EJywgICAgICAgICAgICAgIC8vIFJPQUQgLyBSRFxuICAnUk9XJywgICAgICAgICAgICAgICAgICAvLyBST1dcbiAgJ1NRKFVBUkUpPycsICAgICAgICAgICAgLy8gU1FVQVJFIC8gU1FcbiAgJ1NUKFJFRVQpPycsICAgICAgICAgICAgLy8gU1RSRUVUIC8gU1RcbiAgJ1NUUkk/UCcsICAgICAgICAgICAgICAgLy8gU1RSSVAgLyBTVFJQXG4gICdUQVJOJywgICAgICAgICAgICAgICAgIC8vIFRBUk5cbiAgJ1QoRVJSQSk/Q0V8VEVSP1InLCAgICAgLy8gVEVSUkFDRSAvIFRFUiAvIFRFUlIgLyBUQ0VcbiAgJyhUSE9ST1VHSEZBUkV8VEZSRSknLCAgLy8gVEhPUk9VR0hGQVJFIC8gVEZSRVxuICAnVFJBQ0s/JywgICAgICAgICAgICAgICAvLyBUUkFDSyAvIFRSQUNcbiAgJ1RSKEFJKT9MJywgICAgICAgICAgICAgLy8gVFJBSUwgLyBUUkxcbiAgJ1QoUlVOSyk/V0FZJywgICAgICAgICAgLy8gVFJVTktXQVkgLyBUV0FZXG4gIC8vICdWSUVXJywgICAgICAgICAgICAgICAgIC8vIFZJRVdcbiAgJ1ZJP1NUQScsICAgICAgICAgICAgICAgLy8gVklTVEEgLyBWU1RBXG4gICdXQUxLJywgICAgICAgICAgICAgICAgIC8vIFdBTEtcbiAgJ1dBP1knLCAgICAgICAgICAgICAgICAgLy8gV0FZIC8gV1lcbiAgJ1coQUxLKT9XQVknLCAgICAgICAgICAgLy8gV0FMS1dBWSAvIFdXQVlcbiAgJ1lBUkQnLCAgICAgICAgICAgICAgICAgLy8gWUFSRFxuICAnQlJPQURXQVknXG5dKTtcblxudmFyIHJlU3BsaXRTdHJlZXQgPSAvXihOfE5USHxOT1JUSHxFfEVTVHxFQVNUfFN8U1RIfFNPVVRIfFd8V1NUfFdFU1QpXFwsJC9pO1xudmFyIHJlTm9TdHJlZXQgPSBjb21waWxlcihbJ0JST0FEV0FZJ10pLnBvcCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRleHQsIG9wdHMpIHtcbiAgdmFyIGFkZHJlc3MgPSBuZXcgQWRkcmVzcyh0ZXh0LCBvcHRzKTtcblxuICAvLyBjbGVhbiB0aGUgYWRkcmVzc1xuICBhZGRyZXNzXG4gICAgLmNsZWFuKFtcbiAgICAgICAgLy8gcmVtb3ZlIHRyYWlsaW5nIGRvdHMgZnJvbSB0d28gbGV0dGVyIGFiYnJldmlhdGlvbnNcbiAgICAgICAgZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dC5yZXBsYWNlKC8oXFx3ezJ9KVxcLi9nLCAnJDEnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBjb252ZXJ0IHNob3AgdG8gYSB1bml0IGZvcm1hdFxuICAgICAgICBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXHMqU0hPUFxccz8oXFxkKilcXCw/XFxzKi9pLCAnJDEvJyk7XG4gICAgICAgIH1cbiAgICBdKVxuXG4gICAgLy8gc3BsaXQgdGhlIGFkZHJlc3NcbiAgICAuc3BsaXQoL1xccy8pXG5cbiAgICAvLyBleHRyYWN0IHRoZSB1bml0XG4gICAgLmV4dHJhY3QoJ3VuaXQnLCBbXG4gICAgICAgICgvXig/OlxcI3xBUFR8QVBBUlRNRU5UKVxccz8oXFxkKykvKSxcbiAgICAgICAgKC9eKFxcZCspXFwvKC4qKS8pXG4gICAgXSlcblxuICAgIC8vIGV4dHJhY3QgdGhlIHN0cmVldFxuICAgIC5leHRyYWN0U3RyZWV0KHN0cmVldFJlZ2V4ZXMsIHJlU3BsaXRTdHJlZXQsIHJlTm9TdHJlZXQpO1xuXG4gIGlmIChvcHRzICYmIG9wdHMuc3RhdGUpIHtcbiAgICBhZGRyZXNzLmV4dHJhY3QoJ3N0YXRlJywgb3B0cy5zdGF0ZSApO1xuICB9XG5cbiAgaWYgKG9wdHMgJiYgb3B0cy5jb3VudHJ5KSB7XG4gICAgYWRkcmVzcy5leHRyYWN0KCdjb3VudHJ5Jywgb3B0cy5jb3VudHJ5ICk7XG4gIH1cblxuICBpZiAob3B0cyAmJiBvcHRzLnJlUG9zdGFsQ29kZSkge1xuICAgIGFkZHJlc3MuZXh0cmFjdCgncG9zdGFsY29kZScsIFsgb3B0cy5yZVBvc3RhbENvZGUgXSk7XG4gIH1cblxuICAgLy8gdGFrZSByZW1haW5pbmcgdW5rbm93biBwYXJ0cyBhbmQgcHVzaCB0aGVtXG4gICByZXR1cm4gYWRkcmVzcy5maW5hbGl6ZSgpO1xufTtcbiJdfQ==
