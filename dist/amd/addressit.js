
define('addressit', [], function() {
    var locales = {};
    
    function Address(text) {
        this.text = text;
        this.parts = [];
    }
    
    Address.prototype = {
        // This function is used to extract from the street type match
        // index *back to* the street number and possibly unit number fields.
        // The function will start with the street type, then also grab the 
        // previous field regardless of checks.  Fields will continue to be 
        // pulled in until fields start satisfying numeric checks.  Once 
        // positive numeric checks are firing, those will be brought in as
        // building / unit numbers and once the start of the parts array is
        // reached or we fall back to non-numeric fields then the extraction
        // is stopped.
        _extractStreetParts: function(startIndex) {
            var index = startIndex,
                streetParts = [],
                numberParts,
                parts = this.parts,
                reNumeric = /^\d+$/,
                testFn = function() { return true; };
                
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
        },
        
        /**
        ## clean
        
        The clean function is used to clean up an address string.  It is designed
        to remove any parts of the text that preven effective parsing of the 
        address string.
        */
        clean: function(cleaners) {
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
        },
        
        /**
        ## extract(fieldName, regexes)
        
        The extract function is used to extract the specified field from the raw 
        parts that have previously been split from the input text.  If successfully 
        located then the field will be updated from the parts and that part removed
        from the parts list.
        */
        extract: function(fieldName, regexes) {
            var match, rgxIdx, ii, 
                value, lookups = [];
            
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
        },
        
        /**
        ## extractStreet
        
        This function is used to parse the address parts and locate any parts
        that look to be related to a street address.
        */
        extractStreet: function(regexes, reSplitStreet) {
            var reNumericesque = /^(\d*|\d*\w)$/,
                parts = this.parts;
            
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
        },
        
        /**
        ## finalize
        
        The finalize function takes any remaining parts that have not been extracted
        as other information, and pushes those fields into a generic `regions` field.
        */
        finalize: function() {
            // update the regions
            this.regions = this.parts.join(' ').split(/\,\s?/);
            
            // reset the parts
            this.parts = [];
            
            return this;
        },
        
        /**
        ## split
        
        Split the address into it's component parts, and remove any empty parts
        */
        split: function(separator) {
            // split the string
            var newParts = this.text.split(separator || ' ');
    
            this.parts = [];
            for (var ii = 0; ii < newParts.length; ii++) {
                if (newParts[ii]) {
                    this.parts[this.parts.length] = newParts[ii];
                } // if
            } // for
    
            return this;
        },
    
        /**
        ## toString
        
        Convert the address to a string representation
        */
        toString: function() {
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
        }
    };
    function AddressParser() {
    }
    
    AddressParser.prototype.accept = function(text) {
        return new Address(text);
    };
    
    AddressParser.prototype.compile = function(textRegexes) {
        var regexes = [],
            reStreetCleaner = /^\^?(.*)\,?\$?$/;
        
        for (var ii = textRegexes.length; ii--; ) {
            regexes[ii] = new RegExp(textRegexes[ii].replace(reStreetCleaner, '^$1\,?$'));
        } // for
        
        return regexes;
    };
    
    function addressit(input, locale) {
        var parser;
        
        // update the locale
        locale = (locale || '').toUpperCase();
    
        // get the parser for the locale
        parser = locales[locale] || locales.EN;
    
        // parse the address
        return parser(input);
    }
    
    addressit.locales = locales;
    
    (function(_locales) {
    
        var parser = new AddressParser(),
        
            // these are the regexes for determining whether or not a string is a street
            // it is important to note that they are parsed through the reStreetCleaner
            // regex to become more strict
            // this list has been sourced from: 
            // https://www.propertyassist.sa.gov.au/pa/qhelp.phtml?cmd=streettype
            // 
            // __NOTE:__ Some of the street types have been disabled due to collisions with 
            // common parts of suburb names.  At some point the street parser may be improved
            // to deal with these cases, but for now this has been deemed suitable
            streetRegexes = parser.compile([
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
            ]),
            reSplitStreet = /^(N|NTH|NORTH|E|EST|EAST|S|STH|SOUTH|W|WST|WEST)\,$/i;
    
        _locales.EN = function(text) {
            return parser
                .accept(text)
                
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
        }; // EN parser
    })(typeof addressit != 'undefined' ? addressit.locales : (typeof module != 'undefined' ? module.exports : {}));
    
    return typeof addressit != 'undefined' ? addressit : undefined;
});