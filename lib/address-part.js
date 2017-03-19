// @flow

/* ::
export type AddressPartType =
    'unknown'
  | 'unit';

export type AddressPart = {|
  type: AddressPartType,
  value: string
|}

export type AddressParts = Array<AddressPart>;
*/

class PartCreator {
  static of(type /*: AddressPartType */, value /*: string */) {
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
