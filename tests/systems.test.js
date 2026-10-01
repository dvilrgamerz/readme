import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roadNetwork,shortestRoadPath,coverageFields,parseSave} from '../src/systems.js';
const grid=(w=5,h=5)=>Array.from({length:h},()=>Array.from({length:w},()=>({type:'empty',connected:false,level:0})));
test('connections propagate to zones independent of scan order and include east border',()=>{
 const g=grid();g[2][4].type='road';g[2][3].type='avenue';g[2][2].type='bridge';g[1][2].type='residential';g[4][1].type='road';
 assert.equal(roadNetwork(g).length,4);assert.equal(g[1][2].connected,true);
 g[2][3].type='empty';roadNetwork(g);assert.equal(g[1][2].connected,false);
});
test('destination routes follow roads, cross bridges and refuse disconnected targets',()=>{
 const g=grid();for(let x=0;x<5;x++)g[2][x].type=x===2?'bridge':'road';
 assert.equal(shortestRoadPath(g,[0,2],[4,2]).length,5);g[2][2].type='water';assert.deepEqual(shortestRoadPath(g,[0,2],[4,2]),[]);
});
test('service fields respect distance, road access and overlapping pollution',()=>{
 const g=grid();g[2][2]={type:'school',connected:false};let f=coverageFields(g,{school:{radius:2,strength:1,connected:true}});assert.equal(f.school[12],0);
 g[2][2].connected=true;f=coverageFields(g,{school:{radius:2,strength:1,connected:true}});assert.equal(f.school[0],0);assert.equal(f.school[10],1);
});
const defaults=()=>({grid:grid(),funds:50000,debt:0,day:1,year:1,hour:8,speed:1,serviceBudget:100,taxes:{res:9,com:9,ind:9},policies:{},districtNames:['A','B','C'],milestones:[]});
test('legacy saves migrate; invalid maps and tile types are rejected atomically',()=>{
 const d=defaults();const old={...d,taxes:{res:99},grid:grid(),districtNames:['<b>name</b>']};
 const c=parseSave(JSON.stringify(old),d,['empty','road'],5,5);assert.equal(c.taxes.res,20);assert.equal(c.taxes.com,9);assert.equal(c.grid[0][0].density,0);
 assert.throws(()=>parseSave('{',d,['empty'],5,5));assert.throws(()=>parseSave(JSON.stringify({...old,grid:[]}),d,['empty'],5,5));
 old.grid[0][0].type='script';assert.throws(()=>parseSave(JSON.stringify(old),d,['empty'],5,5));assert.equal(d.funds,50000);
});
