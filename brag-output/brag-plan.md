# Brag Plan: Feedants Competition Platform

## What is this app?
A paid talent-competition module — an Expo app plus a Node/Express + MongoDB API where people reserve
one of a limited number of seats, pay an entry fee, upload a performance video and follow it to results —
built so the last seat can never be sold twice.

## The angle
Most "competition page" builds are a pretty screen with hardcoded numbers. This one is a *system*: the
interesting part is what happens when a thousand people tap Register at the same second. The video leads
with the load-test result — 1,000 users, 20 seats, 0 oversold — then shows the real product that number
protects.

## Hook (first 2-3 seconds)
Three lines of huge type on deep teal, landing one at a time: **"1,000 users."** → **"20 seats."** →
**"0 oversold."** The third line slams onto the track's strong beat. It is a claim with a receipt.

## Key moments (the middle)
- The actual Competition Details screen rising into a phone frame, its "Only 19 spots left" counter live.
- The seat counter running 1 → 20 while the progress bar fills and a SOLD OUT stamp lands, with the real
  request tally underneath: 20 × `201`, 980 × `409 SOLD_OUT`, oversold: 0.
- Three real screens arriving one by one: the mock payment sheet with its seat-hold timer, the ranked
  results with prize money, and the same screen in हिंदी.

## Outro / punchline
Wordmark, one line — **"Never oversells a seat."** — and the repo URL.

## User flow worth showing
Entry → key action → result: open the competition (seats and countdown live) → reserve a seat and pay in
the mock gateway while a 10-minute hold ticks down → the entry is confirmed, the video is uploaded, and
results with prize money appear when judging ends. The centre of the video is these real screens, captured
from the running app.

## Tone
- Preset: `polished`
- Creative direction: quiet engineering confidence — a number, then the product that earns it
- Interpretation: few scenes, long holds, restrained motion. No jokes, no hype adjectives. The type is
  large and still; the only "loud" moment is the 0 oversold slam.

## Format: landscape — 1920x1080
## Duration: 21 seconds

## Visual identity (from the project)
- Background: `#FFFFFF` (product), deep teal `#0B3A3D` for the type cards
- Accent: `#0F5D63` (primary) and `#0E6D6F` (primary text)
- Text: `#1A2427`
- Tint: `#E6F2F1`
- Display font: Outfit (the app's own typeface)
- Body font: Outfit
- Strongest visual element: the Competition Details screen — prize pool, "Only 19 spots left", the
  countdown banner and the rewards table

## Share copy (draft)
Built a paid competition platform where 1,000 people can race for 20 seats and exactly 20 get in —
Expo + Node + MongoDB, with the load test to prove it.

## Audio direction
- Role: warm bed with sparse, motion-matched accents
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (bundled), 114.84 BPM
- Music treatment: starts at 0 at bed level (~0.32), fades out over the final 1.4s under the wordmark
- Music cue guidance: preset cue file read. Strong cues at 3.70s (lock the "0 oversold." slam), 5.28s
  (phone reveal), 10.54s (counter starts). Sequential rows use every *other* beat — 11.60 / 12.65 / 13.70 —
  so each line stays readable; the three product screens use 15.28 / 16.34 / 17.38.
- Audio-reactive treatment: subtle if the extraction helper is available; otherwise skip (documented).
- SFX posture: sparse. A soft impact on the slam and the wordmark, a warm bong on the phone reveal, and a
  low click per row and per screen.
- Audio-coupled moments: the 0-oversold slam, the counter's arrival, each tally row, each product screen.
- Restraint rule: no risers, no whooshes on every element, nothing bright or clicky repeated.

## Storyboard

### Scene 1 — The claim — 5.3s
Deep teal. "1,000 users." lands at 1.07, "20 seats." at 2.12, then "0 oversold." slams at 3.70 in mint and
holds. A small line underneath reads "Load test, every run."
Sequential/interaction: yes — three lines arrive one at a time, each held ≥1.1s.
Audio intent: confident, unhurried; the third line is the only hit.
Audio-coupled idea: beat-locked reveal + one soft impact on line three.
Music: warm bed from the first frame.
Transition mood: clean → Scene 2

### Scene 2 — The product — 5.3s
White. The real Competition Details screen rises into a phone frame on the left and scrolls slowly.
On the right: "Feedants Competition Platform", then "Paid competitions, end to end — Expo · Node · MongoDB",
then three small chips: "Seats held while you pay", "Server-decided actions", "English / हिंदी".
Sequential/interaction: yes — title, subtitle, then chips one by one.
Audio intent: the bed opens up; one warm accent as the phone lands.
Audio-coupled idea: bong on the phone reveal, beat-locked to 5.28.
Transition mood: soft → Scene 3

### Scene 3 — The race — 4.7s
Deep teal. A seat counter reads "1 / 20 Booked" and runs up to "20 / 20" as the progress bar fills and a
SOLD OUT stamp settles. Three tally rows arrive underneath on every other beat:
"20 × 201 seat held", "980 × 409 SOLD_OUT", "oversold: 0" (the last in gold).
Sequential/interaction: yes — counter count-up, then three rows at 11.60 / 12.65 / 13.70.
Audio intent: steady, mechanical certainty.
Audio-coupled idea: a low click per row, landing with the row.
Transition mood: clean → Scene 4

### Scene 4 — The flow — 3.2s
White. Three real screens slide up one by one: the payment sheet with "Seat held for 09:59", the ranked
results with prize money, and the details screen in हिंदी. Small captions under each.
Sequential/interaction: yes — three screens at 15.28 / 16.34 / 17.38, all held together at the end.
Audio intent: light, rhythmic, three small arrivals.
Audio-coupled idea: one soft click per screen.
Transition mood: soft → Scene 5

### Scene 5 — Wordmark — 2.6s
Teal. "Feedants Competition Platform" with the line "Never oversells a seat." and the repo URL beneath.
Sequential/interaction: none.
Audio intent: the bed fades out under the line.
Audio-coupled idea: one soft impact as the wordmark settles.

**Music mood for this video:** upbeat but restrained — a warm business bed, not a hype track.
**Audio summary:** a steady warm bed from frame one, three sparse accents (slam, phone, wordmark) and a
low click on each sequential arrival, fading out under the closing line.
