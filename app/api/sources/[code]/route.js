import { sourcesPayload } from '../../../lib/sourcesPayload.js';

// GET /api/sources/ca -> one country's verified official links (about 1 KB), cached for an hour
// in the browser and a day on the CDN. The sources table changes only when scripts/sources runs.
export async function GET(_request, { params }) {
  const { code } = await params;
  const payload = sourcesPayload(code);
  if (!payload) return Response.json({ error: 'Unknown country' }, { status: 404 });
  return Response.json(payload, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
  });
}
