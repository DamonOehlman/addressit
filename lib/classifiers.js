//@ flow

const {
  AddressPart,
  UnknownPart
} = require('./address-part');

/* ::
import type {
  ClassifiedComponent,
  ClassifierParts,
  ClassifierFn
} from './flow-types';
*/

function unitClassifier(parts) {
  return parts.reduce((memo /*: ClassifierParts */, item /*: ClassifierComponent */) => {
    if (item instanceof UnknownPart) {
      const unitParts = item.value.split('/');
      if (unitParts.length === 2) {
        return memo.concat([
          new AddressPart('unit', unitParts[0]),
          new AddressPart('street', unitParts[1])
        ]);
      }
    }

    return memo.concat(item);
  }, []);
}

module.exports /*: Array<ClassifierFn */ = [
  unitClassifier
];

function getValue(part /*: ClassifiedComponent */) /*: string */ {
  return part[1];
}

function isUnknown(part) {
  return part[0] === 'UNKNOWN';
}
