//@ flow

/* ::
import type {
  ClassifiedComponent,
  AddressComponents,
  ClassifierFn
} from './flow-types';
*/

function unitClassifier(parts) {
  return parts.reduce((memo /*: AddressComponents */, item) => {
    if (!isUnknown(item)) {
      return memo.concat([item]);
    }
    
    const unitParts = getValue(item).split('/');
    if (unitParts.length === 2) {
      return memo.concat([
        ['UNIT', unitParts[0]],
        ['STREET_NUMBER', unitParts[1]]
      ]);
    }

    // TODO: (Unit \d) test
    // TODO: (#\d) test

    return memo.concat([item]);
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
