# MetroForge V6

**Build a town. Connect a region. Shape a metropolis.**

MetroForge is an original, free browser city builder inspired by the road planning, zoning, and municipal management of games such as Cities: Skylines. It is a lightweight **2D simulation**, with no installation, account, paid assets, or API keys required.

## Play online

**[Launch MetroForge →](https://dvilrgamerz.github.io/readme/)**

If this link shows a 404, enable Pages once: **Settings → Pages → Source: GitHub Actions**. Then open **Actions → Test and deploy MetroForge → Run workflow**. Subsequent pushes to `main` test and deploy automatically.

Use **Showcase** in the Build panel to explore an established city. It starts paused; press Play when you're ready. Showcase replaces the current city, so save or export first.

## What's new in V6

| System | What you can do |
|---|---|
| Traffic queues | Cars, buses and trucks queue behind vehicles, wait at signals, and yield at occupied junctions. |
| Custom bus lines | Pick stops in order, save a loop, and add up to four buses per line. |
| Supply chains | Staff factories, move goods by truck, and keep shop inventories stocked. |
| Garbage | Build garbage depots and watch trucks collect waste before it harms your neighborhoods. |
| Households | Track families, workers, students, reachable jobs and commute distances per residential property. |
| Building upgrades | Resolve listed development blockers, upgrade levels, and convert density in the inspector. |
| Regional map | Plan across 64×40 tiles, with bridges, avenues, wind power and named districts. |
| Daily budget | See every income and expense category, transit fares, debt payments and the projected net. |
| Controls & saves | Touch controls, keyboard shortcuts, 500% zoom, JSON backups, and V4/V5 migration. |

V2–V4 systems remain: taxes, municipal loans, service budgets, parks, education, healthcare, safety, recycling, buses, metro capacity, weather, disasters, day/night lighting, missions, and milestones.

## First city in five steps

1. Extend the starter highway near the bottom-left corner. Roads must connect to a map edge.
2. Zone residential homes and commercial/industrial jobs immediately beside connected roads.
3. Build connected wind turbines or a power plant, plus a water tower. Zones need road access, power, and water to develop.
4. Press Play and balance jobs, income, and services as buildings grow.
5. Add parks and schools; upgrade busy roads, paint districts, and expand across the river with bridges.

Avoid spending all your money on services before you have a tax base. Add a garbage depot as waste accumulates. Keep staffed industry connected so trucks can supply shops. Buildings lose development after sustained poor conditions; restore access and utilities to recover.

## Controls

| Action | Desktop | Phone / tablet |
|---|---|---|
| Build | Select tool, click or drag | Build & manage → select tool → Map → touch or drag |
| Inspect | `I`, then select property | Choose Inspect, tap property, open City report |
| Pan | Pan tool or Shift/middle-button drag | Pan tool, then drag |
| Zoom | Wheel or + / − | + / − buttons |
| Reset camera | Fit map | Fit map |
| Bulldoze | Right-drag or `B` | Bulldoze tool |
| Pause | Space or pause button | Pause button |
| Quick tools | `R` road, `A` avenue, `H` homes, `C` shops, `F` industry, `P` pan | Build panel |

## Understand the city

- **Demand percentages** show how attractive new zoning is; they are not your city's land-use proportions.
- **Tax percentages** set the tax rate for each zone. High taxes discourage growth.
- **Service budget** scales service expenses and service effectiveness; roads and zoning upkeep are unaffected.
- **Traffic percentage** measures the share of simulated vehicles moving freely; higher is better. The traffic overlay shows the activity of visible vehicles per road segment.
- **Utilities** show current use / connected supply. Towers and generators need connected roads; distribution is city-wide rather than simulated pipes or cables.
- **Green Initiative** costs $60/day and reduces pollution. **Free Transit** costs $90/day and increases transit capacity. **Education Boost** costs $80/day and improves education.
- **District green policy** reduces local pollution and raises land value. **Business policy** improves job-zone development while increasing local pollution.
- **Red building dots** indicate a missing road, electricity, or water connection. Use Inspect to find the cause.

## Save your work

Save and autosave are stored in this browser on this device. Use **Export** for a portable backup, then **Import** on another device. A V6 load checks V6 slots first, then V5 and V4 saves. Older files migrate automatically into the larger map; utilities and access are recalculated. Browser privacy settings or clearing site data can remove local saves.

## Run and test locally

```sh
python3 -m http.server 8000
# Open http://localhost:8000
npm test
```

Node 20+ is required for tests; the browser game needs no npm dependencies or build step. The included GitHub Actions workflow tests and deploys the game files from `main` after Pages is enabled.

## Traffic, transit and logistics

- Use **Traffic Lights** to toggle signals at junctions. Upgrade busy roads to avenues and create alternate routes when trucks queue.
- Build bus stops beside connected roads. Choose **New line**, tap stops in order, then **Save line**. A route needs stops near both homes and workplaces to attract riders. Each bus costs **$18/day**.
- Staffed, powered factories produce goods each day. Violet delivery trucks bring goods to shops; empty shops pay less tax.
- A **Garbage Depot** costs **$1,250**, with **$55/day** upkeep and up to three active trucks. Lime trucks collect accumulated waste. Waste hurts health and development when neglected.
- Inspect a home to see household groups, students, employment, commute distance and development blockers. Upgrade levels for **$200–800**, or convert density for **$350** (high) / **$150** (low).
- The budget panel shows projected daily totals; the number under Funds shows the last settled day's result.

## Scope

This release uses a 64×40 map and Canvas 2D renderer, up to 180 vehicles, grid-based queues and signals, generic goods, per-property waste, and household groups. Bus ridership is estimated from coverage rather than individual passengers. Metro remains a simplified capacity service. Detailed rail, individual pedestrian agents, terrain editing, and a full 3D engine are future work.

[Changelog](CHANGELOG.md) · [V6 release notes](versions/V6.md) · [V5 release notes](versions/V5.md) · [V4 release plan](docs/V4_BUG_FIX_UI_RELEASE_PLAN.md)
