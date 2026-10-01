import {isRoad,isZone,adjacent,shortestRoadPath} from './systems.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const tileId=(x,y,w)=>y*w+x;
export function newV6(){
  return {routes:[],nextRouteId:1,vehicles:[],signals:{},households:[],budget:null,
    clock:0,nextVehicleId:1,delivered:0,collected:0,sales:0,householdCount:0,
    workers:0,employed:0,students:0,unservedTrash:0,unstockedShops:0,traffic:100,queues:0,
    riders:0,lastServiceDay:-1};
}
export function sanitiseV6(input,grid){
  const out=newV6(),w=grid[0].length,h=grid.length;
  const number=(v,min,max,fallback=0)=>Number.isFinite(v)?clamp(v,min,max):fallback;
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&p[0]>=0&&p[0]<w&&p[1]>=0&&p[1]<h;
  if(!input||typeof input!=='object')return out;
  const ids=new Set();
  for(const r of Array.isArray(input.routes)?input.routes.slice(0,12):[]){
    if(!r||!Array.isArray(r.stops)||r.stops.length<2||r.stops.length>16||!r.stops.every(p=>point(p)&&grid[p[1]][p[0]].type==='bus'))continue;
    const id=Math.floor(number(r.id,1,1e6,1));if(ids.has(id))continue;ids.add(id);
    out.routes.push({id,name:String(r.name||'Bus line '+id).slice(0,32),stops:r.stops.map(p=>[...p]),buses:Math.floor(number(r.buses,1,4,1))});
  }
  out.nextRouteId=Math.max(1,...out.routes.map(r=>r.id+1));
  for(const [k,v]of Object.entries(input.signals||{}).slice(0,w*h)){
    const id=Number(k);if(Number.isInteger(id)&&id>=0&&id<w*h&&isRoad(grid[Math.floor(id/w)][id%w].type)&&typeof v==='boolean')out.signals[k]=v;
  }
  const vehicleIds=new Set();
  for(const v of Array.isArray(input.vehicles)?input.vehicles.slice(0,180):[]){
    if(!v||!['car','bus','cargo','garbage'].includes(v.kind)||!Array.isArray(v.path)||v.path.length<2||v.path.length>w*h||!v.path.every(p=>point(p)&&isRoad(grid[p[1]][p[0]].type)))continue;
    if(v.path.some((p,i)=>i&&Math.abs(p[0]-v.path[i-1][0])+Math.abs(p[1]-v.path[i-1][1])!==1))continue;
    if(['cargo','garbage'].includes(v.kind)&&(!point(v.source)||!point(v.target)))continue;
    if(v.kind==='bus'&&!out.routes.some(r=>r.id===v.routeId))continue;
    const id=Math.floor(number(v.id,1,1e8,1));if(vehicleIds.has(id))continue;vehicleIds.add(id);
    out.vehicles.push({id,kind:v.kind,path:v.path.map(p=>[...p]),index:Math.floor(number(v.index,0,v.path.length-2)),t:number(v.t,0,.999),speed:number(v.speed,.5,4,1.8),wait:number(v.wait,0,1e7),dwell:number(v.dwell,0,2),age:number(v.age,0,1e7),payload:number(v.payload,0,100),source:point(v.source)?[...v.source]:null,target:point(v.target)?[...v.target]:null,routeId:v.routeId,leg:Math.floor(number(v.leg,0,15)),color:['#ffd35e','#f7fafc','#68d8df','#ee8ba0'].includes(v.color)?v.color:'#ffd35e'});
  }
  out.nextVehicleId=Math.max(1,...out.vehicles.map(v=>v.id+1));out.clock=number(input.clock,0,1e9);
  for(const k of ['delivered','collected','sales'])out[k]=number(input[k],0,1e12);
  return out;
}

