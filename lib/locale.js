// @flow

class DefaultLocale {
  constructor() {
  }

  getPartSeparator() {
    return /,? +/g;
  }

  getPostalCodeRegex() {
    return null;
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
