#include <DHT.h>
#include <SoftwareSerial.h>

constexpr uint8_t ESP_RX_PIN = 4;
constexpr uint8_t ESP_TX_PIN = 5;
constexpr uint8_t DHT_PIN = 2;
constexpr uint8_t RED_PIN = 13;
constexpr uint8_t GREEN_PIN = 12;
constexpr uint8_t BLUE_PIN = 11;
constexpr uint8_t FAN_PWM_PIN = 6;
constexpr unsigned long SENSOR_INTERVAL_MS = 2000;

SoftwareSerial espSerial(ESP_RX_PIN, ESP_TX_PIN);
DHT dht(DHT_PIN, DHT11);

uint8_t fanMode = 0;
bool lightOn = false;
float lastTemperature = NAN;
unsigned long lastSensorReading = 0;

void applyOutputs();
void readControlMessage();
void readAndSendSensor();
void setFanSpeed(uint8_t mode, float temperature);

void setup() {
  Serial.begin(115200);
  espSerial.begin(9600);
  espSerial.setTimeout(50);
  dht.begin();

  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  pinMode(FAN_PWM_PIN, OUTPUT);
  applyOutputs();
}

void loop() {
  readControlMessage();

  if (millis() - lastSensorReading >= SENSOR_INTERVAL_MS) {
    lastSensorReading = millis();
    readAndSendSensor();
  }
}

void readControlMessage() {
  if (!espSerial.available()) return;

  String message = espSerial.readStringUntil('\n');
  message.trim();
  if (!message.startsWith("CONTROL,")) return;

  int firstComma = message.indexOf(',');
  int secondComma = message.indexOf(',', firstComma + 1);
  if (secondComma < 0) return;

  int requestedMode = message.substring(firstComma + 1, secondComma).toInt();
  if (requestedMode < 0 || requestedMode > 4) requestedMode = 0;

  fanMode = static_cast<uint8_t>(requestedMode);
  lightOn = message.substring(secondComma + 1).toInt() == 1;
  applyOutputs();

  Serial.print(F("Kontrola: ventilator="));
  Serial.print(fanMode);
  Serial.print(F(", svjetlo="));
  Serial.println(lightOn ? F("ON") : F("OFF"));
}

void readAndSendSensor() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println(F("DHT11 ocitanje nije uspjelo."));
    return;
  }

  lastTemperature = temperature;
  if (fanMode == 4) setFanSpeed(fanMode, lastTemperature);

  espSerial.print(F("SENSOR,"));
  espSerial.print(temperature, 1);
  espSerial.print(',');
  espSerial.println(humidity, 1);
}

void applyOutputs() {
  digitalWrite(RED_PIN, lightOn ? HIGH : LOW);
  digitalWrite(GREEN_PIN, lightOn ? HIGH : LOW);
  digitalWrite(BLUE_PIN, lightOn ? HIGH : LOW);
  setFanSpeed(fanMode, lastTemperature);
}

void setFanSpeed(uint8_t mode, float temperature) {
  uint8_t speed = 0;

  switch (mode) {
    case 1: speed = 80; break;
    case 2: speed = 150; break;
    case 3: speed = 255; break;
    case 4:
      if (isnan(temperature)) {
        speed = 80;
      } else if (temperature <= 25.0) {
        speed = 80;
      } else if (temperature >= 35.0) {
        speed = 255;
      } else {
        speed = static_cast<uint8_t>((temperature - 25.0) * 17.5 + 80.0);
      }
      break;
    default: speed = 0;
  }

  analogWrite(FAN_PWM_PIN, speed);
}
