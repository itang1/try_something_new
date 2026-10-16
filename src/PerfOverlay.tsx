import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';

export type PerfStats = { mapReadyMs: number | null; clusterMs: number; pinCount: number };

const WINDOW_MS = 1000;

// Shows current and worst frame rates for the UI thread (where map gestures and
// Reanimated run) and the JS thread (where clustering runs). Tap to reset the worst values.
export function PerfOverlay({ stats }: { stats: PerfStats }) {
  const [ui, setUi] = useState({ now: 0, min: Infinity });
  const [js, setJs] = useState({ now: 0, min: Infinity });
  const [maxStall, setMaxStall] = useState(0);

  const uiFrames = useSharedValue(0);
  const uiWindowStart = useSharedValue(0);
  const reportUi = (fps: number) => setUi((s) => ({ now: fps, min: Math.min(s.min, fps) }));

  useFrameCallback((frame) => {
    'worklet';
    if (uiWindowStart.value === 0) uiWindowStart.value = frame.timestamp;
    uiFrames.value += 1;
    const elapsed = frame.timestamp - uiWindowStart.value;
    if (elapsed >= WINDOW_MS) {
      runOnJS(reportUi)(Math.round((uiFrames.value * 1000) / elapsed));
      uiFrames.value = 0;
      uiWindowStart.value = frame.timestamp;
    }
  });

  const jsState = useRef({ frames: 0, start: 0, last: 0 });
  useEffect(() => {
    let id: number;
    const tick = (t: number) => {
      const s = jsState.current;
      if (s.start === 0) s.start = s.last = t;
      const gap = t - s.last;
      if (gap > 100) setMaxStall((m) => Math.max(m, Math.round(gap)));
      s.last = t;
      s.frames += 1;
      if (t - s.start >= WINDOW_MS) {
        const fps = Math.round((s.frames * 1000) / (t - s.start));
        setJs((v) => ({ now: fps, min: Math.min(v.min, fps) }));
        s.frames = 0;
        s.start = t;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const reset = () => {
    setUi((s) => ({ now: s.now, min: Infinity }));
    setJs((s) => ({ now: s.now, min: Infinity }));
    setMaxStall(0);
  };

  const fmt = (n: number) => (Number.isFinite(n) ? n : '-');
  return (
    <Pressable style={styles.box} onPress={reset}>
      <Text style={styles.line}>
        UI {ui.now} fps (worst {fmt(ui.min)}) · JS {js.now} fps (worst {fmt(js.min)})
      </Text>
      <Text style={styles.line}>
        JS stalls over 100 ms: {maxStall ? `${maxStall} ms` : 'none'} · cluster {stats.clusterMs.toFixed(1)} ms
      </Text>
      <Text style={styles.line}>
        {stats.pinCount} markers on screen · map ready {stats.mapReadyMs ? `${Math.round(stats.mapReadyMs)} ms` : '-'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(17,24,39,0.82)',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  line: { color: 'white', fontSize: 12, fontVariant: ['tabular-nums'] },
});
