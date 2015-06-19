var parser = require('../parsers/en.js');
var extend = require('cog/extend');

module.exports = function(input, opts) {
  // parse the base address
  return parser(input, extend({ 
  	state: {
	    AL: /(^alabama|^AL$)/i,
	    AK: /(^alaska|^AK$)/i,
	    AS: /(^american\ssamoa|^AS$)/i,
	    AZ: /(^arizona|^AZ$)/i,
	    AR: /(^arkansas|^AR$)/i,
	    CA: /(^california|^CA$)/i,
	    CO: /(^colorado|^CO$)/i,
	    CT: /(^connecticut|^CT$)/i,
	    DE: /(^delaware|^DE$)/i,
	    DC: /(^district\sof\scolumbia|^DC$)/i,
	    FM: /(^federated\sstates\sof\smicronesia|^FM$)/i,
	    FL: /(^florida|^FL$)/i,
	    GA: /(^georgia|^GA$)/i,
	    GU: /(^guam|^GU$)/i,
	    HI: /(^hawaii|^HI$)/i,
	    ID: /(^idaho|^ID$)/i,
	    IL: /(^illinois|^IL$)/i,
	    IN: /(^indiana|^IN$)/i,
	    IA: /(^iowa|^IA$)/i,
	    KS: /(^kansas|^KS$)/i,
	    KY: /(^kentucky|^KY$)/i,
	    LA: /(^louisiana|^LA$)/i,
	    ME: /(^maine|^ME$)/i,
	    MH: /(^marshall\sislands|^MH$)/i,
	    MD: /(^maryland|^MD$)/i,
	    MA: /(^massachusetts|^MA$)/i,
	    MI: /(^michigan|^MI$)/i,
	    MN: /(^minnesota|^MN$)/i,
	    MS: /(^mississippi|^MS$)/i,
	    MO: /(^missouri|^MO$)/i,
	    MT: /(^montana|^MT$)/i,
	    NE: /(^nebraska|^NE$)/i,
	    NV: /(^nevada|^NV$)/i,
	    NH: /(^new\shampshire|^NH$)/i,
	    NJ: /(^new\sjersey|^NJ$)/i,
	    NM: /(^new\smexico|^NM$)/i,
	    NY: /(^new\syork|^NY$)/i,
	    NC: /(^north\scarolina|^NC$)/i,
	    ND: /(^north\sdakota|^ND$)/i,
	    MP: /(^northern\smariana\sislands|^MP$)/i,
	    OH: /(^ohio|^OH$)/i,
	    OK: /(^oklahoma|^OK$)/i,
	    OR: /(^oregon|^OR$)/i,
	    PW: /(^palau|^PW$)/i,
	    PA: /(^pennsylvania|^PA$)/i,
	    PR: /(^puerto\srico|^PR$)/i,
	    RI: /(^rhode\sisland|^RI$)/i,
	    SC: /(^south\scarolina|^SC$)/i,
	    SD: /(^south\sdakota|^SD$)/i,
	    TN: /(^tennessee|^TN$)/i,
	    TX: /(^texas|^TX$)/i,
	    UT: /(^utah|^UT$)/i,
	    VT: /(^vermont|^VT$)/i,
	    VI: /(^virgin\sislands|^VI$)/i,
	    VA: /(^virginia|^VA$)/i,
	    WA: /(^washington|^WA$)/i,
	    WV: /(^west\svirginia|^WV$)/i,
	    WI: /(^wisconsin|^WI$)/i,
	    WY: /(^wyoming|^WY$)/i
  	},
  	country: {
        USA: /(^UNITED\sSTATES|^U\.?S\.?A?$)/i
    },
    rePostalCode: /(^\d{5}$)|(^\d{5}-\d{4}$)/ }, opts));
               // Postal codes of the form 'DDDDD-DDDD' or just 'DDDDD'
               // 10010 is valid and so is 10010-1234
};
