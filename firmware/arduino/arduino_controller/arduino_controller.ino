#include <Adafruit_NeoPixel.h>
#include <DHT.h>
#include <SoftwareSerial.h>

constexpr uint8_t ESP_RX_PIN = 4;
constexpr uint8_t ESP_TX_PIN = 5;
constexpr uint8_t DHT_PIN = 2;
constexpr uint8_t FAN_PWM_PIN = 6;       // L298N ENA, ENA jumper removed
constexpr uint8_t LED_DATA_PIN = 11;     // NeoPixel data input
constexpr uint16_t LED_COUNT = 60;
constexpr uint8_t MAX_LED_BRIGHTNESS = 255;
constexpr unsigned long SENSOR_INTERVAL_MS = 2000;

SoftwareSerial espSerial(ESP_RX_PIN, ESP_TX_PIN);
DHT dht(DHT_PIN, DHT11);
Adafruit_NeoPixel strip(LED_COUNT, LED_DATA_PIN, NEO_GRB + NEO_KHZ800);

uint8_t fanMode = 0;
uint8_t fanManualSpeed = 50;
uint8_t fanPwm = 0;
bool lightOn = false;
uint8_t lightMode = 0;
uint8_t lightRed = 53;
uint8_t lightGreen = 211;
uint8_t lightBlue = 154;
uint8_t lightBrightness = 25;
uint8_t animationSpeed = 50;
bool animationFollowsFan = false;
bool lightRainbow = false;

float lastTemperature = NAN;
unsigned long lastSensorReading = 0;
unsigned long lastAnimationFrame = 0;
uint16_t animationStep = 0;

void readControlMessage();
void readAndSendSensor();
void updateFanOutput();
void renderLights();
void renderSolid();
void renderSpiral();
void renderPulse();
void renderFill();
uint32_t wheel(uint8_t position);
uint8_t scaled(uint8_t value, uint8_t percent);
uint32_t selectedColor(uint16_t pixel, uint8_t strength = 100);

void setup() {
  Serial.begin(115200);
  espSerial.begin(9600);
  espSerial.setTimeout(50);
  dht.begin();

  pinMode(FAN_PWM_PIN, OUTPUT);
  analogWrite(FAN_PWM_PIN, 0);

  strip.begin();
  strip.clear();
  strip.show();
}

void loop() {
  readControlMessage();

  if (millis() - lastSensorReading >= SENSOR_INTERVAL_MS) {
    lastSensorReading = millis();
    readAndSendSensor();
  }

  uint8_t effectiveSpeed = animationFollowsFan ? map(fanPwm, 0, 255, 0, 100) : animationSpeed;
  uint8_t framesPerSecond = 4 + (constrain(effectiveSpeed, 0, 100) * 36UL / 100);
  unsigned long frameInterval = 1000UL / framesPerSecond;
  if (millis() - lastAnimationFrame >= frameInterval) {
    lastAnimationFrame = millis();
    renderLights();
  }
}

void readControlMessage() {
  if (!espSerial.available()) return;

  String message = espSerial.readStringUntil('\n');
  message.trim();
  if (!message.startsWith("CONTROL,")) return;

  int values[11];
  int start = message.indexOf(',') + 1;
  for (uint8_t i = 0; i < 11; i++) {
    int end = message.indexOf(',', start);
    if (end < 0) end = message.length();
    if (start <= 0 || start >= static_cast<int>(message.length())) return;
    values[i] = message.substring(start, end).toInt();
    start = end + 1;
  }

  fanMode = constrain(values[0], 0, 5);
  fanManualSpeed = constrain(values[1], 0, 100);
  lightOn = values[2] == 1;
  lightMode = constrain(values[3], 0, 3);
  lightRed = constrain(values[4], 0, 255);
  lightGreen = constrain(values[5], 0, 255);
  lightBlue = constrain(values[6], 0, 255);
  lightBrightness = constrain(values[7], 0, 100);
  animationSpeed = constrain(values[8], 0, 100);
  animationFollowsFan = values[9] == 1;
  lightRainbow = values[10] == 1;

  updateFanOutput();
}

