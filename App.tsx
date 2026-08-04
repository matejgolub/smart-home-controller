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
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import { onValue, ref, update } from 'firebase/database';

import { database, firebaseConfigurationError } from './src/firebase';

type FanMode = 0 | 1 | 2 | 3 | 4 | 5;
type LightMode = 0 | 1 | 2 | 3 | 4;
type RgbColor = { r: number; g: number; b: number };

type HomeState = {
  fanMode: FanMode;
  fanManualSpeed: number;
  lightOn: boolean;
  lightMode: LightMode;
  brightness: number;
  animationSpeed: number;
  followFan: boolean;
  color: RgbColor;
  temperature: number | null;
  humidity: number | null;
};

const initialState: HomeState = {
  fanMode: 0,
  fanManualSpeed: 50,
  lightOn: false,
  lightMode: 0,
  brightness: 25,
  animationSpeed: 50,
  followFan: false,
  color: { r: 53, g: 211, b: 154 },
  temperature: null,
  humidity: null,
};

const fanModes: { value: Exclude<FanMode, 5>; label: string; detail: string }[] = [
  { value: 0, label: 'Isključeno', detail: '0%' },
  { value: 1, label: 'Tiho', detail: '31%' },
  { value: 2, label: 'Srednje', detail: '59%' },
  { value: 3, label: 'Jako', detail: '100%' },
  { value: 4, label: 'Automatski', detail: 'Prema temperaturi' },
];

const lightModes: { value: LightMode; label: string; detail: string }[] = [
  { value: 0, label: 'Stalna boja', detail: 'Sve LED diode jednako' },
  { value: 1, label: 'Spirala', detail: 'Trećina trake kruži u istoj boji' },
  { value: 2, label: 'Pulsiranje', detail: 'Lagano pojačavanje i smanjivanje' },
  { value: 3, label: 'Duga', detail: 'Promjena cijelog spektra boja' },
  { value: 4, label: 'Punjenje', detail: 'LED diode ostaju upaljene do kraja' },
];

const colorPresets: RgbColor[] = [
  { r: 255, g: 40, b: 40 },
  { r: 255, g: 140, b: 20 },
  { r: 255, g: 220, b: 40 },
  { r: 50, g: 220, b: 100 },
  { r: 30, g: 150, b: 255 },
  { r: 130, g: 80, b: 255 },
  { r: 255, g: 60, b: 180 },
  { r: 255, g: 255, b: 255 },
];

const clamp = (value: unknown, fallback: number, min = 0, max = 100) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
};

const colorCss = ({ r, g, b }: RgbColor) => `rgb(${r}, ${g}, ${b})`;

function formatReading(value: number | null, suffix: string) {
  return value === null ? '—' : `${value.toFixed(1)}${suffix}`;
}

