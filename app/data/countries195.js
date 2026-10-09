// Canonical country list: the 193 UN member states + 2 observer states
// (Holy See, Palestine). Source of truth for every country dropdown and for
// the Official Sources directory (scripts/sources/).

export const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Middle East', 'Oceania'];

// code | name | region | demonym | iso3 (ISO 3166-1 alpha-3)
const TABLE = `
dz|Algeria|Africa|Algerian|DZA
ao|Angola|Africa|Angolan|AGO
bj|Benin|Africa|Beninese|BEN
bw|Botswana|Africa|Motswana|BWA
bf|Burkina Faso|Africa|Burkinabé|BFA
bi|Burundi|Africa|Burundian|BDI
cv|Cabo Verde|Africa|Cabo Verdean|CPV
cm|Cameroon|Africa|Cameroonian|CMR
cf|Central African Republic|Africa|Central African|CAF
td|Chad|Africa|Chadian|TCD
km|Comoros|Africa|Comorian|COM
cg|Republic of the Congo|Africa|Congolese (Republic)|COG
cd|DR Congo|Africa|Congolese (DRC)|COD
ci|Côte d'Ivoire|Africa|Ivorian|CIV
dj|Djibouti|Africa|Djiboutian|DJI
eg|Egypt|Africa|Egyptian|EGY
gq|Equatorial Guinea|Africa|Equatoguinean|GNQ
er|Eritrea|Africa|Eritrean|ERI
sz|Eswatini|Africa|Swazi|SWZ
et|Ethiopia|Africa|Ethiopian|ETH
ga|Gabon|Africa|Gabonese|GAB
gm|Gambia|Africa|Gambian|GMB
gh|Ghana|Africa|Ghanaian|GHA
gn|Guinea|Africa|Guinean|GIN
gw|Guinea-Bissau|Africa|Bissau-Guinean|GNB
ke|Kenya|Africa|Kenyan|KEN
ls|Lesotho|Africa|Basotho|LSO
lr|Liberia|Africa|Liberian|LBR
ly|Libya|Africa|Libyan|LBY
mg|Madagascar|Africa|Malagasy|MDG
mw|Malawi|Africa|Malawian|MWI
ml|Mali|Africa|Malian|MLI
mr|Mauritania|Africa|Mauritanian|MRT
mu|Mauritius|Africa|Mauritian|MUS
ma|Morocco|Africa|Moroccan|MAR
mz|Mozambique|Africa|Mozambican|MOZ
na|Namibia|Africa|Namibian|NAM
ne|Niger|Africa|Nigerien|NER
ng|Nigeria|Africa|Nigerian|NGA
rw|Rwanda|Africa|Rwandan|RWA
st|São Tomé and Príncipe|Africa|São Toméan|STP
sn|Senegal|Africa|Senegalese|SEN
sc|Seychelles|Africa|Seychellois|SYC
sl|Sierra Leone|Africa|Sierra Leonean|SLE
so|Somalia|Africa|Somali|SOM
za|South Africa|Africa|South African|ZAF
ss|South Sudan|Africa|South Sudanese|SSD
sd|Sudan|Africa|Sudanese|SDN
tz|Tanzania|Africa|Tanzanian|TZA
tg|Togo|Africa|Togolese|TGO
tn|Tunisia|Africa|Tunisian|TUN
ug|Uganda|Africa|Ugandan|UGA
zm|Zambia|Africa|Zambian|ZMB
zw|Zimbabwe|Africa|Zimbabwean|ZWE
ag|Antigua and Barbuda|Americas|Antiguan|ATG
ar|Argentina|Americas|Argentine|ARG
bs|Bahamas|Americas|Bahamian|BHS
bb|Barbados|Americas|Barbadian|BRB
bz|Belize|Americas|Belizean|BLZ
bo|Bolivia|Americas|Bolivian|BOL
br|Brazil|Americas|Brazilian|BRA
ca|Canada|Americas|Canadian|CAN
cl|Chile|Americas|Chilean|CHL
co|Colombia|Americas|Colombian|COL
cr|Costa Rica|Americas|Costa Rican|CRI
cu|Cuba|Americas|Cuban|CUB
dm|Dominica|Americas|Dominican (Dominica)|DMA
do|Dominican Republic|Americas|Dominican|DOM
ec|Ecuador|Americas|Ecuadorian|ECU
sv|El Salvador|Americas|Salvadoran|SLV
gd|Grenada|Americas|Grenadian|GRD
gt|Guatemala|Americas|Guatemalan|GTM
gy|Guyana|Americas|Guyanese|GUY
ht|Haiti|Americas|Haitian|HTI
hn|Honduras|Americas|Honduran|HND
jm|Jamaica|Americas|Jamaican|JAM
mx|Mexico|Americas|Mexican|MEX
ni|Nicaragua|Americas|Nicaraguan|NIC
pa|Panama|Americas|Panamanian|PAN
py|Paraguay|Americas|Paraguayan|PRY
pe|Peru|Americas|Peruvian|PER
kn|Saint Kitts and Nevis|Americas|Kittitian|KNA
lc|Saint Lucia|Americas|Saint Lucian|LCA
vc|Saint Vincent and the Grenadines|Americas|Vincentian|VCT
sr|Suriname|Americas|Surinamese|SUR
tt|Trinidad and Tobago|Americas|Trinidadian|TTO
us|United States|Americas|American|USA
uy|Uruguay|Americas|Uruguayan|URY
ve|Venezuela|Americas|Venezuelan|VEN
af|Afghanistan|Asia|Afghan|AFG
am|Armenia|Asia|Armenian|ARM
az|Azerbaijan|Asia|Azerbaijani|AZE
bd|Bangladesh|Asia|Bangladeshi|BGD
bt|Bhutan|Asia|Bhutanese|BTN
bn|Brunei|Asia|Bruneian|BRN
kh|Cambodia|Asia|Cambodian|KHM
cn|China|Asia|Chinese|CHN
ge|Georgia|Asia|Georgian|GEO
in|India|Asia|Indian|IND
id|Indonesia|Asia|Indonesian|IDN
jp|Japan|Asia|Japanese|JPN
kz|Kazakhstan|Asia|Kazakh|KAZ
kp|North Korea|Asia|North Korean|PRK
kr|South Korea|Asia|South Korean|KOR
kg|Kyrgyzstan|Asia|Kyrgyz|KGZ
la|Laos|Asia|Lao|LAO
my|Malaysia|Asia|Malaysian|MYS
mv|Maldives|Asia|Maldivian|MDV
mn|Mongolia|Asia|Mongolian|MNG
mm|Myanmar|Asia|Burmese|MMR
np|Nepal|Asia|Nepali|NPL
pk|Pakistan|Asia|Pakistani|PAK
ph|Philippines|Asia|Filipino|PHL
sg|Singapore|Asia|Singaporean|SGP
lk|Sri Lanka|Asia|Sri Lankan|LKA
tj|Tajikistan|Asia|Tajik|TJK
th|Thailand|Asia|Thai|THA
tl|Timor-Leste|Asia|Timorese|TLS
tm|Turkmenistan|Asia|Turkmen|TKM
uz|Uzbekistan|Asia|Uzbek|UZB
vn|Vietnam|Asia|Vietnamese|VNM
al|Albania|Europe|Albanian|ALB
ad|Andorra|Europe|Andorran|AND
at|Austria|Europe|Austrian|AUT
by|Belarus|Europe|Belarusian|BLR
be|Belgium|Europe|Belgian|BEL
ba|Bosnia and Herzegovina|Europe|Bosnian|BIH
bg|Bulgaria|Europe|Bulgarian|BGR
hr|Croatia|Europe|Croatian|HRV
cy|Cyprus|Europe|Cypriot|CYP
cz|Czechia|Europe|Czech|CZE
dk|Denmark|Europe|Danish|DNK
ee|Estonia|Europe|Estonian|EST
fi|Finland|Europe|Finnish|FIN
fr|France|Europe|French|FRA
de|Germany|Europe|German|DEU
gr|Greece|Europe|Greek|GRC
hu|Hungary|Europe|Hungarian|HUN
is|Iceland|Europe|Icelandic|ISL
ie|Ireland|Europe|Irish|IRL
it|Italy|Europe|Italian|ITA
lv|Latvia|Europe|Latvian|LVA
li|Liechtenstein|Europe|Liechtensteiner|LIE
lt|Lithuania|Europe|Lithuanian|LTU
lu|Luxembourg|Europe|Luxembourgish|LUX
mt|Malta|Europe|Maltese|MLT
md|Moldova|Europe|Moldovan|MDA
mc|Monaco|Europe|Monégasque|MCO
me|Montenegro|Europe|Montenegrin|MNE
nl|Netherlands|Europe|Dutch|NLD
mk|North Macedonia|Europe|Macedonian|MKD
no|Norway|Europe|Norwegian|NOR
pl|Poland|Europe|Polish|POL
pt|Portugal|Europe|Portuguese|PRT
ro|Romania|Europe|Romanian|ROU
ru|Russia|Europe|Russian|RUS
sm|San Marino|Europe|Sammarinese|SMR
rs|Serbia|Europe|Serbian|SRB
sk|Slovakia|Europe|Slovak|SVK
si|Slovenia|Europe|Slovenian|SVN
es|Spain|Europe|Spanish|ESP
se|Sweden|Europe|Swedish|SWE
ch|Switzerland|Europe|Swiss|CHE
ua|Ukraine|Europe|Ukrainian|UKR
gb|United Kingdom|Europe|British|GBR
va|Vatican City|Europe|Vatican|VAT
bh|Bahrain|Middle East|Bahraini|BHR
ir|Iran|Middle East|Iranian|IRN
iq|Iraq|Middle East|Iraqi|IRQ
il|Israel|Middle East|Israeli|ISR
jo|Jordan|Middle East|Jordanian|JOR
kw|Kuwait|Middle East|Kuwaiti|KWT
lb|Lebanon|Middle East|Lebanese|LBN
om|Oman|Middle East|Omani|OMN
ps|Palestine|Middle East|Palestinian|PSE
qa|Qatar|Middle East|Qatari|QAT
sa|Saudi Arabia|Middle East|Saudi|SAU
sy|Syria|Middle East|Syrian|SYR
tr|Turkey|Middle East|Turkish|TUR
ae|United Arab Emirates|Middle East|Emirati|ARE
ye|Yemen|Middle East|Yemeni|YEM
au|Australia|Oceania|Australian|AUS
fj|Fiji|Oceania|Fijian|FJI
ki|Kiribati|Oceania|I-Kiribati|KIR
mh|Marshall Islands|Oceania|Marshallese|MHL
fm|Micronesia|Oceania|Micronesian|FSM
nr|Nauru|Oceania|Nauruan|NRU
nz|New Zealand|Oceania|New Zealander|NZL
pw|Palau|Oceania|Palauan|PLW
pg|Papua New Guinea|Oceania|Papua New Guinean|PNG
ws|Samoa|Oceania|Samoan|WSM
sb|Solomon Islands|Oceania|Solomon Islander|SLB
to|Tonga|Oceania|Tongan|TON
tv|Tuvalu|Oceania|Tuvaluan|TUV
vu|Vanuatu|Oceania|Ni-Vanuatu|VUT
`;

