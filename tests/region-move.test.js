import {test} from 'node:test';import assert from 'node:assert/strict';
import {packRegion,unpackRegion,REGION_WIDTH,REGION_HEIGHT} from '../src/region.js';
import {newLand,ownsTile,sanitiseLand} from '../src/land.js';import {moveOffer,moveBuilding} from '../src/move.js';
const tile=(type='empty')=>({type,terrain:type==='water'?'water':'empty',level:0,density:0,district:0,age:0,distress:0,trash:0,stock:0,goods:0,rail:false});
const makeCity=()=>({grid:Array.from({length:REGION_HEIGHT},()=>Array.from({length:REGION_WIDTH},()=>tile())),land:newLand(),funds:1234,v7:{freeBuild:true,incidents:[]},v6:{routes:[],vehicles:[]}});
test('regional saves preserve terrain, rail and inventory in a compact round trip',()=>{
 const c=makeCity();c.grid[100][200]=tile('water');c.grid[10][90]={...tile('industrial'),level:4,goods:170,district:2,rail:true};c.grid[100][201]={...tile('bridge'),terrain:'water'};
 const packed=packRegion(c.grid);assert.equal(packed.width,256);assert.equal(packed.height,160);assert.equal(packed.cells.length,2);assert(JSON.stringify(packed).length<1000);
 const grid=unpackRegion(JSON.parse(JSON.stringify(packed)),tile,['empty','water','industrial','bridge']);assert.equal(grid[100][200].type,'water');assert.equal(grid[100][201].terrain,'water');assert.deepEqual(grid[10][90],c.grid[10][90]);
});
test('regional imports reject duplicate, invalid and non-finite property records',()=>{
 const c=makeCity();c.grid[1][1]=tile('industrial');const p=packRegion(c.grid);assert.throws(()=>unpackRegion({...p,width:64},tile,['industrial']));assert.throws(()=>unpackRegion({...p,cells:[p.cells[0],p.cells[0]]},tile,['industrial']));assert.throws(()=>unpackRegion({...p,water:[-1]},tile,['industrial']));p.cells[0][9]=Infinity;assert.throws(()=>unpackRegion(p,tile,['industrial']));
});
test('moving preserves development and inventory, restores the source and claims distant land free',()=>{
 const c=makeCity();c.grid[5][6]={...tile('industrial'),level:3,density:1,goods:80,trash:12,age:44,rail:true,district:1};c.grid[90][200].district=3;
 const result=moveBuilding(c,{x:6,y:5},{x:200,y:90});assert(result.ok);assert.equal(c.funds,1234);assert(ownsTile(c,200,90));assert.deepEqual(sanitiseLand(c.land),c.land);
 const moved=c.grid[90][200];assert.equal(moved.level,3);assert.equal(moved.goods,80);assert.equal(moved.density,1);assert.equal(moved.district,3);assert.equal(moved.rail,false);assert.equal(c.grid[5][6].type,'empty');assert(c.grid[5][6].rail,'track stays in place');assert.equal(c.grid[5][6].goods,0);
});
test('invalid drops and normal mode leave buildings, funds and land unchanged',()=>{
 const c=makeCity();c.grid[1][1]=tile('school');c.grid[1][2]=tile('park');c.grid[1][3]=tile('water');const before=JSON.stringify(c);for(const to of [{x:2,y:1},{x:3,y:1},{x:-1,y:1},{x:1,y:1}])assert(!moveBuilding(c,{x:1,y:1},to).ok);assert.equal(JSON.stringify(c),before);
 c.v7.freeBuild=false;assert(!moveOffer(c,{x:1,y:1},{x:4,y:1}).ok);c.v7.freeBuild=true;c.grid[1][1]=tile('road');assert(!moveOffer(c,{x:1,y:1},{x:4,y:1}).ok);
});
test('moving a stop or incident property updates persistent route and incident references',()=>{
 const c=makeCity();c.grid[1][1]=tile('bus');c.v6.routes=[{id:1,stops:[[1,1],[8,1]],buses:1}];moveBuilding(c,{x:1,y:1},{x:10,y:1});assert.deepEqual(c.v6.routes[0].stops,[[10,1],[8,1]]);
 c.grid[2][2]=tile('residential');c.v7.incidents=[{id:1,kind:'fire',target:[2,2],remaining:50}];moveBuilding(c,{x:2,y:2},{x:7,y:7});assert.deepEqual(c.v7.incidents[0].target,[7,7]);assert.equal(c.v7.incidents[0].remaining,50);
});
