// @flow

const {
  PartBuilder
} = require('./address');

const {
  getStreetType
} = require('./streets');

/* ::
import type {
  AddressPart,
  AddressParts
} from './address';

import type {
  AddressLocale,
  ClassifierFn
} from './flow-types';
*/

// walk through the parts of the address and look for any parts that match
// <number>/<number> pattern, e.g. 145/32
function slashSplitUnitSeparator(parts) {
  return parts.reduce((memo, item) => {
    if (item.type === 'unknown') {
      const unitParts = item.value.split('/');
      if (unitParts.length === 2) {
        return memo.concat([
          PartBuilder.create('unit', unitParts[0]),
          PartBuilder.create('street', unitParts[1])
        ]);
      }
    }

    return memo.concat(item);
  }, []);
}

function checkForUnitPrefix(parts) {
  const haveUnitPart = parts.some(part => part.type === 'unit');

  return [].concat(parts);
}

function streetTypeClassifiers(parts) {
  // iterate through the parts and look for street types
  return parts.map(part => {
    if (part.type !== 'unknown') {
      return part;
    }

    const streetType = getStreetType(part.value);
    if (streetType) {
      part = PartBuilder.create('streetType', part.value);
    }  

    return part;
  });
}

const classifierFns /*: Array<ClassifierFn> */ = [
  slashSplitUnitSeparator,
  checkForUnitPrefix,
  streetTypeClassifiers
];

module.exports = classifierFns;
