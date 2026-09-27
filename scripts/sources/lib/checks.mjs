// Verdict for one official-source candidate, given facts already fetched.
// Pure: no network. The rules here are what "Verified" means on the site.
import { hostOf, hostMatches, isAllowedHost } from './domains.mjs';

const AUTHORITY = [
  'immigration', 'visa', 'visas', 'migration', 'residence permit', 'border',
  'immigración', 'migración', 'visado', 'extranjería', 'visto', 'imigração', 'immigrazione',
  'einwanderung', 'visum', 'aufenthalt', 'immigratie', 'verblijf', 'étrangers', 'séjour',
  'göç', 'vize', 'иммиграц', 'виза', 'миграц', 'هجرة', 'تأشيرة', 'إقامة', 'جوازات',
  '签证', '移民', '出入境', 'ビザ', '査証', '入国', '在留', '비자', '출입국', '체류',
];

export const KEYWORDS = {
  authority: AUTHORITY,
  apply: [...AUTHORITY, 'e-visa', 'evisa', 'eta', 'application', 'apply', 'solicitud', 'demande', 'antrag'],
  embassies: [
    'embassy', 'embassies', 'consulate', 'consular', 'mission', 'high commission',
    'representation', 'diplomatic', 'représentation', 'vertretung', 'rappresentanz', 'representación', 'representação',
    'ambassade', 'consulat', 'embajada', 'consulado', 'botschaft', 'konsulat', 'ambasciata',
    'büyükelçilik', 'konsolosluk', 'посольств', 'консульств', 'سفارة', 'قنصلية',
    '大使馆', '领事', '大使館', '領事', '대사관', '영사', 'embaixada',
  ],
  work: [...AUTHORITY, 'work permit', 'employment', 'labour', 'labor', 'travail', 'trabajo', 'arbeit', 'lavoro', 'çalışma', 'работ', 'عمل', '工作', '就労', '취업'],
  study: [...AUTHORITY, 'study', 'student', 'university', 'études', 'étudiant', 'estudio', 'estudiante', 'studium', 'studio', 'öğrenci', 'учеб', 'студент', 'دراسة', '学习', '留学', '유학'],
  citizenship: [
    'citizenship', 'naturalisation', 'naturalization', 'nationality', 'citoyenneté', 'nationalité',
    'ciudadanía', 'nacionalidad', 'einbürgerung', 'staatsangehörigkeit', 'cittadinanza', 'vatandaşlık',
    'гражданств', 'جنسية', 'تجنس', '国籍', '국적', 'cidadania', 'naturalizzazione',
    'nacionalidade', 'naturalização', 'naturalización', 'naturalisatie', 'nationaliteit', 'medborgarskap', 'statsborgerskab', 'statsborgerskap',
  ],
};

function nameNeedles(name) {
  const n = String(name || '').toLowerCase().trim();
  if (!n) return [];
  const out = [n];
  const before = n.split(' (')[0].trim();
  if (before && before !== n) out.push(before);
  const inParens = n.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (inParens) out.push(inParens);
  // Very short needles ("x", "MI") match inside unrelated words.
  return out.filter((s) => s.length >= 4);
}

export function contentMatches(type, candidate, text) {
  const hay = String(text || '').toLowerCase();
  if (!hay) return false;
  const needles = [
    ...(KEYWORDS[type] || AUTHORITY),
    ...(candidate.keywords || []).map((k) => String(k).toLowerCase()),
    ...nameNeedles(candidate.name),
  ];
  return needles.some((k) => k && hay.includes(k));
}

const is2xx = (s) => s >= 200 && s < 300;

// linkedFromPage must itself be an official page of this country, on a
// different host (a site linking to itself proves nothing), that links to `host`.
function officialPageLinksTo(linkedFromPage, host, govDomains) {
  if (!linkedFromPage || linkedFromPage.error || !is2xx(linkedFromPage.status)) return false;
  if (!linkedFromPage.finalUrl?.startsWith('https://')) return false;
  const linkerHost = hostOf(linkedFromPage.finalUrl);
  if (linkerHost === host || !isAllowedHost(linkerHost, govDomains)) return false;
  return (linkedFromPage.hrefs || []).some((h) => hostOf(h) === host);
}

export function judge({ type, candidate, page, govDomains, wikidataHosts, linkedFromPage }) {
  const fail = (reason) => ({ status: 'not_verified', evidence: [], reason });

  if (!page || page.error) return fail(`fetch:${page?.error || 'no response'}`);
  if (!page.finalUrl?.startsWith('https://')) return fail('http');
  if (!is2xx(page.status)) return fail(`status:${page.status}`);
  if (!contentMatches(type, candidate, page.text)) return fail('content');

  const host = hostOf(page.finalUrl);
  const evidence = ['https', 'content'];
  const linked = officialPageLinksTo(linkedFromPage, host, govDomains);
  const linkedEvidence = linked ? `linked-from:${linkedFromPage.finalUrl}` : null;

  // Exception: an official portal off the government domain, vouched for by a
  // government page that links to it. Nothing else bypasses the domain rule.
  if (!isAllowedHost(host, govDomains)) {
    if (!linked) return fail(`domain:${host}`);
    return { status: 'verified', evidence: [...evidence, linkedEvidence] };
  }

  evidence.push('gov-domain');
  const hosts = wikidataHosts instanceof Set ? [...wikidataHosts] : wikidataHosts || [];
  if (hosts.some((w) => hostMatches(host, w))) evidence.push('wikidata');
  if (linked) evidence.push(linkedEvidence);
  if (evidence.length === 3) return fail('corroboration');
  return { status: 'verified', evidence };
}
