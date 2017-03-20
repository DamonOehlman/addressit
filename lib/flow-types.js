// @flow

import type {
  AddressParts
} from './address-part';

export type Street =
    'ALLEY'
  | 'APPROACH'
  | 'ARCADE'
  | 'AVENUE'
  | 'BOULEVARD'
  | 'BROW'
  | 'BYPASS'
  | 'CAUSEWAY'
  | 'CIRCUIT'
  | 'CIRCUS'
  | 'CLOSE'
  | 'COPSE'
  | 'CORNER'
  // | 'COVE'
  | 'COURT'
  | 'CRESCENT'
  | 'DRIVE'
  // | 'END'
  | 'ESPLANADE'
  // | 'FLAT'
  | 'FREEWAY'
  | 'FRONTAGE'
  // | 'GARDENS'
  | 'GLADE'
  // | 'GLEN'
  | 'GREEN'
  | 'GROVE'
  // | 'HEIGHTS'
  | 'HIGHWAY'
  | 'LANE'
  | 'LINK'
  | 'LOOP'
  | 'MALL'
  | 'MEWS'
  | 'PACKET'
  | 'PARADE'
  // | 'PARK'
  | 'PARKWAY'
  | 'PLACE'
  | 'PROMENADE'
  | 'RESERVE'
  // | 'RIDGE'
  | 'RISE'
  | 'ROAD'
  | 'ROW'
  | 'SQUARE'
  | 'STREET'
  | 'STRIP'
  | 'TARN'
  | 'TERRACE'
  | 'THOROUGHFARE'
  | 'TRACK'
  | 'TRAIL'
  | 'TRUNKWAY'
  // | 'VIEW'
  | 'VISTA'
  | 'WALK'
  | 'WAY'
  | 'WALKWAY'
  | 'YARD';

export type Address = {|
  unit: ?string,
  number: ?string,
  street: ?Street,
  regions: Array<string>
|};

export type AddressLocale = {
  getUnitTypes: Array<string>
};

export type ClassifierInstruction = {
  type: 'instruction'
};

// export type ClassifierComponent = AddressPart | ClassifierInstruction;
// export type ClassifierParts = Array<ClassifierComponent>;
export type ClassifierFn = (input: AddressParts, locale: AddressLocale) => AddressParts;