import {chromium} from 'playwright';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
await fs.mkdir('qa-artifacts',{recursive:true});
const server=spawn('python3',['-m','http.server','8000'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 for(let n=0;n<40;n++){try{await page.goto('http://127.0.0.1:8000');break;}catch{if(n===39)throw Error('Test server failed to start');}}
 await page.locator('[data-tool="garbage"]').waitFor();assert.equal(await page.locator('.tool').count(),32);
 // Land expansion uses actual clicks and records purchases in the save.
 const landTile=async(x,y)=>{const r=await page.locator('#gameCanvas').boundingBox();await page.mouse.click(r.x+r.width*(x+.5)/256,r.y+r.height*(y+.5)/160);};
 await page.locator('[data-speed="1"]').click();await page.locator('#pauseBtn').click();await page.locator('#saveBtn').click();const startingFunds=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.funds);assert.equal(await page.locator('#zoomLabel').textContent(),'400%');await page.locator('#resetView').click();
 assert.equal(await page.locator('#plotGrid button').count(),16);await page.locator('[data-tool="road"]').click();await landTile(64,37);await page.locator('#saveBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.region.cells.find(r=>r[0]===37*256+64)?.[1]||'empty'),'empty');
 await page.locator('#expandCity').click();await landTile(96,20);await page.locator('#buyPlot').click();await page.locator('#saveBtn').click();const landSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city);assert.deepEqual(landSave.land.owned,[0,1]);assert(landSave.funds<startingFunds);
 await page.locator('[data-tool="road"]').click();await landTile(64,37);await page.locator('#saveBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.region.cells.find(r=>r[0]===37*256+64)?.[1]||'empty'),'road');await page.locator('#loadBtn').click();assert((await page.locator('#landSummary').textContent()).includes('2/16'));
 await page.locator('#freeBuild').check();await page.locator('#expandCity').click();await page.locator('[data-plot="2"]').click();await page.locator('#buyPlot').click();await page.locator('#saveBtn').click();const freeLand=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city);assert(freeLand.land.owned.includes(2));assert.equal(freeLand.funds,landSave.funds-20);await page.locator('#expandCity').click();await page.evaluate(()=>document.querySelector('.left').scrollTop=0);await page.screenshot({path:'qa-artifacts/land-expansion-desktop.png'});await page.locator('#freeBuild').uncheck();
 await page.locator('#demoBtn').click();await page.locator('#population').filter({hasNotText:/^0$/}).waitFor();
 await page.locator('#newRoute').click();
 const tile=async(x,y)=>{const r=await page.locator('#gameCanvas').boundingBox();await page.mouse.click(r.x+r.width*(x+.5)/64,r.y+r.height*(y+.5)/40);};
 await tile(6,22);await tile(13,22);await page.locator('#routeName').fill('Browser Test Loop');await page.locator('#saveRoute').click();
 await page.locator('#routeList').getByText(/Browser Test Loop/).waitFor();assert.equal(await page.locator('#routeList .route-item').count(),2);
 await page.locator('[data-tool="inspect"]').click();await tile(6,10);await page.locator('#upgradeBuilding').click();
 await page.locator('#zoomIn').click();assert.equal(await page.locator('#zoomLabel').textContent(),'480%');await page.locator('#expandCity').click();await page.locator('[data-plot="0"]').click();await page.locator('#openPlot').click();
 await page.locator('[data-tool="signal"]').click();await tile(12,15);await page.locator('#saveBtn').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')));
 assert.equal(saved.version,8);assert.equal(saved.city.region.height,160);assert.equal(saved.city.v6.routes.length,2);assert.equal(saved.city.v6.signals[15*256+12],false);
 await page.locator('[data-speed="4"]').click();await page.waitForTimeout(2500);await page.locator('#pauseBtn').click();
 await page.locator('#saveBtn').click();const inFlight=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.v6.vehicles.map(v=>({id:v.id,kind:v.kind}))); await page.locator('#loadBtn').click();await page.locator('#saveBtn').click();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.v6.vehicles.map(v=>({id:v.id,kind:v.kind}))),inFlight);
 await page.locator('[data-tool="inspect"]').click();await page.screenshot({path:'qa-artifacts/desktop-v7.png'});
 const frames=await page.evaluate(async()=>{
   const stamps=[];await new Promise(resolve=>{function step(t){stamps.push(t);if(stamps.length===61)resolve();else requestAnimationFrame(step);}requestAnimationFrame(step);});return stamps.slice(1).map((t,i)=>t-stamps[i]);
 });
 console.log('Paused desktop frame median ms:',frames.sort((a,b)=>a-b)[Math.floor(frames.length/2)]);
 // V7 playground: real controls, all 15 templates, free costs and editor transactions.
 assert.equal(await page.locator('#designSelect option').count(),15);
 for(const id of ['garden','river','coastal','industrial','downtown','islands','rail','university','eco','tourism','suburbs','harbor','boulevard','traffic','balanced']){
   await page.locator('#designSelect').selectOption(id);await page.locator('#loadDesign').click();await page.locator('#saveBtn').click();
   const c=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city);assert(c.population>500,id);assert(c.power.cap>=c.power.use,id);assert(c.water.cap>=c.water.use,id);
 }
 await page.locator('#freeBuild').check();await page.locator('#saveBtn').click();const beforeFree=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.funds);
 await page.locator('[data-tool="power"]').click();await tile(0,0);await page.locator('#saveBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.funds),beforeFree);
 await page.locator('#editorStart').click();await page.locator('#editorBrush').selectOption('water');await tile(1,0);await page.locator('#editorCancel').click();await page.locator('#saveBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.region.water.includes(1)?'water':'empty'),'empty');
 await page.locator('#editorStart').click();await page.locator('#editorBrush').selectOption('water');await tile(1,0);await page.locator('#editorApply').click();await page.locator('#saveBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.region.water.includes(1)?'water':'empty'),'water');
 await page.locator('#loadBtn').click();assert(await page.locator('#freeBuild').isChecked());
 await page.locator('#freeBuild').check();await page.locator('#moveBuildings').click();
 const drag=async(a,b)=>{const r=await page.locator('#gameCanvas').boundingBox(),point=p=>({x:r.x+r.width*(p[0]+.5)/64,y:r.y+r.height*(p[1]+.5)/40});const start=point(a),end=point(b);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();};
 await drag([0,0],[4,0]);await page.locator('#saveBtn').click();let movedSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')));assert.equal(movedSave.city.region.cells.find(r=>r[0]===4)?.[1],'power');assert(!movedSave.city.region.cells.some(r=>r[0]===0));
 await drag([4,0],[1,0]);await page.keyboard.press('Escape');await page.locator('#saveBtn').click();movedSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')));assert.equal(movedSave.city.region.cells.find(r=>r[0]===4)?.[1],'power');
 await page.locator('#moveBuildings').click();await tile(4,0);await page.keyboard.press('Escape');await page.locator('#loadBtn').click();await page.locator('#saveBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.region.cells.find(r=>r[0]===4)?.[1]),'power');
 await page.locator('#designSelect').selectOption('tourism');await page.locator('#loadDesign').click();await page.locator('#testEmergency').click();await page.locator('[data-speed="4"]').click();await page.waitForTimeout(3500);await page.locator('#pauseBtn').click();
 await page.locator('#saveBtn').click();const v7City=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city);assert(v7City.v7.visitors>=100);assert(v7City.v7.incidents.length+v7City.v7.resolved>0);
 const activeFrames=await page.evaluate(async()=>{document.querySelector('[data-speed="1"]').click();const stamps=[];await new Promise(resolve=>{function step(t){stamps.push(t);if(stamps.length===121)resolve();else requestAnimationFrame(step);}requestAnimationFrame(step);});document.querySelector('#pauseBtn').click();return stamps.slice(1).map((t,i)=>t-stamps[i]).sort((a,b)=>a-b);});
 console.log('Active full city frame median ms:',activeFrames[60]);await page.evaluate(()=>{document.querySelector('.left').scrollTop=0;document.querySelector('.right').scrollTop=0;});await page.screenshot({path:'qa-artifacts/playground-v7.png'});
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));mobile.on('dialog',d=>d.accept());
 await mobile.goto('http://127.0.0.1:8000');await mobile.locator('[data-tool="garbage"]').waitFor({state:'attached'});
 await mobile.locator('#buildTab').click();await mobile.locator('#expandCity').click();await mobile.locator('[data-plot="4"]').click();await mobile.locator('#buyPlot').click();await mobile.locator('#saveBtn').click();assert.deepEqual(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.land.owned),[0,4]);await mobile.locator('#mapTab').click();await mobile.waitForTimeout(200);await mobile.screenshot({path:'qa-artifacts/land-expansion-mobile.png'});await mobile.locator('#buildTab').click();assert(await mobile.locator('#districtPolicy').isVisible());await mobile.locator('#demoBtn').click();await mobile.locator('[data-tool="residential"]').click();await mobile.locator('#mapTab').click();
 const r=await mobile.locator('#gameCanvas').boundingBox();await mobile.touchscreen.tap(r.x+r.width*2.5/64,r.y+r.height*26.5/40);
 await mobile.locator('#buildTab').click();await mobile.locator('#saveBtn').click();assert.equal(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.region.cells.find(r=>r[0]===26*256+2)?.[1]||'empty'),'residential');await mobile.locator('#mapTab').click();
 await mobile.locator('#zoomIn').click();await mobile.locator('#resetView').click();await mobile.screenshot({path:'qa-artifacts/mobile-map-v7.png'});
 await mobile.locator('#buildTab').click();await mobile.locator('#designSelect').selectOption('river');await mobile.locator('#loadDesign').click();await mobile.locator('#freeBuild').check();await mobile.locator('#saveBtn').click();assert(await mobile.locator('#freeBuild').isChecked());await mobile.locator('#mapTab').click();await mobile.screenshot({path:'qa-artifacts/mobile-playground-v7.png'});
 await mobile.locator('#buildTab').click();await mobile.locator('#moveBuildings').click();const moveRect=await mobile.locator('#gameCanvas').boundingBox();const tapTile=async(x,y)=>mobile.touchscreen.tap(moveRect.x+moveRect.width*(x+.5)/64,moveRect.y+moveRect.height*(y+.5)/40);await tapTile(8,3);await tapTile(4,0);await mobile.locator('#buildTab').click();await mobile.locator('#saveBtn').click();assert.equal(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v7-save')).city.region.cells.find(r=>r[0]===4)?.[1]),'wind');await mobile.locator('#mapTab').click();await mobile.waitForTimeout(200);await mobile.screenshot({path:'qa-artifacts/move-mobile.png'});
 await mobile.locator('#cityTab').click();assert(await mobile.locator('#budgetTotal').isVisible());await mobile.screenshot({path:'qa-artifacts/mobile-report-v7.png'});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);await fs.writeFile('qa-artifacts/results.json',JSON.stringify({passed:true,errors,desktopFrameMedianMs:frames[Math.floor(frames.length/2)],activeFullCityFrameMedianMs:activeFrames[60],checks:['boot','showcase','route planning','building upgrade','signals','save/load','camera','simulation','mobile navigation','touch','budget','horizontal overflow','15 designs','free build','map editor apply/cancel','V7 save migration','tourism','emergency dispatch','active full-city performance','land purchase','unowned construction blocked','free land claim','land persistence','mobile plot grid','64x40 per plot','256x160 region','sparse saves','desktop building drag','invalid drop','cancel move','phone tap-to-move']},null,2));
 console.log('Browser checks passed. Screenshots saved in qa-artifacts.');
}finally{await browser.close();server.kill();}
