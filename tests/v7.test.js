import {test} from 'node:test';import assert from 'node:assert/strict';
import {newV7,sanitiseV7,railPath,ExpansionEngine} from '../src/v7.js';
import {newV6,TrafficEngine,budgetBreakdown,developmentBlockers} from '../src/v6.js';
import {roadNetwork} from '../src/systems.js';import {DESIGNS,cityDesign} from '../src/designs.js';
const tile=(type='empty')=>({type,terrain:type==='water'?'water':'empty',rail:false,level:1,residents:0,jobs:0,stock:type==='commercial'?0:0,goods:0,trash:0,education:60,connected:false,powered:true,watered:true});
function fixture(){const grid=Array.from({length:8},()=>Array.from({length:20},()=>tile()));for(let x=0;x<20;x++)grid[4][x]=tile('road');
 const city={grid,v6:newV6(),v7:newV7(),policies:{},population:1000,happiness:100,pollutionAvg:0,taxes:{res:9,com:9,ind:9},serviceBudget:100,debt:0,funds:0,cashflow:100,traffic:90};
 const put=(x,y,type)=>grid[y][x]=tile(type);return {city,grid,put,start(){roadNetwork(grid);const traffic=new TrafficEngine(city),expansion=new ExpansionEngine(city,traffic);traffic.onEmergencyArrival=v=>expansion.arrived(v);return {traffic,expansion};}};}
test('rail follows only connected tracks and carries reserved goods to a reachable destination',()=>{
 const f=fixture();f.put(1,3,'cargoTerminal');f.put(15,3,'cargoTerminal');for(let x=1;x<=15;x++)f.grid[3][x].rail=true;
 f.put(2,5,'industrial').goods=100;f.put(16,5,'commercial');const {expansion}=f.start();assert.equal(railPath(f.grid,[1,3],[15,3]).length,15);
 expansion.update(.1);assert.equal(f.grid[5][2].goods,40);assert.equal(f.grid[5][16].stock,0,'inventory is reserved until arrival');
 for(let i=0;i<100;i++)expansion.update(.1);assert.equal(f.grid[5][16].stock,60);assert.equal(f.city.v7.railDelivered,60);assert.equal(f.grid[5][2].goods+f.grid[5][16].stock,100);
 f.grid[3][8].rail=false;assert.deepEqual(railPath(f.grid,[1,3],[15,3]),[]);
});
test('interrupted rail cargo is refunded, including removed destination properties',()=>{
 const f=fixture();f.put(1,3,'cargoTerminal');f.put(15,3,'cargoTerminal');for(let x=1;x<=15;x++)f.grid[3][x].rail=true;f.put(2,5,'industrial').goods=100;f.put(16,5,'commercial');const {expansion}=f.start();expansion.update(.1);for(const t of f.city.v7.trains)expansion.cancelFreight(t);assert.equal(f.grid[5][2].goods,100);
});
test('emergency response needs roads and actual vehicle arrival; timeouts damage properties',()=>{
 const f=fixture();f.put(1,3,'fire');f.put(15,3,'residential').residents=20;const {traffic,expansion}=f.start();assert(expansion.incident('fire',[15,3]));expansion.update(.1);assert.equal(f.city.v7.resolved,0);assert(f.city.v6.vehicles.some(v=>v.kind==='fireEngine'));
 for(let i=0;i<400&&f.city.v7.incidents.length;i++){traffic.update(.05);expansion.update(.05);}assert.equal(f.city.v7.resolved,1);assert.equal(f.grid[3][15].level,1);
 f.grid[4][10]=tile();roadNetwork(f.grid);traffic.rebuild();assert(expansion.incident('fire',[15,3]));for(let i=0;i<100;i++)expansion.update(1);assert.equal(f.city.v7.lost,1);assert.equal(f.grid[3][15].level,0);
});
test('tourism requires rooms, attractions and highway access; office jobs require educated workers',()=>{
 const f=fixture();f.put(1,3,'hotel');f.put(2,3,'attraction');f.put(3,5,'residential').residents=20;f.grid[5][3].education=20;f.put(12,3,'office').jobs=20;const {traffic,expansion}=f.start();traffic.householdPass();assert.equal(f.city.v6.employed,0);assert(developmentBlockers({...f.grid[3][12],education:20}).some(x=>x.includes('45%')));
 f.grid[5][3].education=60;traffic.householdPass();assert.equal(f.city.v6.employed,12);expansion.metrics();assert.equal(f.city.v7.visitors,65);const b=budgetBreakdown(f.city,{});assert.equal(b.tourism,130);assert(b.offices>0);assert.equal(b.net,b.income-b.expense);
 f.grid[4][1]=tile();f.grid[4][2]=tile();roadNetwork(f.grid);expansion.metrics();assert.equal(f.city.v7.visitors,0);
});
test('challenges need five consecutive qualifying days, reward once, and disallow free-build rewards',()=>{
 const f=fixture(),{expansion}=f.start();f.city.v7.challenge='profit';for(let i=0;i<4;i++)assert.equal(expansion.daily(),null);assert.equal(f.city.funds,0);f.city.cashflow=-1;expansion.daily();assert.equal(f.city.v7.streak,0);f.city.cashflow=100;for(let i=0;i<5;i++)expansion.daily();assert.equal(f.city.funds,5000);expansion.daily();assert.equal(f.city.funds,5000);f.city.v7.challenge='traffic';f.city.v7.freeBuild=true;for(let i=0;i<10;i++)expansion.daily();assert.equal(f.city.funds,5000);
});
test('V7 import rejects malformed incidents and unknown challenges, reconstructing derived trains',()=>{
 const f=fixture();f.put(1,3,'residential');const s=sanitiseV7({freeBuild:'true',challenge:'hack',incidents:[null,{kind:'fire',target:[1,3],remaining:-4},{kind:'fire',target:[1000,3]}],trains:[{payload:{amount:1e8}}],completed:['hack','profit']},f.grid);assert.equal(s.freeBuild,false);assert.equal(s.challenge,null);assert.equal(s.incidents.length,1);assert.equal(s.incidents[0].remaining,1);assert.deepEqual(s.trains,[]);assert.deepEqual(s.completed,['profit']);
});
test('all fifteen reproducible full-city designs have distinct layouts and connected services',()=>{
 assert.equal(DESIGNS.length,15);const signatures=new Set();for(const d of DESIGNS){const a=cityDesign(d.id,tile),b=cityDesign(d.id,tile);assert.deepEqual(a.grid,b.grid);roadNetwork(a.grid);assert(a.grid.flat().filter(c=>c.type==='residential'&&c.connected).length>100,d.id);assert(a.grid.flat().some(c=>c.type==='power'&&c.connected));assert(a.grid.flat().some(c=>c.type==='waterTower'&&c.connected));signatures.add(JSON.stringify(a.grid.map(r=>r.map(c=>[c.type,c.density,c.level]))));}assert.equal(signatures.size,15);
});
