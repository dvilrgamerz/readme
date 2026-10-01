# MetroForge V4: Bug Fixes, UI Audit, and Release Plan

This plan is the working checklist for stabilizing and polishing MetroForge V4 before calling the browser release complete.

## Release Goal

Ship a stable, polished V4 that:

- feels clear on desktop and mobile
- has reliable building, zoning, utilities, traffic, policies, overlays, districts, missions, weather, disasters, and save/load
- keeps the game fast on the current 48×30 map
- gives players enough feedback to understand why a city is growing or failing
- deploys safely through GitHub Pages

---

## Phase 1 — Critical Bug Fixes

### Game loop and simulation
- [ ] Check for console errors during a 30+ minute play session
- [ ] Prevent simulation values from becoming `NaN`, `Infinity`, or negative when they should not
- [ ] Verify pause, 1×, 2×, and 4× speed stay synchronized with the UI
- [ ] Verify day/year rollover
- [ ] Make simulation updates deterministic enough that loading a save does not immediately break city stats

### Roads and avenues
- [ ] Verify starter road is connected correctly
- [ ] Fix road connectivity when placing and bulldozing roads
- [ ] Verify avenues count as valid road access
- [ ] Prevent zones from growing without road access
- [ ] Make road capacity differences visible in tooltips
- [ ] Recalculate connectivity immediately after bulldozing

### Zoning and buildings
- [ ] Verify Residential, Commercial, and Industrial demand affects growth correctly
- [ ] Prevent buildings from leveling up when power, water, or road access is missing
- [ ] Improve abandonment/downgrade behavior
- [ ] Make level changes easier to see
- [ ] Verify jobs and population totals match the buildings on the map

### Power and water
- [ ] Verify total capacity and usage calculations
- [ ] Fix zones showing powered/watered incorrectly after load or bulldoze
- [ ] Add clearer shortage alerts
- [ ] Recalculate utilities immediately after service buildings are added or removed

### Economy
- [ ] Verify Residential, Commercial, and Industrial taxes affect both income and demand
- [ ] Verify service budget changes service strength and upkeep
- [ ] Verify policy costs are charged once per simulation day
- [ ] Verify loans, debt, and repayments cannot produce broken balances
- [ ] Prevent cashflow display from lagging behind the simulation
- [ ] Balance early-game income so a new city can recover from mistakes

### Save, load, and autosave
- [ ] Add a V4 save-format version field
- [ ] Validate saved data before loading
- [ ] Restore all policies, taxes, service budget, weather, mission, milestones, districts, and simulation state
- [ ] Rebuild derived data such as connectivity and utilities after loading
- [ ] Prevent a bad save from crashing the game
- [ ] Add visible "Saved" / "Autosaved" feedback
- [ ] Keep manual save separate from autosave fallback

---

## Phase 2 — Policy and Balance Audit

### Green Initiative
Current concept:
- daily city cost
- reduces pollution

Tasks:
- [ ] Confirm the pollution reduction is applied exactly once
- [ ] Show the exact cost and effect in the UI
- [ ] Make lower pollution visibly improve health and land value
- [ ] Add active-policy visual state

### Free Transit
Current concept:
- daily city cost
- raises transit use
- helps traffic

Tasks:
- [ ] Confirm ridership increases when enabled
- [ ] Confirm traffic bonus is not applied without transit infrastructure
- [ ] Scale benefit with bus stops and metro stations
- [ ] Show current riders and estimated policy effect

### Education Boost
Current concept:
- daily city cost
- raises education

Tasks:
- [ ] Confirm education rises only when intended
- [ ] Make schools still matter when the policy is active
- [ ] Connect education to building quality/growth more clearly
- [ ] Show the policy effect in the education tooltip

### Taxes and services
- [ ] Add tooltip: high Residential tax reduces Residential demand
- [ ] Add tooltip: high Commercial tax reduces Commercial demand
- [ ] Add tooltip: high Industrial tax reduces Industrial demand
- [ ] Add tooltip: Service Budget changes service effectiveness and upkeep
- [ ] Add recommended/default markers around 9% taxes and 100% services
- [ ] Clamp all sliders to safe ranges

