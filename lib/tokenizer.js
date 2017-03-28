// @flow

const {
  PartBuilder,
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
  let lastTokenType;
  return parts.reduce((memo, part) => {
    switch (part.partType) {
      case 'WORD_SEPARATOR':
        if (lastTokenType === 'WORD_SEPARATOR' || lastTokenType === 'SECTION_SEPARATOR') {
          return memo;
        }

      case 'SECTION_SEPARATOR':
        if (lastTokenType === 'SECTION_SEPARATOR') {
          return memo;
        }

        lastTokenType = part.partType;
        break;

      default:
        lastTokenType = null;
    }

    return memo.concat(part);
  }, []);
}
