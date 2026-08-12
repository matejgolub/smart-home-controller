# Počni ovdje

Ovo je jedina radna mapa cijelog projekta:

`C:\Users\matej\Documents\Codex\2026-08-04\v\outputs\smart-home-controller`

U njoj su mobilna aplikacija, Arduino UNO program, ESP32 program, Firebase pravila i dokumentacija. Kada se nešto promijeni, Codex će mijenjati datoteke u ovoj mapi i spremiti iste promjene na privatni GitHub.

## Prvo postavljanje Arduino IDE-a

U Arduino IDE-u otvori **File → Preferences** i kao **Sketchbook location** postavi:

`C:\Users\matej\Documents\Codex\2026-08-04\v\outputs\smart-home-controller\firmware`

Nakon toga ponovno pokreni Arduino IDE. Tako će automatski pronaći potrebne biblioteke iz `firmware\libraries`.

Za ESP32 u **Tools → Board → Boards Manager** mora biti instaliran Espressifov paket ESP32 pločica. Arduino UNO podrška obično dolazi s Arduino IDE-om.

## Što se prenosi na koji uređaj

### Arduino UNO

U Arduino IDE-u otvori:

`firmware\arduino\arduino_controller\arduino_controller.ino`

Odaberi pločicu Arduino Uno, odgovarajući COM port i klikni **Upload**.

Trenutačni Arduino UNO spojevi:

- DHT11 podatkovni pin → Arduino pin 2
- ESP32 komunikacija → Arduino pinovi 4 i 5
- L298N ENA → Arduino PWM pin 6, uz uklonjen ENA jumper
- L298N IN1 → 5 V, IN2 → GND, motor → OUT1 i OUT2
- NeoPixel podatkovni ulaz → Arduino pin 11
- NeoPixel GND → zajednički GND
- NeoPixel +5 V → zasebno stabilizirano 5 V napajanje za normalnu uporabu

Firmware podržava svih 60 LED dioda i cijeli raspon intenziteta od 0 do 100%.

### ESP32

U Arduino IDE-u otvori:

`firmware\esp32\esp32_gateway\esp32_gateway.ino`

U istom folderu mora postojati lokalna datoteka `config.h` s Wi-Fi podacima i Firebase tokenom. Ona se namjerno ne šalje na GitHub. Odaberi svoj ESP32 model, odgovarajući COM port i klikni **Upload**.

Ako Arduino IDE javi `Sketch too big`, u izborniku **Tools → Partition Scheme** odaberi **Huge APP (3MB No OTA/1MB SPIFFS)**. Ako taj točan naziv nije ponuđen, odaberi varijantu **No OTA** s najvećim APP prostorom. Ovaj projekt ne koristi OTA ažuriranje pa je takva particija prikladna.

Lokalni `config.h` već je pripremljen iz originalnog ESP32 programa. Ako promijeniš Wi-Fi mrežu ili Firebase token, mijenja se samo ta lokalna datoteka.

### Mobilna aplikacija

Mobilna aplikacija nalazi se u glavnoj mapi projekta. Za testiranje se u toj mapi pokreće:

`npm start`

Zatim se QR kod skenira aplikacijom Expo Go. Kod mobilne aplikacije ne prenosi se kroz Arduino IDE.

## Lokalno ili GitHub?

- **Na pločice se prenosi iz lokalne mape kroz Arduino IDE.**
- GitHub čuva sigurnosnu kopiju i povijest svih verzija.
- GitHub ne prenosi program izravno na Arduino ili ESP32 koji je USB kabelom spojen na tvoje računalo.
- Ako projekt otvaraš na drugom računalu, na GitHubu odaberi **Code → Download ZIP**, raspakiraj projekt i tada otvori lokalne `.ino` datoteke.
- Lokalni `config.h`, `.env` i druge tajne treba zasebno prenijeti na novo računalo jer ih GitHub namjerno ne čuva.

## Kada Codex napravi promjenu

Codex će uvijek napisati jednu od ovih uputa:

- **Samo aplikacija** – ne prenosi ništa na pločice; ponovno otvori Expo Go.
- **Arduino promjena** – prenesi `arduino_controller.ino` na Arduino UNO.
- **ESP32 promjena** – prenesi `esp32_gateway.ino` na ESP32.
- **Promjena komunikacije** – prenesi oba programa, prvo Arduino pa ESP32.

Nemoj koristiti stare programe iz `C:\Users\matej\Documents\Arduino` za buduće izmjene. Oni ostaju samo kao originalna sigurnosna kopija. Radna verzija uvijek je u ovoj projektnoj mapi.
