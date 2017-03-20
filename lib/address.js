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
      switch (item.type) {
        case 'streetType':
          address.street = `${address.street} ${item.value}`;
          break;
        
        case 'region':
          address.regions = [].concat(address.regions || []).concat(item.value);
          break;

        default:
          address[item.type] = item.value;
      }
    }

    return address;
  }
}

class PartBuilder {
  static create(type /*: AddressPartType */, value /*: string */) /*: AddressPart */ {
    return {
      type: type,
      value: value
    };
  }

  static unknown(value /*: string */) {
    return PartBuilder.create('UNKNOWN', value);
  }
}

module.exports = {
  AddressBuilder,
  PartBuilder
};
