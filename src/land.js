// The 64×40 region is divided into sixteen 16×10 expansion plots.
export const LAND_COLS=4,LAND_ROWS=4,START_PLOT=12;
export const ALL_PLOTS=Array.from({length:LAND_COLS*LAND_ROWS},(_,id)=>id);
export const newLand=(full=false)=>({owned:full?[...ALL_PLOTS]:[START_PLOT]});
export const plotName=id=>String.fromCharCode(65+id%LAND_COLS)+(Math.floor(id/LAND_COLS)+1);
export function plotBounds(id,w=64,h=40){const col=id%LAND_COLS,row=Math.floor(id/LAND_COLS);return {x:Math.floor(col*w/LAND_COLS),y:Math.floor(row*h/LAND_ROWS),width:Math.floor((col+1)*w/LAND_COLS)-Math.floor(col*w/LAND_COLS),height:Math.floor((row+1)*h/LAND_ROWS)-Math.floor(row*h/LAND_ROWS)};}
export function plotAt(x,y,w=64,h=40){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<w&&y<h?Math.floor(y*LAND_ROWS/h)*LAND_COLS+Math.floor(x*LAND_COLS/w):-1;}
export const ownsTile=(city,x,y)=>city.land.owned.includes(plotAt(x,y,city.grid[0].length,city.grid.length));
export function neighboringPlots(id){const col=id%LAND_COLS,row=Math.floor(id/LAND_COLS);return [[col-1,row],[col+1,row],[col,row-1],[col,row+1]].filter(([x,y])=>x>=0&&x<LAND_COLS&&y>=0&&y<LAND_ROWS).map(([x,y])=>y*LAND_COLS+x);}
export function sanitiseLand(input){
 // Pre-expansion cities retain the entire region so their existing work stays usable.
 if(input===undefined||input===null)return newLand(true);
 if(!input||!Array.isArray(input.owned)||!input.owned.length||input.owned.length>ALL_PLOTS.length||input.owned.some(id=>!Number.isInteger(id)||!ALL_PLOTS.includes(id))||!input.owned.includes(START_PLOT))throw Error('Invalid land ownership');
 const owned=[...new Set(input.owned)],reached=new Set([START_PLOT]),queue=[START_PLOT];for(let n=0;n<queue.length;n++)for(const id of neighboringPlots(queue[n]))if(owned.includes(id)&&!reached.has(id)){reached.add(id);queue.push(id);}
 if(reached.size!==owned.length)throw Error('Land plots must be connected');return {owned:owned.sort((a,b)=>a-b)};
}
export function plotOffer(city,id){
 if(!ALL_PLOTS.includes(id))return {eligible:false,reason:'Choose a plot on the region map',price:0};
 if(city.land.owned.includes(id))return {eligible:false,reason:'Already owned',price:0};
 const bounds=plotBounds(id,city.grid[0].length,city.grid.length);let water=0;
 for(let y=bounds.y;y<bounds.y+bounds.height;y++)for(let x=bounds.x;x<bounds.x+bounds.width;x++)if(city.grid[y][x].terrain==='water')water++;
 const price=city.v7?.freeBuild?0:Math.round((5000+1500*(city.land.owned.length-1)+water/(bounds.width*bounds.height)*3000)/250)*250;
 if(!neighboringPlots(id).some(p=>city.land.owned.includes(p)))return {eligible:false,reason:'Buy a neighboring plot first',price};
 if(!Number.isFinite(city.funds)||(!city.v7?.freeBuild&&city.funds<price))return {eligible:false,reason:'Not enough funds',price};
 return {eligible:true,reason:price?'Ready to purchase':'Free to claim',price};
}
export function purchasePlot(city,id){
 const offer=plotOffer(city,id);if(!offer.eligible)return {success:false,...offer};city.funds-=offer.price;city.land.owned.push(id);city.land.owned.sort((a,b)=>a-b);return {success:true,...offer};
}
