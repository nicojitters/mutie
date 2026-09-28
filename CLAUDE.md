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
- **Transparent percentages.** Every shot shows its hit chance before you commit. Never hide the math — including mitigation: Focus and Set shot are visible modifiers, not hidden fudge.
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
- **Placeholder art until mechanics are fun.** (Historical — the 3D figures shipped 2026-09-27; the 2D fallback still draws circles with a glyph.) Everything a mutant does on the board should read as a power, never as a gun.
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

Phase 8 still open: mid-mission resume (the epilogue shipped 2026-09-27).

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

## Exposure preview (2026-09-27)
Hovering (or touch-arming) a reachable move tile answers "who could hit me there?": `exposureAt(u,p)` probes the tile with a
copy of the unit (`Object.assign({},u,{x,y})`) through the same `inRange`/`hitChance` the Coalition turn uses, so preview and
roll can't disagree. Awake, un-stunned hostiles only, from where they stand now (melee counts if adjacent). Surfaces: each
threatening enemy's `.pct` label swaps from *your* odds to theirs ("47% AT YOU" / "FLANKS YOU", class `lo exp`); a tile label
(`pctFor('exptile')`, class `exp lo|ok`) reads "N CAN HIT · best % · FLANKED/NO COVER" or "SAFE"; the tile tints red/amber/green
via `put(...,2)`; and `moveHint(u,p,n)` feeds both the hover hint and the touch arm hint (`.hint .risk/.safe`). The renderer
computes `moveR` (reachable set) and `expo` once per frame before the unit loop. The 2D fallback draws dashed threat lines and a
tile chip. `mousemove` now re-runs `setHint()` whenever the hovered *tile* changes in move mode, not only the hovered unit.

## Fuel drums (2026-09-27)
A drum is a unit, not a tile: `makeDrum(x,y)` → `side:'obj'`, `def.hazard`, `DRUM_HP=2`, 100% to hit like a relay. `isWall`
includes hazards (blocks LOS) and `adjacentCover` grants val 2 to **either** side (`isDrum(u)`), so when it dies the cover
vanishes with no grid edit. `killUnit` → `detonate(d,source)`: `DRUM_DMG=4` to every unit within Chebyshev 1 (players and
captives included, armor ignored, kills credited to `source` so kill cam/XP work), adjacent crates → floor, neighbouring drums
chain through `applyDamage`, unaware victims are woken via `wakePod` into `G.pendingScamper`, which `checkContact()` drains.
Placement: map char `D` is always a drum; in `DRUM_THEMES` (industrial, rust) `drumSet(m)` ranks the map's `O` tiles by a hash
of `mission id:x,y` and converts the top `DRUM_SHARE=0.45` (min 1) — the rest stay `T.FULL` and render as sealed drums with no
band. Live drums: `drumMesh` (hazard band, blinking valve, fume sprite) in 3D, banded barrel in 2D; tooltip carries `def.desc`.
POV strip order is now shootable hostiles → relays → drums → the rest, so a drum is never the default target.
**Fixed alongside:** `makeRelay` never set a unit `id`, so every relay (and then every drum) shared the `undefined` slot in the
renderer's mesh/label maps — only one relay per map was ever drawn. Relays and drums now get unique ids.
`sim.mjs` bot: shoots via `performAt(...,{confirmed:true})` (a bare click on a non-current hostile in POV only retargets) and
ignores drums when listing relays. Bot never uses drums, so it undercounts their value.

## Render target path, bloom & cover crouch (2026-09-27)
- **All 3D frames now go scene → `sceneRT` (half-float, MSAA 4, linear, un-tonemapped) → composite quad**, on phones too. The
  composite does ACES (three's matrices, `renderer.toneMappingExposure`) and linear→sRGB **by hand** (`comp` ShaderMaterial,
  `toneMapped:false`) — three only applies its tonemapping/colorspace chunks to the default framebuffer, and relying on the
  defines inside a ShaderMaterial was unreliable. `BLOOM` (inside `R3`) is `null` when WebGL2 is missing or the framebuffer
  check at init fails (`checkFramebufferStatus`), and then the old direct `renderer.render` path runs unchanged.