void readAndSendSensor() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println(F("DHT11 ocitanje nije uspjelo."));
    return;
  }

  lastTemperature = temperature;
  if (fanMode == 4) updateFanOutput();

  espSerial.print(F("SENSOR,"));
  espSerial.print(temperature, 1);
  espSerial.print(',');
  espSerial.println(humidity, 1);
}

void updateFanOutput() {
  switch (fanMode) {
    case 1: fanPwm = 80; break;
    case 2: fanPwm = 150; break;
    case 3: fanPwm = 255; break;
    case 4:
      if (isnan(lastTemperature) || lastTemperature <= 25.0) {
        fanPwm = 80;
      } else if (lastTemperature >= 35.0) {
        fanPwm = 255;
      } else {
        fanPwm = static_cast<uint8_t>((lastTemperature - 25.0) * 17.5 + 80.0);
      }
      break;
    case 5:
      fanPwm = fanManualSpeed == 0 ? 0 : map(fanManualSpeed, 1, 100, 65, 255);
      break;
    default: fanPwm = 0;
  }

  analogWrite(FAN_PWM_PIN, fanPwm);
}

void renderLights() {
  if (!lightOn || lightBrightness == 0) {
    strip.clear();
    strip.show();
    return;
  }

  strip.setBrightness(map(lightBrightness, 0, 100, 0, MAX_LED_BRIGHTNESS));
  switch (lightMode) {
    case 1: renderSpiral(); break;
    case 2: renderPulse(); break;
    case 3: renderFill(); break;
    default: renderSolid();
  }
  strip.show();
  animationStep++;
}

void renderSolid() {
  for (uint16_t pixel = 0; pixel < LED_COUNT; pixel++) {
    strip.setPixelColor(pixel, selectedColor(pixel));
  }
}

void renderSpiral() {
  strip.clear();
  const uint8_t segmentLength = LED_COUNT / 3;
  uint16_t head = animationStep % LED_COUNT;

  for (uint8_t offset = 0; offset < segmentLength; offset++) {
    uint16_t pixel = (head + LED_COUNT - offset) % LED_COUNT;
    strip.setPixelColor(pixel, selectedColor(pixel));
  }
}

void renderFill() {
  strip.clear();
  uint8_t phase = animationStep % (LED_COUNT + 8);
  uint8_t litCount = phase <= LED_COUNT ? phase : (phase <= LED_COUNT + 4 ? LED_COUNT : 0);
  for (uint8_t pixel = 0; pixel < litCount; pixel++) {
    strip.setPixelColor(pixel, selectedColor(pixel));
  }
}

void renderPulse() {
  uint8_t phase = animationStep % 200;
  uint8_t strength = phase <= 100 ? map(phase, 0, 100, 12, 100) : map(phase, 101, 199, 100, 12);
  for (uint16_t pixel = 0; pixel < LED_COUNT; pixel++) {
    strip.setPixelColor(pixel, selectedColor(pixel, strength));
  }
}

uint32_t selectedColor(uint16_t pixel, uint8_t strength) {
  if (lightRainbow) {
    uint8_t position = (pixel * 256UL / LED_COUNT + animationStep) & 255;
    uint32_t color = wheel(position);
    return strip.Color(
      scaled((color >> 16) & 0xFF, strength),
      scaled((color >> 8) & 0xFF, strength),
      scaled(color & 0xFF, strength)
    );
  }
  return strip.Color(
    scaled(lightRed, strength),
    scaled(lightGreen, strength),
    scaled(lightBlue, strength)
  );
}

uint32_t wheel(uint8_t position) {
  position = 255 - position;
  if (position < 85) return strip.Color(255 - position * 3, 0, position * 3);
  if (position < 170) {
    position -= 85;
    return strip.Color(0, position * 3, 255 - position * 3);
  }
  position -= 170;
  return strip.Color(position * 3, 255 - position * 3, 0);
}

uint8_t scaled(uint8_t value, uint8_t percent) {
  return static_cast<uint8_t>((static_cast<uint16_t>(value) * percent) / 100);
}
