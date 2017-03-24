// @flow

const {
  PartBuilder
} = require('./address');

/* ::
import type {
  AddressLocale,
  AddressPart
} from './flow-types';
*/

module.exports = (input /*: string */, locale /*: AddressLocale */) /*: Array<AddressPart> */ => {
  const separator = locale.getPartSeparator();
  return input.split(separator).map(value => PartBuilder.unknown(value));
};
