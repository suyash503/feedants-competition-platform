# Hyperframes Composition Brief: Feedants Competition Platform

## Objective
Create a short launch-style brag video for the Feedants Competition Platform.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21 seconds

## Source Material
- Project root: `C:/Projects/feedants-competition`
- Primary files read: `README.md`, `mobile/src/theme/index.ts`, `mobile/src/features/competition/**`,
  `backend/src/services/seats.js`, `backend/scripts/load-test.js`, `docs/screenshots/*`
- Product name: Feedants Competition Platform
- Tagline / strongest claim: 1,000 users racing over HTTP for 20 seats gives exactly 20 winners, every time
- Key UI or visual moment to recreate: the real Competition Details screen (prize pool, "Only 19 spots
  left", countdown, rewards) — used as captured screenshots, not redrawn
- Copy that must appear verbatim:
  - "1,000 users." / "20 seats." / "0 oversold."
  - "Only 19 spots left"
  - "Seat held for 09:59"
  - "Never oversells a seat."

## Creative Direction
- Tone preset: `polished`
- Creative direction: quiet engineering confidence — a number, then the product that earns it
- Interpretation: few scenes, long holds, restrained motion; one loud beat only (the "0 oversold." slam)
- Angle: the interesting part of a competition page is what happens when a thousand people tap Register in
  the same second. Lead with the load-test result, then show the real product that number protects.
- Hook: three lines of huge type landing one at a time, the third on the beat
- Outro / punchline: "Never oversells a seat." with the repo URL
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: `#FFFFFF` (product scenes), `#0B3A3D` (type scenes)
- Text: `#1A2427` on white, `#FFFFFF` on teal
- Accent: `#0F5D63` primary, `#0E6D6F` primary text, `#E6F2F1` tint, `#F2A900` gold for the payoff number
- Display font: Outfit (the app's own typeface, loaded from Google Fonts)
- Body font: Outfit
- Visual references from the project: the Competition Details screen, the seat progress bar, the mock
  payment sheet with its hold timer, the ranked results list, the हिंदी screen

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. The claim — 5.3s — "1,000 users." / "20 seats." / "0 oversold." landing one at a time
2. The product — 5.3s — the real details screen in a phone frame; name, one-line stack, three chips
3. The race — 4.7s — seat counter 1 → 20, SOLD OUT stamp, three tally rows with "oversold: 0"
4. The flow — 3.2s — payment sheet, results, हिंदी screen arriving one by one
5. Wordmark — 2.6s — "Never oversells a seat." and the repo URL

## Audio
- Audio role: warm bed with sparse, motion-matched accents
- Audio arc: bed from frame one, three accents (slam, phone reveal, wordmark), low clicks on sequential
  arrivals, fade out under the closing line
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: `data-volume` ≈ 0.32, `data-fade-out` 1.4s at the end
- Music cue guidance: bundled preset read (114.84 BPM). Strong cues 3.70 / 5.28 / 10.54; beat grid used at
  11.60 / 12.65 / 13.70 and 15.28 / 16.34 / 17.38 (every other beat, for readability)
- Audio-reactive treatment: none — the `hyperframes-creative` extraction helper is not installed in this
  environment (documented here per step-3 guidance); motion is beat-locked instead
- Audio-coupled moments:
  - Scene 1 "0 oversold." — beat-locked slam + soft impact
  - Scene 2 phone reveal — warm bong
  - Scene 3 tally rows — one low click each, on the row
  - Scene 4 product screens — one low click each
  - Scene 5 wordmark — soft impact
- SFX selection guidance: only low high-frequency-risk files (`impact/impactSoft_medium_*`,
  `interface/bong_001`, `interface/click_003`), nothing bright or repeated quickly
- SFX analysis guidance: `skills/brag/assets/sfx/sfx-analysis.md` (safest general picks)
- Audio files: copied into `brag-output/composition/assets/`

## Hyperframes Instructions
Follow the composition contract in the scaffolded project (`composition/CLAUDE.md` + `hyperframes docs`):
one paused root GSAP timeline registered on `window.__timelines`, every timed element with `class="clip"`,
`data-start` and `data-duration`, deterministic logic only, local assets.

Requirements:
- Show real UI from the project (captured screenshots of the running app).
- Keep all text readable: ≥0.8s settled for short lines, ≥1.2s for sentences.
- Keep the video within 15-25 seconds.
- Include the music bed and the sparse SFX layer.
- Lock the "0 oversold." reveal to the 3.70s strong cue; snap sequential rows to every other beat.
- Run `npm run check` before rendering.
