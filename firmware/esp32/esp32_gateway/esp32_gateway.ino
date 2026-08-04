#include <FirebaseESP32.h>
#include <WiFi.h>
#include "config.h"

constexpr uint8_t ARDUINO_RX_PIN = 4;
constexpr uint8_t ARDUINO_TX_PIN = 5;
constexpr unsigned long CONTROL_INTERVAL_MS = 500;

FirebaseData firebaseData;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;

uint8_t fanMode = 0;
bool lightOn = false;
unsigned long lastControlRead = 0;

void connectWiFi();
void readSensorMessage();
void readAndSendControls();

void setup() {
  Serial.begin(115200);
  Serial1.begin(9600, SERIAL_8N1, ARDUINO_RX_PIN, ARDUINO_TX_PIN);
  Serial1.setTimeout(50);

  connectWiFi();

  firebaseConfig.host = FIREBASE_HOST;
  firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  readSensorMessage();

  if (millis() - lastControlRead >= CONTROL_INTERVAL_MS) {
    lastControlRead = millis();
    readAndSendControls();
  }

  delay(10);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print(F("Spajanje na Wi-Fi"));

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }

  Serial.println(F(" povezano."));
}

void readSensorMessage() {
  if (!Serial1.available()) return;

  String message = Serial1.readStringUntil('\n');
  message.trim();
  if (!message.startsWith("SENSOR,")) return;

  int firstComma = message.indexOf(',');
  int secondComma = message.indexOf(',', firstComma + 1);
  if (secondComma < 0) return;

  float temperature = message.substring(firstComma + 1, secondComma).toFloat();
  float humidity = message.substring(secondComma + 1).toFloat();

  if (!Firebase.setFloat(firebaseData, "/sensor/temperature", temperature)) {
    Serial.print(F("Temperatura nije spremljena: "));
    Serial.println(firebaseData.errorReason());
  }

  if (!Firebase.setFloat(firebaseData, "/sensor/humidity", humidity)) {
    Serial.print(F("Vlaznost nije spremljena: "));
    Serial.println(firebaseData.errorReason());
  }
}

void readAndSendControls() {
  if (Firebase.getInt(firebaseData, "/fan/mode")) {
    int value = firebaseData.intData();
    fanMode = static_cast<uint8_t>(constrain(value, 0, 4));
  } else {
    Serial.print(F("Fan mode nije procitan: "));
    Serial.println(firebaseData.errorReason());
  }

  if (Firebase.getBool(firebaseData, "/light/turn")) {
    lightOn = firebaseData.boolData();
  } else {
    Serial.print(F("Svjetlo nije procitano: "));
    Serial.println(firebaseData.errorReason());
  }

  Serial1.print(F("CONTROL,"));
  Serial1.print(fanMode);
  Serial1.print(',');
  Serial1.println(lightOn ? 1 : 0);
}
