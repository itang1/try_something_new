import { NativeTabs } from 'expo-router/native-tabs';
import { useColors } from '@/theme';

export default function TabLayout() {
  const colors = useColors();
  return (
    <NativeTabs tintColor={colors.accent} sidebarAdaptable>
      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Icon sf="sparkle.magnifyingglass" md="travel_explore" />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Icon sf="map" md="map" />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="checklist">
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
        <NativeTabs.Trigger.Label>Checklist</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
