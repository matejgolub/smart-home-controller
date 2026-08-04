# Lokalne Arduino biblioteke

Ove biblioteke kopirane su iz originalnog Arduino foldera kako bi projekt imao iste provjerene verzije:

- `DHT_sensor_library` 1.4.7 – DHT11 senzor temperature i vlažnosti
- `Adafruit_Unified_Sensor` 1.1.15 – ovisnost Adafruit senzorskih biblioteka
- `Firebase_ESP32_Client` 4.4.17 – Firebase Realtime Database komunikacija na ESP32

`SoftwareSerial.h` dolazi s Arduino AVR/UNO paketom, a `WiFi.h` s ESP32 paketom pločica. Oni se ne instaliraju kao zasebne biblioteke iz ove mape.

Biblioteke `Adafruit_NeoPixel` i `IRremote` iz starog foldera nisu kopirane jer ih trenutačni firmware ne uključuje. Ako kasnije dodamo NeoPixel traku ili infracrveni daljinski, dodat ćemo ih zajedno s odgovarajućim kodom.

Sve izvorne licence biblioteka zadržane su unutar njihovih foldera.
