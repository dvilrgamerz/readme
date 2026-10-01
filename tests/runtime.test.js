import {test} from 'node:test';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as systems from '../src/systems.js';
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
const storage=new Map();const sandbox={...systems,...v6,document,console,performance,structuredClone,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>queue.push(f),ResizeObserver:class{observe(){}},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},window:{addEventListener(){}},URL,Blob,confirm:()=>true};
vm.createContext(sandbox);let source=fs.readFileSync('src/game.js','utf8').replace(/^import.*\n/gm,'');
source+='\nglobalThis.qa={getCity:()=>city,build,simulationStep,loadRaw,tileBase,economyDay,gameLoop,reset:()=>{city=freshCity();invalidate()},force:()=>lastPaint=""};';
vm.runInContext(source,sandbox);const q=sandbox.qa;
assert.equal(elements.get('toolGrid').children.length,24);
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
const before=q.getCity();assert.throws(()=>q.loadRaw('{'));assert.equal(q.getCity(),before);
for(const b of overlays)b.onclick();for(let i=0;i<100;i++)q.gameLoop(performance.now()+i*17);
});
