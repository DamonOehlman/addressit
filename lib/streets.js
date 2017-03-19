// @flow

/* ::
import type { Street } from './flow-types';
*/

const STREET_ALIASES /*: Map<Street, Array<string>> */= new Map([
  ['ALLEY', ['ALLY']],
  ['APPROACH', ['APP']],
  ['ARCADE', ['ARC']],
  ['AVENUE', ['AV', 'AVE']],
  ['BOULEVARD', ['BLVD']],
  ['BROW', []],
  ['BYPASS', ['BYPA']],
  ['CAUSEWAY', ['CWAY']],
  ['CIRCUIT', ['CCT']],
  ['CIRCUS', ['CIRC']],
  ['CLOSE', ['CL']],
  ['COPSE', ['CPSE']],
  ['CORNER', ['CNR']],
  // ['COVE', []],
  ['COURT', ['CT', 'CRT']],
  ['CRESCENT', ['CRES']],
  ['DRIVE', ['DR']],
  // ['END', []],
  ['ESPLANADE', ['ESP']],
  // ['FLAT', []],
  ['FREEWAY', ['FWAY']],
  ['FRONTAGE', ['FRNT']],
  // ['GARDENS', ['GDNS']],
  ['GLADE', ['GLD']],
  // ['GLEN', []],
  ['GREEN', ['GRN']],
  // ['GROVE', ['GR']],
  // ['HEIGHTS', ['HTS']],
  ['HIGHWAY', ['HWY']],
  ['LANE', ['LN']],
  ['LINK', []],
  ['LOOP', []],
  ['MALL', []],
  ['MEWS', []],
  ['PACKET', ['PCKT']],
  ['PARADE', ['PDE']],
  // ['PARK', []],
  ['PARKWAY', ['PKWY']],
  ['PLACE', ['PL']],
  ['PROMENADE', ['PROM']],
  ['RESERVE', ['RES']],
  // ['RIDGE', ['RDGE']],
  ['RISE', []],
  ['ROAD', ['RD']],
  ['ROW', []],
  ['SQUARE', ['SQ']],
  ['STREET', ['ST']],
  ['STRIP', ['STRP']],
  ['TARN', []],
  ['TERRACE', ['TCE']],
  ['THOROUGHFARE', ['TFRE']],
  ['TRACK', ['TRAC']],
  ['TRAIL', ['TRL']],
  ['TRUNKWAY', ['TWAY']],
  // ['VIEW', []],
  ['VISTA', ['VSTA']],
  ['WALK', []],
  ['WAY', ['WY']],
  ['WALKWAY', ['WWAY']],
  ['YARD', []]
]);

// create am array of all the street tyoes that have been aliased
// (which should be all of them)
const ALL_STREETS = Array.from(STREET_ALIASES.keys());

// a list of street types that should be elevated for each lookup efficieny
// this has been implemented in this way such that locale specific elevations
// can be implemented in the future
const STREET_TYPE_ELEVATIONS /*: Array<Street> */ = [
  'ROAD',
  'STREET'
];

const STREET_LOOKUPS /*: Map<string,Street> */ = (aliases => {
  const unelevatedStreets = ALL_STREETS.reduce((memo, item) => {
    if (STREET_TYPE_ELEVATIONS.indexOf(item) < 0) {
      return memo.concat(item);
    }

    return memo;
  }, []);

  const streets = [].concat(STREET_TYPE_ELEVATIONS).concat(unelevatedStreets);

  const aliasToStreetLookups = new Map();
  for (const street of streets) {
    aliasToStreetLookups.set(street, street);
    for (const alias of (aliases.get(street) || [])) {
      aliasToStreetLookups.set(alias, street);
    }
  }

  return aliasToStreetLookups;
})(STREET_ALIASES);
  
exports.getStreet = () => {
};
