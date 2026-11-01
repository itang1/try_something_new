import { issueFor, parseReport, reportPlace } from '../server/drive-times/report';
import { reportUrl } from '../src/data/report';

const report = {
  placeId: 'osm:n42',
  placeName: 'Snow Trails',
  activityId: 'snow-sports',
  activityName: 'Skiing or snowboarding',
  city: 'Columbus',
  reason: 'closed',
  note: 'Closed in 2025 @someone see #12',
};

describe('place reports', () => {
  it('checks what the app sends', () => {
    expect(parseReport(report)).toMatchObject({ placeId: 'osm:n42', reason: 'closed' });
    expect(parseReport({ ...report, reason: 'spam' })).toBeNull();
    expect(parseReport({ ...report, placeId: 'not an id' })).toBeNull();
    expect(parseReport({ ...report, placeName: '' })).toBeNull();
    expect(parseReport(null)).toBeNull();
    expect(parseReport({ ...report, note: 'x'.repeat(900) })!.note).toHaveLength(500);
  });

  it('writes an issue with the ids and no mentions or links', () => {
    const issue = issueFor(parseReport(report)!);
    expect(issue.title).toBe('Place report: Snow Trails (Closed for good)');
    expect(issue.body).toContain('`osm:n42` in Columbus');
    expect(issue.body).toContain('`snow-sports`');
    expect(issue.body).toContain('\\@someone see \\#12');
    expect(issue.labels).toEqual(['place report']);
  });

  it('files the issue with the token, and says when it is not set up', async () => {
    const request = () => new Request('https://w.example/report', { method: 'POST', body: JSON.stringify(report) });
    expect((await reportPlace(request(), {})).status).toBe(503);

    const fetchMock = jest.fn(async () => Response.json({ number: 7 }, { status: 201 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await reportPlace(request(), { GITHUB_TOKEN: 't', GITHUB_REPO: 'me/repo' });
    expect(await response.json()).toEqual({ number: 7 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/me/repo/issues');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t');

    const bad = new Request('https://w.example/report', { method: 'POST', body: '{}' });
    expect((await reportPlace(bad, { GITHUB_TOKEN: 't', GITHUB_REPO: 'me/repo' })).status).toBe(400);
    const limited = await reportPlace(request(), { GITHUB_TOKEN: 't', GITHUB_REPO: 'me/repo', REPORT_LIMITER: { limit: async () => ({ success: false }) } });
    expect(limited.status).toBe(429);
  });

  it('finds the endpoint next to the drive-time Worker', () => {
    expect(reportUrl('https://drive.example.workers.dev')).toBe('https://drive.example.workers.dev/report');
    expect(reportUrl(undefined)).toBeNull();
  });
});
