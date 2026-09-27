import { COUNTRIES_195 } from './countries195.js';

// Nationality dropdown: every country by demonym, plus 'Other'.
export const NATIONALITIES = [
  ...[...COUNTRIES_195]
    .sort((x, y) => x.demonym.localeCompare(y.demonym))
    .map((c) => ({ code: c.code, label: `${c.demonym} ${c.flag}` })),
  { code: 'other', label: 'Other' },
];

// Countries with Adzuna API support (real local job listings)
export const ADZUNA_SUPPORTED = new Set([
  'us', 'gb', 'ca', 'au', 'de', 'fr', 'in', 'it', 'nl', 'sg',
  'br', 'mx', 'nz', 'za', 'pl', 'at', 'be', 'es', 'se', 'ch', 'ru',
]);

// All 195 countries (UN members + observers), alphabetical.
export const ALL_COUNTRIES = [...COUNTRIES_195]
  .sort((x, y) => x.name.localeCompare(y.name))
  .map((c) => ({ code: c.code, label: c.name, flag: c.flag, region: c.region }));

// Backwards compat — used throughout the app as "ADZUNA_COUNTRIES"
export const ADZUNA_COUNTRIES = ALL_COUNTRIES;

export const COUNTRY_NAMES = Object.fromEntries(ALL_COUNTRIES.map((c) => [c.code, c.label]));

// Country coordinates for map placement
export const COUNTRY_COORDS = {
  us: [-98, 38],      ca: [-96, 56],    mx: [-102, 23],   br: [-51, -10],
  ar: [-64, -34],     co: [-74, 4],     cl: [-71, -30],   pe: [-76, -9],
  ve: [-66, 8],       ec: [-78, -2],    bo: [-65, -17],   uy: [-56, -33],
  cr: [-84, 10],      pa: [-80, 9],     gt: [-90, 15],    do: [-70, 19],
  cu: [-80, 22],      jm: [-77, 18],    tt: [-61, 11],    bs: [-77, 25],
  gb: [-1.5, 52],     de: [10, 51],     fr: [2.3, 46],    it: [12, 42],
  es: [-3.7, 40],     nl: [5.3, 52.1],  se: [18, 60],     ch: [8.2, 46.8],
  pl: [19, 52],       at: [14, 47],     be: [4.5, 50.5],  pt: [-8, 39.5],
  no: [10, 62],       dk: [10, 56],     fi: [26, 64],     ie: [-8, 53],
  gr: [22, 39],       hu: [19, 47],     ro: [25, 46],     cz: [15.5, 50],
  ru: [60, 55],       ua: [32, 49],     hr: [15.5, 45],   sk: [19.5, 48.7],
  bg: [25, 43],       lt: [24, 56],     lv: [25, 57],     ee: [25, 59],
  si: [14.8, 46.1],   rs: [21, 44],
  in: [78, 20],       cn: [105, 35],    jp: [138, 36],    kr: [128, 37],
  sg: [103.8, 1.35],  ae: [54, 24],     sa: [45, 24],     il: [35, 31.5],
  tr: [35, 39],       id: [118, -5],    my: [109, 4],     ph: [122, 12],
  th: [101, 15],      vn: [108, 16],    pk: [70, 30],     bd: [90, 23.7],
  lk: [80.7, 7.9],    np: [84, 28],     kz: [68, 48],     uz: [64, 41],
  qa: [51.5, 25.3],   kw: [47.5, 29.3], om: [57, 22],     jo: [37, 31],
  lb: [35.9, 33.9],
  za: [25, -29],      ng: [8, 9],       ke: [37.9, -1],   eg: [30, 27],
  et: [40, 9],        gh: [-1, 8],      tz: [35, -6],     ug: [32, 1],
  ma: [-7, 32],       dz: [3, 28],      tn: [9, 34],      cm: [12, 4],
  ci: [-5.5, 7.5],    sn: [-14, 14],    rw: [30, -2],
  au: [134, -25],     nz: [174, -41],   pg: [145, -6],    fj: [178, -18],
};
