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

class PartCreator {
  static of(type /*: AddressPartType */, value /*: string */) /*: AddressPart */ {
    return {
      type: type,
      value: value
    };
  }

  static unknown(value) {
    return PartCreator.of('unknown', value);
  }
}

module.exports = {
  PartCreator
};
