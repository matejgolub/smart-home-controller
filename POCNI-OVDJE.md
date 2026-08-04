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

### ESP32

U Arduino IDE-u otvori:

`firmware\esp32\esp32_gateway\esp32_gateway.ino`

U istom folderu mora postojati lokalna datoteka `config.h` s Wi-Fi podacima i Firebase tokenom. Ona se namjerno ne šalje na GitHub. Odaberi svoj ESP32 model, odgovarajući COM port i klikni **Upload**.

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
