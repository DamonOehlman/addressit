// @flow

/* ::
import type {
  AddressPart,
  AddressPartType
} from './flow-types';
*/

class AddressBuilder {
  static fromParts(parts /*: Array<AddressPart> */) {
    const address = {};
    for (const item of parts) {
      switch (item.partType) {
        case 'STREET':
          address.street = (address.street ? `${address.street} ` : '') + item.value;
          break;

        case 'STREET_TYPE':
          address.street = `${address.street} ${item.value}`;
          break;
        
        case 'REGION':
          address.regions = [].concat(address.regions || []).concat(item.value);
          break;
        
        case 'WORD_SEPARATOR':
        case 'SECTION_SEPARATOR':
          break;

        default:
          address[item.partType.toLowerCase()] = item.value;
      }
    }

    return address;
  }
}

class PartBuilder {
  static create(partType /*: AddressPartType */, value /*: string */) /*: AddressPart */ {
    return { partType, value };
  }

  static unknown(value /*: string */) {
    return PartBuilder.create('UNKNOWN', value);
  }
}

class PartFinder {
  static firstOfType(parts /*: Array<AddressPart> */, type /*: AddressPartType */) /*: number */ {
    return parts.reduce((memo, part, index) => {
      if (memo >= 0) {
        return memo;
      } else if (part.partType === type) {
        return index;
      }

      return -1;
    }, -1);
  }

  static havePartType(parts /*: Array<AddressPart> */, type /*: AddressPartType */) /*: boolean */ {
    return parts.some(part => part.partType === type);
  }
}

class PartClassifier {
  static matches(part /*: AddressPart */, partType /*: AddressPartType */) /*: boolean */ {
    return part && part.partType === partType;
  }

  static isUnknown(part) {
    return PartClassifier.matches(part, 'UNKNOWN');
  }

  static isSeparator(part) {
    return PartClassifier.matches(part, 'WORD_SEPARATOR') || PartClassifier.matches(part, 'SECTION_SEPARATOR');
  }

  static isDefined(part) {
    return !PartClassifier.matches(part, 'UNKNOWN');
  }
}

module.exports = {
  AddressBuilder,
  PartBuilder,
  PartFinder,
  PartClassifier
};
