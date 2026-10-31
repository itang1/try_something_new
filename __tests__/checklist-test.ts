import type { Entry } from '@/data/catalog';
import { checklistSections } from '@/data/checklist';
import { matchesStatus } from '@/data/status';

const entry = (id: string, subcategory: string, kind: Entry['kind'] = 'activity') =>
  ({ id, name: id, subcategory, kind }) as unknown as Entry;

const pier = entry('pier', 'outdoors', 'icon');
const hike = entry('hike', 'outdoors');
const bowl = entry('bowl', 'sport');
const pottery = entry('pottery', 'craft');
const all = [pier, hike, bowl, pottery];
const rows = all.map((activity) => ({ activity }));

const options = {
  grouping: 'Kind' as const,
  cityName: 'Los Angeles',
  doneIds: new Set(['hike']),
  planDay: (id: string) => ({ bowl: '2026-11-07' })[id],
  kindLabel: (id: string) => ({ outdoors: 'Outdoors', sport: 'Sport', craft: 'Crafts' })[id] ?? id,
};

describe('checklistSections', () => {
  it('puts plans first, then must-dos, then kinds by name', () => {
    const sections = checklistSections(all, rows, options);
    expect(sections.map((s) => s.title)).toEqual(['Coming up', 'Los Angeles must-dos', 'Crafts', 'Outdoors']);
    expect(sections[0].data.map((r) => r.activity.id)).toEqual(['bowl']);
  });

  it('counts done against everything in the section, not just what is shown', () => {
    const outdoors = checklistSections(all, [{ activity: pier }], options).find((s) => s.key === 'kind:outdoors');
    expect(outdoors).toBeUndefined();
    const shown = checklistSections(all, rows, options).find((s) => s.key === 'kind:outdoors')!;
    expect([shown.done, shown.total]).toEqual([1, 1]);
  });

  it('only lets kind sections fold', () => {
    const sections = checklistSections(all, rows, options);
    expect(sections.filter((s) => s.collapsible).map((s) => s.key)).toEqual(['kind:craft', 'kind:outdoors']);
  });

  it('makes one list when not grouping', () => {
    const sections = checklistSections(all, rows, { ...options, grouping: 'None' });
    expect(sections.map((s) => s.title)).toEqual(['Coming up', 'Everything']);
    expect(sections[1].data).toHaveLength(3);
  });
});

describe('matchesStatus', () => {
  const done = new Set(['a']);
  const saved = new Set(['b']);
  it('treats a pin as done only when everything there is done', () => {
    expect(matchesStatus(['a'], 'Done', done, saved)).toBe(true);
    expect(matchesStatus(['a', 'b'], 'Done', done, saved)).toBe(false);
    expect(matchesStatus(['a', 'b'], 'Not done', done, saved)).toBe(true);
    expect(matchesStatus(['a'], 'Not done', done, saved)).toBe(false);
  });
  it('matches saved if anything there is saved', () => {
    expect(matchesStatus(['a', 'b'], 'Saved', done, saved)).toBe(true);
    expect(matchesStatus(['a'], 'Saved', done, saved)).toBe(false);
    expect(matchesStatus([], 'All', done, saved)).toBe(true);
  });
});
