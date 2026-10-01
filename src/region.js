export const PLOT_WIDTH=64,PLOT_HEIGHT=40,REGION_WIDTH=256,REGION_HEIGHT=160;
// Sparse records keep the sixteen-map region small enough for browser saves.
const fields=['level','density','district','age','distress','trash','stock','goods'];
export function packRegion(grid){
 const width=grid[0].length,height=grid.length,water=[],cells=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const c=grid[y][x],id=y*width+x;if(c.terrain==='water'||c.type==='water')water.push(id);
  if(!['empty','water'].includes(c.type)||c.rail||c.district)cells.push([id,c.type,...fields.map(k=>c[k]||0),c.rail?1:0]);}
 return {width,height,water,cells};
}
export function unpackRegion(region,tileBase,allowedTypes){
 if(!region||region.width!==REGION_WIDTH||region.height!==REGION_HEIGHT||!Array.isArray(region.water)||!Array.isArray(region.cells)||region.water.length>REGION_WIDTH*REGION_HEIGHT||region.cells.length>REGION_WIDTH*REGION_HEIGHT)throw Error('Invalid regional map');
 const valid=id=>Number.isInteger(id)&&id>=0&&id<REGION_WIDTH*REGION_HEIGHT;
 if(region.water.some(id=>!valid(id)))throw Error('Invalid water tile');
 const grid=Array.from({length:REGION_HEIGHT},()=>Array.from({length:REGION_WIDTH},()=>tileBase()));
 for(const id of region.water)grid[Math.floor(id/REGION_WIDTH)][id%REGION_WIDTH]=tileBase('water');
 const seen=new Set();for(const record of region.cells){if(!Array.isArray(record)||record.length!==11||!valid(record[0])||seen.has(record[0])||!allowedTypes.includes(record[1])||record.slice(2,10).some(v=>!Number.isFinite(v))||![0,1].includes(record[10]))throw Error('Invalid regional property');
  const [id,type]=record;seen.add(id);const y=Math.floor(id/REGION_WIDTH),x=id%REGION_WIDTH,c=tileBase(type);c.terrain=grid[y][x].terrain;fields.forEach((k,i)=>c[k]=record[i+2]);c.rail=!!record[10];grid[y][x]=c;}
 return grid;
}
