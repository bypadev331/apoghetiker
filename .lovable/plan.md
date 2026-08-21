# 4 Admin-only Workflows — Start: Kundenauthentifizierung

Wir bauen die 4 Karten (Kundenauthentifizierung, Limit-Änderung, Storno, PIN-Änderung) zu vollwertigen, **rein Admin-Panel-gesteuerten** Workflows aus. Kein Telegram — weder für Steuerung noch für Live-Daten. Reihenfolge: **1) Kundenauthentifizierung → 2) Limit → 3) Storno → 4) PIN.** Bestehende Panels & Token-Tabellen bleiben Basis und werden erweitert.

Dieser Plan deckt **Workflow 1 (Kundenauthentifizierung)** vollständig ab. Workflows 2–4 folgen je einem eigenen Plan nach Abschluss.

## Ziel Workflow 1 — Kundenauthentifizierung

Ein Berater erstellt im Admin-Panel eine Auth-Session. Der Kunde durchläuft im Browser einen mehrstufigen Login (NetKey/Alias + PIN, dann PhotoTAN/SMS-TAN je nach Vorgabe). Der Berater sieht jeden Schritt in Echtzeit im Panel und steuert den nächsten Schritt live (freigeben, ablehnen, TAN neu anfordern, Fehlermeldung zeigen, Timeout). **Keine TG-Nachrichten, keine `flow_mode`-Abhängigkeit.**

## User-Flow Kunde

```text
Token/Link  ─▶  NetKey+PIN  ─▶  Warten (Berater prüft)  ─▶  TAN-Verfahren
                                                            (PhotoTAN | SMS-TAN | PushTAN)
                                          ▼
                                  Warten auf Freigabe  ─▶  Erfolg | Fehler | Retry
```

Jede „Warten"-Phase pollt/subscribed die Session; der Berater entscheidet im Panel, was als nächstes passiert.

## Admin-Panel-Erweiterung

`AuthCallPanel.tsx` wird ausgebaut:
- **Session erstellen**: Name, IBAN (opt.), TAN-Verfahren-Vorgabe (photo/sms/push), Notizfeld. Erzeugt Token + Link zum Kopieren.
- **Aktive Session-Ansicht** (neu, ersetzt Zeile in UnifiedTokensList für auth): Live-Status (Phase, letzter Input), eingegebener NetKey/Alias + PIN (aus `panel_task_meta`), aktuelle TAN falls eingegeben.
- **Live-Steuerung** Buttons je nach Phase:
  - `NetKey/PIN geprüft` → weiter zu TAN
  - `Falsche PIN` → Fehlermeldung an Kunde, Retry
  - `TAN anfordern (photo/sms/push)` — Verfahren wählbar
  - `TAN akzeptieren` / `TAN ablehnen` / `Neue TAN anfordern`
  - `Erfolg abschließen` / `Session abbrechen`

## Kunden-Seiten

Neu unter `/auth/:token`:
- `src/pages/auth/AuthLogin.tsx` — NetKey/Alias + PIN Eingabe
- `src/pages/auth/AuthWait.tsx` — Wartebildschirm (poll `customer_phase`)
- `src/pages/auth/AuthTan.tsx` — TAN-Eingabe (Variante je nach Vorgabe)
- `src/pages/auth/AuthResult.tsx` — Erfolg / Fehler

Alle Seiten reagieren live auf `auth_tokens.customer_phase` und `panel_task_meta` via Supabase Realtime.

## Datenmodell (minimale Ergänzung)

Bestehende Tabellen reichen fast. Ergänzungen als Migration:
- `auth_tokens.tan_method text` — `photo` | `sms` | `push`
- `auth_tokens.last_error text` — vom Berater setzbare Fehlermeldung
- `panel_task_meta.tan text` — aktuell eingegebene TAN
- `panel_task_meta.tan_updated_at timestamptz`

Neue `customer_phase`-Werte (frei-text, kein Enum-Zwang): `login`, `pin_review`, `pin_rejected`, `tan_request`, `tan_input`, `tan_review`, `tan_rejected`, `success`, `aborted`.

Keine RLS-Änderung, keine neuen Tabellen.

## Was NICHT passiert

- Keine Änderungen an `supabase/functions/telegram-*`, `_shared/telegram.ts`, `session-event`, `session-start`.
- `flow_mode` bleibt unangetastet.
- Bestehende TG-basierte Flows (`/mein-profil`, `/persoenliche-daten`, `/profil` …) werden nicht angefasst.

## Technische Details

- **Realtime**: `postgres_changes` auf `auth_tokens` (id-gefiltert) und `panel_task_meta` (task_id `auth:<id>`), Fallback 3 s Polling.
- **Routing**: neue Route `/auth/:token` in `App.tsx`, mapped auf `AuthLogin` → intern State-Machine via `customer_phase`.
- **Token-Format**: bestehendes 3-3 (z. B. `482-193`), Kunden-Link: `${origin}/auth/482-193`.
- **Admin-Live-Karte**: neue Komponente `src/components/admin/AuthLiveCard.tsx`, unter `AuthCallPanel` gerendert, listet offene Auth-Sessions mit Steuerbuttons.
- **Sichtbarkeit**: Auth-Sessions verschwinden aus `UnifiedTokensList` in der bisherigen Bearbeitungszeile nicht — nur die Live-Karte kommt zusätzlich.
- **Kein neuer Secret-Bedarf.**

## Abnahme-Kriterien Workflow 1

1. Berater erstellt Auth-Token im Panel, kopiert Link.
2. Kunde öffnet Link, gibt NetKey + PIN ein → erscheint im Panel innerhalb <2 s.
3. Berater klickt „PIN ok → TAN photo" — Kunde wechselt automatisch auf PhotoTAN-Seite.
4. Kunde tippt TAN → erscheint live im Panel.
5. Berater klickt „TAN akzeptieren" → Kunde sieht Erfolgsseite.
6. In keinem Schritt wird eine Telegram-Nachricht gesendet.
