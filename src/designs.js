import {isRoad,isZone,adjacent} from './systems.js';
export const DESIGNS=[
 ['garden','Garden Grid','Leafy neighborhoods and clean office jobs'],
 ['river','River Crossing','Two shores linked by bridges and passenger rail'],
 ['coastal','Coastal Resort','Hotels and attractions along the waterfront'],
 ['industrial','Factory Belt','Separated industrial blocks with cargo rail'],
 ['downtown','Downtown Towers','Dense homes, offices and frequent bus service'],
 ['islands','Island Network','Bridge-connected island communities'],
 ['rail','Rail City','Passenger stations and freight corridors'],
 ['university','University Town','Schools support an educated office workforce'],
 ['eco','Eco Districts','Wind power, parks and green policies'],
 ['tourism','Tourism Capital','Visitors, hotels and landmark attractions'],
 ['suburbs','Quiet Suburbs','Low-density residential blocks'],
 ['harbor','Harbor Exchange','Waterfront factories and logistics terminals'],
 ['boulevard','Grand Boulevards','Wide avenues and spacious city blocks'],
 ['traffic','Traffic Lab','Busy narrow streets to test junctions and buses'],
 ['balanced','Balanced Metropolis','A mix of homes, services, industry and offices']
].map(([id,name,description],index)=>({id,name,description,index}));
// Deterministic layouts: every design can be reproduced without a saved asset.
export function cityDesign(id,tileBase,w=64,h=40){
 const design=DESIGNS.find(d=>d.id===id)||DESIGNS[0],n=design.index;
 const grid=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>{
  const river=['river','islands','harbor'].includes(id)&&Math.abs(x-(32+Math.round(Math.sin(y*.2)*3)))<=1;
  const coast=['coastal','tourism','harbor'].includes(id)&&y>h-8;
  const channel=id==='islands'&&Math.abs(y-20)<=1;
  return tileBase(river||coast||channel?'water':'empty');
 }));
 const put=(x,y,type,level=0)=>{const c=tileBase(type);c.terrain=grid[y][x].terrain;c.level=level;c.district=x<22?1:x<43?2:3;grid[y][x]=c;return c;};
 const road=(x,y,wide=false)=>put(x,y,grid[y][x].terrain==='water'?'bridge':wide?'avenue':'road');
 const sx=id==='boulevard'?9:id==='suburbs'?8:6+(n%3),sy=5+(n%3);
 const ys=[];for(let y=4;y<h-4;y+=sy)ys.push(y);ys.push(h-4);
 const xs=[];for(let x=2;x<w-2;x+=sx)xs.push(x);xs.push(w-3);
 for(const y of ys)for(let x=0;x<w;x++)road(x,y,id!=='traffic'&&(y===4||y===h-4||id==='boulevard'));
 for(const x of xs)for(let y=4;y<=h-4;y++)road(x,y,id!=='traffic'&&(x===2||x===w-3||id==='boulevard'));
 let zones=0;
 for(let y=5;y<h-5;y++)for(let x=3;x<w-3;x++){
  if(grid[y][x].type!=='empty'||!adjacent(x,y,w,h).some(([a,b])=>isRoad(grid[b][a].type)))continue;
  const hash=(x*17+y*11+n*13)%23;if(hash<2){put(x,y,'park');continue;}
  const industry=x>w*(id==='industrial'?.55:id==='suburbs'?.87:.72),commerce=(y+n)%4===0;
  const type=industry?'industrial':commerce?'commercial':(x+n)%7===0?'office':'residential';
  const c=put(x,y,type,id==='downtown'?3:id==='suburbs'?1:2);c.density=id==='downtown'&&type!=='industrial'?1:0;c.stock=type==='commercial'?80:0;c.goods=type==='industrial'?100:0;zones++;
 }
 // Service spines share each neighborhood's connected road, including island bridges.
 for(const y of ys.slice(0,-1)){
  for(const [x,t]of [[3,'power'],[10,'waterTower'],[17,'school'],[24,'hospital'],[38,'school'],[45,'fire'],[52,'garbage'],[58,'waterTower']]){
   if(!isRoad(grid[y+1][x].type)&&grid[y+1][x].terrain!=='water')put(x,y+1,t);
  }
 }
 for(let x=3;x<w-3;x++)grid[3][x].rail=true;
 for(const [x,t]of [[5,'station'],[21,'station'],[41,'cargoTerminal'],[56,'cargoTerminal']]){const c=put(x,3,t);c.rail=true;}
 for(const [x,t]of [[6,'bus'],[20,'bus'],[39,'bus'],[57,'bus'],[12,'hotel'],[26,'hotel'],[18,'attraction'],[35,'attraction'],[48,'recycle'],[8,'wind']]){
  if(grid[3][x].terrain!=='water'){const c=put(x,3,t);c.rail=true;}
 }
 if(['tourism','coastal'].includes(id))for(const [x,t]of [[9,'hotel'],[14,'hotel'],[24,'hotel'],[29,'hotel'],[34,'hotel'],[44,'hotel'],[49,'attraction'],[54,'attraction'],[59,'attraction']]){const c=put(x,3,t);c.rail=true;}
 if(id==='university')for(const y of ys.slice(0,-1))for(const x of [8,32,56])if(isZone(grid[y+1][x].type))put(x,y+1,'school');
 if(id==='rail'){const c=put(35,3,'station');c.rail=true;}
 // Reserve enough utility supply for the actual density of each design.
 const ensureSupply=(type,supply,perLevel)=>{
  const demand=grid.flat().filter(c=>isZone(c.type)).reduce((sum,c)=>sum+perLevel*Math.max(1,c.level)*(c.density?2.5:1),0);
  let cap=grid.flat().filter(c=>c.type===type).length*supply;
  for(let y=5;y<h-5&&cap<demand;y++)for(let x=3;x<w-3&&cap<demand;x++)if(isZone(grid[y][x].type)&&grid[y][x].terrain!=='water'&&adjacent(x,y,w,h).some(([a,b])=>isRoad(grid[b][a].type))){put(x,y,type);cap+=supply;}
 };
 ensureSupply('power',900,3.5);ensureSupply('waterTower',750,2.7);
 // Keep the original highway accessible and all starter blocks visibly occupied.
 return {grid,design,zones,route:{id:1,name:design.name+' Loop',stops:[[6,3],[20,3],[39,3],[57,3]],buses:3}};
}
