import type { Entry } from './catalog';

export type Grouping = 'Kind' | 'None';

export type ChecklistSection<R> = {
  key: string;
  title: string;
  /** Kind sections fold away; Coming up and the must-dos always stay open. */
  collapsible: boolean;
  /** Done and total in this section, counted before the status filter so "3 of 12" stays true. */
  done: number;
  total: number;
  data: R[];
};

type Options = {
  grouping: Grouping;
  cityName: string;
  doneIds: Set<string>;
  /** Day each planned entry is planned for, as YYYY-MM-DD. */
  planDay: (id: string) => string | undefined;
  /** Label for a kind (subcategory) id. */
  kindLabel: (id: string) => string;
};

/**
 * Splits the checklist into sections:
 * Coming up (planned, not done, soonest first), then the city's must-dos, then one section per kind.
 * `all` is every entry in the city, used only for the done counts; `shown` is what passed the filters, already sorted.
 */
export function checklistSections<R extends { activity: Entry }>(
  all: Entry[],
  shown: R[],
  { grouping, cityName, doneIds, planDay, kindLabel }: Options,
): ChecklistSection<R>[] {
  const count = (pick: (e: Entry) => boolean) => {
    const pool = all.filter(pick);
    return { done: pool.filter((e) => doneIds.has(e.id)).length, total: pool.length };
  };
  const isUpcoming = (r: R) => planDay(r.activity.id) !== undefined && !doneIds.has(r.activity.id);
  const upcoming = shown.filter(isUpcoming).sort((x, y) => planDay(x.activity.id)!.localeCompare(planDay(y.activity.id)!));
  const rest = shown.filter((r) => !isUpcoming(r));

  const sections: ChecklistSection<R>[] = [
    {
      key: 'upcoming',
      title: 'Coming up',
      collapsible: false,
      ...count((e) => planDay(e.id) !== undefined && !doneIds.has(e.id)),
      data: upcoming,
    },
  ];

  if (grouping === 'None') {
    sections.push({ key: 'all', title: 'Everything', collapsible: false, ...count(() => true), data: rest });
  } else {
    const isMustDo = (e: Entry) => e.kind === 'icon';
    sections.push({
      key: 'must-do',
      title: `${cityName} must-dos`,
      collapsible: false,
      ...count(isMustDo),
      data: rest.filter((r) => isMustDo(r.activity)),
    });
    const kinds = [...new Set(all.filter((e) => !isMustDo(e)).map((e) => e.subcategory))].sort((a, b) =>
      kindLabel(a).localeCompare(kindLabel(b)),
    );
    for (const kind of kinds) {
      const inKind = (e: Entry) => !isMustDo(e) && e.subcategory === kind;
      sections.push({
        key: `kind:${kind}`,
        title: kindLabel(kind),
        collapsible: true,
        ...count(inKind),
        data: rest.filter((r) => inKind(r.activity)),
      });
    }
  }
  return sections.filter((s) => s.data.length > 0);
}
