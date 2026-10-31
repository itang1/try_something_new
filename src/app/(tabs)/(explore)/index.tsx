import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import FiltersIcon from '@expo/material-symbols/tune.xml';
import AboutIcon from '@expo/material-symbols/info.xml';
import * as Haptics from 'expo-haptics';
import { entryHint, inSeason, isHomeSpot, kindsOf, LEVELS, listOr, otherWays, type Entry } from '@/data/catalog';
import { addDays, dayKey, formatDay } from '@/data/days';
import { openDirections, searchNearby } from '@/data/directions';
import { allowNudges } from '@/data/nudge';
import { placesByDistance } from '@/data/drive';
import { CARD_PLACES, defaultWhere, whereOptions, type WhereOption } from '@/data/where';
import { describeFilters, matchesFilters, NO_FILTERS } from '@/data/filters';
import { readSetting, writeSetting } from '@/data/storage';
import { useAppState } from '@/state/app-state';
import { readable, readableOn, subcategory, useColors } from '@/theme';
import { toolbarIcon } from '@/components/header-items';
import { GradientIcon, Icon } from '@/components/icon';
import { MetadataTag } from '@/components/chips';
import { LocationControl } from '@/components/location-control';
import { SwipeCard } from '@/components/swipe-card';
import { useMarkDone } from '@/state/use-mark-done';
import { useToast } from '@/state/toast';
import type { IconName } from '@/icons/paths';

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function sample<T>(items: T[], n: number): T[] {
  const rest = [...items];
  return Array.from({ length: Math.min(n, rest.length) }, () => rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
}

export default function ExploreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { city, entries, findEntry, home, origin, driveTimes, isDone, savedIds, toggleSaved, hiddenIds, hide, plans, filters, setFilters, weekendNudge, setWeekendNudge } =
    useAppState();
  const markDone = useMarkDone();
  const toast = useToast();
  // The pick remembers its city, so switching cities clears it without an effect.
  const [pick, setPick] = useState<{ id: string; city: string; n: number; nudge: boolean } | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [nudgeAsked, setNudgeAsked] = useState(() => readSetting('nudgeAsked', false));
  const { height } = useWindowDimensions();
  const footer = useRef<ComponentRef<typeof View>>(null);
  const [toastBottom, setToastBottom] = useState<number>();

  useEffect(() => {
    if (!home && !readSetting('onboarded', false)) router.push('/welcome');
    // Only on first mount: later changes to home shouldn't bring the welcome back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activity = pick?.city === city.id ? findEntry(pick.id) : undefined;

  const showAnother = (exclude?: string) => {
    const current = exclude ?? activity?.id;
    const allowed = entries.filter(
      (e) => e.id !== current && !hiddenIds.has(e.id) && inSeason(e) && matchesFilters(e, filters, origin, driveTimes),
    );
    const fresh = allowed.filter((e) => !isDone(e.id));
    // Early on, skip the stretches so the first few tries are easy wins, unless levels were picked on purpose.
    const warmingUp = !filters.levels.length && entries.filter((e) => isDone(e.id)).length < 3;
    const gentle = warmingUp ? fresh.filter((e) => e.level !== 'stretch') : fresh;
    const pool = gentle.length ? gentle : fresh.length ? fresh : allowed;
    Haptics.selectionAsync();
    if (!pool.length) {
      setPick(null);
      setNoMatch(true);
      return;
    }
    setNoMatch(false);
    const nudge = !readSetting('swipeNudged', false);
    if (nudge) writeSetting('swipeNudged', true);
    setPick({ id: randomItem(pool).id, city: city.id, n: (pick?.n ?? 0) + 1, nudge });
  };

  // A gentle nudge for a plan that's today or tomorrow. Missed plans just drop off.
  const soonDays = [dayKey(new Date()), dayKey(addDays(new Date(), 1))];
  const soonPlan = [...plans.values()]
    .filter((p) => soonDays.includes(p.day) && !isDone(p.entryId))
    .sort((x, y) => x.day.localeCompare(y.day))[0];
  const soonEntry = soonPlan && findEntry(soonPlan.entryId);
  const soonPlace = soonEntry?.places.find((p) => p.id === soonPlan?.placeId)?.name ?? soonPlan?.placeName;

  const activeFilters = describeFilters(filters, (id) => subcategory(id).label);
  // Asked once, and only after someone has saved or done something, so it never comes up cold.
  const offerNudge = !weekendNudge && !nudgeAsked && (savedIds.size > 0 || entries.some((e) => isDone(e.id)));
  const answerNudge = async (yes: boolean) => {
    writeSetting('nudgeAsked', true);
    setNudgeAsked(true);
    if (yes) setWeekendNudge(await allowNudges());
  };

  // A swipe moves the card away, so say it was saved.
  const save = (entry: Entry) => {
    if (savedIds.has(entry.id)) return;
    toggleSaved(entry.id);
    toast(`Saved ${entry.name}`, { type: 'unsave', id: entry.id }, toastBottom);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* A scroll view lets the large title lay out natively; the button sits outside it, above the tabs. */}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LocationControl />

        {activeFilters.length > 0 && (
          <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
            <Pressable
              onPress={() => router.push('/filters')}
              accessibilityRole="button"
              accessibilityHint="Changes the filters"
              style={styles.filterText}
            >
              <Icon name="tune" size={18} color={colors.accent} />
              <Text style={[styles.filterLabel, { color: colors.label }]} numberOfLines={1}>
                {activeFilters.join(' · ')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setFilters(NO_FILTERS);
                setNoMatch(false);
              }}
              hitSlop={10}
              accessibilityLabel="Clear filters"
            >
              <Icon name="close" size={18} color={colors.secondary} />
            </Pressable>
          </View>
        )}

        {soonPlan && soonEntry && (
          <Pressable
            onPress={() => router.push(`/activity/${soonEntry.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.soon, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.7 : 1 }]}
          >
            <GradientIcon icon={soonEntry.icon} subcategoryId={soonEntry.subcategory} size={40} shape="tile" />
            <View style={styles.grow}>
              <Text style={[styles.soonDay, { color: colors.accent }]}>{formatDay(soonPlan.day)}</Text>
              <Text style={[styles.placeName, { color: colors.label }]} numberOfLines={2}>
                {isHomeSpot(soonPlan.placeId) ? `${soonEntry.name} at home` : soonPlace ? `${soonEntry.name} at ${soonPlace}` : soonEntry.name}
              </Text>
            </View>
            <Icon name="chevron_right" size={20} color={colors.tertiary} />
          </Pressable>
        )}

        {offerNudge && (
          <View style={[styles.nudge, { backgroundColor: colors.card }]}>
            <View style={styles.nudgeTop}>
              <View style={[styles.nudgeIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name="notifications" size={22} color={colors.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.placeName, { color: colors.label }]}>Want one idea every Thursday?</Text>
                <Text style={[styles.placeLine, { color: colors.secondary }]}>
                  A single suggestion for the weekend, at 6 pm. No streaks, and you can turn it off in Settings.
                </Text>
              </View>
            </View>
            <View style={styles.nudgeButtons}>
              <Pressable
                onPress={() => answerNudge(false)}
                style={({ pressed }) => [styles.nudgeButton, { backgroundColor: colors.fill, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.nudgeButtonText, { color: colors.label }]}>No thanks</Text>
              </Pressable>
              <Pressable
                onPress={() => answerNudge(true)}
                style={({ pressed }) => [styles.nudgeButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.nudgeButtonText, { color: colors.onAccent }]}>Yes, please</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.middle, activity && styles.top]}>
          {activity ? (
            <SwipeCard
              key={pick?.n}
              nudge={pick?.nudge}
              onSwipeLeft={() => showAnother(activity.id)}
              onSwipeRight={() => {
                save(activity);
                showAnother(activity.id);
              }}
            >
              <ActivityCard
                entry={activity}
                origin={origin}
                done={isDone(activity.id)}
                saved={savedIds.has(activity.id)}
                planned={plans.has(activity.id)}
                onPlan={(spot) => router.push({ pathname: '/plan/[id]', params: spot ? { id: activity.id, spot } : { id: activity.id } })}
                onOpen={() => router.push(`/activity/${activity.id}`)}
                onPickKind={(id) => setPick({ id, city: city.id, n: (pick?.n ?? 0) + 1, nudge: false })}
                onNotForMe={() => {
                  hide(activity.id);
                  toast(`Hid ${activity.name}`, { type: 'hide', id: activity.id }, toastBottom);
                  showAnother(activity.id);
                }}
                onSave={() => {
                  Haptics.selectionAsync();
                  toggleSaved(activity.id);
                }}
                onDone={() => {
                  Haptics.selectionAsync();
                  markDone(activity);
                }}
              />
            </SwipeCard>
          ) : noMatch ? (
            <View style={styles.empty}>
              <Icon name="tune" size={60} color={colors.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.secondary }]}>Nothing matches your filters</Text>
              <Pressable onPress={() => router.push('/filters')} hitSlop={8}>
                <Text style={[styles.emptyLink, { color: colors.accent }]}>Change filters</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Icon name="help" size={60} color={colors.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.secondary }]}>What should you do today?</Text>
              <Text style={[styles.emptyBody, { color: colors.tertiary }]}>Tap the button to find out!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView
        ref={footer}
        edges={['bottom']}
        style={styles.footer}
        onLayout={() => footer.current?.measureInWindow((_x, y) => setToastBottom(height - y + 8))}
      >
        <Pressable
          onPress={() => showAnother()}
          disabled={entries.length === 0}
          style={({ pressed }) => [styles.tryButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name="shuffle" size={22} color={colors.onAccent} />
          <Text style={[styles.tryText, { color: colors.onAccent }]}>{activity ? 'Show me another' : 'Show me something'}</Text>
        </Pressable>
        {activity && (
          <View style={styles.swipeHint} accessibilityLabel="Or swipe the card: left to skip, right to save">
            <Icon name="arrow_back" size={16} color={colors.secondary} />
            <Text style={[styles.swipeHintText, { color: colors.secondary }]}>Skip</Text>
            <Text style={[styles.swipeHintText, { color: colors.tertiary }]}>swipe</Text>
            <Text style={[styles.swipeHintText, { color: colors.accent }]}>Save</Text>
            <Icon name="arrow_forward" size={16} color={colors.accent} />
          </View>
        )}
      </SafeAreaView>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="About"
          tintColor={colors.accent}
          onPress={() => router.push('/about')}
        >
          <Stack.Toolbar.Icon {...toolbarIcon('info.circle', AboutIcon)} />
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Filters"
          tintColor={colors.accent}
          onPress={() => router.push('/filters')}
        >
          <Stack.Toolbar.Icon {...toolbarIcon('line.3.horizontal.decrease', FiltersIcon)} />
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </View>
  );
}

type CardProps = {
  entry: Entry;
  origin: Parameters<typeof placesByDistance>[1];
  done: boolean;
  saved: boolean;
  planned: boolean;
  onPlan: (spotId: string | null) => void;
  onOpen: () => void;
  onPickKind: (id: string) => void;
  onNotForMe: () => void;
  onSave: () => void;
  onDone: () => void;
};

function ActivityCard({ entry, origin, done, saved, planned, onPlan, onOpen, onPickKind, onNotForMe, onSave, onDone }: CardProps) {
  const colors = useColors();
  const { driveTimes, entries, filters } = useAppState();
  const sub = subcategory(entry.subcategory);
  // Staying in leads with the home version, even for something that also has places nearby.
  const stayIn = filters.where === 'home';
  const places = placesByDistance(entry, origin, driveTimes);
  const [whereId, setWhereId] = useState<string | null>(null);
  const options = whereOptions(entry, places, whereId);
  const where = options.find((o) => o.id === whereId) ?? defaultWhere(options, stayIn);
  const hostWay = otherWays(entry).find((w) => w.kind === 'host');
  // A broad idea like "Try a new craft" offers a few of its kinds. The card remounts for each pick, so they hold still.
  const allKinds = kindsOf(entries, entry);
  const [kinds] = useState(() => sample(allKinds, KINDS_ON_CARD));
  const [open, setOpen] = useState(false);

  const toggle = () => {
    Haptics.selectionAsync();
    setOpen(!open);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <GradientIcon
        icon={entry.icon}
        subcategoryId={entry.subcategory}
        size={88}
        shape="circle"
        style={{ boxShadow: `0 10px 20px ${sub.color}59` }}
      />
      <Text style={[styles.title, { color: colors.label }]}>{entry.name}</Text>
      <Text style={[styles.pill, { color: sub.color, backgroundColor: `${sub.color}26` }]}>{sub.label}</Text>

      {kinds.length > 0 ? (
        <ChoiceBox
          label="Pick one"
          open={open}
          canChange
          changeLabel="Choose"
          onToggle={toggle}
          summary={
            <ChoiceRow
              icon={entry.icon}
              title={`Like ${listOr(kinds.slice(0, 3).map((k) => k.name.toLowerCase()))}`}
              detail={`${allKinds.length} kinds to try`}
            />
          }
          more={allKinds.length > kinds.length ? `See all ${allKinds.length} kinds` : 'See details'}
          onMore={onOpen}
        >
          {kinds.map((kind) => (
            <ChoiceRow
              key={kind.id}
              icon={kind.icon}
              title={kind.name}
              detail={entryHint(kind)}
              trailing="chevron"
              onPress={() => {
                Haptics.selectionAsync();
                onPickKind(kind.id);
              }}
              hint="Shows this one on the card instead"
            />
          ))}
        </ChoiceBox>
      ) : where ? (
        <ChoiceBox
          label={where.kind === 'home' ? 'Where: at home' : 'Where'}
          open={open}
          canChange={options.length > 1}
          changeLabel="Change"
          onToggle={toggle}
          summary={
            <ChoiceRow
              icon={whereIcon(where)}
              title={where.title}
              detail={where.detail}
              action={whereAction(where, entry, origin)}
            />
          }
          more={places.length > CARD_PLACES ? `See all ${places.length} places` : 'See details'}
          onMore={onOpen}
        >
          {options.map((o) => (
            <ChoiceRow
              key={o.id}
              icon={whereIcon(o)}
              title={o.title}
              detail={o.detail}
              trailing={o.id === where.id ? 'selected' : 'unselected'}
              onPress={() => {
                Haptics.selectionAsync();
                setWhereId(o.id);
                setOpen(false);
              }}
              hint="Shows this on the card"
            />
          ))}
        </ChoiceBox>
      ) : (
        hostWay && (
          <ChoiceBox label="Where" open={false} canChange={false} changeLabel="" onToggle={toggle}>
            <ChoiceRow icon={hostWay.icon} title={hostWay.title} detail={hostWay.detail} />
          </ChoiceBox>
        )
      )}

      <View style={styles.tags}>
        <MetadataTag icon="schedule" text={entry.duration} />
        <MetadataTag icon="payments" text={entry.cost} />
        <MetadataTag icon={LEVELS[entry.level].icon} text={LEVELS[entry.level].label} />
      </View>

      <View style={styles.actions}>
        <CardAction icon="block" label="Not for me" onPress={onNotForMe} tint={colors.red} />
        <CardAction icon="bookmark" label={saved ? 'Saved' : 'Save'} onPress={onSave} tint={colors.accent} selected={saved} />
        <CardAction
          icon="calendar_month"
          label={planned ? 'Planned' : 'Plan'}
          onPress={() => onPlan(where && where.kind !== 'search' ? where.id : null)}
          tint={colors.blue}
          selected={planned}
        />
        <CardAction
          icon={done ? 'check_circle' : 'radio_button_unchecked'}
          label={done ? 'Done!' : 'Done'}
          onPress={onDone}
          tint={colors.done}
          selected={done}
        />
      </View>

      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityHint="Opens every place, directions and check-offs"
        hitSlop={8}
        style={({ pressed }) => [styles.details, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="info" size={16} color={colors.secondary} />
        <Text style={[styles.detailsText, { color: colors.secondary }]}>Details</Text>
      </Pressable>
    </View>
  );
}

const KINDS_ON_CARD = 5;

function whereIcon(o: WhereOption): IconName {
  return o.kind === 'home' ? 'cottage' : o.kind === 'search' ? 'search' : 'location_on';
}

function whereAction(o: WhereOption, entry: Entry, origin: CardProps['origin']): RowAction | undefined {
  if (o.kind === 'place') return { icon: 'directions', label: 'Go', a11y: `Directions to ${o.title}`, onPress: () => openDirections(o.place) };
  if (o.kind === 'search') return { icon: 'search', label: 'Search', a11y: `Search maps for ${entry.search}`, onPress: () => searchNearby(entry.search!, origin) };
  return undefined;
}

type ChoiceBoxProps = {
  label: string;
  open: boolean;
  canChange: boolean;
  changeLabel: string;
  onToggle: () => void;
  /** The current choice, shown while the list is closed. */
  summary?: ReactNode;
  /** The choices, shown while the list is open. */
  children: ReactNode;
  more?: string;
  onMore?: () => void;
};

/** "Where" or "Pick one" on the card: the current choice, and a Change button that opens the other choices in place. */
function ChoiceBox({ label, open, canChange, changeLabel, onToggle, summary, children, more, onMore }: ChoiceBoxProps) {
  const colors = useColors();
  return (
    <View style={[styles.choice, { backgroundColor: colors.background }]}>
      <View style={styles.choiceHead}>
        <Text style={[styles.choiceLabel, { color: colors.secondary }]}>{label}</Text>
        {canChange && (
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            hitSlop={10}
            style={({ pressed }) => [styles.change, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.changeText, { color: colors.accent }]}>{open ? 'Close' : changeLabel}</Text>
            <View style={open && styles.flip}>
              <Icon name="keyboard_arrow_down" size={18} color={colors.accent} />
            </View>
          </Pressable>
        )}
      </View>
      {open ? children : (summary ?? children)}
      {open && more && onMore && (
        <Pressable onPress={onMore} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.more, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.moreText, { color: colors.accent }]}>{more}</Text>
          <Icon name="chevron_right" size={18} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

type RowAction = { icon: IconName; label: string; a11y: string; onPress: () => void };

type ChoiceRowProps = {
  icon: IconName;
  title: string;
  detail?: string | null;
  action?: RowAction;
  trailing?: 'selected' | 'unselected' | 'chevron';
  onPress?: () => void;
  hint?: string;
};

function ChoiceRow({ icon, title, detail, action, trailing, onPress, hint }: ChoiceRowProps) {
  const colors = useColors();
  const selected = trailing === 'selected';
  const body = (
    <>
      <Icon name={icon} size={22} color={colors.accent} />
      <View style={styles.grow}>
        <Text style={[styles.placeName, { color: colors.label }]} numberOfLines={2}>
          {title}
        </Text>
        {!!detail && (
          <Text style={[styles.placeLine, { color: colors.secondary }]} numberOfLines={2}>
            {detail}
          </Text>
        )}
      </View>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.a11y}
          hitSlop={6}
          style={({ pressed }) => [styles.go, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name={action.icon} size={16} color={colors.accent} />
          <Text style={[styles.goText, { color: colors.accent }]}>{action.label}</Text>
        </Pressable>
      )}
      {trailing === 'chevron' && <Icon name="chevron_right" size={20} color={colors.tertiary} />}
      {(trailing === 'selected' || trailing === 'unselected') && (
        <Icon
          name={selected ? 'check_circle' : 'radio_button_unchecked'}
          size={22}
          color={selected ? colors.accent : colors.tertiary}
        />
      )}
    </>
  );
  if (!onPress) return <View style={styles.choiceRow}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={trailing === 'chevron' ? 'button' : 'radio'}
      accessibilityState={trailing === 'chevron' ? undefined : { selected }}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.choiceRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

type ActionProps = { icon: IconName; label: string; onPress: () => void; tint: string; selected?: boolean };

function CardAction({ icon, label, onPress, tint, selected }: ActionProps) {
  const color = selected ? readableOn(tint) : tint;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: selected ? tint : `${tint}1F`, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { ...readable, flexGrow: 1, padding: 16, gap: 16 },
  middle: { flex: 1, justifyContent: 'center' },
  // The scroll view runs behind the footer, so a centered card would slip under it.
  top: { justifyContent: 'flex-start' },
  card: { borderRadius: 24, padding: 16, paddingTop: 20, alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  pill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  choice: { alignSelf: 'stretch', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
  choiceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  choiceLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  change: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 10, paddingRight: 6, paddingVertical: 4, borderRadius: 999 },
  changeText: { fontSize: 14, fontWeight: '600' },
  flip: { transform: [{ rotate: '180deg' }] },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 6 },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 10, borderRadius: 16 },
  goText: { fontSize: 14, fontWeight: '600' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 6 },
  moreText: { fontSize: 14, fontWeight: '600' },
  details: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  detailsText: { fontSize: 14, fontWeight: '600' },
  placeName: { fontSize: 15, fontWeight: '600' },
  placeLine: { fontSize: 13, marginTop: 2 },
  grow: { flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  actions: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, marginTop: 4 },
  action: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  nudge: { padding: 14, borderRadius: 16, gap: 12 },
  nudgeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nudgeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nudgeButtons: { flexDirection: 'row', gap: 8 },
  nudgeButton: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nudgeButtonText: { fontSize: 15, fontWeight: '600' },
  soonDay: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  empty: { alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyBody: { fontSize: 15 },
  emptyLink: { fontSize: 16, fontWeight: '600' },
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  filterText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  footer: { ...readable, paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' },
  tryButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryText: { fontSize: 17, fontWeight: '600' },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  swipeHintText: { fontSize: 13, fontWeight: '600' },
});
