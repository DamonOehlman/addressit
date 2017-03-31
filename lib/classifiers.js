// @flow

const {
  PartBuilder,
  PartFinder,
  PartClassifier
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

const classifierFns /*: Array<ClassifierFn> */ = [
  slashSplitUnitSeparator,
  checkForUnitPrefix,
  findFirstStreetNumber,
  streetTypeClassifiers,
  resetMisclassifiedStreetTypes,
  markStreetParts,
  markStreetQualifiers,
  markPostalCode,
  tagRegions,
  joinSectionSeparatedRegions
];

module.exports = classifierFns;

/**
 * Walk through the parts of the address and look for any parts that match 
 * <number>/<number> pattern, e.g. 145/32
 *
 * @param {!Array<AddressPart>} input
 * @return {!Array<AddressPart>}
 */
function slashSplitUnitSeparator(input) {
  return input.reduce((memo, part) => {
    // TODO: find out why flow allows reading non-existant properties in conditionals...
    // and also why reads of existent properties aren't type checked when they do exist (seems like a bug)
    if (PartClassifier.isUnknown(part)) { 
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

/**
 * Look for unit instances in the format of 'UNIT8' or 'UNIT 8' (split across two parts)
 * and make the appropriate unit part.
 *
 * @param {!Array<AddressPart>} input
 * @param {!AddressLocale} locale
 * @return {!Array<AddressPart>}
 */
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

/**
 * Search for street number parts in the address part.  Currently we are looking
 * for the first integer part located in the parts list that has not already
 * been classified.
 *
 * @param {!Array<AddressPart>} input
 * @return {!Array<AddressPart>}
 */
function findFirstStreetNumber(input) {
  let haveNumberPart = input.some(part => part.partType === 'NUMBER');
  return input.map(part => {
    if (haveNumberPart || PartClassifier.isDefined(part)) {
      return part;
    }

    haveNumberPart = String(parseInt(part.value, 10)) === part.value;
    if (haveNumberPart) {
      return PartBuilder.create('NUMBER', part.value);
    }

    return part;
  });
}

/**
 * Walk through the address parts and look for parts that match a street name.
 *
 * @param {!Array<AddressPart>} input
 * @return {!Array<AddressPart>}
 */
function streetTypeClassifiers(input) {
  // iterate through the parts and look for street types
  return input.map(part => {
    if (PartClassifier.isDefined(part)) {
      return part;
    }

    const streetType = getStreetType(part.value);
    if (streetType) {
      part = PartBuilder.create('STREET_TYPE', part.value);
    }  

    return part;
  });
}

/**
 * Search for a number part in the parts that we have and if we have a STREET_TYPE part
 * immediately after that part, we have a case where the text has been matched to a street type
 * but it is in a position where it doesn't make sense.  In this instance we should reset
 * it to the UNKNOWN type.
 *
 * @param {!Array<AddressPart>} input
 * @return {!Array<AddressPart>}
 */
function resetMisclassifiedStreetTypes(input) {
  const output = [].concat(input);
  const numberIndex = PartFinder.firstOfType(input, 'NUMBER');

  if (numberIndex >= 0 && numberIndex+1 < input.length) {
    if (PartClassifier.matches(output[numberIndex + 1], 'STREET_TYPE')) {
      output[numberIndex + 1] = PartBuilder.unknown(output[numberIndex + 1].value);
    }
  }

  return output;
}

/**
 * Search for the first NUMBER part and mark all parts between that part and the
 * first STREET_TYPE part as STREET parts.
 *
 * @param {!Array<AddressPart>} input
 * @return {!Array<AddressPart>}
 */
function markStreetParts(input) {
  const output = [].concat(input);
  const numberIndex = PartFinder.firstOfType(input, 'NUMBER');
  
  if (numberIndex < 0) {
    return output;
  }

  for (let partIndex = numberIndex + 1; partIndex < output.length; partIndex++) {
    const part = output[partIndex];
    if (PartClassifier.matches(part, 'STREET_TYPE')) {
      break;
    }

    if (!PartClassifier.isSeparator(part)) {
      output[partIndex] = PartBuilder.create('STREET', part.value);
    }
  }

  return output;
}

/**
 * When section separators are used it is possible to determine that a street has additional
 * information as part of the street name.  For instance, if an address contained no section
 * separators then it would not be possible to properly classifier the following address:
 * 
 * 555 Robinson Rd West Aspley
 * 
 * However, when a section separator is used, we can quite clearly see the intention:
 * 
 * 555 Robinson Rd West, Aspley
 * 
 * Unfortunately, the following is still confusing to the parser and will result in misclassified
 * addresses:
 * 
 * 555 Robinson Rd West Aspley, QLD
 * 
 * For that reason, we limit the potential street qualifiers to a know set as specified by the
 * locale.
 *
 * @param {!Array<AddressPart>} input
 * @param {!AddressLocale} locale
 * @return {!Array<AddressPart>}
 */
function markStreetQualifiers(input, locale) {
  const haveSectionSeparator = PartFinder.havePartType(input, 'SECTION_SEPARATOR');
  const output = input.slice();
  if (!haveSectionSeparator) {
    return output;
  }

  const qualifiers = locale.getStreetQualifiers().map(value => value.toUpperCase());
  let index = PartFinder.firstOfType(input, 'STREET_TYPE');
  while (true) {
    const part = output[index];
    if (index === output.length || PartClassifier.matches(part, 'SECTION_SEPARATOR')) {
      break;
    }

    const validMatch = PartClassifier.matches(part, 'UNKNOWN')
      && (typeof part.value == 'string')
      && (qualifiers.indexOf(part.value.toUpperCase()) >= 0);
      
    
    // TODO: determine whether it would be best to only allow a single qualifier match
    if (validMatch) {
      output[index] = PartBuilder.create('STREET', part.value);
    }

    index++;
  }

  return output;
}

/**
 * Given the pattern supplied by the locale, look for any unknown parts that match the
 * postal code / zipcode regex.
 *
 * @param {!Array<AddressPart>} input
 * @param {!AddressLocale} locale
 * @return {!Array<AddressPart>}
 */
function markPostalCode(input, locale) {
  return input.map(part => {
    const regex = locale.getPostalCodeRegex();
    if (PartClassifier.isUnknown(part) && regex && regex.test(part.value)) {
      return PartBuilder.create('POSTALCODE', part.value);
    }
    
    return part;
  });
}

/**
 * For any remaining unknown sections, collect them into a regions collection
 *
 * @param {!Array<AddressPart>} input
 * @return {!Array<AddressPart>}
 */
function tagRegions(input) {
  return input.reduce((memo, part) => {
    if (PartClassifier.isUnknown(part)) {
      return memo.concat(PartBuilder.create('REGION', part.value));
    }

    return memo.concat(part);  
  }, []);
}

/**
 * Depending on how an input string has been provided to the parser, we may have
 * some additional token information that we can use to correctly structure region
 * information.
 * 
 * @param {!Array<AddressPart>} input 
 * @return {!Array<AddressPart>}
 */
function joinSectionSeparatedRegions(input) {
  // first detect whether we have a section separator in the input
  const haveSectionSeparator = input.some(part => part.partType === 'SECTION_SEPARATOR');
  if (!haveSectionSeparator) {
    return [].concat(input);
  }

  // so given we do have a section separator, we want to find the index of the first region part
  const firstRegionIndex = PartFinder.firstOfType(input, 'REGION');
  const head = input.slice(0, firstRegionIndex);
  const tail = input.slice(firstRegionIndex, input.length);

  const collectedRegionData = [];
  const compressedRegions = tail.reduce((memo, part, index) => {
    if (PartClassifier.matches(part, 'SECTION_SEPARATOR')) {
      return memo.concat([
        PartBuilder.create('REGION', collectedRegionData.splice(0).join('')),
        PartBuilder.create('SECTION_SEPARATOR', part.value)
      ]);
    } else if (index === tail.length-1) {
      return memo.concat(part);
    } else {
      collectedRegionData.push(part.value);
    }

    return memo;
  }, []);

  return head.concat(compressedRegions);
}
