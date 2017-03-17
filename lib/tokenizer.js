// @flow

/* ::
import type {
  Separator
} from './flow-types';
*/

const reSeparator = /[ ,]/g;

module.exports = (input /*: string */) => {
  const parts = input.split(reSeparator).filter(Boolean);

  console.log(parts);

  return {
    unit: '',
    number: '',
    street: '',
    regions: []
  };
};
