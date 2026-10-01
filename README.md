# MetroForge V7.2

**Build a town. Connect a region. Shape a metropolis.**

MetroForge is an original, free browser city builder inspired by the road planning, zoning, and municipal management of games such as Cities: Skylines. It is a lightweight **2D simulation**, with no installation, account, paid assets, or API keys required.

## Play online

**[Launch MetroForge →](https://dvilrgamerz.github.io/readme/)**

If this link shows a 404, enable Pages once: **Settings → Pages → Source: GitHub Actions**. Then open **Actions → Test and deploy MetroForge → Run workflow**. Subsequent pushes to `main` test and deploy automatically.

Choose **City playground → Load full city** to try any of 15 ready-built layouts, or turn on **Free build** for free construction. Use **Showcase** in the Build panel to explore an established city. It starts paused; press Play when you're ready. Showcase replaces the current city, so save or export first.

## What's new in V7.2

| System | What you can do |
|---|---|
| Land expansion | Start with A1 and buy neighboring **64×40 plots** across a **256×160 region**. Plot prices rise with expansion; free build lets you claim plots free. |
| Free build + Move | Build free, then drag buildings to empty land or tap a building and its destination. Levels and inventory move with it; required plots are claimed free. |
| 15 full cities | Load garden, river, coastal, industrial, downtown, island, rail, university, eco, tourism, suburban, harbor, boulevard, traffic and balanced layouts. |
| Passenger rail | Paint tracks through two road-connected stations and watch trains shuttle between them. Nearby home-to-work trips become rail riders. |
| Cargo rail | Connect terminals by track to move reserved factory goods into shops near the destination terminal, reducing truck deliveries. |
| Tourism | Build hotels and attractions to attract visitors and earn daily income. |
| Offices | Create clean jobs; workers and office development need education of at least 45%. Offices use the commercial tax rate. |
| Emergency response | Fire engines and ambulances follow roads through traffic to incidents, with a 90-second simulation deadline. Test either incident from City report. |
| Map editor | Pause and paint rivers, land, roads or bridges; Apply keeps edits, Cancel restores the city. Export shares your custom map. |
| City challenges | Maintain profitable growth, good traffic or tourism for five days to earn a one-time grant. Free build pauses challenge rewards. |
| Bus editing | Edit names and stops, undo selected stops, and increase or decrease the bus fleet. |


V2–V4 systems remain: taxes, municipal loans, service budgets, parks, education, healthcare, safety, recycling, buses, metro capacity, weather, disasters, day/night lighting, missions, and milestones.

## First city in five steps

1. Extend the starter highway inside your owned A1 plot near the bottom-left corner. Roads must connect to a map edge.
2. Zone residential homes and commercial/industrial jobs immediately beside connected roads.
3. Build connected wind turbines or a power plant, plus a water tower. Zones need road access, power, and water to develop.
4. Press Play and balance jobs, income, and services as buildings grow.
5. Choose **Expand city → select a bordering plot → Buy plot** to unlock more land. Add parks and schools, upgrade busy roads, and cross the river with bridges.

Avoid spending all your money on services before you have a tax base. Add a garbage depot as waste accumulates. Keep staffed industry connected so trucks can supply shops. Buildings lose development after sustained poor conditions; restore access and utilities to recover.

## Buying more land

New cities begin with **A1**, one full **64×40 map**. The region contains **16 full-size plots** arranged in a 4×4 grid: **256×160 tiles**, or **40,960 tiles total**. Select **Expand city** to zoom out, then choose a plot on the map or in the plot grid, then press **Buy plot**. Select **Build in this plot** to zoom back into any owned plot. A plot must share an edge with land you own. Base prices start at **$5,000**, increase by **$1,500 per previously purchased plot**, and include a small terrain adjustment for water. The panel shows the exact current price before purchase.

Unowned plots stay shaded and reject construction, rail, demolition, district painting and map-editor changes. Purchased land unlocks immediately and remains owned through Save, Export and Import. **Free build** makes land claims free; plots still need to border your city. Showcase, all 15 ready-made designs and older saves occupy the first full plot, leaving fifteen surrounding maps available to expand into. Land is a one-time purchase, separate from daily upkeep.

## Move buildings in Free build

Enable **Free build → Move buildings**, then drag a building to empty land. On a phone you can also tap a building, then tap its destination. A green preview means the drop is valid; a red preview means it is blocked. **Escape**, right-click or another tool cancels the move. A blocked drop leaves the original building intact.

Levels, density and inventory move with the building. Bus stops keep their route membership and active incidents follow their property. Roads and rail track remain in place; a moved service or zone needs road access at its new location. Empty plots needed to reach the destination are claimed free. Water, existing buildings and locations outside the region reject drops.

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

Save and autosave are stored in this browser on this device. Use **Export** for a portable backup, then **Import** on another device. The current release checks V7 storage slots first, then V6, V5 and V4 saves. Rail tracks, free-build mode, incidents and challenge progress persist. Train trips restart on load; reserved cargo is returned to its factory before saving. Valid emergency trips resume; pending incidents redispatch as needed. Older files migrate automatically into the larger map; utilities and access are recalculated. Large regional maps use compact sparse save records so empty terrain does not fill browser storage. Older 48×30 and 64×40 cities migrate into the first plot. Browser privacy settings or clearing site data can remove local saves.

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

This release uses a 256×160 region made of sixteen 64×40 plots and a Canvas 2D renderer, up to 180 vehicles, grid-based queues and signals, generic goods, per-property waste, and household groups. Bus ridership is estimated from coverage rather than individual passengers. Metro remains a simplified capacity service. Rail uses orthogonal track corridors with automatic station connections and up to 20 shuttles. Terminals transfer directly to factories/shops within seven tiles; local truck legs and rail signals are not modeled. Tourism and passenger counts are aggregate estimates. Individual pedestrians, realistic train scheduling and a full 3D engine remain future work.

[Changelog](CHANGELOG.md) · [V7.2 release notes](versions/V7.2.md) · [V7.1 release notes](versions/V7.1.md) · [V7 release notes](versions/V7.md) · [V6 release notes](versions/V6.md) · [V5 release notes](versions/V5.md) · [V4 release plan](docs/V4_BUG_FIX_UI_RELEASE_PLAN.md)
