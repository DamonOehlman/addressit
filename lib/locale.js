// @flow

class DefaultLocale {
  constructor() {
  }

  getUnitTypes() {
    return ['UNIT', 'SHOP'];
  }

  getUnitRegexes() {
    return [
      /^unit\s?(\w*)$/i,
      /^shop\s?(\w*)+$/i,
      /^store\s?(\w*)+$/i,
      /^#(\w+)$/i,
      /^N(\w+)$/
    ];
  }
}

module.exports = {
  DefaultLocale
};
