# Lokalne Arduino biblioteke

Ove biblioteke kopirane su iz originalnog Arduino foldera kako bi projekt imao iste provjerene verzije:

- `DHT_sensor_library` 1.4.7 – DHT11 senzor temperature i vlažnosti
- `Adafruit_Unified_Sensor` 1.1.15 – ovisnost Adafruit senzorskih biblioteka
- `Firebase_ESP32_Client` 4.4.17 – Firebase Realtime Database komunikacija na ESP32
- `Adafruit_NeoPixel` 1.15.5 – upravljanje adresabilnom RGB trakom od 60 LED dioda

`SoftwareSerial.h` dolazi s Arduino AVR/UNO paketom, a `WiFi.h` s ESP32 paketom pločica. Oni se ne instaliraju kao zasebne biblioteke iz ove mape.

Biblioteka `IRremote` iz starog foldera nije kopirana jer je trenutačni firmware ne koristi. Ako kasnije dodamo infracrveni daljinski, dodat ćemo je zajedno s odgovarajućim kodom.

Sve izvorne licence biblioteka zadržane su unutar njihovih foldera.
