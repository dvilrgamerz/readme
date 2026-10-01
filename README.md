# MetroForge V5

**Build a town. Connect a region. Shape a metropolis.**

MetroForge is an original, free browser city builder inspired by the road planning, zoning, and municipal management of games such as Cities: Skylines. It is a lightweight **2D simulation**, with no installation, account, paid assets, or API keys required.

## Play online

**[Launch MetroForge →](https://dvilrgamerz.github.io/readme/)**

If this link shows a 404, enable Pages once: **Settings → Pages → Source: GitHub Actions**. Then open **Actions → Test and deploy MetroForge → Run workflow**. Subsequent pushes to `main` test and deploy automatically.

Use **Showcase** in the Build panel to explore an established city. It starts paused; press Play when you're ready. Showcase replaces the current city, so save or export first.

## What's new in V5

| System | What you can do |
|---|---|
| Traffic | Watch vehicles follow shortest road routes between homes and workplaces. Inspect busy road segments with the traffic overlay. |
| Regional roads | Connect to any map edge, upgrade roads to avenues, and build bridges across the river. |
| Neighborhoods | Choose low or high density when zoning. High density provides 2.5× capacity and benefits from education. |
| Districts | Paint named districts; choose balanced, green, or business policies for each one. |
| Clean energy | Supply 200 MW per connected wind turbine without power-plant pollution. |
| Building health | Inspect road and utility access, development level, residents, jobs, pollution, and abandonment pressure. |
| City planning | Follow the mayor's adviser, zone-demand meters, alerts, and a 40-day population chart. |
| Controls | Pan, zoom, fit the map, paint continuous lines, and use keyboard shortcuts or touch. |
| Saves | Save locally, export/import JSON backups, and load existing V4 saves. Invalid saves leave the current city intact. |
| Performance | Cache the map layer and road/service data; refresh the dashboard four times per second rather than every animation frame. |

V2–V4 systems remain: taxes, municipal loans, service budgets, parks, education, healthcare, safety, recycling, buses, metro capacity, weather, disasters, day/night lighting, missions, and milestones.

## First city in five steps

1. Extend the starter highway near the bottom-left corner. Roads must connect to a map edge.
2. Zone residential homes and commercial/industrial jobs immediately beside connected roads.
3. Build connected wind turbines or a power plant, plus a water tower. Zones need road access, power, and water to develop.
4. Press Play and balance jobs, income, and services as buildings grow.
5. Add parks and schools; upgrade busy roads, paint districts, and expand across the river with bridges.

Avoid spending all your money on services before you have a tax base. Buildings lose development after sustained poor conditions; restore access and utilities to recover.

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
- **Traffic percentage** is an aggregate road-capacity estimate; higher is better. The traffic overlay shows the activity of visible vehicles per road segment.
- **Utilities** show current use / connected supply. Towers and generators need connected roads; distribution is city-wide rather than simulated pipes or cables.
- **Green Initiative** costs $60/day and reduces pollution. **Free Transit** costs $90/day and increases transit capacity. **Education Boost** costs $80/day and improves education.
- **District green policy** reduces local pollution and raises land value. **Business policy** improves job-zone development while increasing local pollution.
- **Red building dots** indicate a missing road, electricity, or water connection. Use Inspect to find the cause.

## Save your work

Save and autosave are stored in this browser on this device. Use **Export** for a portable backup, then **Import** on another device. A V5 load checks V5 slots first, then V4 saves. V4 files migrate automatically; utilities and access are recalculated. Browser privacy settings or clearing site data can remove local saves.

## Run and test locally

```sh
python3 -m http.server 8000
# Open http://localhost:8000
npm test
```

Node 20+ is required for tests; the browser game needs no npm dependencies or build step. The included GitHub Actions workflow tests and deploys the game files from `main` after Pages is enabled.

## Scope

This release retains the 48×30 map and Canvas 2D renderer. Vehicles use home-to-job road routes, with an aggregate congestion model. Transit contributes connected capacity; it does not have editable bus routes. Individual households, detailed supply chains, rail, terraforming, and a full 3D engine are future work.

[Changelog](CHANGELOG.md) · [V5 release notes](versions/V5.md) · [V4 release plan](docs/V4_BUG_FIX_UI_RELEASE_PLAN.md)
