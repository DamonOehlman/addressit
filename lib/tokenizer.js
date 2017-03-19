// @flow

const CLASSIFIERS = require('./classifiers');

const {
  UnknownPart
} = require('./address-part');

/* ::
import type {
  ClassifierParts,
  ClassifierFn
} from './flow-types';
*/

const reSeparator = /[ ,]/g;

module.exports = (input /*: string */) => {
  let components /*: ClassifierParts */ =
    input.split(reSeparator).map(value => new UnknownPart(value));

  for (const classifier of CLASSIFIERS) {
    components = classifier(components);
  }
  
  console.log(components);

  // let partial = '';
  
  // while (input.length > 0) {
  //   switch (input[0]) {
  //     case TOKEN_SPACE: {
  //       components.push([TOKEN_SPACE, ])
  //     }
  //   }
  //   if (SEPARATORS.indexOf(input[0]) >= 0) {
  //     components.push([partial);
  //   }
  // }
  // const parts = input.split(reSeparator).filter(Boolean);

  // console.log(parts);

  return {
    unit: '',
    number: '',
    street: '',
    regions: []
  };
};

function unitClassifer(input /*: AddressComponents */) {
  
}
