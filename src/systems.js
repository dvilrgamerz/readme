export const isRoad = type => ['road', 'avenue', 'bridge'].includes(type);
export const isZone = type => ['residential', 'commercial', 'industrial'].includes(type);
export function adjacent(x, y, w, h) {
  return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b]) => a>=0 && b>=0 && a<w && b<h);
}
export function roadNetwork(grid) {
  const h=grid.length, w=grid[0].length, roads=[], seen=new Set(), queue=[];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    grid[y][x].connected=false;
    if(isRoad(grid[y][x].type) && (x===0||x===w-1||y===0||y===h-1)) {
      seen.add(y*w+x); queue.push([x,y]);
    }
  }
  for(let head=0;head<queue.length;head++) {
    const [x,y]=queue[head];
    for(const [nx,ny] of adjacent(x,y,w,h)) {
      const id=ny*w+nx;
      if(isRoad(grid[ny][nx].type)&&!seen.has(id)) { seen.add(id);queue.push([nx,ny]); }
    }
  }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const c=grid[y][x];
    c.connected=isRoad(c.type)?seen.has(y*w+x):adjacent(x,y,w,h).some(([a,b])=>seen.has(b*w+a));
    if(isRoad(c.type)&&c.connected) roads.push([x,y]);
  }
  return roads;
}
export function shortestRoadPath(grid, start, end) {
  const h=grid.length,w=grid[0].length;
  if(!start||!end||!isRoad(grid[start[1]]?.[start[0]]?.type)||!isRoad(grid[end[1]]?.[end[0]]?.type)) return [];
  const key=([x,y])=>y*w+x, target=key(end), prev=new Map([[key(start),null]]), q=[start];
  for(let head=0;head<q.length;head++) {
    const p=q[head];
    if(key(p)===target) {
      const route=[]; let id=target;
      while(id!==null) { route.push([id%w,Math.floor(id/w)]);id=prev.get(id); }
      return route.reverse();
    }
    for(const n of adjacent(...p,w,h)) if(isRoad(grid[n[1]][n[0]].type)&&!prev.has(key(n))) {
      prev.set(key(n),key(p));q.push(n);
    }
  }
  return [];
}
export function coverageFields(grid, specs) {
  const h=grid.length,w=grid[0].length;
  const fields=Object.fromEntries(Object.keys(specs).map(k=>[k,new Float32Array(w*h)]));
  // Scatter each source once instead of searching for services at every map tile.
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const c=grid[y][x], spec=specs[c.type];
    if(!spec || (spec.connected && !c.connected)) continue;
    const field=fields[c.type], r=spec.radius;
    for(let yy=Math.max(0,y-r);yy<=Math.min(h-1,y+r);yy++) for(let xx=Math.max(0,x-r);xx<=Math.min(w-1,x+r);xx++) {
      const d=Math.abs(xx-x)+Math.abs(yy-y);
      if(d<=r) field[yy*w+xx]+=spec.falloff ? Math.max(0,spec.strength-d*spec.falloff) : spec.strength;
    }
  }
  return fields;
}
export function parseSave(raw, defaults, allowedTypes, w, h) {
  const input=JSON.parse(raw), data=input?.city||input;
  if(!data||!Array.isArray(data.grid))throw Error('Wrong map dimensions');
  const legacy=w===64&&h===40&&data.grid.length===30&&data.grid.every(row=>Array.isArray(row)&&row.length===48);
  if(!legacy&&(data.grid.length!==h||data.grid.some(row=>!Array.isArray(row)||row.length!==w)))throw Error('Wrong map dimensions');
  const finite=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  const out=structuredClone(defaults);
  const migrated=legacy?Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>data.grid[y]?.[x]||{...defaults.grid[y][x],type:defaults.grid[y][x].type==='road'?'empty':defaults.grid[y][x].type})):data.grid;
  out.grid=migrated.map(row=>row.map(c=>{
    if(!c||!allowedTypes.includes(c.type)) throw Error('Unknown tile');
    const t={...defaults.grid[0][0],type:c.type};
    for(const k of ['level','district','density','age','distress']) t[k]=Math.floor(finite(c[k],0,k==='age'?1e7:k==='distress'?100:k==='district'?3:k==='level'?4:1,0));
    for(const k of ['trash','stock','goods'])t[k]=finite(c[k],0,k==='goods'?1000:k==='stock'?120:100,k==='stock'&&c.type==='commercial'?25:0);
    t.terrain=c.type==='water'||c.type==='bridge'||c.terrain==='water'?'water':'empty';
    return t;
  }));
  for(const k of ['funds','debt','day','year','hour','speed','serviceBudget']) out[k]=finite(data[k],k==='funds'?-10000:0,k==='funds'?1e12:k==='debt'?1e9:k==='day'?360:k==='hour'?23.99:k==='speed'?4:k==='serviceBudget'?150:1e6,out[k]);
  out.day=Math.max(1,Math.floor(out.day));out.year=Math.max(1,Math.floor(out.year));out.speed=[1,2,4].includes(out.speed)?out.speed:1;
  out.serviceBudget=Math.max(50,out.serviceBudget);out.cashflow=finite(data.cashflow,-1e12,1e12,0);out.paused=!!data.paused;
  for(const k of ['res','com','ind']) out.taxes[k]=finite(data.taxes?.[k],1,20,9);
  for(const k of ['green','education','freeTransit']) out.policies[k]=!!data.policies?.[k];
  out.milestones=Array.isArray(data.milestones)?[...new Set(data.milestones.filter(i=>Number.isInteger(i)&&i>=0&&i<5))]:[];
  out.districtNames=Array.from({length:3},(_,i)=>String(data.districtNames?.[i]||out.districtNames[i]).slice(0,24));
  out.districtPolicies=Array.from({length:3},(_,i)=>['balanced','green','business'].includes(data.districtPolicies?.[i])?data.districtPolicies[i]:'balanced');
  if(['Clear','Cloudy','Rain','Storm','Heatwave'].includes(data.weather)) out.weather=data.weather;
  out.temperature=finite(data.temperature,0,120,72);
  out.history=Array.isArray(data.history)?data.history.slice(-40).map(h=>({population:finite(h?.population,0,1e9,0),cashflow:finite(h?.cashflow,-1e12,1e12,0)})):[];
  if(data.mission && ['pop','happy','jobs','transit','green'].includes(data.mission.id)) out.mission={id:data.mission.id,target:finite(data.mission.target,0,1e7,250),complete:!!data.mission.complete};
  return out;
}
