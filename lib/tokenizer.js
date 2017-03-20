// @flow

const {
  PartBuilder
} = require('./address');

/* ::
import type {
  AddressPart
} from './flow-types';
*/

const reSeparator = /[ ,]/g;
module.exports = (input /*: string */) /*: Array<AddressPart> */ => {
    return input.split(reSeparator).map(value => PartBuilder.unknown(value));
};