const flagOf = (code) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

export const COUNTRIES_195 = TABLE.trim().split('\n').map((line) => {
  const [code, name, region, demonym, iso3] = line.split('|');
  return { code, name, region, demonym, iso3, flag: flagOf(code) };
});

const BY_CODE = new Map(COUNTRIES_195.map((c) => [c.code, c]));

export function countryByCode(code) {
  return BY_CODE.get(String(code || '').toLowerCase()) || null;
}

// Common alternative names people type (lower-case) → code.
const ALIASES = {
  'usa': 'us', 'u.s.': 'us', 'u.s.a.': 'us', 'united states of america': 'us', 'america': 'us',
  'uk': 'gb', 'u.k.': 'gb', 'britain': 'gb', 'great britain': 'gb', 'england': 'gb', 'scotland': 'gb', 'wales': 'gb', 'northern ireland': 'gb',
  'uae': 'ae', 'emirates': 'ae', 'dubai': 'ae', 'abu dhabi': 'ae',
  'korea': 'kr', 'republic of korea': 'kr',
  'czech republic': 'cz', 'ivory coast': 'ci', 'drc': 'cd', 'democratic republic of the congo': 'cd',
  'holland': 'nl', 'turkiye': 'tr', 'türkiye': 'tr', 'burma': 'mm', 'swaziland': 'sz',
  'cape verde': 'cv', 'east timor': 'tl', 'holy see': 'va', 'vatican': 'va',
  'macedonia': 'mk', 'russian federation': 'ru', 'viet nam': 'vn', 'lao pdr': 'la',
};

// [lower-case needle, code], longest first so "Nigeria" wins over "Niger"
// and "South Sudan" over "Sudan".
const NEEDLES = [
  ...COUNTRIES_195.map((c) => [c.name.toLowerCase(), c.code]),
  ...Object.entries(ALIASES),
].sort((a, b) => b[0].length - a[0].length);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function findCountryInText(text) {
  const hay = String(text || '').toLowerCase();
  if (!hay.trim()) return null;
  for (const [needle, code] of NEEDLES) {
    if (new RegExp(`(^|[^\\p{L}])${escapeRe(needle)}($|[^\\p{L}])`, 'u').test(hay)) return BY_CODE.get(code);
  }
  return null;
}
