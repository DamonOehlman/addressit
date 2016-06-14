# addressit

AddressIt is a freeform street address parser, that is designed to take a
piece of text and convert that into a structured address that can be
processed in different systems.

The focal point of `addressit` is on the street parsing component, rather
than attempting to appropriately identify various states, counties, towns,
etc, as these vary from country to country fairly dramatically. These
details are instead put into a generic regions array that can be further
parsed based on your application needs.


[![NPM](https://nodei.co/npm/addressit.png)](https://nodei.co/npm/addressit/)

[![stable](https://img.shields.io/badge/stability-stable-green.svg)](https://github.com/dominictarr/stability#stable) [![Build Status](https://api.travis-ci.org/DamonOehlman/addressit.svg?branch=master)](https://travis-ci.org/DamonOehlman/addressit) [![bitHound Score](https://www.bithound.io/github/DamonOehlman/addressit/badges/score.svg)](https://www.bithound.io/github/DamonOehlman/addressit) 

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

### addressit(input, opts?)

Run the address parser for the given input.  Optional `opts` can be
supplied if you want to override the default (EN) parser.

### Address

#### Address#_extractStreetParts(startIndex)

This function is used to extract from the street type match
index *back to* the street number and possibly unit number fields.

The function will start with the street type, then also grab the previous
field regardless of checks.  Fields will continue to be pulled in until
fields start satisfying numeric checks.  Once positive numeric checks are
firing, those will be brought in as building / unit numbers and once the
start of the parts array is reached or we fall back to non-numeric fields
then the extraction is stopped.

#### Address#clean

The clean function is used to clean up an address string.  It is designed
to remove any parts of the text that preven effective parsing of the
address string.

#### Address#extract(fieldName, regexes)

The extract function is used to extract the specified field from the raw
parts that have previously been split from the input text.  If successfully
located then the field will be updated from the parts and that part removed
from the parts list.

#### Address#extractStreet

This function is used to parse the address parts and locate any parts
that look to be related to a street address.

#### Address#finalize

The finalize function takes any remaining parts that have not been extracted
as other information, and pushes those fields into a generic `regions` field.

#### Address#split

Split the address into it's component parts, and remove any empty parts

#### Address#toString

Convert the address to a string representation

## License(s)

### MIT

Copyright (c) 2016 Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
