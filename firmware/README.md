# Firmware

Ovdje su očišćene i dorađene kopije Arduino i ESP32 programa. Originalne datoteke nisu mijenjane.

Potrebne vanjske biblioteke nalaze se u lokalnoj mapi `libraries`. Postavi ovaj `firmware` folder kao Arduino IDE **Sketchbook location** kako bi ih IDE automatski pronašao.

## Prije prijenosa na uređaje

1. U `firmware/esp32/esp32_gateway` otvori lokalni `config.h` i unesi stvarne vrijednosti.
2. U `config.h` unesi Wi-Fi podatke i trenutačni Firebase token.
3. Na Arduino prenesi `arduino/arduino_controller/arduino_controller.ino`.
4. Na ESP32 prenesi `esp32/esp32_gateway/esp32_gateway.ino`.
5. Provjeri da su veze ukrižene: Arduino TX → ESP32 RX i Arduino RX ← ESP32 TX, uz zajednički GND.

Serijska veza je postavljena na 9600 baud jer je pouzdanija za `SoftwareSerial` na Arduinu. Poruke imaju oznake `SENSOR` i `CONTROL`, pa ih uređaji mogu jednoznačno razlikovati.

> Prije fizičkog testiranja treba potvrditi točan Arduino model te da je ESP32 TX od 3,3 V spojen sigurno na Arduino. ESP32 ulazi ne podnose 5 V; Arduino TX prema ESP32 RX obično zahtijeva djelitelj napona ili level shifter.
