import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { mmss } from '@/lib/dates';
import { radius, space, useTheme } from '@/theme';

export const REST_PRESETS = [60, 90, 120, 180];

interface Props {
  /** Epoch ms when the rest ends, or null when no rest is running. */
  endsAt: number | null;
  onChange: (endsAt: number | null) => void;
  restSec: number;
  onRestSecChange: (sec: number) => void;
}

/**
 * Countdown between sets. It stores an end time rather than counting ticks, so it stays
 * right if the phone locks or the app goes to the background. Vibrates once when done.
 */
export function RestTimer({ endsAt, onChange, restSec, onRestSecChange }: Props) {
  const t = useTheme();
  const [now, setNow] = useState(Date.now());
  const buzzedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = endsAt ? Math.max(0, (endsAt - now) / 1000) : 0;
  const done = !!endsAt && left <= 0;

  useEffect(() => {
    if (done && buzzedFor.current !== endsAt) {
      buzzedFor.current = endsAt;
      Vibration.vibrate([0, 400, 200, 400]);
    }
  }, [done, endsAt]);

  const pill = (label: string, onPress: () => void, selected = false, a11y?: string) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      onPress={onPress}
      style={[
        styles.pill,
        { borderColor: selected ? t.accent : t.border, backgroundColor: selected ? t.accentSoft : t.card },
      ]}
    >
      <Text style={{ color: t.text, fontWeight: selected ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.bar, { backgroundColor: t.card, borderTopColor: t.border }]}>
      {endsAt ? (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.muted, fontSize: 13 }}>{done ? 'Rest over' : 'Resting'}</Text>
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: done ? t.accent : t.text, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}
            >
              {done ? 'Go!' : mmss(left)}
            </Text>
          </View>
          {!done ? pill('−15s', () => onChange(endsAt - 15_000), false, 'Subtract 15 seconds') : null}
          {!done ? pill('+15s', () => onChange(endsAt + 15_000), false, 'Add 15 seconds') : null}
          {pill(done ? 'Close' : 'Skip', () => onChange(null))}
        </View>
      ) : (
        <View style={styles.row}>
          <Text style={{ color: t.muted, flex: 1 }}>Rest after each set</Text>
          {REST_PRESETS.map((s) => pill(mmss(s), () => onRestSecChange(s), s === restSec, `${s} seconds rest`))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.lg, paddingVertical: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
});
