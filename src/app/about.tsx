import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { CREDITS, openCredit } from '@/data/credits';
import { canReport } from '@/data/report';
import { readable, useColors } from '@/theme';
import { Icon } from '@/components/icon';

export default function AboutSheet() {
  const colors = useColors();
  const router = useRouter();
  const version = Constants.expoConfig?.version;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.label }]}>About</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Close"
          style={[styles.close, { backgroundColor: colors.fill }]}
        >
          <Icon name="close" size={18} color={colors.secondary} />
        </Pressable>
      </View>

      <Text style={[styles.body, { color: colors.label }]}>
        Try Something New{version ? ` ${version}` : ''} is built on open data. Every place in it comes from people who
        mapped their own cities, and these projects make that data free to use.
      </Text>

      <Text style={[styles.section, { color: colors.secondary }]}>Data and credits</Text>
      <View style={[styles.list, { backgroundColor: colors.card }]}>
        {CREDITS.map((credit, i) => (
          <Pressable
            key={credit.id}
            onPress={() => openCredit(credit)}
            accessibilityRole="link"
            accessibilityHint={`Opens ${credit.name}'s license and attribution page`}
            style={({ pressed }) => [
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View style={styles.grow}>
              <Text style={[styles.name, { color: colors.label }]}>{credit.name}</Text>
              <Text style={[styles.use, { color: colors.secondary }]}>{credit.use}</Text>
              <Text style={[styles.notice, { color: colors.tertiary }]}>
                {credit.notice} · {credit.license}
              </Text>
            </View>
            <Icon name="open_in_new" size={18} color={colors.accent} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.secondary }]}>
        The map itself is Apple Maps on iOS and Google Maps on Android, credited in its corner.
        {canReport ? ' Places can be out of date, and the flag next to a place reports it.' : ''}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { ...readable, padding: 16, paddingTop: 24, paddingBottom: 40, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700' },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 16, lineHeight: 22 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: 4, marginTop: 8 },
  list: { borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  grow: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  use: { fontSize: 14, marginTop: 2 },
  notice: { fontSize: 12, marginTop: 4 },
  footnote: { fontSize: 13, lineHeight: 18, marginHorizontal: 4 },
});
