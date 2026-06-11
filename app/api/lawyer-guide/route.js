import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const cache = new Map();
const CACHE_MS = 60 * 60 * 1000;

export async function POST(request) {
  try {
    const { caseType, destination, budget, language } = await request.json();
    if (!caseType || !destination) {
      return Response.json({ error: 'Case type and destination are required' }, { status: 400 });
    }

    const cacheKey = `${caseType}|${destination}|${budget || ''}|${language || ''}`.toLowerCase();
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.t < CACHE_MS) return Response.json(hit.data);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You are an immigration information specialist helping families understand how to find and work with immigration lawyers. You provide GENERAL INFORMATION ONLY — never legal advice, never case-specific directives. Use informational phrasing ("applicants typically...", "fees commonly range...", never "you should..."). NEVER invent or name specific lawyers, law firms, websites, or URLs. NEVER guarantee outcomes. Always note that fees vary and that the reader should consult a licensed immigration attorney about their specific situation.

Respond with ONLY valid JSON (no markdown fences) in exactly this shape:
{
  "process_overview": "2-3 sentence plain-English overview of how working with a lawyer on this case type usually goes",
  "fee_ranges": [{"stage": "string", "range": "string", "notes": "string"}],
  "consult_questions": ["string"],
  "red_flags": ["string"],
  "low_cost_options": ["string"],
  "disclaimer": "one sentence reminding this is general information, not legal advice"
}`,
        },
        {
          role: 'user',
          content: `Case type: ${caseType}. Destination: ${destination}. Budget: ${budget || 'not specified'}. Preferred language: ${language || 'not specified'}. Give general information about typical lawyer fees for this case type in this destination, what to ask in a first consultation, red flags when choosing a lawyer, and free/low-cost legal aid routes.`,
        },
      ],
    });

    let raw = completion.choices?.[0]?.message?.content || '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'Could not parse the guide. Try again.' }, { status: 500 });
    }

    const result = {
      process_overview: data.process_overview || null,
      fee_ranges: Array.isArray(data.fee_ranges) ? data.fee_ranges : [],
      consult_questions: Array.isArray(data.consult_questions) ? data.consult_questions : [],
      red_flags: Array.isArray(data.red_flags) ? data.red_flags : [],
      low_cost_options: Array.isArray(data.low_cost_options) ? data.low_cost_options : [],
      disclaimer: data.disclaimer || 'This is general information, not legal advice. Consult a licensed immigration attorney about your situation.',
    };

    cache.set(cacheKey, { t: Date.now(), data: result });
    return Response.json(result);
  } catch (err) {
    console.error('lawyer-guide error:', err);
    return Response.json({ error: 'Failed to generate the guide. Try again.' }, { status: 500 });
  }
}