- **Glow** (bright pass with soft knee at ¼ res → two separable blurs → added in the composite, `strength 0.85`) runs only for
  fine-pointer desktop viewports (`glow` flag); phones pay one RT + one blit and skip the blur. `R3.bloom(on)` toggles glow,
  `R3.rtPath(on)` the whole RT path, `R3.bloomTune({threshold,knee,strength})` tunes. Emissives with intensity >1 (trims,
  drum bands, wall strips, evac rings, Surgeon halo, muzzle flash) are what crosses the threshold; lit surfaces stay below it.
- **Why the overlay alphas changed:** a render target blends transparent overlays in *linear* space, the screen path blended in
  sRGB, so every half-transparent thing read brighter. `basic()`/`sprite()` no longer set `toneMapped:false` (the composite
  tone-maps everything anyway) and alphas were re-tuned once for linear blending: highlight tiles 0.34, hover 0.24, path dots
  0.7, AO decals ×1.3, figure contact shadow 0.75, unaware dim 0.45, evac columns 0.15, jam field 0.11. Tune for the RT path;
  the direct fallback will look slightly hotter, which is acceptable for a fallback.
- **Cover crouch** in `pose()`: an idle, non-captive, armed unit beside cover eases (`g.userData.cr`, 0.12/frame, paused while
  frozen) into a hunker — knees bent, torso lowered/leaned, head down — 0.62 for half cover, 1.0 if any adjacent cover is full,
  preferring the cover that `protects` against the nearest foe. Suppressed while moving, on overwatch, or during fire/lunge/cast/
  drop anims. Convergence is frame-rate based, so in swiftshader tests wait ~20 s before judging it.
- Perf (swiftshader 1240×900, M2 with drums): direct 473 ms/frame, RT 545, RT+glow 541 — the RT/MSAA is the cost, the glow is
  free. On a GPU all of it is negligible.

## Enemy action cam & campaign epilogue (2026-09-27)
- **Action cam.** `G.actcam={x,y,zoom,pull}` is a persistent framing goal for the ortho camera; `AC` in `placeCamera()` eases
  `camTarget`/zoom toward `CENTER.lerp(point,pull)` (dt-scaled, 0.085/frame in, 0.11 back out), and kill cam / contact focus
  layer on top (their zoom now multiplies `AC.z`). Set by the enemy phase: each activation frames the unit (with a 220/420 ms
  lead so the camera arrives first), `doMove`/Husk blink keep it on the mover, `shoot()` frames the shooter–target midpoint
  (zoom by distance), the Surgeon graft and each reinforcement get a beat, and `endTurn` clears it before the player turn.
  Cleared in `startMission`; off under `prefers-reduced-motion` (`AC.still`). `R3._camState()` exposes zoom/offset for tests
  (`test21.mjs`).
