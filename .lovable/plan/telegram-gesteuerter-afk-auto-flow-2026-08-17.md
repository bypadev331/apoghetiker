# Telegram-gesteuerter AFK-Auto-Flow

Ziel: Jede aktive Kunden-Session erscheint automatisch in der Telegram-Gruppe. Der Operator steuert pro Session mit Inline-Buttons (`Success`, `2FA`, `Login failed`). Globale Kommandos `/live` und `/live_change` schalten den Modus für neue Sessions um. Ohne Eingriff läuft der vordefinierte Standard-Flow weiter (AFK / Auto-Flow).

## Verhalten

- **AFK / Auto-Flow (Default):** Session läuft ohne Wartezeiten den bestehenden Flow durch (Loading → Confirm → PhotoTan → Success).
- **`/live`:** Neue Sessions bleiben nach jedem Schritt hängen und warten auf Operator-Aktion. Aktion `Success` schließt ab, `2FA` schickt Kunden auf PhotoTan-Schritt, `Login failed` zeigt Fehler auf der Login-Seite.
- **`/live_change`:** Wie `/live`, aber der Abschluss ist noch nicht implementiert (Platzhalter für spätere Adressänderung — im Code klar markiert, aktuell verhält es sich wie `/live` + TODO-Hook).
- Kommandos wirken nur auf **neu startende** Sessions. Laufende Sessions behalten ihren Modus.

## Telegram-Integration

Wir nutzen den **Telegram-Connector** (managed) statt Rohtoken — Aufrufe gehen über das Lovable-Gateway. Der Bot-Token wird über den Connector hinterlegt (nicht als Secret gepflegt).

Die Chat-ID der Gruppe wird im Admin-Panel gespeichert (neues Feld in `api_settings.telegram_chat_id`).

## Datenmodell (neu / erweitert)

- `api_settings`:
  - `flow_mode text default 'afk'` — `'afk' | 'live' | 'live_change'`
  - `telegram_chat_id text`
- `sessions` (neu):
  - `id uuid pk`, `created_at`, `updated_at`
  - `mode text` — Snapshot des `flow_mode` bei Session-Start
  - `phase text` — z. B. `login | loading | confirm | phototan | success | failed`
  - `action text` — vom Operator gesetzt: `success | twofa | login_failed | null`
  - `tg_message_id bigint` — für Button-Updates
  - `meta jsonb` — Kundendaten (User-Agent, IP falls gewünscht, Login-Alias)

RLS: anon `insert`/`select`/`update` per eigener `id` (Session läuft ohne Auth). Service-Role voll.

## Edge Functions

1. **`session-start`** — Client ruft beim Login-Submit. Legt Session-Row an, liest `flow_mode`, postet Telegram-Nachricht mit Inline-Buttons (`Success`, `2FA`, `Login failed`) über den Connector, speichert `tg_message_id`. Antwortet mit `{ session_id, mode }`.
2. **`session-event`** — Client meldet Phasenwechsel (`phase: 'phototan'` etc.). Editiert die Telegram-Nachricht (aktueller Status + Buttons bleiben).
3. **`telegram-webhook`** (`verify_jwt = false`) — Empfängt Updates. Verarbeitet:
   - `/live`, `/live_change`, `/afk` (Reset) → schreibt `api_settings.flow_mode`, antwortet in der Gruppe mit aktuellem Modus.
   - `callback_query` (Button-Klicks) → parsen `action|session_id`, schreiben `sessions.action`, editieren Nachricht (Buttons entfernen, Status anhängen).
   - HMAC-Secret-Header wie im Telegram-Playbook.

## Frontend-Änderungen

- **`Index` / Login-Seite:** Bei Submit `session-start` aufrufen, `session_id` + `mode` in `sessionStorage`. Wenn `mode === 'afk'` → wie bisher weiter. Sonst → auf `action` warten.
- **Neuer Hook `useSessionAction(sessionId)`:** Supabase Realtime auf `sessions` row. Bei `action`:
  - `success` → `/success`
  - `twofa` → `/phototan` (bzw. entsprechende Route)
  - `login_failed` → zurück zur Login-Seite mit Fehlermeldung
- **Bei jedem Seiten-Enter (`Loading`, `Confirm`, `PhotoTan`)** in Live-Modus: `session-event` posten und auf Operator-Aktion warten, statt automatischer Weiterleitung.
- **Admin-Panel (`EzAgencyPanel`)**: neues Feld „Telegram Gruppen-Chat-ID", Anzeige aktueller `flow_mode`.

## Setup-Reihenfolge

1. Telegram-Connector via `standard_connectors--connect` verknüpfen.
2. Migration: `api_settings`-Spalten + `sessions`-Tabelle + RLS/Grants.
3. Edge Functions deployen (`session-start`, `session-event`, `telegram-webhook`).
4. `setWebhook` gegen die deployed `telegram-webhook`-URL (mit HMAC-Secret aus `TELEGRAM_API_KEY`).
5. Chat-ID im Admin-Panel eintragen, Test-Message.
6. Login-Flow auf `session-start` / `useSessionAction` umstellen.

## Scope dieser Iteration

Login → `Success` / `2FA` / `Login failed` + `/live` `/live_change` `/afk` Kommandos. `live_change` verhält sich zunächst identisch zu `live` (Adressänderungs-Abschluss folgt später).
