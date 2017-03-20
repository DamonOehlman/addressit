// @flow

const {
  PartBuilder
} = require('./address');

/* ::
import type {
  AddressParts
} from './address';
*/

const reSeparator = /[ ,]/g;
module.exports = (input /*: string */) /*: AddressParts */ => {
    return input.split(reSeparator).map(value => PartBuilder.unknown(value));
};
