import Groq from 'groq-sdk';
import { GROQ_OPTIONS } from '../../../lib/ai.js';
import { friendlyError } from '../../lib/friendlyError.js';
import { describeProfile, pickMatches, profileKey } from '../../lib/match.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const listText = (value) => (Array.isArray(value) ? value.join(', ') : (value || ''));

export async function POST(request) {
  // `refresh`: "Refresh matches" asks the AI again instead of the cached answer (which it replaces).
  const { profile, refresh = false } = await request.json();

  if (typeof profile?.nationality !== 'string' || !profile.nationality.trim()) {
    return Response.json({ error: 'Nationality is required' }, { status: 400 });
  }
  // Guard against oversized payloads inflating token cost.
  if (JSON.stringify(profile).length > 6000) {
    return Response.json({ error: 'Profile too large' }, { status: 400 });
  }

  const key = profileKey(profile);
  const cached = refresh === true ? null : cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  // Country names, not ISO2 codes: the model reads a bare "ge" as the US state.
  const person = describeProfile(profile);
  const prompt = `You are a global mobility information guide providing general information only, not legal or career advice. Given this person's profile, recommend the top 5 countries where they would have the best chance of finding work and getting a visa.

Profile:
- Nationality: ${person.nationality}
- Currently in: ${person.currentCountry || 'not specified'}
- Experience: ${profile.experience || 'not specified'}
- Skills: ${listText(profile.skills) || 'not specified'}
- Preferred regions: ${person.preferredRegions.join(', ') || 'open to anywhere'}
- Job interests: ${listText(profile.jobTypes) || 'not specified'}

For each country, provide:
1. match_score (1-100, be realistic)
2. country_name
3. country_code (ISO 2-letter)
4. visa_difficulty ("Easy", "Moderate", "Hard", "Very Hard")
5. job_availability ("High", "Medium", "Low")
6. cost_of_living ("$" cheap, "$$" moderate, "$$$" expensive, "$$$$" very expensive)
7. language_barrier ("None", "Low", "Medium", "High")
8. diaspora_size ("Large", "Medium", "Small")
9. top_reason (one sentence why this country is a good match)
10. visa_path (one sentence about the most realistic visa route)

Return ONLY valid JSON: { "matches": [...] } sorted by match_score descending. No markdown, no explanation.`;

  try {
    const completion = await groq.chat.completions.create({
      ...GROQ_OPTIONS,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '';
    let jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // A sentence around the JSON (as app/api/relocation/route.js allows): keep the outermost {…}.
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    // Only known countries, best first; an answer with none is an error, and is not cached.
    const matches = pickMatches(JSON.parse(jsonStr));
    if (matches.length === 0) throw new Error('The answer named no known country');
    const data = { matches };

    cache.set(key, { data, ts: Date.now() });
    return Response.json(data);
  } catch (err) {
    console.error('Country match error:', err);
    return Response.json({ error: friendlyError('match') }, { status: 500 });
  }
}
