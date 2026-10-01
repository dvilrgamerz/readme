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
 await page.locator('[data-tool="garbage"]').waitFor();assert.equal(await page.locator('.tool').count(),24);
 await page.locator('#demoBtn').click();await page.locator('#population').filter({hasNotText:/^0$/}).waitFor();
 await page.locator('#newRoute').click();
 const tile=async(x,y)=>{const r=await page.locator('#gameCanvas').boundingBox();await page.mouse.click(r.x+r.width*(x+.5)/64,r.y+r.height*(y+.5)/40);};
 await tile(6,22);await tile(13,22);await page.locator('#routeName').fill('Browser Test Loop');await page.locator('#saveRoute').click();
 await page.locator('#routeList').getByText(/Browser Test Loop/).waitFor();assert.equal(await page.locator('#routeList .route-item').count(),2);
 await page.locator('[data-tool="inspect"]').click();await tile(6,10);await page.locator('#upgradeBuilding').click();
 await page.locator('#zoomIn').click();assert.equal(await page.locator('#zoomLabel').textContent(),'120%');await page.locator('#resetView').click();
 await page.locator('[data-tool="signal"]').click();await tile(12,15);await page.locator('#saveBtn').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v6-save')));
 assert.equal(saved.version,6);assert.equal(saved.city.grid.length,40);assert.equal(saved.city.v6.routes.length,2);assert.equal(saved.city.v6.signals[15*64+12],false);
 await page.locator('[data-speed="4"]').click();await page.waitForTimeout(2500);await page.locator('#pauseBtn').click();
 await page.locator('#saveBtn').click();const inFlight=await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v6-save')).city.v6.vehicles.length);await page.locator('#loadBtn').click();await page.locator('#saveBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v6-save')).city.v6.vehicles.length),inFlight);
 await page.locator('[data-tool="inspect"]').click();await page.screenshot({path:'qa-artifacts/desktop-v6.png'});
 const frames=await page.evaluate(async()=>{
   const stamps=[];await new Promise(resolve=>{function step(t){stamps.push(t);if(stamps.length===61)resolve();else requestAnimationFrame(step);}requestAnimationFrame(step);});return stamps.slice(1).map((t,i)=>t-stamps[i]);
 });
 console.log('Paused desktop frame median ms:',frames.sort((a,b)=>a-b)[Math.floor(frames.length/2)]);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));mobile.on('dialog',d=>d.accept());
 await mobile.goto('http://127.0.0.1:8000');await mobile.locator('[data-tool="garbage"]').waitFor({state:'attached'});
 await mobile.locator('#buildTab').click();assert(await mobile.locator('#districtPolicy').isVisible());await mobile.locator('#demoBtn').click();await mobile.locator('[data-tool="residential"]').click();await mobile.locator('#mapTab').click();
 const r=await mobile.locator('#gameCanvas').boundingBox();await mobile.touchscreen.tap(r.x+r.width*2.5/64,r.y+r.height*26.5/40);
 await mobile.locator('#buildTab').click();await mobile.locator('#saveBtn').click();assert.equal(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('metroforge-v6-save')).city.grid[26][2].type),'residential');await mobile.locator('#mapTab').click();
 await mobile.locator('#zoomIn').click();await mobile.locator('#resetView').click();await mobile.screenshot({path:'qa-artifacts/mobile-map-v6.png'});
 await mobile.locator('#cityTab').click();assert(await mobile.locator('#budgetTotal').isVisible());await mobile.screenshot({path:'qa-artifacts/mobile-report-v6.png'});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);await fs.writeFile('qa-artifacts/results.json',JSON.stringify({passed:true,errors,desktopFrameMedianMs:frames[Math.floor(frames.length/2)],checks:['boot','showcase','route planning','building upgrade','signals','save/load','camera','simulation','mobile navigation','touch','budget','horizontal overflow']},null,2));
 console.log('Browser checks passed. Screenshots saved in qa-artifacts.');
}finally{await browser.close();server.kill();}
