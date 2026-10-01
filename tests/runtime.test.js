import {test} from 'node:test';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as systems from '../src/systems.js';
import * as v7 from '../src/v7.js';
import * as designs from '../src/designs.js';
import * as v6 from '../src/v6.js';
test('game runtime keeps utilities, demolition and saves consistent',()=>{
const html=fs.readFileSync('index.html','utf8'),elements=new Map(),queue=[];
const context=new Proxy({},{get:(_,k)=>k==='measureText'?()=>({width:10}):()=>{},set:()=>true});
class Element{
 constructor(id){this.id=id;this.style={};this.dataset={};this.children=[];this.classList={add(){},remove(){},toggle(){}};this.options=[{},{},{},{}];this.clientWidth=1000;this.clientHeight=750;this.width=1200;this.height=750;this.handlers={};this.textContent='';}
 getContext(){return context;}addEventListener(k,fn){this.handlers[k]=fn;}appendChild(el){this.children.push(el);}replaceChildren(...els){this.children=els;}
 getBoundingClientRect(){return {left:0,top:0,width:1200,height:750};}setPointerCapture(){}click(){this.onclick?.();}
}
for(const match of html.matchAll(/id="([^"]+)"/g))elements.set(match[1],new Element(match[1]));
elements.get('gameCanvas').parentElement=new Element('shell');
const speeds=[1,2,4].map(n=>{const e=new Element('');e.dataset.speed=''+n;return e;});
const overlays=['none','land','traffic','pollution','services'].map(n=>{const e=new Element('');e.dataset.overlay=n;return e;});
const document={getElementById:id=>elements.get(id),querySelector:s=>elements.get(s.slice(1)),createElement:tag=>new Element(tag),querySelectorAll:s=>s==='.tool'?elements.get('toolGrid').children:s==='.speed'?speeds:s==='.overlay'?overlays:[],addEventListener(){},body:{dataset:{}}};
const storage=new Map();const sandbox={...systems,...v6,...v7,...designs,document,console,performance,structuredClone,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>queue.push(f),ResizeObserver:class{observe(){}},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},window:{addEventListener(){}},URL,Blob,confirm:()=>true};
vm.createContext(sandbox);let source=fs.readFileSync('src/game.js','utf8').replace(/^import.*\n/gm,'');
source+='\nglobalThis.qa={getCity:()=>city,getCars:()=>cars,build,simulationStep,loadRaw,tileBase,economyDay,gameLoop,reset:()=>{city=freshCity();invalidate()},loadDesign,saveSnapshot,getExpansion:()=>expansion,force:()=>lastPaint=""};';
vm.runInContext(source,sandbox);const q=sandbox.qa;
assert.equal(elements.get('toolGrid').children.length,30);
q.reset();q.force();q.build(1,36,'residential');q.simulationStep(false);assert.equal(q.getCity().grid[36][1].connected,true);
for(let i=0;i<30;i++)q.simulationStep();assert.equal(q.getCity().population,0,'no growth without utilities');
q.force();q.build(2,36,'wind');q.force();q.build(3,36,'waterTower');q.simulationStep(false);
assert.equal(q.getCity().power.cap,200);assert.equal(q.getCity().water.cap,750);
const river=q.getCity().grid.flatMap((row,y)=>row.map((c,x)=>({c,x,y}))).find(({c})=>c.type==='water');
q.force();q.build(river.x,river.y,'bridge');assert.equal(q.getCity().grid[river.y][river.x].type,'bridge');q.force();q.build(river.x,river.y,'bulldoze');assert.equal(q.getCity().grid[river.y][river.x].type,'water');
elements.get('demoBtn').onclick();assert(q.getCity().population>0);assert(q.getCity().paused);const pop=q.getCity().population;
elements.get('saveBtn').onclick();elements.get('loadBtn').onclick();assert.equal(q.getCity().population,pop,'load preserves building levels');
assert.equal(q.getCity().grid.length,40);assert.equal(q.getCity().grid[0].length,64);
q.economyDay();assert(Number.isFinite(q.getCity().v6.budget.net));assert(q.getCity().v6.householdCount>0);
assert(q.getCity().v6.workers<q.getCity().population,'children are not workers');
q.getCity().v6.vehicles=[{id:1,kind:'car',path:[[5,15],[6,15]],index:0,t:.4,speed:2,age:0,wait:0,payload:0,color:'#ffd35e'}];q.getCity().cashflow=-123;
elements.get('saveBtn').onclick();elements.get('loadBtn').onclick();assert.equal(q.getCars().length,1,'paused vehicles render after loading');assert.equal(q.getCity().cashflow,-123);assert.equal(q.getCity().lastPopulation,q.getCity().population);
const before=q.getCity();assert.throws(()=>q.loadRaw('{'));assert.equal(q.getCity(),before);
for(let day=0;day<40;day++){q.simulationStep(false);q.economyDay();assert(Number.isFinite(q.getCity().funds));assert(Number.isFinite(q.getCity().v6.budget.net));}
q.loadDesign('garden');assert(q.getCity().population>500);assert(q.getCity().v7.trains.length>=2);assert(q.getCity().v7.visitors>0);
const target=q.getCity().grid.flatMap((row,y)=>row.map((c,x)=>({c,x,y}))).find(({c})=>c.type==='residential'&&c.residents&&c.connected);assert(q.getExpansion().incident('fire',[target.x,target.y]));q.getExpansion().update(.1);const crew=q.getCity().v6.vehicles.find(v=>v.kind==='fireEngine');assert(crew,'a connected fire station dispatches a crew');const incident=crew.incidentId;q.loadRaw(JSON.stringify(q.saveSnapshot()));assert(q.getCity().v6.vehicles.some(v=>v.kind==='fireEngine'&&v.incidentId===incident),'saved crews retain their incident and road trip');
const train=q.getCity().v7.trains.find(t=>t.type==='cargoTerminal');train.path.reverse();train.reverse=true;const shop=q.getCity().grid.flatMap((row,y)=>row.map((c,x)=>({c,x,y}))).find(({c,x,y})=>c.type==='commercial'&&c.connected&&Math.abs(x-train.stops[0][0])+Math.abs(y-train.stops[0][1])<=7);assert(shop);shop.c.stock=0;q.getExpansion().update(.1);assert(train.payload,'freight design has goods and shops at its terminals');const factory=q.getCity().grid[train.payload.source[1]][train.payload.source[0]],goods= factory.goods,amount=train.payload.amount;const snapshot=q.saveSnapshot();assert.equal(factory.goods,goods,'saving does not mutate live inventory');assert.equal(snapshot.city.grid[train.payload.source[1]][train.payload.source[0]].goods,goods+amount,'save refunds reserved train cargo');q.loadRaw(JSON.stringify(snapshot));
const funds=q.getCity().funds;q.getCity().v7.freeBuild=true;q.force();q.build(0,0,'power');assert.equal(q.getCity().funds,funds);q.economyDay();assert.equal(q.getCity().funds,funds,'free mode freezes finances');
elements.get('saveBtn').onclick();elements.get('loadBtn').onclick();assert(q.getCity().v7.freeBuild);assert(q.getCity().grid[3][5].rail);
const type=q.getCity().grid[0][1].type;elements.get('editorStart').onclick();elements.get('editorBrush').value='water';q.force();q.build(1,0,'road');assert.equal(q.getCity().grid[0][1].type,'water');elements.get('editorCancel').onclick();assert.equal(q.getCity().grid[0][1].type,type);
elements.get('editorStart').onclick();elements.get('editorBrush').value='water';q.force();q.build(1,0,'road');elements.get('editorApply').onclick();assert.equal(q.getCity().grid[0][1].type,'water');
for(const d of designs.DESIGNS){q.loadDesign(d.id);assert(q.getCity().population>500,d.id);assert(q.getCity().power.cap>=q.getCity().power.use,d.id+' power');assert(q.getCity().water.cap>=q.getCity().water.use,d.id+' water');q.economyDay();assert(Number.isFinite(q.getCity().v6.budget.net));}
for(const b of overlays)b.onclick();for(let i=0;i<100;i++)q.gameLoop(performance.now()+i*17);
});
