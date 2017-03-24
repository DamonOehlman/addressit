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
        case 'STREET_TYPE':
          address.street = `${address.street} ${item.value}`;
          break;
        
        case 'REGION':
          address.regions = [].concat(address.regions || []).concat(item.value);
          break;

        default:
          address[item.partType] = item.value;
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
}

module.exports = {
  AddressBuilder,
  PartBuilder,
  PartFinder
};
