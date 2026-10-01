import {test} from 'node:test';import assert from 'node:assert/strict';
import {newLand,plotAt,plotBounds,ownsTile,plotOffer,purchasePlot,sanitiseLand,neighboringPlots} from '../src/land.js';
const city=()=>({grid:Array.from({length:40},()=>Array.from({length:64},()=>({type:'empty',terrain:'empty'}))),land:newLand(),funds:50000,v7:{freeBuild:false}});
test('sixteen equal plots cover the region and the starter highway is owned',()=>{
 const c=city();assert(ownsTile(c,0,37));assert(ownsTile(c,15,39));assert(!ownsTile(c,16,37));assert.equal(plotAt(64,39),-1);assert.equal(plotAt(-1,0),-1);assert.equal(plotAt(15,29),8);assert.equal(plotAt(16,30),13);
 const covered=new Set();for(let id=0;id<16;id++){const b=plotBounds(id);assert.equal(b.width*b.height,160);for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++){assert.equal(plotAt(x,y),id);covered.add(y*64+x);}}assert.equal(covered.size,2560);
 assert.deepEqual(neighboringPlots(12),[13,8]);
});
test('only bordering plots can be bought, with increasing prices and exactly one charge',()=>{
 const c=city();assert.equal(plotOffer(c,13).price,5000);assert.equal(plotOffer(c,8).eligible,true);assert.equal(purchasePlot(c,0).success,false);assert.equal(c.funds,50000);
 assert(purchasePlot(c,13).success);assert.equal(c.funds,45000);assert(ownsTile(c,16,37));assert.equal(plotOffer(c,14).price,6500);assert(!purchasePlot(c,13).success);assert.equal(c.funds,45000);assert(purchasePlot(c,14).success);assert.equal(c.funds,38500);
});
test('insufficient funds and invalid plots never change ownership; free build allows claims with debt',()=>{
 const c=city();c.funds=100;assert(!purchasePlot(c,8).success);assert.deepEqual(c.land.owned,[12]);assert(!purchasePlot(c,99).success);assert(!purchasePlot(c,NaN).success);c.funds=-500;c.v7.freeBuild=true;assert.equal(plotOffer(c,8).price,0);assert(purchasePlot(c,8).success);assert.equal(c.funds,-500);
});
test('saved ownership validates connected region plots and old saves retain full land',()=>{
 assert.equal(sanitiseLand(undefined).owned.length,16);assert.deepEqual(sanitiseLand({owned:[13,12,13]}).owned,[12,13]);for(const input of [{owned:[]},{owned:[0,12]},{owned:[12,16]},{owned:[12,'13']},{owned:[12.5]},{}])assert.throws(()=>sanitiseLand(input));
 const c=city();purchasePlot(c,8);purchasePlot(c,4);c.land=sanitiseLand(JSON.parse(JSON.stringify(c.land)));assert(ownsTile(c,0,10));
});
