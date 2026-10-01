import {isRoad} from './systems.js';
import {plotAt,neighboringPlots,purchasePlot} from './land.js';
export const sameTile=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y;
export function moveOffer(city,from,to){
 if(!city.v7.freeBuild)return {ok:false,reason:'Turn on Free build to move buildings'};
 const source=city.grid[from?.y]?.[from?.x],target=city.grid[to?.y]?.[to?.x];
 if(!source||['empty','water','rail','district'].includes(source.type)||isRoad(source.type))return {ok:false,reason:'Choose a building or park to move'};
 if(!target)return {ok:false,reason:'Drop inside the map'};
 if(sameTile(from,to))return {ok:false,reason:'Drag or tap an empty destination'};
 if(target.type!=='empty'||target.terrain==='water')return {ok:false,reason:'Choose empty land; buildings cannot overlap or sit in water'};
 return {ok:true,reason:'Release to move · Free'};
}
export function moveBuilding(city,from,to){
 const offer=moveOffer(city,from,to);if(!offer.ok)return offer;
 const targetPlot=plotAt(to.x,to.y,city.grid[0].length,city.grid.length);
 if(!city.land.owned.includes(targetPlot)){
  const queue=[...city.land.owned],prev=new Map(queue.map(id=>[id,null]));for(let n=0;n<queue.length&&!prev.has(targetPlot);n++)for(const id of neighboringPlots(queue[n]))if(!prev.has(id)){prev.set(id,queue[n]);queue.push(id);}
  const path=[];for(let at=targetPlot;prev.get(at)!==null;at=prev.get(at))path.push(at);for(const id of path.reverse())purchasePlot(city,id);
 }
 const source=city.grid[from.y][from.x],target=city.grid[to.y][to.x];
 city.grid[to.y][to.x]={...source,terrain:target.terrain,district:target.district,rail:target.rail||['station','cargoTerminal'].includes(source.type),connected:false};
 city.grid[from.y][from.x]={...source,type:source.terrain==='water'?'water':'empty',level:0,density:0,residents:0,jobs:0,staffed:0,age:0,distress:0,trash:0,stock:0,goods:0,powered:false,watered:false,connected:false};
 const match=p=>p&&p[0]===from.x&&p[1]===from.y;
 for(const route of city.v6.routes)route.stops=route.stops.map(p=>match(p)?[to.x,to.y]:p);
 for(const incident of city.v7.incidents)if(match(incident.target))incident.target=[to.x,to.y];
 return {ok:true,reason:'Building moved'};
}
