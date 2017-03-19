//@ flow

const {
  PartCreator
} = require('./address-part');

/* ::
import type {
  AddressPart,
  AddressParts
} from './address-part';

import type {
} from './flow-types';
*/

function unitClassifier(parts /*: AddressParts */) {
  return parts.reduce((memo, item) => {
    if (item.type === 'unknown') {
      const unitParts = item.value.split('/');
      if (unitParts.length === 2) {
        return memo.concat([
          PartCreator.of('unit', unitParts[0]),
          PartCreator.of('street', unitParts[1])
        ]);
      }
    }

    return memo.concat(item);
  }, []);
}

module.exports /*: Array<ClassifierFn> */ = [
  unitClassifier
];
