import {test} from 'node:test';import assert from 'node:assert/strict';
import {newLand,plotAt,plotBounds,ownsTile,plotOffer,purchasePlot,sanitiseLand,neighboringPlots} from '../src/land.js';
const city=()=>({grid:Array.from({length:160},()=>Array.from({length:256},()=>({type:'empty',terrain:'empty'}))),land:newLand(),funds:50000,v7:{freeBuild:false}});
test('sixteen full-size plots cover the region and the starter highway is owned',()=>{
 const c=city();assert(ownsTile(c,0,37));assert(ownsTile(c,63,39));assert(!ownsTile(c,64,37));assert.equal(plotAt(256,39),-1);assert.equal(plotAt(-1,0),-1);assert.equal(plotAt(63,39),0);assert.equal(plotAt(64,40),5);
 const covered=new Set();for(let id=0;id<16;id++){const b=plotBounds(id);assert.equal(b.width*b.height,2560);for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++){assert.equal(plotAt(x,y),id);covered.add(y*256+x);}}assert.equal(covered.size,40960);
 assert.deepEqual(neighboringPlots(0),[1,4]);
});
test('only bordering plots can be bought, with increasing prices and exactly one charge',()=>{
 const c=city();assert.equal(plotOffer(c,1).price,5000);assert.equal(plotOffer(c,4).eligible,true);assert.equal(purchasePlot(c,15).success,false);assert.equal(c.funds,50000);
 assert(purchasePlot(c,1).success);assert.equal(c.funds,45000);assert(ownsTile(c,64,37));assert.equal(plotOffer(c,2).price,6500);assert(!purchasePlot(c,1).success);assert.equal(c.funds,45000);assert(purchasePlot(c,2).success);assert.equal(c.funds,38500);
});
test('insufficient funds and invalid plots never change ownership; free build allows claims with debt',()=>{
 const c=city();c.funds=100;assert(!purchasePlot(c,4).success);assert.deepEqual(c.land.owned,[0]);assert(!purchasePlot(c,99).success);assert(!purchasePlot(c,NaN).success);c.funds=-500;c.v7.freeBuild=true;assert.equal(plotOffer(c,4).price,0);assert(purchasePlot(c,4).success);assert.equal(c.funds,-500);
});
test('regional ownership persists while legacy cities become the first full map',()=>{
 assert.equal(sanitiseLand(undefined).owned.length,1);assert.deepEqual(sanitiseLand({owned:[12,13]}).owned,[0]);assert.deepEqual(sanitiseLand({version:2,owned:[1,0,1]}).owned,[0,1]);for(const input of [{version:2,owned:[]},{version:2,owned:[0,15]},{version:2,owned:[0,16]},{version:2,owned:[0,'1']},{version:2,owned:[0.5]},{version:9,owned:[0]}])assert.throws(()=>sanitiseLand(input));
 const c=city();purchasePlot(c,4);purchasePlot(c,8);c.land=sanitiseLand(JSON.parse(JSON.stringify(c.land)));assert(ownsTile(c,0,100));
});
