import {test} from 'node:test';import assert from 'node:assert/strict';
import {roadNetwork,parseSave} from '../src/systems.js';
import {newV6,TrafficEngine,sanitiseV6,budgetBreakdown,developmentBlockers} from '../src/v6.js';
function cell(type='empty'){return {type,level:1,connected:false,residents:0,jobs:0,education:55,powered:true,watered:true,trash:0,stock:25,goods:0};}
function fixture(){
 const grid=Array.from({length:6},()=>Array.from({length:10},()=>cell()));for(let x=0;x<10;x++)grid[3][x]=cell('road');roadNetwork(grid);
 return {grid,v6:newV6(),policies:{freeTransit:false},serviceBudget:100,taxes:{res:9,com:9,ind:9},population:40,debt:120,traffic:100};
}
function refresh(c){roadNetwork(c.grid);return new TrafficEngine(c);}
test('cars stop for red lights, keep a following gap and resume on green',()=>{
 const c=fixture();c.grid[2][4]=cell('road');c.grid[1][4]=cell('road');const t=refresh(c);c.v6.clock=5;
 assert(t.spawn('car',[[3,3],[4,3],[5,3]]));const lead=c.v6.vehicles[0];lead.t=.8;
 t.step(.03);assert.equal(lead.t,.8);assert(lead.wait>0);c.v6.clock=0;t.step(.03);assert(lead.t>.8);
 c.v6.vehicles=[];t.spawn('car',[[1,3],[2,3],[3,3]]);const a=c.v6.vehicles[0];a.t=.6;
 t.spawn('car',[[1,3],[2,3],[3,3]]);const b=c.v6.vehicles[1];b.t=.4;a.speed=.5;b.speed=4;
 for(let i=0;i<3;i++)t.step(1/30);assert(a.t-b.t>=.2);assert(b.wait>0);
});
test('truck delivery conserves factory goods and shops receive them only on arrival',()=>{
 const c=fixture();c.grid[2][1]=Object.assign(cell('industrial'),{jobs:20,goods:25});c.grid[2][8]=Object.assign(cell('commercial'),{stock:0,jobs:10});const t=refresh(c);
 t.dispatch();assert.equal(c.grid[2][1].goods,0);assert.equal(c.grid[2][8].stock,0);assert.equal(c.v6.vehicles[0].payload,25);
 t.spawnTime=-999;for(let i=0;i<250;i++)t.step(1/30);assert.equal(c.grid[2][8].stock,25);assert.equal(c.v6.delivered,25);assert.equal(c.grid[2][1].goods+c.grid[2][8].stock,25);
});
test('demolishing a truck route refunds reserved factory inventory',()=>{
 const c=fixture();c.grid[2][1]=Object.assign(cell('industrial'),{goods:25});c.grid[2][8]=Object.assign(cell('commercial'),{stock:0});const t=refresh(c);t.dispatch();c.grid[3][5]=cell('empty');roadNetwork(c.grid);t.rebuild();
 assert.equal(c.grid[2][1].goods,25);assert.equal(c.v6.vehicles.length,0);assert.equal(c.grid[2][8].stock,0);
});
test('garbage collection requires a reachable depot and actual truck arrival',()=>{
 const c=fixture();c.grid[2][8]=Object.assign(cell('residential'),{trash:60});let t=refresh(c);t.dispatch();assert.equal(c.v6.vehicles.length,0);
 c.grid[2][1]=cell('garbage');t=refresh(c);t.dispatch();assert.equal(c.grid[2][8].trash,60);assert.equal(c.v6.vehicles[0].kind,'garbage');
 t.spawnTime=-999;for(let i=0;i<250;i++)t.step(1/30);assert.equal(c.grid[2][8].trash,25);assert.equal(c.v6.collected,35);
});
test('bus routes serve home-to-work trips and become inactive when stops lose road routes',()=>{
 const c=fixture();c.grid[2][1]=Object.assign(cell('residential'),{residents:40});c.grid[2][8]=Object.assign(cell('industrial'),{jobs:24});c.grid[4][1]=cell('bus');c.grid[4][8]=cell('bus');
 c.v6.routes=[{id:1,name:'Loop',stops:[[1,4],[8,4]],buses:2}];const t=refresh(c);t.householdPass();assert.equal(c.v6.workers,24);assert.equal(c.v6.students,8);assert.equal(c.v6.householdCount,10);assert.equal(c.v6.employed,24);assert.equal(c.v6.riders,24);
 t.dispatch();assert.equal(c.v6.vehicles[0].kind,'bus');c.grid[3][5]=cell('empty');roadNetwork(c.grid);t.rebuild();t.householdPass();assert.equal(t.routes[0].active,false);assert.equal(c.v6.riders,0);assert.equal(c.v6.employed,0);
});
test('budget explains its exact net and shortages lower commercial revenue',()=>{
 const c=fixture();c.grid[2][1]=Object.assign(cell('commercial'),{jobs:20,stock:0});const meta={road:{upkeep:1},commercial:{upkeep:2}};
 const b=budgetBreakdown(c,meta,2);assert.equal(b.net,b.income-b.expense);assert.equal(b.transit,36);assert.equal(b.debt,100);c.grid[2][1].stock=25;assert(budgetBreakdown(c,meta,2).commercial>b.commercial);
 assert(developmentBlockers({...c.grid[2][1],stock:0}).includes('Shops need factory deliveries'));
});
test('V6 save validation preserves legitimate trips but rejects malformed or overlong paths',()=>{
 const c=fixture();const t=refresh(c);t.spawn('cargo',[[1,3],[2,3]],{source:[1,2],target:[2,2],payload:12});const valid=sanitiseV6(c.v6,c.grid);assert.equal(valid.vehicles.length,1);assert.equal(valid.vehicles[0].payload,12);
 c.v6.vehicles.push({...c.v6.vehicles[0],id:2,path:[[1,3],[4,3]]});assert.equal(sanitiseV6(c.v6,c.grid).vehicles.length,1);
 c.v6.vehicles[0].payload=1e12;assert.equal(sanitiseV6(c.v6,c.grid).vehicles[0].payload,100);
});
test('V5 maps expand without losing original tiles, funds or building levels',()=>{
 const defaults={...fixture(),grid:Array.from({length:40},()=>Array.from({length:64},()=>cell())),funds:50000,day:1,year:1,hour:8,speed:1,districtNames:['A','B','C']};
 const old={...defaults,grid:Array.from({length:30},()=>Array.from({length:48},()=>cell())),funds:12345};old.grid[4][7]={...cell('residential'),level:3,density:1};
 const out=parseSave(JSON.stringify({version:5,city:old}),defaults,['empty','residential'],64,40);assert.equal(out.grid.length,40);assert.equal(out.grid[0].length,64);assert.equal(out.grid[4][7].level,3);assert.equal(out.funds,12345);
});
test('traffic displacement is independent of animation refresh rate',()=>{
 const a=fixture(),b=fixture(),ta=refresh(a),tb=refresh(b);ta.spawnTime=tb.spawnTime=-999;
 const route=Array.from({length:9},(_,x)=>[x,3]);ta.spawn('car',route);tb.spawn('car',route);
 for(let i=0;i<60;i++)ta.update(1/60);for(let i=0;i<30;i++)tb.update(1/30);
 assert.equal(a.v6.vehicles[0].index,b.v6.vehicles[0].index);assert(Math.abs(a.v6.vehicles[0].t-b.v6.vehicles[0].t)<1e-6);
});
