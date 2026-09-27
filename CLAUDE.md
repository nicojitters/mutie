# Mutie — project guide for Claude Code

## What this is
Mutie (formerly Xutant) is a turn-based tactical game with mutant superheroes, in the XCOM lineage.
It is a **single self-contained browser game**: `index.html` holds all markup, CSS, and JS.
No build step, no framework, no assets — every sprite is drawn on canvas and every sound is
synthesised with WebAudio. This browser build replaced the earlier Godot 4 project as the
canonical version.

## Fiction (Cameron's call, 2026-09-26)
The world's militaries formed a joint command ("the Coalition" — placeholder name, rename freely) to wipe out
mutant-kind. Losing, they became continuously less scrupulous about modifying their own soldiers' bodies.
**Program Graft**: the augments are grown from harvested mutant tissue — the hunt was supply, not extermination.
**Colonel Voss, "the Surgeon"**, runs it and is its best work. Ten-mission arc in three acts (see `ACTS`/`MISSIONS`):
Contact (1–5) → The Harvest (6–8) → The Surgeon (9–10). Each mission carries `intro` (Control's line at start) and
`debrief` (story beat on the victory screen). Captives so far: Wren (M3), Tamsin & Ori (M6).

## Core vision (two sentences)
Mutie is a turn-based tactical game where you command a small squad of mutant superheroes,
using cover, flanking, and clashing powers to outmaneuver tougher foes one grid at a time.
Every mission is a tense, readable puzzle of position and percentages — where a single
well-placed teleport or a missed 80% shot can swing the whole fight.

## Design pillars (do not break these)
- **Two-action economy.** Move costs 1; dash uses both; firing and most powers end the turn.
- **Transparent percentages.** Every shot shows its hit chance before you commit. Never hide the math.
- **Cover and flanking are the game.** Half cover −20, full cover −40, flanked ignores cover and adds +1 dmg.
- **Reactive play exists.** Overwatch is a base action for both sides (aim −15 reaction fire).
- **Pressure.** Reinforcements arrive each turn after a per-mission timer. Turtling is punished.
- **Enemies are verbs, not stat remixes.** Augmented Coalition units each deny a player tool: Spotter (marks:
  +20 to hit), Bulwark (blocks LOS, full cover for allies, armor 2), Jammer (powers disabled within 3 tiles).
- **Armor is answered by the kit.** Flat damage reduction; Pulse Blast and Seismic Smash ignore it.
- **Missions are strikes.** Objectives: eliminate · sabotage (relays/vats → evac) · rescue (captives → evac, optional
  transport deadline) · extract (survive until the pad opens) · hold (end N turns on a console, optionally then evac) ·
  assassinate (kill the boss). Evac pads and consoles are map tiles.
- **Pods.** Enemies spawn unaware in pods (clustered within 3 tiles at spawn). A pod wakes when a mutant is within
  7 tiles with line of sight, or fires on a member; it scampers to cover on waking. Hovering a move tile shows
  which unaware enemies it would wake. Reinforcements and summons arrive awake. The player paces the fight.
- **Placeholder art until mechanics are fun.** Units are colored circles with a glyph on purpose.
- **Guerrilla stance.** The squad is outgunned and picks its fights; missions are strikes, not sieges.

## Campaign layer (Phase 8 — built in-page)
**Roster growth (2026-09-27, Cameron's call).** A new campaign starts with only Vex, Halden and Nix (`STARTING_IDS`).
The other nine named mutants join one per campaign-mission clear, keyed by mission index: `RECRUIT_ORDER[G.missionIdx]`
= Sol (after M1), Ember, Mara, Sable, Iris, Rook, Grit, Echo, Tobias (after M9); nothing after M10. Order is role-spread so
the first mender arrives before M2. Guarded by `CAMP.joined` (mission ids, like `CAMP.drafted`), so replays and side ops
never add anyone; skipped if that mutant is already on the roster (old 12-member saves just never trigger it). Separate
from death recruits (`makeRecruit`, random name, same family). `renderArchCards` hides family headers with no members.
`window.MUTIE.unlockAll()` adds every missing mutant; **test harnesses that deploy non-starter kits must call it** after load.
Small rosters can't dead-end: `squadNeed()` = min(3, alive); when fewer than three are fit, `deployPool()` lets wounded mutants
fill the empty slots (ready first, flagged on the deploy bar). Deploying wounded doesn't tick their bench counter down.

`CAMP` in localStorage `mutie.campaign` (per browser): `roster[]` entries `{cid, kit, name, level, xp, kills, missions,
wounded, alive, upgrade, pendingUpgrade, custom}`, `fallen[]` (memorial), `doom` (Graft Index 0–10), `lost`.
`buildDef(entry)` = ARCH + kit + level bonuses (L2 +1HP/+5aim, L4 +2HP/+5aim) + the chosen L3 upgrade (`KIT_UPGRADES`: 12 kits × 2 options,
each `{id,name,desc,mod?,flags?}`; `mod` tweaks stats/cd/range, `flags` land in `def.flags` and are read with `F(u,key)` at the
ability hook — blastRadius/blastDmg, concussKnock/concussStun/concussMomentum, suppressRange/suppressRoot (→ `e.rooted`),
smashDmg/smashAoE, braceLOS (braced unit counts as `isWall`)/braceThorns, rallyRange/rallyShield/rallyHeal, blinkAim
(→ `u.blinkAim`, +aim on next non-reaction shot), strikeDmg, decoys/decoyBoom (`decoyBoom()` on fade or kill), mendAmt/mendSplash,
wardAmt/wardTwin, stimHeal/stimReset. `findUpgrade(kit,id)` falls back to the old per-family `UPGRADES` so older saves still load.
Enemy `stunned` skips its whole activation; `rooted` clears with `suppressed` at the start of the player turn). XP: +2 per mission survived, +1 per kill; thresholds `LEVEL_XP=[0,3,7,12]`. Under 50% HP at mission end → `wounded=1`
(benched one mission). Death → memorial entry + `makeRecruit(arch)` adds a fresh named mutant of that family with a random
kit from it. Graft Index: +1 per mission (+1 more on defeat); wins subtract: sabotage −3, Open Air −2, Exfil −1, Surgeon −4,
Last Light −3. At 10 → `CAMP.lost` (hub shows it, Continue disabled; New campaign resets). Bookkeeping runs once per mission
in `finish()` (guarded by `G.campApplied`) and writes the report block `#res-camp`. Hub = `screen-select` (`renderHub()`):
index bar, roster cards → `openMutant()` (stats, upgrade, appearance customizer: name, skin, hair colour, headgear, accent;
stored in `entry.custom`, read by `fig()`), memorial. `G.squad` holds roster `cid`s (the twelve originals' cids equal their kit ids).
Destructive actions confirm via `confirmBox()`: New campaign (shows what it erases), and abandoning a mission from the
logo, which calls `finish(false)` so wounds/deaths/Index apply (no free escapes). New campaign is offered whenever any
campaign state exists (cleared, fallen, XP, missions, Index moved, lost).
Bleed-out (Slice 6 refinement, built): a squad mutant at 0 HP becomes `downed` (`bleed=3`, decremented at each of the
player's turn starts; 0 → `killUnit`). `stabilized` stops the clock. Actions when adjacent to a downed ally: `stabilize`,
`carry` (carrier `move-1`, no overwatch, carried unit hidden and follows; `setdown` mode places them). Mender powers
`revive()` (Mend 4 HP, Ward 1 HP + shield, Stim 3 HP). Enemies skip downed targets; melee/phase enemies execute an adjacent
downed unit when they have no other target. `active()` = standing squad; none standing → defeat. Mission end: downed units
recovered on a win unless the mission needs evac and they aren't on the pad (then "left on the field" → memorial); on a
loss all downed die. Recovered-from-downed → `wounded=2` (two missions benched).
**Perks (between-mission).** `PERKS` (12): drafted 1-of-3 after each *first* clear of a campaign mission (`CAMP.drafted` guards
replays; side ops never draft — their reward is Graft −3). Owned perks live in `CAMP.perks`; `CAMP.equipped` holds at most
`PERK_SLOTS=2`, toggled in the hub or briefing (`renderPerkList`). `G.perks` is the equipped set for the current mission;
`perk(id)` reads it. Kinds: `use` (once per mission, `G.perkUsed`; buttons rendered as `perk:<id>` modes in `renderSide`,
handled in `setMode`, smoke needs a tile click) and `passive` (hooks: hitChance for ambush/steady/smoke, `jammed` for
scrambler, spawn shield for plating, applyDamage downed-block for medevac, `adjustMission` for intel/fastpad).
Nothing stacks across the campaign — the choice is *which two to bring*. `CAMP.perkOffer` is shown by `checkPerkOffer()`
from `renderHub`/`openBriefing` (Escape dismisses; it comes back until picked).

**Coalition adaptations (enemy counterweight — the XCOM2 Dark-Event analog).** `ADAPT` is an ordered list; the first
`adaptCount(doom,act) = act + floor(doom/3) (+1 at doom≥9)` are active, computed at `startMission` into `G.adapt`.
Order: optics → reactive → plates → frenzy → rapid → surplus → vanguard. Applied in `makeUnit` (HP/aim/armor), `shoot`
(frenzy crit 24%), reinforcement code (vanguard = first wave is a Husk) and `adjustMission` (rapid). `MADJ`/`MX()` return the
adjusted mission object during play so every timer read sees the modified `reinforceAt/evacAt/deadline`; `openBriefing`
clears `MADJ` and previews the adjusted numbers with "(was N)". Clean Act III run = 2 adaptations; doom 6–8 = 4; doom 9 = 6.

Phase 8 still open: campaign epilogue after Last Light, mid-mission resume.

**Fixed 2026-09-27 — the real "mission report won't close" bug.** Every `.overlay`/`.modal` element (result screen,
all 6 modals) was marked `hidden` in markup but its CSS class sets `display:grid`; the bare `hidden` *attribute* relies
on the browser's user-agent stylesheet (`[hidden]{display:none}`, not `!important`), and author CSS with equal or lower
specificity still wins over a non-important UA rule — so `hidden` alone never actually hid these elements on the raw
shipped file (confirmed empirically: computed `display` was `grid` despite `hidden` being present). All 7 stacked
full-viewport (`position:fixed;inset:0`) with no `pointer-events:none`, so whichever is last in DOM order eats every
click, permanently, with nothing visibly "off" (the dark 82%-opacity backdrop blends into the already-dark theme).
This is why the bug was real, catastrophic when it hit, and never reproduced in dev: every test harness in this repo
wraps the page with its own `<style>[hidden]{display:none!important}</style>` for headless testing, which
*accidentally fixed the exact bug it should have caught* — so all our screenshots and sims looked correct while the
raw file was still broken. Fixed with a single rule: `[hidden]{display:none!important}` in the page's own CSS
(kept `.screen[hidden]` too, redundant but harmless). **Any new test harness for this game must NOT add its own
`[hidden]` override** — it would mask this exact class of regression again; test the raw file's computed style instead.
The new perk-draft modal also got a "Decide later" link (plus Escape) so a forced-choice modal is never a true dead
end even if something else regresses.
Kill cam: `G.killcam` set on a player kill; `placeCamera()` pushes toward the target and zooms (bosses longer/closer).

## Procedural side ops
`genMission(seed, tier, objective)` (seeded `mulberry32`) builds a mission object with the same shape as a `MISSIONS` entry
(`generated:true`, `sector` code, `tier`, random `theme`). Rules, in order: spawn block on the left with a reserved halo →
objective tiles by type (relays ×2 + evac by spawn / corner pad + evacAt 5 / captive + deadline + evac / console in a
three-sided booth) → 1–3 wall segments → pillars and crates with a crowding limit → guaranteed crate near spawn → enemy
pods from a tier pool under a cost budget, anchors ≥7 from spawn and ≥4 apart → connectivity pass (BFS from spawn; carve
the nearest blocker until every passable tile is reachable). `gentest.mjs` asserts all of this over 400 seeds.
Side ops live at `G.missionIdx = -1` with the mission in `SIDE`; `MX(i)` resolves either. Hub shows two offers
(`sideOffers()`, cached in `CAMP.offers`, regenerated after any mission) plus a sector-code replay box. Campaign effects:
same roster bookkeeping; Graft Index +1 then −3 on a win (net −2). Wins don't mark campaign progress.

## Juice (feel layer — all read from game events, never the other way)
Helpers in game code: `flash(color,alpha,ms)` (screen-edge vignette flash via `#flash`), `freeze(ms)` (hit-stop: renderer
holds pose/fx time via `G.freezeUntil`), `fxSpark/fxPuff/fxSmoke` (particle fx kinds `p`/`puff`/`smoke`), `light(x,y,color,
intensity,dur)` (shared event PointLight), `G.focus` (camera nudge, used on pod contact), `G.killcam`. Anims added:
`drop` (fall-in with squash; insertion is staggered by `delay`), `select` (nod). Renderer extras: marked reticle torus,
low-HP red pulsing base ring, additive light columns on open evac pads / held consoles. HUD: `.abtn.ready` glow + `Audio.ready()`
when a cooldown hits 0, `.ucard.low`, End Turn `.pulse` when the squad is spent, debrief stat count-up. Sounds: thud, heartbeat, ready.
Multi-kill callout when a Blast kills 2+ (`huge` float text).

## Rendering
Two renderers share all game state. `R3` (Three.js r158 UMD from cdnjs — the last release with a single-script build;
do not bump past 0.158.0 without switching to modules) draws an orthographic three-quarter view. If `window.THREE`
is missing, `R3` is null and the original 2D canvas `draw()` runs unchanged — the game never goes blank.
Picking: `canvasPos()` raycasts to the ground plane when `R3` exists. Local testing: the sandbox can't reach the CDN,
so the `.mjs` harnesses route the CDN URL to `node_modules/three/build/three.min.js`; software GL runs ~2 fps, so
capture FX by freezing game time (`G.freezeUntil=now()+1e7; G.freezeT=<fx.t0>+offset`) rather than by wall-clock waits.

**Asset pass (2026-09-27, "board-game tokens → video-game assets").** Everything is still procedural (no files), but:
- Pipeline: ACES tone mapping (exposure 1.42), sRGB out, PCFSoft shadows (1536², normalBias), pixel ratio capped at
  1.75 for phones. A PMREM environment (`envFor`: gradient sky + light panels, one per theme) is applied **only** to
  materials that earn it — `armorM`, `metalM`, glass, steel walls — via `envMap:ENV`, never `scene.environment`: on the
  full-screen floor it cost more than everything else combined (596→215 ms/frame in software GL after the change).
  `PM()` makes MeshStandardMaterial and only upgrades to Physical when transmission/transparency needs it.
- Theme rigs `RIG[id]` (roof, industrial, lab, night, rust): hemi/sun/fill/rim colours, fog, `strip` (emissive accent used
  for rim lights, wall strips, skyline windows), floor/wall/crate texture recipes, `prop` (full-cover model: hvac, drum,
  tank, column, drumRust), `crate` (wood|metal), `sandbags` share, `skyline` (city|pipes|lab|girders).
- Textures come from a canvas kit (`canvasTex`, `grime`, `speckle`, `scuffs`, `rivet`, `stencil`; seeded by `srand(hash(...))`,
  cached per theme in `texCache`). Floor = one 1024×704 plane with albedo + roughness (wet patches) + bump (grout) maps;
  the tile grid is drawn into the texture, so grid legibility is preserved. Walls are textured boxes with per-tile
  hash-picked top props (vent, pipe, antenna, strip light). Cover: crates (rounded box + brackets + stencil), small crate
  stacks, sandbag piles. Objective props: evac plate with chevron decal + ring, console post with scanline screen, relay
  mast/dish or a pink containment vat. AO decals (`aoDecal`) sit under every static and figure. Backdrop silhouettes
  live beyond the far edges; dust motes are a Points cloud. Board sits on a platform with a lit rim.
- Figures (`fig`): capsule limbs with hip/knee and shoulder/elbow pivots (`parts` now also has kneeL/R, elbowL/R), rounded
  torso + chest plate + shoulder pads in the unit's accent colour over a dark undersuit (`mix()` blends in sRGB — `Color.lerp`
  is linear and over-saturates), emissive trims, helmets with visor slit and (enemies) a type-coloured crest, proper weapons
  from `makeGun(kind,len)` (rifle/marksman with scope/pistol/heavy), sprinter blades, Surgeon claws + cape + halo.
  **Facing convention is +z = front** (the old rig had its visor on −z while `pose()` aimed at +z). The gun is a child of
  the right elbow with a fixed quaternion so the barrel runs down the arm and comes up on target when the arm raises.
  Armed units idle at low-ready (`userData.rest`); knees flex in the walk cycle; captives kneel. Materials keep their
  base emissive in `userData.e0/i0` and `restoreE()` puts it back after hit/cast/heal flashes.
- FX: additive sprites (`TEX.dot/flash/smoke`) for bolt, muzzle star, impact flash and smoke; tracer keeps a faint line plus a
  stretched trail; path is instanced dots; highlights use a framed-tile texture; selection ring is textured and tinted by the
  unit colour. FX ages are clamped ≥0 in `updFx` because hit-stop can present freshly spawned FX with negative age.
- Perf reference (swiftshader, 1240×900): old renderer ~90 ms/frame, this one ~215. Figures ≈120 of that; use `diag2.mjs`
  (ablation variants) before adding cost.

## Mobile (2026-09-27 pass)
- The file now starts with `<!doctype html>`, charset, **viewport** and theme-color metas. The raw deploy (mutie.lol) had none, so phones
  rendered a 980px desktop layout scaled down; the artifact host injects its own wrapper, where a doctype inside `<body>` is ignored and a
  second viewport meta is harmless. `<html>/<head>/<body>` are still deliberately absent.
- CSS block `/* MOBILE */` at the end of the stylesheet. Phones (`max-width:760px`): `body[data-screen="game"]` is `overflow:hidden;
  height:100dvh` and `#screen-game`/`.game-grid` become a flex column — board on top (sky cropped with negative margins inside
  `.view{overflow:hidden}`), HUD below with `.side{overflow-y:auto}`; panel order is turnline → actions → squad (a horizontal strip) → log.
  Move/Fire/Overwatch drop their description text on phones; the power and perk buttons keep theirs. Landscape phones
  (`max-height:520px`): board left, HUD right, canvas sized by `max-height`. Every card grid uses `minmax(0,1fr)` — a `<button>` grid item
  in Chromium reports a huge min-content, and a plain `1fr` let the briefing widen the layout viewport to 443px.
- Renderer: `fit()` (in `R3`) sets the drawing buffer to the displayed size × dpr (≤1.75, ≤2 on small boards) on resize — same 1040:700
  aspect, so the ortho frustum is untouched — and writes `--ls` on `#labels`; all board overlays (`.lab`, `.pct`, `.shield`, `.ftext`) size
  themselves with `calc(Npx*var(--ls))`. Phones render ~360px wide instead of 1040×1.75.
- Touch: `G.touch` is set from `pointerType` on every pointerdown. On touch, the board click handler arms a tile (`G.armed`) on the first
  tap — sets `G.hover` so the path/wake preview draws and `armHint()` explains cost/hit% with "Tap again to confirm" — and commits on the
  second tap of the same tile in the same mode; tapping your own mutant selects immediately. `select()`/`setMode()` clear `G.armed`.
  Synthetic `mouseleave` after a touch is ignored (it would wipe the preview). `test16.mjs` drives this with Playwright touch emulation
  (iPhone 13); `shotmobile.mjs` screenshots every screen at iPhone 13 portrait/landscape and SE and reports viewport blow-outs.

## POV targeting (2026-09-27, Cameron's call — default everywhere)
- Selecting a mutant (`select()`, squad card, tap on the board, Tab) calls `enterPOV(u,{view:'pov'})`: `G.pov={unit,kind,list,idx,target}`
  with `list` from `povTargets()` — enemy strip: shootable (`povEnemyOk` = inRange, or the power's own reach for concuss/phasestrike/smash)
  first sorted by `hitChance`, then the rest by distance greyed "out of range / no line of sight"; ally strip (mend/ward/stim): valid
  first, then by distance. Relays are targets too (100%). `G.povView` is `'pov'|'map'`; `G.povReturn` remembers that Move or a tile power
  (`TILE_MODES`, smoke) pulled the camera out so `afterAction` returns to POV. Anything that ends the activation chains to the next
  mutant's POV if the player was in POV (`wantPov`), otherwise stays on the map. Turn start and the Coalition phase are always map
  (`G.pov=null`). `toggleView()` = V key / "Map" / "POV" buttons. In POV, `ANYWHERE` powers (suppress/brace/rally) fire on selection.
- Input: `povGo()` is the primary button (`#pov-go`) and Space; `povCycle(±1)` = ‹ › buttons, ←/→ or Q/E, and a horizontal swipe on the
  board (pointerdown/up on `viewEl`; `G.swiped` suppresses the click that follows). Clicking a unit of the strip's family in POV just
  targets it (`povSet`) and arms the tile, so the next click/tap acts; own units select immediately. `performAt(p,{confirmed})` is the
  old board-click body; `confirmed` skips the touch two-tap gate. Fire/power `.abtn`s act on the current target when valid in POV.
- Renderer: `pcam` (PerspectiveCamera) + `updateCameras()`; `povGoal()` puts the camera 3.1–4.4 back, 2.35–3.65 up, 1.0 to the right
  of the unit, looking at the target (fov 40–46). Entering/leaving blends `POV.blend` between a far pose (170 units out along `camDir`,
  fov from the ortho half-height — matches the map frame exactly) and the OTS pose; fog is pushed out while `pcam` draws. `active` is
  the drawing camera for pick/project/shake. The unit faces its POV target. Kill beat in POV: `POV.kc` copies `G.killcam` and, for 1.35 s (boss 2.3 s), freezes the framing, pushes the camera ~a quarter of the way toward the fallen target with a slight fov tighten, holds, then releases — the swing to the next mutant waits for it. `R3.povState()` exposes blend/cam for tests.
- HUD: `#pov-panel` (`renderPov()`): title, ‹ n/m ›, Map button, `.tstrip` of `.tcard`s (name, hp bar, %, cover/FLANKED/marked/unaware/
  armor or the no-shot reason; allies: HP/status), primary `#pov-go`. `body[data-view]` lets phone CSS drop the sky crop in POV and hide
  the redundant Fire button/turnline. `test17.mjs` (desktop flow), `test18.mjs` (touch: tap→POV, swipe, fire), `shotpov.mjs` (shots).

## Audio
Everything is procedural WebAudio in the `Audio` module: master → sfx / ambient buses; every event sound takes a map
x and is stereo-placed via `pan(x)`; pitches get ±6% variance. Voices: UI, deploy swell, turn stings, footsteps
(player tick / enemy scuff), weapon classes (rifle / marksman crack / heavy / pistol), reaction-fire blip, overwatch
chamber, hit / crit / armor ping / miss / kill / squad-member down, powers (charge+blast, lunge+smash, blink,
husk blink, heal), enemy signatures (mark lock, jam, drain, summon), mission events (contact, reinforcement alarm,
evac open, hold signal step, transmission, freed, transport departed), win / lose / campaign fanfare. The mute toggle
drives the master gain. Add a sound by adding a method and calling it at the game-logic hook, never from the renderer.

## Music
`Audio.music` is a generative score (no files): a 16th-note scheduler with 300 ms lookahead plays a per-act theme
(`THEMES` inside Music: key, tempos, 4-chord progression, 8-step motif) through five layers — pad, bass, pluck-arp
with feedback delay, percussion (hat ticks + kick), tension tone — whose gains follow an intensity value:
menu/briefing ≈ 0.15, player turn 0.4, Coalition turn 0.7, +spike on contact/reinforcements, +0.15 on the
Surgeon mission. Chords change every bar in missions, every two bars in the menu. `set(scene,{act,boss,phase})`,
`phase()`, `spike()`, `duck()` (mission report), `mute()`. Starts on the first pointer gesture (autoplay rules).
The old drone is gone; to change the mood of an act, edit its THEMES row, not the voices.

## Screens & flow
menu (animated backdrop; Begin/Continue, New campaign, Mission select) → select (acts, sequential unlock, "Unlock all"
free-play link) → briefing (act/mission, codename, Control's intro, objective + parameters, hostile intel with
UNKNOWN AUGMENT for unseen types, squad pick; Back/Deploy live in `.deploy-bar`, `position:sticky;bottom:0` at the end of
`#screen-brief`, so Deploy is on screen without scrolling at any roster size or viewport — `#db-squad` echoes the pick) → game (2.4s insertion overlay, per-mission palette `THEMES`, vignette,
ambient drone) → result (debrief as a Control transmission; Continue opens the next briefing; campaign-complete
variant after M10). Modals: Threat file (reveals as encountered), How to play. Sound toggle in the top bar.
Progress (`PROG`: cleared ids, seen enemy ids, freeplay) lives in localStorage `mutie.progress`, try/catch-wrapped —
a per-browser convenience, not a save system (Phase 8 still owns real persistence).

## Code map (all in `index.html`)
- `ARCH` — the four families' base stats. `MUTANTS` — the twelve playable mutants (three per family), each with its own
  stats twist, `ability`, `passive`/`passiveKey`, `look` (costume piece for the 3D figure). A unit's `def` is
  `{...ARCH[arch], ...mutant}` so `def.id` is the mutant id ('blaster','ember','rook' | 'bruiser','mara','grit' |
  'phaser','sable','echo' | 'mender','iris','tobias'); `famName(def)` gives the family. Powers by mode key:
  blast, concuss, suppress · smash, brace, rally · blink, phasestrike, afterimage · mend, ward, stim. Statuses added:
  `shield` (absorbs), `brace` (full cover for allies + armor), `suppressed` (−25 aim, no reaction fire, cleared at
  your next turn), `taunt` (enemy must target that unit), decoy units (`def.decoy`, excluded from evac/squad counts).
  Passive keys read in code: overcharge, hotshot, steady, dense, anchor, regen, slippery, momentum, aegis, fieldmedic, triage.
- `ENEMY` — Trooper, Marksman, Sprinter, Juggernaut (stat roles) + verb enemies: Spotter `mark`, Bulwark `wall`,
  Jammer `jam`, Siphon `drain` (−1 action next turn), Husk `phase` (teleport move, ignores overwatch), The Surgeon
  `command` (boss: +1 armor aura, grafts up to 3 Husks from 2 turns after she wakes). `aug` tags drive the threat file.
- `VIP` — the unarmed captive (Wren) for Rescue missions; side flips `captive` → `player` when freed.
- Relays are units with `side:'obj'` (100% hit, block movement, not LOS).
- `MISSIONS` — hand-built maps as string arrays. Legend: `.` floor, `#` wall, `=` half cover, `O` full cover,
  `P` player spawn, `E` evac tile, `C` hold console, `X` relay/vat (`objLabel`), `V` captive (`captiveNames`),
  enemies `t m p j o w z q h S`. Fields: `objective`, `reinforceAt` (>50 = none), `reinforce[]`, `evacAt`,
  `deadline`, `holdTurns`, `evacAfterHold`, `act`, `intro`, `debrief`, `brief`.
- `hasLOS` (Bulwark units block like pillars), `adjacentCover` (friendly Bulwarks count as full cover),
  `coverAgainst`, `protects`, `hitChance` (marks +20, reaction −15, Phaser −20 more), `inRange`, `jammed` — the combat math. Change these carefully;
  the UI (shield icons, % labels, FLANKED tags) reads from the same functions so it always matches the roll.
- `reachable` / `pathTo` — BFS movement (orthogonal only).
- `doMove` — also triggers **reaction fire** from any opposing unit on overwatch that can see each step, and
  `checkCaptive` frees Wren when a player ends adjacent.
- `applyDamage` — armor (min 1 dmg, `ignoreArmor` for Blast/Smash), crits (player 25%/+2 on flanks, enemy 12%/+1),
  relay destruction, kill beat.
- `objectiveComplete` / `checkEnd` / `evacStatus` — win/lose per objective type.
- `enemyAct` — per-archetype AI scoring over reachable tiles (only awake enemies act). Spotters act first and mark;
  Jammers seek tiles with players within 3; Bulwarks advance beside allies; Husks pick any free tile within 4.
- `assignPods` / `alertEnemies` / `wakePod` / `scamper` / `checkContact` — pod activation. `SIGHT=7`.
- `endTurn` — enemy phase, reinforcement spawn, cooldown ticks, overwatch reset.
- `draw` — canvas render. Labels are drawn in a final pass so stacked units never cover them.
- `LINES` / `say()` — text-only handler ("Control") flavour lines. `opName()` — random operation codenames.
- `window.MUTIE` — debug API used by the test harness.

## Conventions
- Keep everything in one file. Inline CSS/JS; no external assets except Google Fonts. Check phones (`node shotmobile.mjs`) as well as
  desktop before publishing — anything that can widen the layout viewport (nowrap text, `1fr` grids of buttons) breaks every screen at once.
- Colors are tokens on `:root`. The look is a single committed dark "field ops" theme on purpose.
- The artifact host wraps the file in its own `<html>/<head>/<body>`; do not add those tags.
- Every mechanic that affects a roll must be visible on screen before the player commits.
- Commit after each working change. Run `node test.mjs` (smoke + screenshots) and
  `node sim.mjs <missionIdx> <runs> <squad>` (bot balance runs) before publishing.

## Balance reference (bot in `sim.mjs`: objective-aware, priority targets, cover-seeking; no pod management,
no Smash/Blast vs armor; 3 runs each, 2026-09-26 after pods)
M1 3/3 · M2 2/3 · M3 2/3 · M4 0/3 (22-turn slog: armor) · M5 0/3 slow squad, 3/3 with Nix · M6 0/3 · M7 3/3 ·
M8–M10 0/3. Past M3 the bot is not a useful yardstick — **Cameron's playthrough is the real test.**
Dials, in order: per-mission `reinforceAt` → enemy count in the map string → Husk/Surgeon HP → mark bonus (+20).
Mutant HP 10/16/11/12. Marks +20 (not vs melee). Player crit 25%/+2, enemy 12%/+1. Sprinter aim 70.
Adaptation sims (`DOOM=n node sim.mjs 0 16`, 2026-09-26): M1 baseline 16/16; optics+reactive 14/16 (noise); Rapid Response as
the 2nd adaptation dropped M1 to 9/16 and Ceramic Plates as the 1st to 4/8 — reinforcements are one-per-turn forever and
Trooper 6→7 HP is a full extra Blaster shot, so both sit late in the order. Doom 9 (4 active) on M1: 2/8 — intended, it's
one point from campaign loss. `FILE=<path> node sim.mjs` sims another build for A/B.

## Roadmap
See `Xutant_Build_Plan.md` (phases), `Xutant_Phase8_Todo.md` (campaign layer slices), and
`design-notes.md` (principles harvested from XCOM 2 and triaged into do-now / Phase 8 / later / rejected).
Phase 8 (roster, permadeath + memorial, recruitment, XP with binary rank-up choices, Doom Clock)
is **not** in this build yet. Shipped: overwatch, timers, codenames, handler lines, kill beat, destructible crates, silhouettes, verb enemies,
pod activation (was "later"), a recurring nemesis (was "Phase 9"), ten-mission story arc. Remaining:
custom-mission JSON import (data tables are already plain objects); difficulty modes; more figure detail (helmets, archetype costumes) and mission-specific set dressing; the mission-report overlay Cameron reported as stuck once (not reproduced; a TDZ bug in finish() that froze mission end was introduced and fixed during the menu pass — if it recurs, check finish()).

## Open creative decision (Cameron's call)
Who or what is the authority the mutants are fighting. Everything else here is mechanics.
