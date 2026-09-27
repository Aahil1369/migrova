// Canonical country list: the 193 UN member states + 2 observer states
// (Holy See, Palestine). Source of truth for every country dropdown and for
// the Official Sources directory (scripts/sources/).

export const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Middle East', 'Oceania'];

// code | name | region | demonym
const TABLE = `
dz|Algeria|Africa|Algerian
ao|Angola|Africa|Angolan
bj|Benin|Africa|Beninese
bw|Botswana|Africa|Motswana
bf|Burkina Faso|Africa|Burkinabé
bi|Burundi|Africa|Burundian
cv|Cabo Verde|Africa|Cabo Verdean
cm|Cameroon|Africa|Cameroonian
cf|Central African Republic|Africa|Central African
td|Chad|Africa|Chadian
km|Comoros|Africa|Comorian
cg|Republic of the Congo|Africa|Congolese (Republic)
cd|DR Congo|Africa|Congolese (DRC)
ci|Côte d'Ivoire|Africa|Ivorian
dj|Djibouti|Africa|Djiboutian
eg|Egypt|Africa|Egyptian
gq|Equatorial Guinea|Africa|Equatoguinean
er|Eritrea|Africa|Eritrean
sz|Eswatini|Africa|Swazi
et|Ethiopia|Africa|Ethiopian
ga|Gabon|Africa|Gabonese
gm|Gambia|Africa|Gambian
gh|Ghana|Africa|Ghanaian
gn|Guinea|Africa|Guinean
gw|Guinea-Bissau|Africa|Bissau-Guinean
ke|Kenya|Africa|Kenyan
ls|Lesotho|Africa|Basotho
lr|Liberia|Africa|Liberian
ly|Libya|Africa|Libyan
mg|Madagascar|Africa|Malagasy
mw|Malawi|Africa|Malawian
ml|Mali|Africa|Malian
mr|Mauritania|Africa|Mauritanian
mu|Mauritius|Africa|Mauritian
ma|Morocco|Africa|Moroccan
mz|Mozambique|Africa|Mozambican
na|Namibia|Africa|Namibian
ne|Niger|Africa|Nigerien
ng|Nigeria|Africa|Nigerian
rw|Rwanda|Africa|Rwandan
st|São Tomé and Príncipe|Africa|São Toméan
sn|Senegal|Africa|Senegalese
sc|Seychelles|Africa|Seychellois
sl|Sierra Leone|Africa|Sierra Leonean
so|Somalia|Africa|Somali
za|South Africa|Africa|South African
ss|South Sudan|Africa|South Sudanese
sd|Sudan|Africa|Sudanese
tz|Tanzania|Africa|Tanzanian
tg|Togo|Africa|Togolese
tn|Tunisia|Africa|Tunisian
ug|Uganda|Africa|Ugandan
zm|Zambia|Africa|Zambian
zw|Zimbabwe|Africa|Zimbabwean
ag|Antigua and Barbuda|Americas|Antiguan
ar|Argentina|Americas|Argentine
bs|Bahamas|Americas|Bahamian
bb|Barbados|Americas|Barbadian
bz|Belize|Americas|Belizean
bo|Bolivia|Americas|Bolivian
br|Brazil|Americas|Brazilian
ca|Canada|Americas|Canadian
cl|Chile|Americas|Chilean
co|Colombia|Americas|Colombian
cr|Costa Rica|Americas|Costa Rican
cu|Cuba|Americas|Cuban
dm|Dominica|Americas|Dominican (Dominica)
do|Dominican Republic|Americas|Dominican
ec|Ecuador|Americas|Ecuadorian
sv|El Salvador|Americas|Salvadoran
gd|Grenada|Americas|Grenadian
gt|Guatemala|Americas|Guatemalan
gy|Guyana|Americas|Guyanese
ht|Haiti|Americas|Haitian
hn|Honduras|Americas|Honduran
jm|Jamaica|Americas|Jamaican
mx|Mexico|Americas|Mexican
ni|Nicaragua|Americas|Nicaraguan
pa|Panama|Americas|Panamanian
py|Paraguay|Americas|Paraguayan
pe|Peru|Americas|Peruvian
kn|Saint Kitts and Nevis|Americas|Kittitian
lc|Saint Lucia|Americas|Saint Lucian
vc|Saint Vincent and the Grenadines|Americas|Vincentian
sr|Suriname|Americas|Surinamese
tt|Trinidad and Tobago|Americas|Trinidadian
us|United States|Americas|American
uy|Uruguay|Americas|Uruguayan
ve|Venezuela|Americas|Venezuelan
af|Afghanistan|Asia|Afghan
am|Armenia|Asia|Armenian
az|Azerbaijan|Asia|Azerbaijani
bd|Bangladesh|Asia|Bangladeshi
bt|Bhutan|Asia|Bhutanese
bn|Brunei|Asia|Bruneian
kh|Cambodia|Asia|Cambodian
cn|China|Asia|Chinese
ge|Georgia|Asia|Georgian
in|India|Asia|Indian
id|Indonesia|Asia|Indonesian
jp|Japan|Asia|Japanese
kz|Kazakhstan|Asia|Kazakh
kp|North Korea|Asia|North Korean
kr|South Korea|Asia|South Korean
kg|Kyrgyzstan|Asia|Kyrgyz
la|Laos|Asia|Lao
my|Malaysia|Asia|Malaysian
mv|Maldives|Asia|Maldivian
mn|Mongolia|Asia|Mongolian
mm|Myanmar|Asia|Burmese
np|Nepal|Asia|Nepali
pk|Pakistan|Asia|Pakistani
ph|Philippines|Asia|Filipino
sg|Singapore|Asia|Singaporean
lk|Sri Lanka|Asia|Sri Lankan
tj|Tajikistan|Asia|Tajik
th|Thailand|Asia|Thai
tl|Timor-Leste|Asia|Timorese
tm|Turkmenistan|Asia|Turkmen
uz|Uzbekistan|Asia|Uzbek
vn|Vietnam|Asia|Vietnamese
al|Albania|Europe|Albanian
ad|Andorra|Europe|Andorran
at|Austria|Europe|Austrian
by|Belarus|Europe|Belarusian
be|Belgium|Europe|Belgian
ba|Bosnia and Herzegovina|Europe|Bosnian
bg|Bulgaria|Europe|Bulgarian
hr|Croatia|Europe|Croatian
cy|Cyprus|Europe|Cypriot
cz|Czechia|Europe|Czech
dk|Denmark|Europe|Danish
ee|Estonia|Europe|Estonian
fi|Finland|Europe|Finnish
fr|France|Europe|French
de|Germany|Europe|German
gr|Greece|Europe|Greek
hu|Hungary|Europe|Hungarian
is|Iceland|Europe|Icelandic
ie|Ireland|Europe|Irish
it|Italy|Europe|Italian
lv|Latvia|Europe|Latvian
li|Liechtenstein|Europe|Liechtensteiner
lt|Lithuania|Europe|Lithuanian
lu|Luxembourg|Europe|Luxembourgish
mt|Malta|Europe|Maltese
md|Moldova|Europe|Moldovan
mc|Monaco|Europe|Monégasque
me|Montenegro|Europe|Montenegrin
nl|Netherlands|Europe|Dutch
mk|North Macedonia|Europe|Macedonian
no|Norway|Europe|Norwegian
pl|Poland|Europe|Polish
pt|Portugal|Europe|Portuguese
ro|Romania|Europe|Romanian
ru|Russia|Europe|Russian
sm|San Marino|Europe|Sammarinese
rs|Serbia|Europe|Serbian
sk|Slovakia|Europe|Slovak
si|Slovenia|Europe|Slovenian
es|Spain|Europe|Spanish
se|Sweden|Europe|Swedish
ch|Switzerland|Europe|Swiss
ua|Ukraine|Europe|Ukrainian
gb|United Kingdom|Europe|British
va|Vatican City|Europe|Vatican
bh|Bahrain|Middle East|Bahraini
ir|Iran|Middle East|Iranian
iq|Iraq|Middle East|Iraqi
il|Israel|Middle East|Israeli
jo|Jordan|Middle East|Jordanian
kw|Kuwait|Middle East|Kuwaiti
lb|Lebanon|Middle East|Lebanese
om|Oman|Middle East|Omani
ps|Palestine|Middle East|Palestinian
qa|Qatar|Middle East|Qatari
sa|Saudi Arabia|Middle East|Saudi
sy|Syria|Middle East|Syrian
tr|Turkey|Middle East|Turkish
ae|United Arab Emirates|Middle East|Emirati
ye|Yemen|Middle East|Yemeni
au|Australia|Oceania|Australian
fj|Fiji|Oceania|Fijian
ki|Kiribati|Oceania|I-Kiribati
mh|Marshall Islands|Oceania|Marshallese
fm|Micronesia|Oceania|Micronesian
nr|Nauru|Oceania|Nauruan
nz|New Zealand|Oceania|New Zealander
pw|Palau|Oceania|Palauan
pg|Papua New Guinea|Oceania|Papua New Guinean
ws|Samoa|Oceania|Samoan
sb|Solomon Islands|Oceania|Solomon Islander
to|Tonga|Oceania|Tongan
tv|Tuvalu|Oceania|Tuvaluan
vu|Vanuatu|Oceania|Ni-Vanuatu
`;

const flagOf = (code) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

export const COUNTRIES_195 = TABLE.trim().split('\n').map((line) => {
  const [code, name, region, demonym] = line.split('|');
  return { code, name, region, demonym, flag: flagOf(code) };
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