---

## Phase 3 — Overlay Fixes and Upgrade

### Normal
- [ ] Keep roads, zones, services, weather, and districts readable

### Land Value
- [ ] Add a visible Low → High legend
- [ ] Improve color separation
- [ ] Show hovered tile value

### Traffic
- [ ] Add Free Flow → Congested legend
- [ ] Make roads/avenues easier to distinguish
- [ ] Show citywide traffic percentage and hovered road state

### Pollution
- [ ] Add Clean → Polluted legend
- [ ] Show industrial/power pollution sources more clearly
- [ ] Make recycling/Green Initiative effects visible

### Services
- [ ] Add Weak → Strong legend
- [ ] Clarify that the overlay combines service-related quality
- [ ] Consider separate future toggles for Police, Fire, Health, and Education

---

## Phase 4 — District Paint Fix

V4 currently uses district painting mainly for organization.

- [ ] Add a dedicated district mode indicator
- [ ] Show district color/name on hover
- [ ] Add an erase district action instead of only cycling
- [ ] Prevent district paint on water
- [ ] Make district borders easier to see
- [ ] Add a simple district panel with tile count and basic stats
- [ ] Keep district-specific policies/taxes as a future expansion unless stable enough for V4

---

## Phase 5 — Traffic and Transit Polish

- [ ] Keep animated traffic from spawning on disconnected roads
- [ ] Prevent cars from getting stuck when a road is bulldozed
- [ ] Make avenues provide meaningfully higher capacity than roads
- [ ] Scale congestion with population/jobs and actual road capacity
- [ ] Make Bus Stops require road access
- [ ] Make Metro Stations require road access
- [ ] Keep Free Transit from giving unrealistic bonuses without infrastructure
- [ ] Add transit tooltip showing riders and capacity
- [ ] Optimize car updates to avoid unnecessary full-map work

Future V5:
- destination-based pathfinding
- intersections
- traffic lights
- editable bus/metro lines

---

## Phase 6 — Weather and Disaster Fixes

- [ ] Verify Clear, Cloudy, Rain, Storm, and Heatwave transitions
- [ ] Ensure weather does not change too frequently
- [ ] Keep rain rendering lightweight
- [ ] Verify fire protection affects fire outcomes
- [ ] Verify flood logic only targets appropriate riverside areas
- [ ] Add disaster cooldown so events cannot spam
- [ ] Improve disaster alerts with location and damage
- [ ] Ensure disasters never delete water tiles or corrupt the map

---

## Phase 7 — Mission and Milestone Fixes

- [ ] Prevent impossible missions from being generated
- [ ] Fix pollution mission completion when population is too low
- [ ] Prevent rewards from being paid twice
- [ ] Show mission progress, not only target text
- [ ] Make reroll cost clear before the user presses it
- [ ] Verify milestone rewards trigger once
- [ ] Add a completed state before automatically assigning the next mission

---

## Phase 8 — Full UI/UX Audit

### Desktop
- [ ] Improve visual hierarchy of top stats
- [ ] Keep important numbers readable at 1366×768
- [ ] Make build buttons easier to scan
- [ ] Add selected-tool description, cost, upkeep, and effect
- [ ] Improve alerts so critical problems stand out first
- [ ] Add overlay legends
- [ ] Add tooltips to policies, taxes, services, roads, and districts
- [ ] Keep panels scrollable without hiding essential controls

### Mobile
- [ ] Make the game playable without hover
- [ ] Add larger touch targets
- [ ] Replace right-click bulldoze with a visible bulldoze tool
- [ ] Make build categories collapsible
- [ ] Keep map visible while choosing tools
- [ ] Prevent accidental page scrolling while building
- [ ] Add mobile-friendly zoom controls
- [ ] Test portrait and landscape layouts

