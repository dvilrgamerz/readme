import {adjacent,isZone} from './systems.js';
const distance=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
export const CHALLENGES=[
 {id:'profit',name:'Profitable city',text:'500 citizens and positive daily cashflow for 5 days',reward:5000},
 {id:'traffic',name:'Traffic recovery',text:'500 citizens and traffic above 80% for 5 days',reward:6000},
 {id:'tourism',name:'Visitor destination',text:'Attract 100 daily visitors for 5 days',reward:7000}
];
export function newV7(){return {freeBuild:false,trains:[],incidents:[],nextIncident:1,resolved:0,lost:0,visitors:0,tourismIncome:0,railRiders:0,railDelivered:0,challenge:null,streak:0,completed:[],design:'Custom city'};}
export function sanitiseV7(input,grid){
 const s=newV7();if(!input||typeof input!=='object')return s;
 s.freeBuild=input.freeBuild===true;s.design=String(input.design||'Custom city').slice(0,40);
 s.challenge=CHALLENGES.some(c=>c.id===input.challenge)?input.challenge:null;
 s.streak=Number.isInteger(input.streak)?Math.max(0,Math.min(5,input.streak)):0;
 s.completed=CHALLENGES.filter(c=>Array.isArray(input.completed)&&input.completed.includes(c.id)).map(c=>c.id);
 for(const k of ['resolved','lost','railDelivered'])s[k]=Number.isFinite(input[k])?Math.max(0,Math.min(1e12,input[k])):0;
 const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&!!grid[p[1]]?.[p[0]];
 const ids=new Set();
 for(const i of Array.isArray(input.incidents)?input.incidents.slice(0,8):[]){if(!i||!point(i.target)||!isZone(grid[i.target[1]][i.target[0]].type)||!['fire','medical'].includes(i.kind))continue;
  const id=Number.isInteger(i.id)&&i.id>0&&i.id<1e8?i.id:s.nextIncident;if(ids.has(id))continue;ids.add(id);s.nextIncident=Math.max(s.nextIncident,id+1);
  s.incidents.push({id,kind:i.kind,target:[...i.target],remaining:Number.isFinite(i.remaining)?Math.max(1,Math.min(120,i.remaining)):90});}
 return s;
}
export function railPath(grid,start,end){
 const w=grid[0].length,h=grid.length,id=p=>p[1]*w+p[0],valid=p=>!!grid[p[1]]?.[p[0]]?.rail;
 if(!valid(start)||!valid(end))return [];const queue=[start],seen=new Map([[id(start),null]]);
 for(let n=0;n<queue.length;n++){const p=queue[n];if(same(p,end)){const path=[];let at=p;while(at){path.push(at);at=seen.get(id(at));}return path.reverse();}
  for(const p2 of adjacent(...p,w,h))if(valid(p2)&&!seen.has(id(p2))){seen.set(id(p2),p);queue.push(p2);}}
 return [];
}
export class ExpansionEngine{
 constructor(city,traffic,onChange=()=>{}){this.city=city;this.traffic=traffic;this.onChange=onChange;this.lines=[];this.rebuild();}
 get state(){return this.city.v7;}
 cell(p){return p&&this.city.grid[p[1]]?.[p[0]];}
 points(type){const out=[];this.city.grid.forEach((r,y)=>r.forEach((c,x)=>{if(c.type===type&&c.connected)out.push([x,y]);}));return out;}
 rebuild(){
  this.lines=[];this.railSegments=[];this.city.grid.forEach((row,y)=>row.forEach((c,x)=>{if(c.rail)for(const [a,b]of adjacent(x,y,row.length,this.city.grid.length))if(this.cell([a,b]).rail&&(a>x||b>y))this.railSegments.push([[x,y],[a,b]]);}));for(const type of ['station','cargoTerminal']){const stops=this.points(type);for(let i=1;i<stops.length;i++){const path=railPath(this.city.grid,stops[0],stops[i]);if(path.length>1)this.lines.push({type,path,stops:[stops[0],stops[i]]});}}
  this.state.trains=this.lines.slice(0,20).map(l=>({...l,index:0,t:0,reverse:false,dwell:0,payload:null}));this.metrics();
 }
 metrics(){
  const stations=this.lines.filter(l=>l.type==='station').flatMap(l=>l.stops);
  const served=this.city.v6.households.filter(h=>stations.some(p=>distance(h.home,p)<=7)&&h.assignments.some(a=>stations.some(p=>distance(a.work,p)<=7))).reduce((s,h)=>s+h.employed,0);
  this.state.railRiders=Math.min(served,this.lines.filter(l=>l.type==='station').length*180);
  this.traffic.transitPass();this.city.v6.riders=Math.min(this.city.v6.employed,this.city.v6.riders+this.state.railRiders);this.city.transitRiders=this.city.v6.riders;
  const attractions=this.points('attraction').length,rooms=this.points('hotel').length*80;
  this.state.visitors=Math.floor(Math.min(rooms,attractions*65+this.state.railRiders*.3)*Math.max(0,Math.min(1,(this.city.happiness||0)/100))*(1-(this.city.pollutionAvg||0)/150));
  this.state.tourismIncome=this.state.visitors*2;
 }
 dispatchFreight(t){
  if(t.type!=='cargoTerminal'||t.payload)return;
  const [source,end]=t.reverse?[...t.stops].reverse():t.stops;
  const factories=this.points('industrial').filter(p=>distance(p,source)<=7&&this.cell(p).goods>=5);
  const shops=this.points('commercial').filter(p=>distance(p,end)<=7&&this.cell(p).stock<75&&!this.state.trains.some(o=>o.payload&&same(o.payload.target,p))&&!this.city.v6.vehicles.some(v=>v.kind==='cargo'&&same(v.target,p)));
  if(!factories.length||!shops.length)return;const f=factories[0],target=shops[0],amount=Math.min(60,this.cell(f).goods);this.cell(f).goods-=amount;t.payload={source:f,target,amount};
 }
 cancelFreight(t){if(t.payload&&this.cell(t.payload.source)?.type==='industrial')this.cell(t.payload.source).goods=Math.min(1000,this.cell(t.payload.source).goods+t.payload.amount);t.payload=null;}
 update(dt){
  for(const t of this.state.trains){if(t.dwell>0){t.dwell-=dt;continue;}this.dispatchFreight(t);t.t+=dt*(t.type==='station'?3:2);
   while(t.t>=1){t.t--;t.index++;if(t.index>=t.path.length-1){if(t.payload){const c=this.cell(t.payload.target);if(c?.type==='commercial'){const amount=Math.min(t.payload.amount,120-c.stock);c.stock+=amount;this.state.railDelivered+=amount;this.city.v6.delivered+=amount;const leftover=t.payload.amount-amount;if(leftover&&this.cell(t.payload.source)?.type==='industrial')this.cell(t.payload.source).goods+=leftover;t.payload=null;}else this.cancelFreight(t);}
    t.path.reverse();t.reverse=!t.reverse;t.index=0;t.t=0;t.dwell=2;break;}}
  }
  for(const incident of [...this.state.incidents]){
   incident.remaining-=dt;
   if(!isZone(this.cell(incident.target)?.type)){this.finish(incident,false);continue;}
   if(!this.city.v6.vehicles.some(v=>v.incidentId===incident.id)){
    const bases=this.points(incident.kind==='fire'?'fire':'hospital').sort((a,b)=>distance(a,incident.target)-distance(b,incident.target));
    for(const base of bases){const path=this.traffic.path(base,incident.target);if(!path.length)continue;if(path.length===1){this.finish(incident,true);break;}
     if(this.traffic.spawn(incident.kind==='fire'?'fireEngine':'ambulance',path,{source:base,target:incident.target,incidentId:incident.id,speed:2.8})){break;}}
   }
   if(incident.remaining<=0){const c=this.cell(incident.target);if(incident.kind==='fire')c.level=0;else c.distress=Math.min(100,c.distress+8);this.finish(incident,false);this.onChange();}
  }
 }
 finish(incident,success){if(success)this.state.resolved++;else this.state.lost++;this.state.incidents=this.state.incidents.filter(i=>i.id!==incident.id);this.city.v6.vehicles=this.city.v6.vehicles.filter(v=>v.incidentId!==incident.id);}
 arrived(v){const incident=this.state.incidents.find(i=>i.id===v.incidentId);if(incident&&this.cell(v.source)?.type===(v.kind==='fireEngine'?'fire':'hospital'))this.finish(incident,true);}
 incident(kind,target){if(this.state.incidents.length>=8||!isZone(this.cell(target)?.type)||this.state.incidents.some(i=>same(i.target,target)))return false;this.state.incidents.push({id:this.state.nextIncident++,kind,target:[...target],remaining:90});return true;}
 daily(){this.metrics();const s=this.state,c=this.city;
  const condition=s.challenge==='profit'?c.population>=500&&c.cashflow>0:s.challenge==='traffic'?c.population>=500&&c.traffic>=80:s.challenge==='tourism'?s.visitors>=100:false;
  if(s.freeBuild){s.streak=0;return null;}s.streak=condition?Math.min(5,s.streak+1):0;
  if(s.streak>=5&&!s.completed.includes(s.challenge)){const challenge=CHALLENGES.find(x=>x.id===s.challenge);s.completed.push(s.challenge);c.funds+=challenge.reward;return challenge;}return null;
 }
}
