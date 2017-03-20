// @flow

const {
  PartCreator
} = require('./address-part');

/* ::
import type {
  AddressParts
} from './address-part';
*/

const reSeparator = /[ ,]/g;

module.exports = (input /*: string */) /*: AddressParts */ => {
    return input.split(reSeparator).map(value => PartCreator.unknown(value));
};
