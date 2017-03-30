// @flow

const {
  PartBuilder,
  PartClassifier
} = require('./address');

/* ::
import type {
  AddressLocale,
  AddressPart
} from './flow-types';
*/

module.exports = (input /*: string */, locale /*: AddressLocale */) /*: Array<AddressPart> */ => {
  return cleanupParts(splitIntoTokens(input, locale));
};

function splitIntoTokens(input, locale) {
  const wordSep = locale.getWordSeparators();
  const sectionSep = locale.getSectionSeparators();
  const values /*: Array<AddressPart|string> */ = [];
  
  let currentValue = '';
  for (let ii = 0, length = input.length; ii < length; ii++) {
    const char = input[ii];
    const isWordSep = wordSep.indexOf(char) >= 0;
    const isSectionSep = sectionSep.indexOf(char) >= 0;

    if (isWordSep || isSectionSep) {
      currentValue && values.push(currentValue);
      currentValue = '';
      values.push({ partType: isWordSep ? 'WORD_SEPARATOR' : 'SECTION_SEPARATOR', value: char });
    } else {
      currentValue += char;
    }
  }

  currentValue && values.push(currentValue);

  return values.map(value => {
    if (typeof value == 'string') {
      return { partType: 'UNKNOWN', value: value };
    }

    return value;
  });  
}

function cleanupParts(parts /*: Array<AddressPart> */) /*: Array<AddressPart> */ {
  const output = [];

  // iterate through the parts from the second item
  // we will be using array destructuring to get the previous, current and next items
  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const [currentPart, nextPart] = parts.slice(partIndex, partIndex+2);
    const lastPart = parts[partIndex-1];

    // if we have no next item and the current item is a separator do nothing
    if (!nextPart && PartClassifier.isSeparator(currentPart)) {
      continue;
    }

    // if we have no next item, then add it and break (we know it's not a separator)
    if (!nextPart) {
      output.push(currentPart);
      continue;
    }

    // if the current item is a space separate and the next item is a separator do nothing
    if (PartClassifier.matches(currentPart, 'WORD_SEPARATOR') && PartClassifier.isSeparator(nextPart)) {
      continue;
    }

    // skip when we have two sequential section separators
    if (PartClassifier.matches(currentPart, 'SECTION_SEPARATOR') && PartClassifier.matches(nextPart, 'SECTION_SEPARATOR')) {
      continue;
    }

    // if we have a word separator trailing a section separator, do nothing also
    if (lastPart && PartClassifier.matches(currentPart, 'WORD_SEPARATOR') && PartClassifier.matches(lastPart, 'SECTION_SEPARATOR')) {
      continue;
    }

    output.push(currentPart);
  }

  return output;
}