### Accessibility
- [ ] Add `aria-label` text to icon-only buttons
- [ ] Ensure keyboard focus is visible
- [ ] Improve contrast for small secondary text
- [ ] Do not rely on color alone for warnings/overlays
- [ ] Add text labels or symbols to legends

---

## Phase 9 — Performance Pass

- [ ] Profile the game loop in browser DevTools
- [ ] Avoid recalculating the entire map more often than needed
- [ ] Cache counts that do not need frame-by-frame updates
- [ ] Update simulation on ticks, render on animation frames
- [ ] Limit traffic agents based on performance budget
- [ ] Avoid unnecessary DOM updates every frame
- [ ] Check for memory growth after repeated save/load/new-city cycles
- [ ] Target smooth play on common phones and low-end laptops

---

## Phase 10 — Code Quality and Automated Checks

- [ ] Add `package.json` for developer tooling only; game remains static for GitHub Pages
- [ ] Add ESLint
- [ ] Add formatting rules
- [ ] Extract pure simulation formulas where practical
- [ ] Add unit tests for:
  - tax/demand math
  - policy effects
  - utility capacity
  - milestone rewards
  - mission completion
  - save migration/validation
- [ ] Add smoke test for loading the game without JavaScript errors
- [ ] Add GitHub Actions CI for lint + tests

Important: do not mark automated tests as passing until the workflow actually runs successfully.

---

## Phase 11 — V4 Release Checklist

### Functional QA
- [ ] New city generation works
- [ ] Roads and avenues work
- [ ] All three zone types grow
- [ ] Bulldoze works
- [ ] Power works
- [ ] Water works
- [ ] Parks work
- [ ] Police works
- [ ] Fire works
- [ ] Schools work
- [ ] Hospitals work
- [ ] Recycling works
- [ ] Bus Stops work
- [ ] Metro Stations work
- [ ] District paint works
- [ ] All policies work
- [ ] Taxes work
- [ ] Service budget works
- [ ] All overlays work
- [ ] Missions work
- [ ] Milestones work
- [ ] Weather works
- [ ] Disasters work
- [ ] Pause and speeds work
- [ ] Save works
- [ ] Load works
- [ ] Autosave works
- [ ] New City works

### Browser QA
- [ ] Chrome desktop
- [ ] Edge desktop
- [ ] Firefox desktop
- [ ] Chrome Android
- [ ] Samsung Internet
- [ ] Safari/iPhone if available

### Release QA
- [ ] No uncaught console errors
- [ ] README matches the live game
- [ ] CHANGELOG updated
- [ ] Version notes updated
- [ ] GitHub Pages loads from the expected URL
- [ ] Create/tag stable release only after QA passes

---

## Recommended V4 Release Sequence

### V4.0.1 — Stability Patch
Focus only on:
1. save/load reliability
2. roads/avenues/connectivity
3. utilities
4. policy math
5. economy bugs
6. input and mobile bugs
7. console/runtime errors

### V4.1.0 — UI & Feedback Update
Add:
1. overlay legends
2. detailed tooltips
3. improved build toolbar
4. better mobile controls
5. policy descriptions
6. clearer alerts
7. district UI

### V4.2.0 — Simulation Polish
Add:
1. better traffic balance
2. improved transit rules
3. stronger mission progression
4. disaster cooldowns
5. economy balancing
6. performance optimization

### V4 Stable
Call V4 stable only when:
- critical bugs are closed
- desktop/mobile smoke tests pass
- save/load is reliable
- the UI explains major systems
- GitHub Pages deployment is verified

---

## V5 — Keep Out of the V4 Bug-Fix Scope

Do not delay V4 stabilization for these larger systems:

- full citizen simulation
- destination-based A* traffic
- editable transit routes
- cargo/rail networks
- full industry supply chains
- tourism simulation
- terrain height/terraforming
- huge maps
- full 3D conversion

These belong in V5 or later.
