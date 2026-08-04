import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onValue, ref, set } from 'firebase/database';

import { database, firebaseConfigurationError } from './src/firebase';

type FanMode = 0 | 1 | 2 | 3 | 4;

type HomeState = {
  fanMode: FanMode;
  lightOn: boolean;
  temperature: number | null;
  humidity: number | null;
};

const initialState: HomeState = {
  fanMode: 0,
  lightOn: false,
  temperature: null,
  humidity: null,
};

const fanModes: { value: FanMode; label: string; detail: string }[] = [
  { value: 0, label: 'Isključeno', detail: '0%' },
  { value: 1, label: 'Tiho', detail: '31%' },
  { value: 2, label: 'Srednje', detail: '59%' },
  { value: 3, label: 'Jako', detail: '100%' },
  { value: 4, label: 'Automatski', detail: '25–35 °C' },
];

function formatReading(value: number | null, suffix: string) {
  return value === null ? '—' : `${value.toFixed(1)}${suffix}`;
}

export default function App() {
  const [home, setHome] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(firebaseConfigurationError);

  useEffect(() => {
    if (!database) {
      setLoaded(true);
      return;
    }

    const unsubscribeHome = onValue(
      ref(database),
      (snapshot) => {
        const value = snapshot.val() ?? {};
        const rawFanMode = Number(value.fan?.mode ?? 0);
        const fanMode = ([0, 1, 2, 3, 4].includes(rawFanMode) ? rawFanMode : 0) as FanMode;

        setHome({
          fanMode,
          lightOn: Boolean(value.light?.turn),
          temperature: typeof value.sensor?.temperature === 'number' ? value.sensor.temperature : null,
          humidity: typeof value.sensor?.humidity === 'number' ? value.sensor.humidity : null,
        });
        setLoaded(true);
        setError(null);
      },
      () => {
        setLoaded(true);
        setError('Baza nije dostupna. Provjeri Firebase konfiguraciju i pravila.');
      },
    );

    const unsubscribeConnection = onValue(ref(database, '.info/connected'), (snapshot) => {
      setConnected(snapshot.val() === true);
    });

    return () => {
      unsubscribeHome();
      unsubscribeConnection();
    };
  }, []);

  const activeMode = useMemo(
    () => fanModes.find((mode) => mode.value === home.fanMode) ?? fanModes[0],
    [home.fanMode],
  );

  async function updateFanMode(mode: FanMode) {
    if (!database || pending) return;
    const previous = home.fanMode;
    setHome((current) => ({ ...current, fanMode: mode }));
    setPending('fan');
    setError(null);
    try {
      await set(ref(database, 'fan/mode'), mode);
    } catch {
      setHome((current) => ({ ...current, fanMode: previous }));
      setError('Način ventilatora nije spremljen. Pokušaj ponovno.');
    } finally {
      setPending(null);
    }
  }

  async function updateLight(value: boolean) {
    if (!database || pending) return;
    const previous = home.lightOn;
    setHome((current) => ({ ...current, lightOn: value }));
    setPending('light');
    setError(null);
    try {
      await set(ref(database, 'light/turn'), value);
    } catch {
      setHome((current) => ({ ...current, lightOn: previous }));
      setError('Stanje svjetla nije spremljeno. Pokušaj ponovno.');
    } finally {
      setPending(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MOJ SUSTAV</Text>
            <Text style={styles.title}>Upravljanje prostorom</Text>
          </View>
          <View style={[styles.connectionBadge, connected && styles.connectionBadgeOnline]}>
            <View style={[styles.connectionDot, connected && styles.connectionDotOnline]} />
            <Text style={styles.connectionText}>{connected ? 'Povezano' : 'Izvan mreže'}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Potrebna je pažnja</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sensorRow}>
          <View style={[styles.sensorCard, styles.temperatureCard]}>
            <Text style={styles.sensorIcon}>☀</Text>
            <Text style={styles.sensorLabel}>Temperatura</Text>
            <Text style={styles.sensorValue}>{formatReading(home.temperature, ' °C')}</Text>
            <Text style={styles.sensorMeta}>DHT11 senzor</Text>
          </View>
          <View style={[styles.sensorCard, styles.humidityCard]}>
            <Text style={styles.sensorIcon}>●</Text>
            <Text style={styles.sensorLabel}>Vlažnost zraka</Text>
            <Text style={styles.sensorValue}>{formatReading(home.humidity, '%')}</Text>
            <Text style={styles.sensorMeta}>DHT11 senzor</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ventilator</Text>
          <Text style={styles.sectionStatus}>{activeMode.label}</Text>
        </View>
        <View style={styles.card}>
          {!loaded ? (
            <ActivityIndicator color="#35D39A" />
          ) : (
            <View style={styles.modeGrid}>
              {fanModes.map((mode) => {
                const active = home.fanMode === mode.value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: Boolean(pending) }}
                    disabled={Boolean(pending) || !database}
                    key={mode.value}
                    onPress={() => updateFanMode(mode.value)}
                    style={({ pressed }) => [
                      styles.modeButton,
                      active && styles.modeButtonActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.modeNumber, active && styles.modeTextActive]}>{mode.value}</Text>
                    <View style={styles.modeCopy}>
                      <Text style={[styles.modeLabel, active && styles.modeTextActive]}>{mode.label}</Text>
                      <Text style={[styles.modeDetail, active && styles.modeDetailActive]}>{mode.detail}</Text>
                    </View>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rasvjeta</Text>
          <Text style={styles.sectionStatus}>{home.lightOn ? 'Uključena' : 'Isključena'}</Text>
        </View>
        <View style={[styles.card, styles.lightCard, home.lightOn && styles.lightCardActive]}>
          <View style={[styles.lightIcon, home.lightOn && styles.lightIconActive]}>
            <Text style={styles.lightGlyph}>✦</Text>
          </View>
          <View style={styles.lightCopy}>
            <Text style={styles.lightTitle}>RGB traka</Text>
            <Text style={styles.lightDescription}>
              {home.lightOn ? 'Traka je trenutno uključena' : 'Dodirni prekidač za uključivanje'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Uključi ili isključi RGB traku"
            disabled={Boolean(pending) || !database}
            onValueChange={updateLight}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#384458', true: '#35D39A' }}
            value={home.lightOn}
          />
        </View>

        <Text style={styles.footer}>Podaci se sinkroniziraju putem Firebase Realtime Database</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1220', paddingTop: NativeStatusBar.currentHeight },
  page: { padding: 20, paddingBottom: 40, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  eyebrow: { color: '#35D39A', fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginBottom: 5 },
  title: { color: '#F6F8FC', fontSize: 25, fontWeight: '800', letterSpacing: -0.6 },
  connectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#172235' },
  connectionBadgeOnline: { backgroundColor: '#15372F' },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#778399' },
  connectionDotOnline: { backgroundColor: '#35D39A' },
  connectionText: { color: '#C7CFDC', fontSize: 11, fontWeight: '700' },
  errorCard: { backgroundColor: '#3A2027', borderColor: '#7C3D48', borderWidth: 1, borderRadius: 16, padding: 14 },
  errorTitle: { color: '#FFB4BE', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  errorText: { color: '#E7B9C0', fontSize: 12, lineHeight: 18 },
  sensorRow: { flexDirection: 'row', gap: 12 },
  sensorCard: { flex: 1, minHeight: 158, borderRadius: 22, padding: 16, overflow: 'hidden' },
  temperatureCard: { backgroundColor: '#342C1C' },
  humidityCard: { backgroundColor: '#172F43' },
  sensorIcon: { color: '#FFD369', fontSize: 20, marginBottom: 14 },
  sensorLabel: { color: '#BBC4D1', fontSize: 12, fontWeight: '600' },
  sensorValue: { color: '#FFFFFF', fontSize: 31, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  sensorMeta: { color: '#7F8A9C', fontSize: 10, marginTop: 'auto' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  sectionTitle: { color: '#F6F8FC', fontSize: 18, fontWeight: '800' },
  sectionStatus: { color: '#8F9BAD', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#111C2D', borderColor: '#1E2B40', borderWidth: 1, borderRadius: 22, padding: 12 },
  modeGrid: { gap: 8 },
  modeButton: { minHeight: 58, borderRadius: 15, backgroundColor: '#172337', padding: 10, flexDirection: 'row', alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#1B4A3E', borderColor: '#35D39A', borderWidth: 1 },
  modeNumber: { width: 36, height: 36, borderRadius: 10, textAlign: 'center', textAlignVertical: 'center', color: '#8490A4', backgroundColor: '#202D42', fontSize: 14, fontWeight: '800' },
  modeCopy: { flex: 1, marginLeft: 12 },
  modeLabel: { color: '#E8ECF3', fontSize: 14, fontWeight: '700' },
  modeDetail: { color: '#758196', fontSize: 11, marginTop: 2 },
  modeTextActive: { color: '#FFFFFF' },
  modeDetailActive: { color: '#9BDCC7' },
  check: { color: '#35D39A', fontSize: 17, fontWeight: '900', marginRight: 4 },
  pressed: { opacity: 0.75 },
  lightCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  lightCardActive: { borderColor: '#806C33', backgroundColor: '#282719' },
  lightIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#263247', justifyContent: 'center', alignItems: 'center' },
  lightIconActive: { backgroundColor: '#554A24' },
  lightGlyph: { color: '#FFD369', fontSize: 22 },
  lightCopy: { flex: 1, marginHorizontal: 13 },
  lightTitle: { color: '#F6F8FC', fontSize: 15, fontWeight: '800' },
  lightDescription: { color: '#8994A6', fontSize: 11, marginTop: 3 },
  footer: { color: '#5D697C', fontSize: 10, textAlign: 'center', marginTop: 6 },
});
