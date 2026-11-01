import { useEffect, useState } from 'react';
import type { Coordinate } from '@/data/drive';
import { readSetting } from '@/data/storage';
import { fetchWeather, moodOf, type Mood } from '@/data/weather';

/** Whether "Weather-aware ideas" is on in Settings. Read at the moment of a pick, so a change there applies right away. */
export const weatherAware = () => readSetting('weatherAware', true);

/** Whether today's weather near a point calls for indoor ideas. Null when it's fine, unknown, or the setting is off. */
export function useWeatherMood(point: Coordinate | null): Mood | null {
  const [mood, setMood] = useState<Mood | null>(null);
  const lat = point?.latitude;
  const lng = point?.longitude;
  useEffect(() => {
    if (!weatherAware() || lat == null || lng == null) return;
    const controller = new AbortController();
    fetchWeather({ latitude: lat, longitude: lng }, controller.signal).then((w) => {
      if (!controller.signal.aborted) setMood(moodOf(w));
    });
    return () => controller.abort();
  }, [lat, lng]);
  return mood;
}