// Simulation owns serializable trips. The canvas only draws their positions.
export class TrafficEngine{
  constructor(city){this.city=city;this.cache=new Map();this.routes=[];this.intersections=new Set();this.spawnTime=0;this.accumulator=0;this.rebuild();}
  get state(){return this.city.v6;}
  get grid(){return this.city.grid;}
  get w(){return this.grid[0].length;}
  pointCell(p){return p&&this.grid[p[1]]?.[p[0]];}
  access(p){const c=this.pointCell(p);if(!c?.connected)return null;if(isRoad(c.type))return p;return adjacent(...p,this.w,this.grid.length).find(n=>isRoad(this.pointCell(n).type)&&this.pointCell(n).connected)||null;}
  path(from,to){
    const a=this.access(from),b=this.access(to);if(!a||!b)return [];
    const key=a.join(',')+'>'+b.join(',');
    if(!this.cache.has(key)){
      if(this.cache.size>=800)this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key,shortestRoadPath(this.grid,a,b));
    }
    return this.cache.get(key);
  }
  rebuild(){
    this.cache.clear();this.intersections.clear();this.routes=[];
    for(let y=0;y<this.grid.length;y++)for(let x=0;x<this.w;x++)if(isRoad(this.grid[y][x].type)&&adjacent(x,y,this.w,this.grid.length).filter(p=>isRoad(this.pointCell(p).type)).length>=3)this.intersections.add(tileId(x,y,this.w));
    this.city.v6.routes=this.state.routes.filter(r=>r.stops.every(p=>this.pointCell(p)?.type==='bus'));
    for(const line of this.state.routes){
      const paths=line.stops.map((p,i)=>this.path(p,line.stops[(i+1)%line.stops.length]));
      this.routes.push({...line,paths,active:paths.every(p=>p.length>=2),riders:0});
    }
    for(const v of this.state.vehicles){
      if(!v.path.every(p=>isRoad(this.pointCell(p)?.type))){this.cancel(v);v.done=true;}
      if(v.kind==='bus'&&!this.routes.some(r=>r.id===v.routeId&&r.active))v.done=true;
    }
    this.state.vehicles=this.state.vehicles.filter(v=>!v.done);
  }
  cancel(v){
    if(v.kind==='cargo'&&this.pointCell(v.source)?.type==='industrial')this.pointCell(v.source).goods=Math.min(1000,(this.pointCell(v.source).goods||0)+v.payload);
  }
  signalGreen(p,next,time=this.state.clock){
    const id=tileId(...p,this.w);if(!this.intersections.has(id)||this.state.signals[id]===false)return true;
    const horizontal=next[0]!==p[0];return Math.floor((time+(p[0]+p[1])%3)/5)%2===(horizontal?0:1);
  }
  spawn(kind,path,extra={}){
    if(path.length<2||this.state.vehicles.length>=180)return false;
    // Space spawning so vehicles cannot start on top of another vehicle in the same lane.
    if(this.state.vehicles.some(v=>v.path[v.index][0]===path[0][0]&&v.path[v.index][1]===path[0][1]&&v.path[v.index+1][0]===path[1][0]&&v.path[v.index+1][1]===path[1][1]&&v.t<.28))return false;
    this.state.vehicles.push({id:this.state.nextVehicleId++,kind,path:path.map(p=>[...p]),index:0,t:0,speed:kind==='car'?2.3:kind==='bus'?1.65:1.4,wait:0,dwell:0,age:0,payload:0,color:['#ffd35e','#f7fafc','#68d8df','#ee8ba0'][this.state.nextVehicleId%4],...extra});return true;
  }
  householdPass(){
    const homes=[],jobs=[];let students=0;
    for(let y=0;y<this.grid.length;y++)for(let x=0;x<this.w;x++){
      const c=this.grid[y][x];if(['commercial','industrial','office'].includes(c.type))c.staffed=0;if(c.type==='residential'&&c.residents)homes.push({home:[x,y],residents:c.residents,families:Math.ceil(c.residents/4),workers:Math.floor(c.residents*.6),students:Math.floor(c.residents*.2),educated:Math.round(c.education),employed:0,assignments:[]});
      if(['commercial','industrial','office'].includes(c.type)&&c.jobs&&c.connected)jobs.push({point:[x,y],remaining:c.jobs,type:c.type});
    }
    for(const h of homes){
      students+=h.students;let remaining=h.workers;
      const nearest=jobs.filter(j=>j.remaining>0).sort((a,b)=>distance(h.home,a.point)-distance(h.home,b.point)).slice(0,12);
      for(const j of nearest){
        if(!remaining)break;if(j.type==='office'&&h.educated<45)continue;const path=this.path(h.home,j.point);if(path.length<1)continue;
        const workers=Math.min(remaining,j.remaining);h.assignments.push({work:j.point,workers,path});h.employed+=workers;j.remaining-=workers;remaining-=workers;
      }
      h.commute=h.assignments.length?Math.round(h.assignments.reduce((s,a)=>s+a.path.length*a.workers,0)/Math.max(1,h.employed)):0;
    }
    for(const j of jobs)this.pointCell(j.point).staffed=this.pointCell(j.point).jobs-j.remaining;
    this.state.households=homes;this.state.householdCount=homes.reduce((s,h)=>s+h.families,0);this.state.workers=homes.reduce((s,h)=>s+h.workers,0);this.state.employed=homes.reduce((s,h)=>s+h.employed,0);this.state.students=students;
    this.city.employed=this.state.employed;
    this.transitPass();
  }
  transitPass(){
    let riders=0;
    for(const r of this.routes){
      r.riders=0;if(!r.active)continue;
      const nearby=this.state.households.filter(h=>r.stops.some(p=>distance(h.home,p)<=5)&&h.assignments.some(a=>r.stops.some(p=>distance(a.work,p)<=5))).reduce((s,h)=>s+h.employed,0);
      r.riders=Math.min(nearby,r.buses*(this.city.policies.freeTransit?90:65));riders+=r.riders;
    }
    // Metro remains a simplified capacity service; editable routes are for buses.
    const metro=this.grid.flat().filter(c=>c.type==='metro'&&c.connected).length;
    this.state.riders=Math.min(this.state.employed,Math.round(riders+metro*120));this.city.transitRiders=this.state.riders;
  }
  dispatch(){
    this.spawnTime=0;
    for(const line of this.routes){
      if(!line.active)continue;
      const buses=this.state.vehicles.filter(v=>v.kind==='bus'&&v.routeId===line.id).length;
      if(buses<line.buses){this.spawn('bus',line.paths[0],{routeId:line.id,leg:0});return;}
    }
    const factories=[],shops=[],depots=[],trash=[];
    for(let y=0;y<this.grid.length;y++)for(let x=0;x<this.w;x++){
      const c=this.grid[y][x];if(!c.connected)continue;
      if(c.type==='industrial'&&c.goods>=5)factories.push([x,y]);
      if(c.type==='commercial'&&c.level&&c.stock<35&&!this.state.vehicles.some(v=>v.kind==='cargo'&&same(v.target,[x,y])))shops.push([x,y]);
      if(c.type==='garbage')depots.push([x,y]);
      if(isZone(c.type)&&c.trash>=8&&!this.state.vehicles.some(v=>v.kind==='garbage'&&same(v.target,[x,y])))trash.push([x,y]);
    }
    for(const shop of shops.slice(0,8))for(const f of factories.slice().sort((a,b)=>distance(a,shop)-distance(b,shop)).slice(0,4)){
      const path=this.path(f,shop);if(path.length<1)continue;
      const payload=Math.min(25,this.pointCell(f).goods);
      if(path.length===1){this.pointCell(f).goods-=payload;this.pointCell(shop).stock=Math.min(120,this.pointCell(shop).stock+payload);this.state.delivered+=payload;return;}
      if(this.spawn('cargo',path,{source:f,target:shop,payload})){this.pointCell(f).goods-=payload;return;}
    }
    for(const target of trash.sort((a,b)=>this.pointCell(b).trash-this.pointCell(a).trash).slice(0,8))for(const depot of depots){
      if(this.state.vehicles.filter(v=>v.kind==='garbage'&&same(v.source,depot)).length>=3)continue;
      const path=this.path(depot,target);if(path.length<1)continue;
      if(path.length===1){const amount=Math.min(35,this.pointCell(target).trash);this.pointCell(target).trash-=amount;this.state.collected+=amount;return;}
      if(this.spawn('garbage',path,{source:depot,target,payload:0})){return;}
    }
    const assignments=this.state.households.flatMap(h=>h.assignments.filter(a=>a.path.length>1).map(a=>({h,a})));
    const carTarget=Math.min(110,Math.ceil(Math.max(0,this.state.employed-this.state.riders)/10));
    if(assignments.length&&this.state.vehicles.filter(v=>v.kind==='car').length<carTarget){
      const {a}=assignments[this.state.nextVehicleId%assignments.length];this.spawn('car',this.state.nextVehicleId%2?a.path:[...a.path].reverse());
    }
  }
  update(dt){
    this.accumulator+=Math.min(.25,Math.max(0,dt));
    while(this.accumulator>=1/30){this.step(1/30);this.accumulator-=1/30;}
  }
  step(dt){
    this.state.clock+=dt;this.spawnTime+=dt;if(this.spawnTime>=.25)this.dispatch();
    const lanes=new Map(),junctions=new Set();let blocked=0;
    for(const v of this.state.vehicles){
      const p=v.path[v.index],n=v.path[v.index+1];if(!p||!n){v.done=true;continue;}
      const key=p.join(',')+'>'+n.join(',');if(!lanes.has(key))lanes.set(key,[]);lanes.get(key).push(v);
    }
    for(const lane of lanes.values())lane.sort((a,b)=>b.t-a.t);
    for(const lane of lanes.values())for(let i=0;i<lane.length;i++){
      const v=lane[i],p=v.path[v.index],n=v.path[v.index+1],id=tileId(...n,this.w);v.age+=dt;
      if(v.age>240&&['cargo','garbage'].includes(v.kind)){this.cancel(v);v.done=true;continue;}
      if(v.dwell>0){v.dwell=Math.max(0,v.dwell-dt);continue;}
      const nextProgress=v.t+dt*v.speed*(this.pointCell(p)?.type==='avenue'?1.5:1);
      const following=i>0&&nextProgress>lane[i-1].t-.25;
      const red=v.t>=.72&&!this.signalGreen(n,p);
      const crowded=nextProgress>=1&&(junctions.has(id)||this.state.vehicles.some(other=>other!==v&&same(other.path[other.index],n)&&same(other.path[other.index+1],v.path[v.index+2])&&other.t<.26));
      if(following||red||crowded){v.wait+=dt;blocked++;continue;}
      v.t=nextProgress;
      if(v.t>=1){
        if(this.intersections.has(id))junctions.add(id);v.index++;v.t=0;
        if(v.index>=v.path.length-1)this.arrive(v);
      }
    }
    this.state.vehicles=this.state.vehicles.filter(v=>!v.done);
    this.state.queues=blocked;
    const sample=this.state.vehicles.length?100*(1-blocked/this.state.vehicles.length):100;
    this.state.traffic=this.state.traffic*.97+sample*.03;
    this.city.traffic=Math.round(clamp(this.state.traffic,0,100));
  }
  arrive(v){
    if(v.kind==='bus'){
      const line=this.routes.find(r=>r.id===v.routeId&&r.active);if(!line){v.done=true;return;}
      v.leg=(v.leg+1)%line.paths.length;v.path=line.paths[v.leg].map(p=>[...p]);v.index=0;v.t=0;v.age=0;v.dwell=1.2;return;
    }
    if(v.kind==='cargo'&&this.pointCell(v.target)?.type==='commercial'){
      this.pointCell(v.target).stock=Math.min(120,this.pointCell(v.target).stock+v.payload);this.state.delivered+=v.payload;
    }
    if(v.kind==='garbage'&&isZone(this.pointCell(v.target)?.type)&&this.pointCell(v.source)?.type==='garbage'){
      const c=this.pointCell(v.target),amount=Math.min(c.trash,35);c.trash-=amount;this.state.collected+=amount;
    }
    if(['fireEngine','ambulance'].includes(v.kind))this.onEmergencyArrival?.(v);
    v.done=true;
  }
  daily(){
    this.householdPass();this.state.sales=0;let unserved=0,unstocked=0;
    for(const row of this.grid)for(const c of row){
      if(!isZone(c.type))continue;
      c.trash=clamp((c.trash||0)+(c.residents||c.jobs||0)*.09,0,100);
      if(c.trash>50)unserved++;
      if(c.type==='industrial'&&c.connected&&c.powered&&c.watered)c.goods=clamp((c.goods||0)+(c.staffed||0)*.4,0,1000);
      if(c.type==='commercial'){
        const sold=Math.min(c.stock||0,Math.max(1,Math.round(c.jobs*.18)));c.stock=Math.max(0,(c.stock||0)-sold);this.state.sales+=sold;
        if(c.level&&c.stock<5)unstocked++;
      }
    }
    this.state.unservedTrash=unserved;this.state.unstockedShops=unstocked;
  }
}
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
const distance=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);

