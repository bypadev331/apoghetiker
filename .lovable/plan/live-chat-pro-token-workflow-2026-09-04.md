# Live-Chat pro Token-Workflow

Neuer Live-Chat zwischen Admin und Kunde – aktivierbar pro Token, sichtbar während des gesamten Workflows als Bubble unten rechts (im Stil der bestehenden Berater-Bubble).

## Datenbank
- Spalte `show_live_chat boolean default false` auf `auth_tokens`, `storno_tokens`, `pin_tokens`, `limit_tokens`, `adress_tokens`.
- Neue Tabelle `live_chat_messages`:
  - `id uuid pk`, `task_id text` (z. B. `pin:<uuid>`), `sender text check in ('admin','customer')`, `text text`, `created_at timestamptz default now()`.
  - Index auf `(task_id, created_at)`.
  - RLS offen (Anon/Auth read+insert), damit Kunde ohne Login schreiben kann.
  - Zu Publication `supabase_realtime` hinzufügen.

## Admin
- Checkbox „Live-Chat anzeigen" in allen CallPanels (Auth, Storno, Pin, Limit, Adress) – speichert `show_live_chat` beim Anlegen.
- In jeder LiveCard-Zeile ein Chat-Icon-Button (nur wenn `show_live_chat`) öffnet Dialog `LiveChatDialog` mit `taskId = <kind>:<id>`.
- Dialog: Nachrichtenverlauf + Eingabefeld, Realtime-Subscription, sendet als `sender='admin'`.

## Kunde
- Neue Komponente `LiveChatBubble` (floating unten rechts, apoBank-Design):
  - Zeigt Bubble nur wenn Token-Row `show_live_chat = true`.
  - Klick öffnet Chat-Fenster (unten rechts, gleiche Position).
  - Erste sichtbare Nachricht (statisch, immer oben): „Herzlich willkommen im Live-Chat der apoBank. Sie werden betreut von Justus Sperling."
  - Danach echter Verlauf via Realtime. Kunde sendet als `sender='customer'`.
- Einbinden in alle Workflow-Kundenseiten (FlowLanding pin/limit/widerruf, PinStart/Offline, LimitConfirm/Loading/PhotoTan, WiderrufStart/PhotoTan, StornoWiderrufFlow, AuthFlow, AdressFlow). Bubble liest Token aus URL, ermittelt `kind` aus Pfad und lädt `show_live_chat`.

## Umsetzung
1. Migration.
2. `LiveChatBubble.tsx` (Kunde) + `LiveChatDialog.tsx` (Admin) + shared `liveChat.ts` Helper.
3. Checkbox in 5 CallPanels + Save-Logik.
4. Chat-Button in 5 LiveCards.
5. Bubble in Kundenseiten einhängen.
