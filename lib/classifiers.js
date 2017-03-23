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
  AddressLocale,
  ClassifierFn
} from './flow-types';
*/

// walk through the parts of the address and look for any parts that match
// <number>/<number> pattern, e.g. 145/32
function slashSplitUnitSeparator(input) {
  return input.reduce((memo, part) => {
    // TODO: find out why flow allows reading non-existant properties in conditionals...
    // and also why reads of existent properties aren't type checked when they do exist (seems like a bug)
    if (part.partType === 'UNKNOWN') { 
      const unitParts = part.value.split('/');
      if (unitParts.length === 2) {
        return memo.concat([
          PartBuilder.create('UNIT', unitParts[0]),
          PartBuilder.create('NUMBER', unitParts[1])
        ]);
      }
    }

    return memo.concat(part);
  }, []);
}

function checkForUnitPrefix(input, locale) {
  const haveUnitPart = input.some(part => part.partType === 'UNIT');
  if (haveUnitPart) {
    return [].concat(input);
  }

  let skipNextPart = false;
  const unitRegexes = locale.getUnitRegexes();
  return input.reduce((memo, part, index) => {
    if (skipNextPart) {
      skipNextPart = false;
      return memo;
    }

    const match = unitRegexes.map(regex => regex.exec(part.value)).filter(Boolean)[0];
    if (match && match[1]) {
      // if we have found a match and have content for that value then we have
      // a complete unit specification in a single part, e.g. UNIT5
      return memo.concat(PartBuilder.create('UNIT', match[1]));
    } else if (match && index+1 < input.length) {
      // otherwise, we have likely got a unit specification that is spread across
      // two tokenized parts, e.g. ['UNIT', '8'] and thus we nwws to check that we
      // a numeric part in the next part
      const nextParsedValue = input[index+1] && String(parseInt(input[index+1].value, 10));
      if (nextParsedValue && nextParsedValue === input[index+1].value) {
        skipNextPart = true;
      }

      return memo.concat(PartBuilder.create('UNIT', input[index + 1].value));
    }

    return memo.concat(part);
  }, []);
}

function findFirstStreetNumber(input) {
  let haveNumberPart = input.some(part => part.partType === 'NUMBER');
  return input.map(part => {
    if (haveNumberPart || part.partType !== 'UNKNOWN') {
      return part;
    }

    haveNumberPart = String(parseInt(part.value, 10)) === part.value;
    if (haveNumberPart) {
      return PartBuilder.create('NUMBER', part.value);
    }

    return part;
  });
}

function streetTypeClassifiers(input) {
  // iterate through the parts and look for street types
  return input.map(part => {
    if (part.partType !== 'UNKNOWN') {
      return part;
    }

    const streetType = getStreetType(part.value);
    if (streetType) {
      part = PartBuilder.create('STREET_TYPE', part.value);
    }  

    return part;
  });
}

const classifierFns /*: Array<ClassifierFn> */ = [
  slashSplitUnitSeparator,
  checkForUnitPrefix,
  findFirstStreetNumber,
  streetTypeClassifiers
];

module.exports = classifierFns;