export function budgetBreakdown(city,build,routeCount=0){
  const res=city.population*city.taxes.res/100*1.6;
  let commercial=0,industrial=0,offices=0,roads=0,zones=0,services=0;
  for(const row of city.grid)for(const c of row){
    if(c.type==='commercial')commercial+=c.jobs*city.taxes.com/100*3.5*((c.stock||0)>0?1:.35);
    if(c.type==='industrial')industrial+=c.jobs*city.taxes.ind/100*3*(c.connected?1:0);
    if(c.type==='office')offices+=(c.staffed||0)*city.taxes.com/100*4;
    if(c.rail)roads+=1;
    const upkeep=build[c.type]?.upkeep||0;if(isRoad(c.type))roads+=upkeep;else if(isZone(c.type))zones+=upkeep;else services+=upkeep*city.serviceBudget/100;
  }
  const transitExpense=routeCount*18,busFares=city.policies.freeTransit?0:(city.v6?.riders||0)*.18;
  const policyCost=(city.policies.green?60:0)+(city.policies.freeTransit?90:0)+(city.policies.education?80:0);
  const debtPayment=Math.min(city.debt,100);
  const b={residential:Math.round(res),commercial:Math.round(commercial),industrial:Math.round(industrial),offices:Math.round(offices),tourism:Math.round(city.v7?.tourismIncome||0),fares:Math.round(busFares),roads:Math.round(roads),zones:Math.round(zones),services:Math.round(services),transit:transitExpense,policies:policyCost,debt:debtPayment};
  b.income=b.residential+b.commercial+b.industrial+b.offices+b.tourism+b.fares;b.expense=b.roads+b.zones+b.services+b.transit+b.policies+b.debt;b.net=b.income-b.expense;return b;
}
export function developmentBlockers(c,tax=9){
  const blockers=[];
  if(!c.connected)blockers.push('Connect a road to the highway');if(!c.powered)blockers.push('Supply electricity');if(!c.watered)blockers.push('Supply water');
  if(c.trash>50)blockers.push('Garbage is piling up');if(c.type==='commercial'&&c.stock<5)blockers.push('Shops need factory deliveries');
  if(c.density&&c.education<45)blockers.push('Improve education for high density');if(tax>12)blockers.push('High taxes discourage growth');
  if(c.pollution>50)blockers.push('Reduce pollution');if(c.type==='office'&&c.education<45)blockers.push('Offices need education of at least 45%');if(c.distress>=8)blockers.push('Abandoned: restore services to recover');return blockers;
}
