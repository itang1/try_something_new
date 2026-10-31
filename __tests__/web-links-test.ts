import { activityLink, displayLink, privacyLink, webHost, webOrigin } from '@/data/web-links';
import { inviteMessage } from '@/data/invite';
import type { Entry, Place } from '@/data/catalog';

jest.mock('@/data/analytics', () => ({ track: jest.fn() }));

describe('web links', () => {
  it('are off without a web URL', () => {
    expect(webOrigin('')).toBeNull();
    expect(webOrigin('   ')).toBeNull();
    expect(activityLink('pottery', 'invite', '')).toBeNull();
    expect(privacyLink('')).toBeNull();
    expect(webHost('')).toBeNull();
    expect(displayLink(null)).toBeNull();
  });

  it('tidy the origin', () => {
    expect(webOrigin('https://trysomething.new/')).toBe('https://trysomething.new');
    expect(webOrigin('trysomething.new')).toBe('https://trysomething.new');
    expect(webHost('https://Try.Example.com:8443/app/')).toBe('try.example.com');
  });

  it('link an activity with the kind of share and nothing else', () => {
    expect(activityLink('pottery', 'invite', 'https://trysomething.new')).toBe('https://trysomething.new/activity/pottery?s=invite');
    expect(activityLink('a b', 'tried', 'https://x.dev/')).toBe('https://x.dev/activity/a%20b?s=tried');
    expect(privacyLink('https://x.dev/')).toBe('https://x.dev/privacy');
  });

  it('print without the scheme, www or query', () => {
    expect(displayLink('https://www.trysomething.new')).toBe('trysomething.new');
    expect(displayLink('https://x.dev/activity/pottery?s=tried')).toBe('x.dev/activity/pottery');
  });
});

describe('inviteMessage', () => {
  const entry = { name: 'Throw a pot', activityId: 'pottery', custom: false } as Entry;
  const place = { name: 'Clay Studio', lat: 34.1, lng: -118.2 } as Place;

  it('adds the map and the idea page', () => {
    expect(inviteMessage(entry, place, null, 'https://x.dev')).toBe(
      [
        'Want to come with me? Throw a pot at Clay Studio',
        'https://www.google.com/maps/search/?api=1&query=34.1,-118.2',
        'https://x.dev/activity/pottery?s=invite',
      ].join('\n'),
    );
  });

  it('leaves out the page without a web URL or for something the user added', () => {
    expect(inviteMessage(entry, null, null, '')).toBe('Want to come with me? Throw a pot');
    expect(inviteMessage({ ...entry, custom: true }, null, null, 'https://x.dev')).toBe('Want to come with me? Throw a pot');
  });
});