- **Epilogue.** `#screen-epilogue` ("Daylight"): Control's closing transmission (five paragraphs, with the fallen named, the
  final Index, and Last Light's survivors), campaign stats, the living roster by missions served, and the wall. `finish()`
  stores `CAMP.finale={survivors,turn,doom,when}` on a Last Light win and relabels Continue as **Epilogue** → `showEpilogue()`;
  the hub shows an Epilogue link next to the progress count once all ten are cleared. `showScreen` knows `'epilogue'`
  (menu music, act 2). Buttons: Return to base, New campaign (reuses the menu's confirm). `test22.mjs` drives the whole flow.
  Phase 8's remaining open item is mid-mission resume.

## Difficulty modes (2026-09-27)
`DIFF` = scout / veteran / graft, stored in `CAMP.diff` (old saves migrate to veteran). Pure deltas on the Veteran numbers via
`diff()`: `playerAim` (added to squad units at deploy), `enemyAim` (in `makeUnit`), `adapt` (added inside `adaptCount`, clamped
0..ADAPT.length), `reinf` (added in `adjustMission`, floor 2). Graft Index math is untouched. Picked in `#modal-diff`
(`pickDifficulty(cb)`) from New campaign and from Begin campaign on an untouched save (`campaignUntouched()`, `CAMP.diffChosen`);
shown in the hub index bar and the briefing parameters. `DIFF=graft node sim.mjs …` for balance runs; `MUTIE.setDiff(id)`.
Scout: +5/−5 aim, one fewer adaptation, reinforcements +1 turn. Graft: enemy +5 aim, one more adaptation (so M1 already has
Graft Optics), reinforcements −1 turn.

## Per-mission set dressing (2026-09-27, "make them truly distinct")
`DRESS[missionId]` inside `R3`, layered on the theme `RIG`: `light` overrides (sky/horizon/ground → env map, hemi/sun/fill/rim,
`strip`, `fog:[near,far]` → `FOG0`, `bg` → fog + background colour, `mote`), `floor(x,S,w,h,R)` paints mission markings into
the floor albedo before the grout pass, `build(c)` places off-board set pieces and non-blocking decor with `c.B(geoName, mat,
[sx,sy,sz], [x,y,z], {rx,ry,rz, beacon|flicker|noise|landing|pulse})`, `c.cone(pos,col,op,{sweep})` (additive light cone
group), `c.spot(pos,at,col,i,angle)` (shadowless SpotLight) and `c.tex('crate'|'static')`, and `particles` = motes | rain |
embers | ash | none (`TEX.streak` for rain; `motes.kind/yMax` drive the update). `rigFor()` merges the dressing into `L` and
sets `L.key = theme|dress`, which now keys `texCache` and `envCache`. Side ops borrow a dressing of their theme by seed
(`DRESS_BY_THEME`). Animated flags are read in the statics traverse in `render()`. **Rule learned:** anything hung above the
board overlaps the play area in the ortho view, so overhead pieces (lamps, tubes) must be small; big pieces go beyond the
back (−z) and right (+x) edges, where the POV camera sees them. The ten: helipad (H, water tower, AC units, beacon mast) ·
loading bay (racks, forklift, roller door, hanging lamps) · containment (biohazard trefoils, glass wall + vats, flickering
tubes, decon arch, no motes) · range (numbered lanes, scorch, watchtower + sweeping cone, standees, sandbag berm, embers) ·
black site (chevrons, chasing landing lights on the pad, fence + razor wire, floodlight towers, transport, rain) · transport
yard (tire tracks, YIELD stencil, the transport with its pink-lit open doors, containers, crane, sodium sun) · plaza
(Coalition emblem, static screens, lamp posts, planters, banner, dusk sky) · growth floor (drains, pink stains, vat rows,
surgical lamps, gurneys, pink hemi/fog) · theatre (operating circle, blood, gallery, small lamp head + real spotlight pool,
specimen tanks, no motes) · transmitter (cable trays, lattice mast with beacons, dishes and guy wires, generators, dawn sky).
`shotdress.mjs [idx,…]` renders the map view, `shotdresspov.mjs` four POV frames; software-GL cost ≈ +20 ms/frame.

## Meaningful-decisions pass (2026-09-27, Cameron's brief: no dominant move, action economy, several valid answers)
- **Pulse Blast is a grenade.** `u.charges`/`u.chargesMax` (3, set at deploy for kits with `ability.key==='blast'`) replace its
  cooldown; the power button shows `N LEFT` / `SPENT` (`.cd.ch`, `.abtn.spent`). Spend happens at the top of the blast block,
  before damage, so **Overcharge** (Vex's passive, now "a Blast that kills refunds its charge") can refund after. Focused Pulse =
  4 dmg (no cd mod); Wide Pulse = 5×5 at 3. Power Surge and Stim restore a charge for Blast users instead of touching cd.
  Why: 3 guaranteed AoE damage on a 3-turn cooldown beat a 70% rifle shot even against one target, so Blast was never a choice.
  A flat cut to 2 dmg hollowed the Blaster (bot M1 7/8 → 3/8); charges keep the power and make every throw a spend-or-save.
  Sims (naive bot, 8 runs): M1 8/8 · M2 7/8 · M3 6/8 vs baseline 7/8 · 3/8 · 7/8. `SMART=1 node sim.mjs` makes the bot blast
  only clusters/armor/drums (it does worse — it forgoes refunding finishers, which is the point).
- **Hunker** (`setMode('hunker')`, key 5, ends turn): `u.hunker` → `hitChance` −20 against them and no crits (`cc=0` in
  `shoot`), cleared with `ow`/`brace` at the player's turn start. Badges on label and squad card, deep crouch (`wantCr` 1.2),
  2D text. Gives a 30% shot, overwatch, hunker and repositioning as four defensible answers to the same board.
- **Exposure preview for Blink and Phase Strike.** `previewTile(u,hover)` returns the tile the current mode is really asking
  about: a reachable move tile, a valid Blink tile (`blinkOk`), or `landingSpot(u,target)` — the nearest open orthogonal tile
  beside a hovered or POV-targeted Phase Strike victim (the strike itself now calls the same helper). The renderer's `expoAt`/
  `expo` come from it in every mode; the tile chip is prefixed `BLINK ·` / `LAND ·`; the POV `.tcard` meta adds "lands: N can hit
  · %" or "lands safe"; hints and the touch arm text carry the same line; enemy "AT YOU" labels draw in any mode while a preview
  is live. `test24.mjs` (charges/refund), `test25.mjs` (hunker), `test26.mjs` (blink/phase previews).
- Harness note: `#m-continue` on a fresh save now opens the difficulty picker first — harnesses tap `#df-choices .btn:nth-child(2)`.

## Legibility pass (2026-09-27, Cameron's brief: show the math, telegraph deliberately)
- **Breakdown & consequence.** `hitChance` returns `parts` (aim, range, cover, marked, reaction, slippery, hunkered, smoke, ambush,
  suppressed, blink, clamped); `fmtParts(h)` renders "70 aim · −12 range · −20 half cover". `effArmor(t)` is the single armor
  rule (Surgeon aura, brace, Aegis) used by both `applyDamage` and the previews. `shotInfo(a,d)` → damage range after
  flank/hotshot/booster/ambush, crit odds, armor, shield and `kill` ∈ kills | may | crit; `powerInfo(u,mode,t)` does the same for
  concuss/smash/phasestrike; `killTag()` → KILLS / MAY KILL / KILLS ON CRIT. Surfaces: POV `.tcard` gets a `.tc-dmg` line and,
  on the selected card in shoot mode, a `.tc-why` breakdown; the map hover `.pct` shows "72% · 2–3 dmg · KILLS"; the POV hint
  carries kill + breakdown; enemy tooltips now list Dmg and Move.
- **Next-turn threat.** `enemyReach(e)` (its move footprint; Husks any free tile within reach; rooted/stunned stay) and
  `threatAfterMove(u,tiles)` → Map tileKey→count of awake hostiles that could move then shoot the tile; cached in `TM` on a
  signature of turn, unit, tile list, enemy states and the grid (≈4 ms for a full footprint in software GL, 0 on hit).
  Move highlights tint by it — blue 0 · amber 1–2 · red 3+, dash variants dimmer — and the exposure chip reads
  "N CAN HIT NOW · M if they move" (`threatMoveAt`); `exposureHtml` adds "M could reach a shot after moving" (`.warn`).
- **Overwatch crossings.** `pathThreats(u,path)` lists overwatchers with a reaction shot on any step and their best odds;
  `moveHint(u,p,n,r)` says "Crosses overwatch — Trooper 40%", and their labels read "OVERWATCH ON PATH" (or "AT YOU · OW 30% ON
  PATH" when they also threaten the destination).
- **Threat zones.** `threatZone(e)` (cached in `TZ` per enemy) = every floor tile e could shoot after moving. Drawn dark red
  (`put(...,-1)`) under the move highlights while hovering an awake hostile on the map or targeting one in POV; the tooltip
  says what the shading is. Deliberately *not* Into-the-Breach intent: it shows where they can hurt you, not what they will do.
- **Reinforcement edge.** With `reinforceAt−turn ≤ 2`, the right-edge arrival columns (`x ≥ COLS−3`, free floor) breathe red
  and the foot reads "Reinforcements in N · right edge". `test27–29.mjs` cover breakdown, heat map and zones.

## Signature basic attacks (2026-09-27, Cameron's brief: no mutant fires a gun)
`ATTACKS[family]` = `{name, kind, sfx, anim, color, desc}` — blaster **Pulse Shot** (bolt, `cast1`), bruiser **Shockwave** (wave
along the floor, `slam`), phaser **Rift Shard** (jittering shard, `cast1`), mender **Suture Dart** (needle, `cast1`); `ATTACK_NAMES`
gives each of the twelve a flavour name/colour (Heat Lance, Static Bolt, Shield Slam, Quake Fist, Void Spike, Echo Pulse, Ward
Sting, Adrenal Dart…). `attackFor(kit)` merges them and `buildDef` sets `def.attack`; the Coalition has none and keeps its rifles.
`shoot()` reads `a.def.attack` for the animation, `fxTracer(a,b,color,kind)` (bullet | bolt | wave | shard | needle — wave runs
at floor height with a ring sprite and a launch ring at the attacker's feet) and `Audio.shoot(x,sfx)` (`pulse`/`slam`/`shard`/
`needle` voices; enemy kinds unchanged). Figures: mutants get emitter rings and palm cores on both forearms in the attack colour
plus a palm flash sprite as `userData.muzzle`; `makeGun` is enemy-only; mutant rest pose is hands-low, not low-ready. New poses in
`pose()`: `cast1` (one-arm push, flash at k 0.18–0.36 with the muzzle light tinted to the attack) and `slam` (both fists up then
down, body dips, warm ground light). Every "Fire" surface uses the attack name: action button (+ `desc`), `#pov-go`
("Pulse Shot → Trooper · 70%"), hints, touch arm text; Overwatch copy says "Hold your shot". Text tidy: Ember is a "Kinetic
striker", Concussion Round → **Concussive Burst** (same key `concuss`), Steady says "reaction shots". `og.png` regenerated without
the rifle. `shotattack.mjs` freezes each family mid-attack (`MUTIE.anim`/`fxTracer` are exposed for it).

## Fair randomness pass (2026-09-27, Cameron's brief: input over output randomness, visible mitigation, "I should have done X")
- **Cap is 100.** `hitChance` clamps 5..100; a computed 100 is guaranteed (was 95).
- **Focus (visible streak protection).** A player miss on a rolled shot adds `diff().focusStep` to that mutant's `u.focus`
  (cap `focusCap`; Scout 15/30, Veteran 10/20, Graft 0/0), a hit resets it, and it shows in the breakdown as `+10 focus`. It is
  the XCOM lower-difficulty aim fudge done in the open, because "never hide the math" forbids the secret version.
- **Set shot.** +10 (`set shot` in parts) when the shooter hasn't moved this turn (`u.movedTurn`, set by move/dash/Blink,
  cleared with `ow`/`hunker` at the player's turn start; not for melee or reaction shots). Stand-and-shoot vs step-into-the-flank
  is now a real fork.
- **Luck line on the report.** `shoot()` accumulates `G.stats.rolls/rollHits/rollExp` for the squad and `eRolls/eHits/eExp` for
  the Coalition (rolled shots only — guaranteed powers stay out); `finish()` fills `#res-luck`: "Your shots: 6 of 9 hit, 5.4
  expected — about even. Theirs: …" (±0.75 hits = even) and, on a loss, a verdict: dice fair → "Look at the positioning";
  dice against you → says so, still points at the plan.
- **Enemy overwatch is a rule, not a coin flip.** With no shot available, a covered hostile overwatches when a mutant is within
  `range+3` but out of sight; otherwise it closes. Learnable.
- **Scout: Coalition never crits** (`DIFF.enemyCrit` multiplies the enemy crit chance in `shoot` and `shotInfo`). Stated in the
  difficulty text. Sims after the pass (naive bot, 8 runs): M1 8/8 · M2 5/8 · M3 7/8; M4 still 0 (armor, as always for the bot).
  `test30.mjs` covers set shot, focus, the cap and the luck line.

## Unit identity & synergy pass (2026-09-27, Cameron's brief: combos are the dopamine; each family sees the board its own way)
- **Combo vocabulary** — four states any family can create and any other can cash in, all read by the same `hitChance`/`powerInfo`
  the roll uses: `expose(target,by,why)` (`target.exposed`: no cover, counts as flanked, cleared at the Coalition reset — set by a
  Concuss knockback that actually moved them, or by `exposeByWreck(tiles,by)` when a Blast/drum wrecks a crate someone was
  hugging); `shred(target,by)` (armor −1 for good, `target.shredded` counts it — every armor-ignoring hit from a player: Smash,
  Blast); **stunned +30** to hit; **Execute** — Smash / Phase Strike on a stunned or exposed target is +2 (`powerInfo().exec`,
  `EXECUTE` on the card and in float text). Suppress (`pinned`) and Rally's taunt (`pulled`) register as setups too.
- **Recognition.** `setup(target,by,kind)` records the last setter per enemy in `G.setups`; `killUnit` fires `combo(by,fin,target,
  kind)` when the killer is a different living mutant and the setup is from this or last turn: hit-stop, gold "COMBO · A → B"
  float, `Audio.win`, flash, `LINES.combo`, `+1 XP each` (`u.combos`, paid in `finish()` and shown on the report), `G.stats.combos`
  in the luck line. `SETUP_WORDS` names the setup in the log. Nothing here changes the numbers except the +30/+2/−1 already listed;
  the point is that the game *notices*. `test31.mjs`.
- **Family sight lines** (each power answers its own question before you commit; all helpers exported on `MUTIE`):
  Blaster — `blastPreview(u,p)` → `blastHtml`: hovering / touch-arming a Blast tile reads "hits 2 hostiles · kills 1 · shreds 1 ·
  wrecks 2 crates · exposes 1 · sets off 1 drum" and calls out allies caught. Phaser — `flankTiles(u)` (cached in `FK`) marks
  every open Blink tile from which a shot at `blinkRef(u)` (POV target, else nearest awake foe) is a flank; both renderers tint
  them gold in blink mode, the hint says "Gold tiles flank Trooper" and a hovered gold tile reads "Flanks Trooper — 75% from
  there" (`flankNote`). Mender — the ally strip is sorted by need (downed → most exposed where they stand → lowest HP) and each
  card carries the ally's own exposure ("2 can hit · 71% · FLANKED" / "safe now") plus `allyResult(u,mode,a)` ("→ 9/10 · clears
  mark", "+4 shield", "+1 action · +1 charge"); the hint repeats both. Bruiser — the Smash card's `shreds armor` / `EXECUTE` from
  `powerInfo`. `test32.mjs` covers all three and screenshots them.
- **Grafts (the customization layer — Program Graft in reverse).** `GRAFTS` (10, one per Coalition unit type: `{name, from, desc,
  mod?, flags?}`): Ceramic Weave +2 HP (trooper) · Optic Lattice +1 rng/+5 aim (marksman) · Tendon Weave +1 move (sprinter) ·
  Subdermal Plating armor +1 (juggernaut) · Target Ganglion — first hit each turn marks the target, `gMark` (spotter) · Bulwark
  Shell — 3 shield at deploy, `gShield` (bulwark) · Null Node — immune to Jammers, `gNull` (jammer) · Siphon Gland — kills heal 2,
  `gLeech` (siphon) · Husk Marrow — no reaction fire against you, `gGhost` (husk) · The Surgeon's Hand — cd −1 / +1 Blast charge,
  +1 HP (surgeon). **Harvest:** `killUnit` records `G.killedTypes`; on a win `finish()` awards *one* graft not yet owned whose source
  type died this mission (verb enemies before the four stat roles) → `CAMP.grafts`, report line "Graft recovered". **Fitting:**
  roster entry `graft` (one per mutant, a graft on one mutant at a time — `setGraft(cid,id)` pulls it off the previous holder,
  `graftHolder(id)`); a fallen mutant's graft returns to the bench. UI: mutant sheet "Graft" row (`#mu-grafts`, `.pk` cards, live),
  hub "Grafts" section (`#grafts`, holder or "on the bench", click opens the holder), roster chip, briefing kit tag, in-game
  `#sel-passive` line. `buildDef` applies `mod` (`rng` = weapon range; `cd` clamps at 1) and merges `flags`. Hooks: deploy shield,
  `jammed`, `doMove` reaction filter + `pathThreats`, `shoot` (mark after a hit; `u.markedTurn` resets at turn start, enemy `marked`
  clears with `exposed`), `killUnit` leech. Marks from the Ganglion count as setups (`SETUP_WORDS.mark`). `test33.mjs` covers harvest,
  fitting/moving, and every hook. Old saves migrate (`CAMP.grafts=[]`).

## Enemy design pass (2026-09-27, Cameron's brief: enemies that break the default plan, AI that punishes waiting, mix over count)
- **Grenadier** (`ENEMY.g`, `ai:'grenadier'`, `verb:'salvo'`, aug "ordnance arm", heavy gun model/sound). `salvoTarget(e)` picks the 3×3
  within range 7 (no LOS) holding the most standing mutants — **minimum two**, never on a hostile — and `plantSalvo(e)` pushes
  `{x,y,by,turn}` onto `G.salvos` (INCOMING float, Control line `salvo`). `resolveSalvos()` runs at the top of the Coalition phase
  (after `checkContact`, before activations): `SALVO_DMG=3` to every non-captive, non-downed unit in the area, no roll, armor applies,
  crates wrecked; cancelled with a log line if `by` is dead. One painted salvo per Grenadier at a time; with no pair to hit it falls
  back to its pistol. Board: the 3×3 pulses red (`put(...,3)`) with a `pctFor('salvo'+i)` label (INCOMING / CANCELLED), the 2D
  fallback draws a dashed box; `inSalvo(p)` feeds a warning into `moveHint` and the Blink hint; the player-turn banner names who is
  standing in the red. Placed in M4 (`proving`), M6 (`harvest`), M8 (`clinic`) maps, the M5/M7 reinforcement lists and side-op tier 1–2
  pools (cost 2).
- **Husk → `ai:'flanker'`**: score = hit chance ×1.2 + 45 if the shot is flanked, own cover ×2 only, distance ×2. It blinks behind you.
- **Marksman → lane**: with no shot it always takes overwatch (`lane`, cover or not) and its reaction fire has no −15 (`steadied` in
  the breakdown, `hitChance`). It is exempt from the pressure rule below.
- **Pressure (anti-turtle)**: `e.idle` counts consecutive activations without a shot (reset on shoot/plant). In the tile scoring,
  `idle≥1` on a `PRESSURE` archetype adds +40 (+10/idle) for any shot and strips most of the own-cover weight; the no-shot overwatch
  branch is allowed only while `e.idle≤1` (log says "it will come for you next turn"); after that the unit advances by **path
  distance** (`distMap(target,self)` BFS — Euclidean advance used to press against walls) and at `idle≥2` it dashes (both actions,
  log "done waiting", Control line `pressure` once). Bulwarks, Sprinters (rusher) and the Marksman keep their own behaviour.
- Sims (naive bot, after the pass): M1 8/8 · M2 6/8 · M3 5/6 · M4 0/4 in 4.8 turns (the previous build also wiped M4, in 7 — the
  bot clusters and wakes every pod; the "22-turn slog" note below is stale). `test34.mjs` covers paint → land → cancel, the flanker,
  the lane and the pressure sequence (hold one turn → dash through the gap → shoot).

## Tempo & pressure pass (2026-09-27, Cameron's brief: anti-turtling that suits the fiction and allows slack)
- **The reinforcement clock starts at contact.** `G.called` = the turn an awake hostile first survived a Coalition turn
  (`registerCall()` after the activation loop) or the console transmission began (hold missions). `waveTurn(m)` is the single
  timer read: `called==null ? ceilTurn : min(ceilTurn, called+callDelay)`, plus `G.reinfDelay`; `callDelay=max(2,reinforceAt−1)`
  (contact on turn 1 reproduces the old schedule), `ceilTurn=reinforceAt+3` (patrols find you regardless). Used by `endTurn`'s spawn
  check, the turnline ("Quiet — nobody has called it in · patrols by turn N" / "Called in turn 3 · reinforcements in 4 · right
  edge"), the right-edge glow and the briefing ("N turns after contact, patrols by turn M"; eliminate adds "they keep coming; clear it
  fast"). Adaptations/perks/difficulty still edit `reinforceAt` through `MX`, so they move both numbers.
- **Spotters are the uplink.** A player kill on a `verb:'mark'` unit adds 1 to `G.reinfDelay` (UPLINK DOWN float, "+1" in the
  turnline) — before or after the call, and mid-stream it opens a one-turn gap.
- **Fire** (industrial/rust — `FIRE_THEMES=DRUM_THEMES`). `detonate()` → `igniteAround()` lights the 3×3 of floor (`G.fire` Map
  key→{life}, `FIRE_LIFE=3`). `spreadFire()` at the top of the Coalition phase: tiles with life≥2 spread to each orthogonal floor
  neighbour with `FIRE_SPREAD=0.35` (new life 2, so a blaze burns out in ~4 turns), then all lives tick down. `burnSide(side)`
  deals `FIRE_DMG=2` (armor ignored) to units starting their turn in fire — enemies at the top of their phase, players right
  before "Your turn" — and drums in fire detonate (chains). `doMove` burns once per move for a path through fire. Enemy tile scoring
  −80 on fire; move highlights turn orange, `moveHint` warns "Burning" / "Runs through fire"; 3D flickers `put(...,3)` with embers
  every 420 ms (`FIRE_T`), 2D fills orange. Control lines `calledIn`, `fire`. `test35.mjs` covers quiet → call → wave, the uplink
  delay, ignition, spread, burning both sides and burn-out. Sims after: M1 8/8 · M2 7/8 · M3 4/6 (bot makes contact on turn 1–2,
  so the slack is for careful players, as intended).

## Consequences & attachment pass (2026-09-27, Cameron's brief: weight from permadeath, emotion from names, stories from systems)
- **Service records.** `moment(u,text,w)` collects story beats into `G.moments` (per cid, de-duplicated): boss kill (6), the fight
  ended with a squadmate bleeding out (4), a ≤35% shot that dropped its target (3–4), a kill at ≤3 HP (3), Blast double/triple (2/4),
  revive (3–4 if with a turn to spare), carry (3), freeing a captive (3), walked out at 1 HP (3), first kill on the first day (2),
  4+ kills in an op (2), first combo with a partner (2), bonding (3), went down and was carried home (1). `finish()` writes the best
  three per mutant into `entry.record[{m,t}]` (cap `RECORD_MAX=12`), the best three overall become the report's **Moments** line
  (`.moments`), the fallen carry theirs in `CAMP.fallen[].record`, and the epilogue quotes the last one per survivor and per fallen.
- **Scars.** Recovering from downed pushes `{m,t:"<downedBy>, turn N"}` onto `entry.scars`; `buildDef` takes −1 max HP per scar
  (floor 4). `applyDamage` records `downedBy`/`downedTurn` when a mutant goes down (source name, else fire/salvo).
- **Bonds.** `combo()` increments `CAMP.pairs[pairKey(a,b)]`; at `BOND_AT=3` the pair is bonded (float, log, moment). `hitChance`
  adds `+5 bond` for a player whose bonded partner is standing within 3 tiles (`bondPartner`); the unit panel says whether the
  partner is close; sheets list partners with combo counts (`partnersOf`, struck through when lost); roster cards show "bonded".
- **Death with a cause.** `killUnit` sets `killedBy`/`killedTurn` on squad deaths ("bled out — Marksman" when the clock ran out);
  fallen entries carry `cid, level, by, turn, record, scars`; the memorial shows the cause and each entry opens `openFallen(f)`
  (the mutant modal with `sheetHistory`). `CAMP.mourn` collects the names lost in a mission; `openBriefing` prefixes Control's intro
  with "First op without X. Make it count." until the next mission starts. Old saves migrate (`record`, `scars`, `pairs`).
  `test36.mjs` drives combo → bond → +5, a downed-and-recovered scar, records on sheet and report, a death by bleed-out, the memorial
  sheet and the mourn line.

## Share card & head tags
`og.png` (1200×630) is the Open Graph / Twitter image, referenced absolutely as `https://mutie.lol/og.png`; the head carries
description, canonical, an inline SVG favicon, `og:*` and `twitter:card=summary_large_image`. Regenerate the card with
`node ogcard.mjs` (in the test dir: renders a POV frame of mission 1 with the real fonts from `@fontsource`, composes the card,
writes `og.png` into the repo). Social scrapers cache aggressively — after changing it, bump the filename or re-scrape.

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
  Passive keys read in code: overcharge (Blast kill refunds a charge), hotshot, steady, dense, anchor, regen, slippery, momentum, aegis, fieldmedic, triage.
- `ENEMY` — Trooper, Sprinter, Juggernaut (stat roles), Marksman (overwatch lane) + verb enemies: Spotter `mark`, Bulwark `wall`,
  Jammer `jam`, Siphon `drain` (−1 action next turn), Husk `phase` (teleport move, ignores overwatch, flanks), Grenadier `salvo`, The Surgeon
  `command` (boss: +1 armor aura, grafts up to 3 Husks from 2 turns after she wakes). `aug` tags drive the threat file.
- `VIP` — the unarmed captive (Wren) for Rescue missions; side flips `captive` → `player` when freed.
- Relays are units with `side:'obj'` (100% hit, block movement, not LOS).
- `MISSIONS` — hand-built maps as string arrays. Legend: `.` floor, `#` wall, `=` half cover, `O` full cover,
  `P` player spawn, `E` evac tile, `C` hold console, `X` relay/vat (`objLabel`), `V` captive (`captiveNames`),
  enemies `t m p j o w z q h g S`. Fields: `objective`, `reinforceAt` (>50 = none), `reinforce[]`, `evacAt`,
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
custom-mission JSON import (data tables are already plain objects); more figure detail (helmets, archetype costumes); mid-mission resume; the mission-report overlay Cameron reported as stuck once (not reproduced; a TDZ bug in finish() that froze mission end was introduced and fixed during the menu pass — if it recurs, check finish()).

## Open creative decision (Cameron's call)
Who or what is the authority the mutants are fighting. Everything else here is mechanics.
