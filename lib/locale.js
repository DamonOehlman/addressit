// @flow

class DefaultLocale {
  constructor() {
  }

  getWordSeparators() {
    return [];
  }

  getSectionSeparators() {
    return [];
  }

  getStreetQualifiers() {
    return [];
  }

  getPostalCodeRegex() {
    return null;
  }

  getUnitRegexes() {
    return [];
  }
}

class DefaultEnglishLocale {
  constructor() {
  }

  getWordSeparators() {
    return [' '];
  }

  getSectionSeparators() {
    return [','];
  }

  getStreetQualifiers() {
    return [];
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
      /^N(\w+)$/,
      /^(\d+)N(\d+)$/
    ];
  }  
}

module.exports = {
  DefaultLocale,
  DefaultEnglishLocale
};
