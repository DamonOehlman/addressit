// @flow

/* ::
export type AddressPartType =
    'unknown'
  | 'unit'
  | 'street'
  | 'streetType';

export type AddressPart = {|
  +type: AddressPartType,
  +value: string
|}

export type AddressParts = Array<AddressPart>;
*/

class AddressBuilder {
  static fromParts(parts /*: AddressParts */) {
  }
}

class PartBuilder {
  static create(type /*: AddressPartType */, value /*: string */) /*: AddressPart */ {
    return {
      type: type,
      value: value
    };
  }

  static unknown(value) {
    return PartBuilder.create('unknown', value);
  }
}

module.exports = {
  AddressBuilder,
  PartBuilder
};
