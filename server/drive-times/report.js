// "Report a problem" with a place, from the app's activity sheet. Opens a GitHub issue with the place's id, so a wrong or
// closed place can be fixed in data/ or the next import, without anyone sending an email. The token lives only here.
// Set it with `npx wrangler secret put GITHUB_TOKEN` (a fine-grained token with Issues read and write on the repository).

export const REASONS = {
  closed: 'Closed for good',
  'wrong-activity': 'Not a place for this activity',
  'wrong-location': 'Wrong location on the map',
  other: 'Something else',
};

const LABEL = 'place report';
const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Checks a report from the app. Returns null when it's missing what an issue needs.
 * @param {unknown} body
 */
export function parseReport(body) {
  const report = {
    placeId: text(body?.placeId, 80),
    placeName: text(body?.placeName, 120),
    activityId: text(body?.activityId, 80),
    activityName: text(body?.activityName, 120),
    city: text(body?.city, 80),
    reason: text(body?.reason, 20),
    note: text(body?.note, 500),
  };
  if (!report.placeId || !report.placeName || !report.activityId || !(report.reason in REASONS)) return null;
  // Place ids look like "osm:n42", "ovt:..." or "pick:short-north".
  if (!/^[a-z]+:[\w.:-]+$/i.test(report.placeId) || !/^[\w-]+$/.test(report.activityId)) return null;
  return report;
}

/** Escapes text from the app so it can't ping people, link issues or add Markdown. */
const quote = (s) => s.replace(/[@#<>[\]`*_|\\]/g, (c) => `\\${c}`);

/** The issue for a report. */
export function issueFor(report) {
  const where = report.city ? ` in ${quote(report.city)}` : '';
  return {
    title: `Place report: ${quote(report.placeName)} (${REASONS[report.reason]})`,
    body: [
      `**Place:** ${quote(report.placeName)} \`${report.placeId}\`${where}`,
      `**Activity:** ${quote(report.activityName || report.activityId)} \`${report.activityId}\``,
      `**What's wrong:** ${REASONS[report.reason]}`,
      report.note ? `\n> ${quote(report.note).replace(/\n/g, '\n> ')}` : '',
      '\n_Sent from the app\'s Report a problem. Fix it in `data/cities` or with the next import._',
    ]
      .filter(Boolean)
      .join('\n'),
    labels: [LABEL],
  };
}

/**
 * POST /report: opens the issue and answers { number }.
 * @param {Request} request
 * @param {{ GITHUB_TOKEN?: string, GITHUB_REPO?: string, REPORT_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> } }} env
 */
export async function reportPlace(request, env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return new Response('Reports are not set up', { status: 503 });
  if (env.REPORT_LIMITER) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.REPORT_LIMITER.limit({ key: ip });
    if (!success) return new Response('Too many reports', { status: 429, headers: { 'Retry-After': '60' } });
  }
  const report = parseReport(await request.json().catch(() => null));
  if (!report) return new Response('Expected a place, an activity and a reason', { status: 400 });
  const issue = issueFor(report);
  const open = (body) =>
    fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'try-something-new-reports',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  let upstream = await open(issue);
  // A token that can't add labels gets a 422 or 403 for the label; the report still matters more than the label.
  if (upstream.status === 422 || upstream.status === 403) upstream = await open({ title: issue.title, body: issue.body });
  if (!upstream.ok) return new Response('Could not file the report', { status: 502 });
  const { number } = await upstream.json();
  return Response.json({ number });
}
