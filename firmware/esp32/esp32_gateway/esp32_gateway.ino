#define DISABLE_ERROR_QUEUE
#define DISABLE_ERROR_STRING
#define DISABLE_FCM
#define DISABLE_PSRAM
#define DISABLE_NPT_TIME
#define DISABLE_OTA
#define DISABLE_KEEP_ALIVE
#define DISABLE_SD
#define DISABLE_FLASH
#define DISABLE_DEBUG

#include <FirebaseESP32.h>
#include <WiFi.h>
#include "config.h"

constexpr uint8_t ARDUINO_RX_PIN = 4;
constexpr uint8_t ARDUINO_TX_PIN = 5;
constexpr unsigned long CONTROL_INTERVAL_MS = 750;

FirebaseData firebaseData;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;

uint8_t fanMode = 0;
uint8_t fanManualSpeed = 50;
bool lightOn = false;
uint8_t lightMode = 0;
uint8_t lightRed = 53;
uint8_t lightGreen = 211;
uint8_t lightBlue = 154;
uint8_t lightBrightness = 25;
uint8_t animationSpeed = 50;
bool animationFollowsFan = false;
unsigned long lastControlRead = 0;

void connectWiFi();
void readSensorMessage();
void readAndSendControls();
int readInt(FirebaseJson *json, const char *path, int fallback, int minimum, int maximum);
bool readBool(FirebaseJson *json, const char *path, bool fallback);

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

  FirebaseJson sensor;
  sensor.set("temperature", temperature);
  sensor.set("humidity", humidity);
  if (!Firebase.updateNode(firebaseData, "/sensor", sensor)) {
    Serial.println(F("Firebase: slanje senzora nije uspjelo"));
  }
}

void readAndSendControls() {
  if (!Firebase.getJSON(firebaseData, "/")) {
    Serial.println(F("Firebase: citanje kontrola nije uspjelo"));
    return;
  }

  FirebaseJson *root = firebaseData.jsonObjectPtr();
  fanMode = readInt(root, "fan/mode", fanMode, 0, 5);
  fanManualSpeed = readInt(root, "fan/manualSpeed", fanManualSpeed, 0, 100);
  lightOn = readBool(root, "light/turn", lightOn);
  lightMode = readInt(root, "light/mode", lightMode, 0, 4);
  lightRed = readInt(root, "light/color/r", lightRed, 0, 255);
  lightGreen = readInt(root, "light/color/g", lightGreen, 0, 255);
  lightBlue = readInt(root, "light/color/b", lightBlue, 0, 255);
  lightBrightness = readInt(root, "light/brightness", lightBrightness, 0, 100);
  animationSpeed = readInt(root, "light/animationSpeed", animationSpeed, 0, 100);
  animationFollowsFan = readBool(root, "light/followFan", animationFollowsFan);

  Serial1.print(F("CONTROL,"));
  Serial1.print(fanMode);
  Serial1.print(',');
  Serial1.print(fanManualSpeed);
  Serial1.print(',');
  Serial1.print(lightOn ? 1 : 0);
  Serial1.print(',');
  Serial1.print(lightMode);
  Serial1.print(',');
  Serial1.print(lightRed);
  Serial1.print(',');
  Serial1.print(lightGreen);
  Serial1.print(',');
  Serial1.print(lightBlue);
  Serial1.print(',');
  Serial1.print(lightBrightness);
  Serial1.print(',');
  Serial1.print(animationSpeed);
  Serial1.print(',');
  Serial1.println(animationFollowsFan ? 1 : 0);
}

int readInt(FirebaseJson *json, const char *path, int fallback, int minimum, int maximum) {
  FirebaseJsonData result;
  if (!json || !json->get(result, path) || !result.success) return fallback;
  return constrain(result.intValue, minimum, maximum);
}

bool readBool(FirebaseJson *json, const char *path, bool fallback) {
  FirebaseJsonData result;
  if (!json || !json->get(result, path) || !result.success) return fallback;
  return result.boolValue;
}
