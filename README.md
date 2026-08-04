# Moj sustav

Android aplikacija za upravljanje ventilatorom i RGB trakom te praćenje temperature i vlažnosti. Komunikacija ide preko Firebase Realtime Database, koju ESP32 povezuje s Arduinom.

## Trenutne mogućnosti

- prikaz temperature i vlažnosti u stvarnom vremenu
- pet stanja ventilatora: isključeno, tiho, srednje, jako i automatski
- uključivanje i isključivanje RGB trake
- prikaz veze s Firebase bazom
- optimističko ažuriranje sučelja i vraćanje prethodne vrijednosti ako zapis ne uspije

## Prvo pokretanje

1. U Firebase Console otvori **Project settings > General**.
2. Ako projekt još nema Web app, odaberi **Add app > Web** i registriraj je (Hosting nije potreban).
3. Kopiraj `.env.example` u `.env`.
4. U `.env` prenesi vrijednosti iz prikazanog `firebaseConfig` objekta.
5. Pokreni `npm install`, zatim `npm start`.
6. Na Android mobitel instaliraj Expo Go i skeniraj QR kod.

Firebase web konfiguracija nije administratorska tajna, ali `.env` se svejedno ne sprema u Git. Wi-Fi lozinka i ESP32 legacy token nikada se ne smiju spremiti u repozitorij.

## Struktura baze

```json
{
  "fan": { "mode": 0 },
  "light": { "turn": false },
  "sensor": { "humidity": 55, "temperature": 27.7 }
}
```

Vrijednost `fan/mode` mora biti cijeli broj od 0 do 4, a `light/turn` Boolean vrijednost.

## Sigurnost

Postojeća pravila dopuštaju čitanje i pisanje bilo kome na internetu. Datoteka `firebase/database.rules.json` sadrži pripremljena pravila za autentificirane klijente i provjeru vrijednosti. Nemoj ih još objaviti dok anonimna autentifikacija nije dodana aplikaciji i potvrđeno je da se ESP32 i dalje može autorizirati.

## Sljedeći koraci

- dodati Firebase Anonymous Authentication
- zamijeniti ESP32 legacy token suvremenijom autentifikacijom
- doraditi serijski protokol Arduino ↔ ESP32
- dodati boju, jačinu i efekte RGB trake
- izraditi instalacijsku Android datoteku nakon testiranja na stvarnom hardveru