export default function App() {
  const [home, setHome] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
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
        const rawFanMode = clamp(value.fan?.mode, 0, 0, 5);
        const rawLightMode = clamp(value.light?.mode, 0, 0, 4);
        setHome({
          fanMode: rawFanMode as FanMode,
          fanManualSpeed: clamp(value.fan?.manualSpeed, 50),
          lightOn: Boolean(value.light?.turn),
          lightMode: rawLightMode as LightMode,
          brightness: clamp(value.light?.brightness, 25),
          animationSpeed: clamp(value.light?.animationSpeed, 50),
          followFan: Boolean(value.light?.followFan),
          color: {
            r: clamp(value.light?.color?.r, 53, 0, 255),
            g: clamp(value.light?.color?.g, 211, 0, 255),
            b: clamp(value.light?.color?.b, 154, 0, 255),
          },
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

  const fanStatus = useMemo(() => {
    if (home.fanMode === 5) return `Ručno · ${home.fanManualSpeed}%`;
    return fanModes.find((mode) => mode.value === home.fanMode)?.label ?? 'Isključeno';
  }, [home.fanMode, home.fanManualSpeed]);

  async function writeValues(values: Record<string, unknown>, message: string) {
    if (!database || pending) return;
    setPending(true);
    setError(null);
    try {
      await update(ref(database), values);
    } catch {
      setError(message);
    } finally {
      setPending(false);
    }
  }

  function setLocal<K extends keyof HomeState>(key: K, value: HomeState[K]) {
    setHome((current) => ({ ...current, [key]: value }));
  }

  function setLocalColor(channel: keyof RgbColor, value: number) {
    setHome((current) => ({
      ...current,
      color: { ...current.color, [channel]: Math.round(value) },
    }));
  }

  async function updateFanMode(mode: Exclude<FanMode, 5>) {
    setLocal('fanMode', mode);
    await writeValues({ 'fan/mode': mode }, 'Način ventilatora nije spremljen.');
  }

  async function finishManualFan(value: number) {
    const speed = Math.round(value);
    setHome((current) => ({ ...current, fanMode: 5, fanManualSpeed: speed }));
    await writeValues(
      { 'fan/mode': 5, 'fan/manualSpeed': speed },
      'Ručna brzina ventilatora nije spremljena.',
    );
  }

  async function updateLightMode(mode: LightMode) {
    setHome((current) => ({ ...current, lightMode: mode, lightOn: true }));
    await writeValues(
      { 'light/mode': mode, 'light/turn': true },
      'Način rasvjete nije spremljen.',
    );
  }

  async function updateColor(color: RgbColor) {
    setLocal('color', color);
    await writeValues(
      { 'light/color/r': color.r, 'light/color/g': color.g, 'light/color/b': color.b },
      'Boja nije spremljena.',
    );
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

        <SectionHeader title="Ventilator" status={fanStatus} />
        <View style={styles.card}>
          {!loaded ? <ActivityIndicator color="#35D39A" /> : (
            <View style={styles.modeGrid}>
              {fanModes.map((mode) => {
                const active = home.fanMode === mode.value;
                return (
                  <Pressable
                    disabled={pending || !database}
                    key={mode.value}
                    onPress={() => updateFanMode(mode.value)}
                    style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}
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
          <ControlSlider
            label="Ručna brzina"
            value={home.fanManualSpeed}
            onValueChange={(value) => setLocal('fanManualSpeed', Math.round(value))}
            onSlidingComplete={finishManualFan}
            accent="#35D39A"
          />
          <Text style={styles.hint}>Pomicanje slidera automatski uključuje ručni način rada.</Text>
        </View>

        <SectionHeader title="Rasvjeta" status={home.lightOn ? 'Uključena' : 'Isključena'} />
        <View style={[styles.card, styles.lightSwitchCard, home.lightOn && styles.lightCardActive]}>
          <View style={[styles.colorPreview, { backgroundColor: colorCss(home.color) }]} />
          <View style={styles.lightCopy}>
            <Text style={styles.lightTitle}>NeoPixel traka · 60 LED</Text>
            <Text style={styles.lightDescription}>{lightModes[home.lightMode].label}</Text>
          </View>
          <Switch
            disabled={pending || !database}
            onValueChange={(value) => {
              setLocal('lightOn', value);
              writeValues({ 'light/turn': value }, 'Stanje svjetla nije spremljeno.');
            }}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#384458', true: '#35D39A' }}
            value={home.lightOn}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Način svjetla</Text>
          <View style={styles.modeGrid}>
            {lightModes.map((mode) => {
              const active = home.lightMode === mode.value;
              return (
                <Pressable
                  disabled={pending || !database}
                  key={mode.value}
                  onPress={() => updateLightMode(mode.value)}
                  style={({ pressed }) => [styles.modeButton, active && styles.lightModeActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.modeNumber, active && styles.modeTextActive]}>{mode.value + 1}</Text>
                  <View style={styles.modeCopy}>
                    <Text style={[styles.modeLabel, active && styles.modeTextActive]}>{mode.label}</Text>
                    <Text style={[styles.modeDetail, active && styles.modeDetailActive]}>{mode.detail}</Text>
                  </View>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.colorHeader}>
            <Text style={styles.cardTitle}>Odabrana boja</Text>
            <View style={[styles.colorValue, { backgroundColor: colorCss(home.color) }]} />
          </View>
          <View style={styles.palette}>
            {colorPresets.map((color) => (
              <Pressable
                key={`${color.r}-${color.g}-${color.b}`}
                onPress={() => updateColor(color)}
                style={({ pressed }) => [styles.swatch, { backgroundColor: colorCss(color) }, pressed && styles.pressed]}
              />
            ))}
          </View>
          {(['r', 'g', 'b'] as const).map((channel) => (
            <ControlSlider
              key={channel}
              label={channel === 'r' ? 'Crvena' : channel === 'g' ? 'Zelena' : 'Plava'}
              value={home.color[channel]}
              maximumValue={255}
              suffix=""
              accent={channel === 'r' ? '#FF5151' : channel === 'g' ? '#35D39A' : '#4DA3FF'}
              onValueChange={(value) => setLocalColor(channel, value)}
              onSlidingComplete={(value) => updateColor({ ...home.color, [channel]: Math.round(value) })}
            />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Intenzitet i animacija</Text>
          <ControlSlider
            label="Intenzitet"
            value={home.brightness}
            accent="#FFD369"
            onValueChange={(value) => setLocal('brightness', Math.round(value))}
            onSlidingComplete={(value) => writeValues({ 'light/brightness': Math.round(value) }, 'Intenzitet nije spremljen.')}
          />
          <ControlSlider
            label="Brzina animacije"
            value={home.animationSpeed}
            accent="#9B7BFF"
            onValueChange={(value) => setLocal('animationSpeed', Math.round(value))}
            onSlidingComplete={(value) => writeValues({ 'light/animationSpeed': Math.round(value) }, 'Brzina animacije nije spremljena.')}
          />
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>Prati brzinu ventilatora</Text>
              <Text style={styles.switchDetail}>Spirala i pulsiranje ubrzavaju s ventilatorom</Text>
            </View>
            <Switch
              value={home.followFan}
              onValueChange={(value) => {
                setLocal('followFan', value);
                writeValues({ 'light/followFan': value }, 'Postavka praćenja nije spremljena.');
              }}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#384458', true: '#9B7BFF' }}
            />
          </View>
          <Text style={styles.safetyNote}>Firmware je privremeno ograničen na 25% fizičke svjetline dok traka nema zasebno 5 V napajanje.</Text>
        </View>

        <Text style={styles.footer}>Firebase ↔ ESP32 ↔ Arduino UNO</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, status }: { title: string; status: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionStatus}>{status}</Text>
    </View>
  );
}

function ControlSlider({
  label,
  value,
  maximumValue = 100,
  suffix = '%',
  accent,
  onValueChange,
  onSlidingComplete,
}: {
  label: string;
  value: number;
  maximumValue?: number;
  suffix?: string;
  accent: string;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
}) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={[styles.sliderValue, { color: accent }]}>{Math.round(value)}{suffix}</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={maximumValue}
        step={1}
        value={value}
        onValueChange={onValueChange}
        onSlidingComplete={onSlidingComplete}
        minimumTrackTintColor={accent}
        maximumTrackTintColor="#324057"
        thumbTintColor={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1220', paddingTop: NativeStatusBar.currentHeight },
  page: { padding: 20, paddingBottom: 42, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  eyebrow: { color: '#35D39A', fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginBottom: 5 },
  title: { color: '#F6F8FC', fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  connectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#172235' },
  connectionBadgeOnline: { backgroundColor: '#15372F' },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#778399' },
  connectionDotOnline: { backgroundColor: '#35D39A' },
  connectionText: { color: '#C7CFDC', fontSize: 11, fontWeight: '700' },
  errorCard: { backgroundColor: '#3A2027', borderColor: '#7C3D48', borderWidth: 1, borderRadius: 16, padding: 14 },
  errorTitle: { color: '#FFB4BE', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  errorText: { color: '#E7B9C0', fontSize: 12, lineHeight: 18 },
  sensorRow: { flexDirection: 'row', gap: 12 },
  sensorCard: { flex: 1, minHeight: 150, borderRadius: 22, padding: 16 },
  temperatureCard: { backgroundColor: '#342C1C' },
  humidityCard: { backgroundColor: '#172F43' },
  sensorIcon: { color: '#FFD369', fontSize: 20, marginBottom: 14 },
  sensorLabel: { color: '#BBC4D1', fontSize: 12, fontWeight: '600' },
  sensorValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  sensorMeta: { color: '#7F8A9C', fontSize: 10, marginTop: 'auto' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  sectionTitle: { color: '#F6F8FC', fontSize: 18, fontWeight: '800' },
  sectionStatus: { color: '#8F9BAD', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#111C2D', borderColor: '#1E2B40', borderWidth: 1, borderRadius: 22, padding: 14 },
  cardTitle: { color: '#F6F8FC', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  modeGrid: { gap: 8 },
  modeButton: { minHeight: 56, borderRadius: 15, backgroundColor: '#172337', padding: 10, flexDirection: 'row', alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#1B4A3E', borderColor: '#35D39A', borderWidth: 1 },
  lightModeActive: { backgroundColor: '#3C3420', borderColor: '#FFD369', borderWidth: 1 },
  modeNumber: { width: 36, height: 36, borderRadius: 10, textAlign: 'center', textAlignVertical: 'center', color: '#8490A4', backgroundColor: '#202D42', fontSize: 14, fontWeight: '800' },
  modeCopy: { flex: 1, marginLeft: 12 },
  modeLabel: { color: '#E8ECF3', fontSize: 14, fontWeight: '700' },
  modeDetail: { color: '#758196', fontSize: 11, marginTop: 2 },
  modeTextActive: { color: '#FFFFFF' },
  modeDetailActive: { color: '#B7C8BC' },
  check: { color: '#35D39A', fontSize: 17, fontWeight: '900', marginRight: 4 },
  pressed: { opacity: 0.72 },
  sliderBlock: { marginTop: 14 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 3 },
  sliderLabel: { color: '#C6CEDA', fontSize: 12, fontWeight: '700' },
  sliderValue: { fontSize: 12, fontWeight: '800' },
  hint: { color: '#69768B', fontSize: 10, lineHeight: 15, marginTop: 3, paddingHorizontal: 3 },
  lightSwitchCard: { flexDirection: 'row', alignItems: 'center' },
  lightCardActive: { borderColor: '#806C33', backgroundColor: '#282719' },
  colorPreview: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: '#FFFFFF22' },
  lightCopy: { flex: 1, marginHorizontal: 13 },
  lightTitle: { color: '#F6F8FC', fontSize: 14, fontWeight: '800' },
  lightDescription: { color: '#8994A6', fontSize: 11, marginTop: 3 },
  colorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorValue: { width: 34, height: 34, borderRadius: 10, borderColor: '#FFFFFF33', borderWidth: 2 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  swatch: { width: 32, height: 32, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF26' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#223047' },
  switchCopy: { flex: 1, paddingRight: 10 },
  switchTitle: { color: '#E8ECF3', fontSize: 13, fontWeight: '700' },
  switchDetail: { color: '#758196', fontSize: 10, marginTop: 3 },
  safetyNote: { color: '#D6B469', backgroundColor: '#332C1B', borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 15, marginTop: 14 },
  footer: { color: '#5D697C', fontSize: 10, textAlign: 'center', marginTop: 6 },
});
