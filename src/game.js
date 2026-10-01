import {isRoad, isZone, roadNetwork, shortestRoadPath, coverageFields, parseSave} from "./systems.js";
const canvas = document.querySelector("#gameCanvas");
let ctx = canvas.getContext("2d");
const W = 48, H = 30, TILE = 25;
canvas.width = W * TILE;
canvas.height = H * TILE;

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const rand = (a,b) => a + Math.random() * (b-a);
const rint = (a,b) => Math.floor(rand(a,b+1));
const money = n => (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString();

const BUILD = {
  empty:{name:"Land",cost:0,color:"#3d744f"},
  water:{name:"Water",cost:0,color:"#2f6f9e"},
  road:{name:"Road",cost:20,upkeep:1,color:"#555d69"},
  bridge:{name:"Bridge",cost:160,upkeep:4,color:"#637b89"},
  wind:{name:"Wind Turbine",cost:1100,upkeep:25,color:"#bde8dc"},
  avenue:{name:"Avenue",cost:55,upkeep:2,color:"#444e5d"},
  residential:{name:"Residential",cost:35,upkeep:1,color:"#55cf7c"},
  commercial:{name:"Commercial",cost:45,upkeep:2,color:"#55a9ff"},
  industrial:{name:"Industrial",cost:55,upkeep:2,color:"#e7b74b"},
  park:{name:"Park",cost:180,upkeep:5,color:"#78d968"},
  power:{name:"Power Plant",cost:1500,upkeep:70,color:"#b76aff"},
  waterTower:{name:"Water Tower",cost:1000,upkeep:45,color:"#42cfe8"},
  fire:{name:"Fire Station",cost:1100,upkeep:55,color:"#f36c69"},
  police:{name:"Police Station",cost:1100,upkeep:55,color:"#7488ff"},
  school:{name:"School",cost:1300,upkeep:65,color:"#f293ff"},
  hospital:{name:"Hospital",cost:1700,upkeep:85,color:"#ff769f"},
  bus:{name:"Bus Stop",cost:400,upkeep:12,color:"#55e0c0"},
  metro:{name:"Metro Station",cost:2800,upkeep:120,color:"#ff9e55"},
  recycle:{name:"Recycling Center",cost:1400,upkeep:60,color:"#92d45d"},
  district:{name:"District Paint",cost:0,color:"#3d744f"}
};

const TOOLS = [
  ["inspect","⌕"],["pan","✥"],["road","🛣️"],["avenue","🛤️"],["bridge","🌉"],["wind","🌬️"],["residential","🏠"],["commercial","🏪"],
  ["industrial","🏭"],["park","🌳"],["power","⚡"],["waterTower","💧"],
  ["fire","🚒"],["police","🚓"],["school","🏫"],["hospital","🏥"],
  ["bus","🚌"],["metro","🚇"],["recycle","♻️"],["district","◫"],["bulldoze","🧨"]
];

const MILESTONES = [
  {pop:100,title:"Village",reward:2000},
  {pop:500,title:"Town",reward:4500},
  {pop:1500,title:"City",reward:9000},
  {pop:4000,title:"Major City",reward:18000},
  {pop:8000,title:"Metropolis",reward:35000}
];

const MISSIONS = [
  {id:"pop",title:"Growth Push",text:"Reach {target} citizens",reward:2400},
  {id:"happy",title:"Happy City",text:"Reach {target}% happiness",reward:1800},
  {id:"jobs",title:"Jobs Engine",text:"Create {target} jobs",reward:2200},
  {id:"transit",title:"Transit First",text:"Reach {target} daily transit riders",reward:2100},
  {id:"green",title:"Cleaner Air",text:"Keep pollution at or below {target}%",reward:1700}
];

let selected = "road";
let overlay = "none";
let pointerDown = false;
let lastPaint = "";
let simAccumulator = 0;
let lastFrame = performance.now();
let cars = [];
let rain = [];
let roadTiles=[], tripOrigins=[], tripDestinations=[], trafficLoads=new Map();
let spawnAccumulator=0, trafficPaintAccumulator=0;
let networkDirty=true, mapDirty=true, fields={}, inspectTile=null, density=0;
let districtBrush=1, uiAccumulator=0, animationDt=1/60;
const mapLayer=document.createElement('canvas');mapLayer.width=canvas.width;mapLayer.height=canvas.height;
const mapCtx=mapLayer.getContext('2d');
let camera={zoom:1,x:0,y:0}, dragStart=null;
const SERVICE_SPECS={
 industrial:{radius:5,strength:8,falloff:1},power:{radius:5,strength:14,falloff:2},
 recycle:{radius:6,strength:1,connected:true},school:{radius:6,strength:1,connected:true},
 hospital:{radius:7,strength:1,connected:true},police:{radius:7,strength:1,connected:true},
 fire:{radius:7,strength:1,connected:true},park:{radius:5,strength:8,falloff:1,connected:true},
 water:{radius:2,strength:2}
};
function invalidate(){networkDirty=true;mapDirty=true;}
function districtPolicy(c){return c.district?city.districtPolicies[c.district-1]:'balanced';}


function tileBase(type="empty"){
  return {
    type, terrain:type==="water"?"water":"empty", density:0, distress:0, level:0, residents:0, jobs:0, age:0,
    powered:false, watered:false, land:50, pollution:0,
    education:0, crime:0, health:50, district:0, connected:false
  };
}

function generateMap(){
  const grid = [];
  const riverCenter = rint(29,36);
  for(let y=0;y<H;y++){
    const row=[];
    const bend = Math.round(Math.sin(y*0.43)*2 + Math.sin(y*0.13)*1.5);
    for(let x=0;x<W;x++){
      const riverX = riverCenter + bend;
      const water = Math.abs(x-riverX) <= 1;
      row.push(tileBase(water ? "water" : "empty"));
    }
    grid.push(row);
  }

  const roadY = H-3;
  for(let x=0;x<10;x++) grid[roadY][x] = tileBase("road");
  return grid;
}

function newMission(city){
  const base = MISSIONS[rint(0,MISSIONS.length-1)];
  let target = 0;
  if(base.id==="pop") target = Math.max(250, Math.ceil((city.population+250)/250)*250);
  if(base.id==="happy") target = Math.max(70, Math.min(90, city.happiness+10));
  if(base.id==="jobs") target = Math.max(200, Math.ceil((city.jobs+200)/200)*200);
  if(base.id==="transit") target = Math.max(50, Math.ceil((city.transitRiders+50)/50)*50);
  if(base.id==="green") target = Math.max(10, Math.min(35, Math.round(city.pollutionAvg)-8));
  return {...base,target,complete:false};
}

function freshCity(){
  const c = {
    grid:generateMap(), funds:50000, debt:0, population:0, lastPopulation:0, jobs:0, employed:0,
    happiness:55, traffic:100, health:50, education:0, crime:0, pollutionAvg:0, landValue:50,
    transitRiders:0, day:1, year:1, hour:8, paused:false, speed:1,
    taxes:{res:9,com:9,ind:9}, serviceBudget:100,
    policies:{green:false,freeTransit:false,education:false},
    demands:{res:55,com:35,ind:45},
    power:{cap:0,use:0}, water:{cap:0,use:0},
    cashflow:0, milestones:[], achievements:[], weather:"Clear", temperature:72,
    mission:null, eventLog:[], districtNames:["Central","Northside","Riverside"],
    districtPolicies:["balanced","balanced","balanced"], history:[], autosaveDay:0
  };
  c.mission = newMission(c);
  return c;
}

let city = freshCity();

function showToast(text){
  const el = $("toast");
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>el.classList.add("hidden"),1800);
}

function showEvent(title,text){
  const el = $("eventBanner");
  el.innerHTML = "<strong>"+title+"</strong><br><small>"+text+"</small>";
  el.classList.remove("hidden");
  clearTimeout(showEvent.timer);
  showEvent.timer = setTimeout(()=>el.classList.add("hidden"),4200);
}

function neighbors(x,y){
  return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>a>=0&&b>=0&&a<W&&b<H);
}

function serviceNear(x,y,type,radius){return (fields[type]?.[y*W+x]||0)>0;}

function nearWater(x,y,r=2){
  for(let yy=Math.max(0,y-r);yy<=Math.min(H-1,y+r);yy++)
    for(let xx=Math.max(0,x-r);xx<=Math.min(W-1,x+r);xx++)
      if(city.grid[yy][xx].type==="water") return true;
  return false;
}

function count(type){
  let n=0;
  for(const row of city.grid) for(const cell of row) if(cell.type===type) n++;
  return n;
}

function setTool(tool){
  selected = tool;
  document.querySelectorAll(".tool").forEach(b=>b.classList.toggle("active",b.dataset.tool===tool));
  const meta = tool==="bulldoze" ? {name:"Bulldoze"} : BUILD[tool] || {name:tool==="inspect"?"Inspect":"Pan"};
  $("selectedName").textContent = meta?.name || tool;
  $("modeHint").textContent = tool==="inspect"?"Select a building to inspect" : tool==="pan"?"Drag the map to move" : tool==="district" ? "Paint districts by clicking land" : tool==="bulldoze" ? "Remove buildings and roads" : "Drag to build "+(meta?.name||tool);
}

function makeTools(){
  const g = $("toolGrid");
  g.innerHTML="";
  for(const [key,icon] of TOOLS){
    const meta = key==="bulldoze" ? {name:"Bulldoze",cost:5} : BUILD[key] || {name:key==="inspect"?"Inspect":"Pan",cost:0};
    const b = document.createElement("button");
    b.className="tool";
    b.dataset.tool=key;
    b.innerHTML="<strong>"+icon+" "+meta.name+"</strong><span>"+(meta.cost ? money(meta.cost) : "Free")+"</span>";
    b.title=meta.name+" • "+money(meta.cost||0)+(meta.upkeep?" • "+money(meta.upkeep)+"/day":"");
    b.onclick=()=>setTool(key);
    g.appendChild(b);
  }
  setTool("road");
}
makeTools();

function pointerTile(e){
  const r=canvas.getBoundingClientRect();
  return {x:Math.floor((e.clientX-r.left)*(canvas.width/r.width)/TILE),y:Math.floor((e.clientY-r.top)*(canvas.height/r.height)/TILE)};
}
function build(x,y,tool=selected){
  const cell=city.grid[y]?.[x];if(!cell) return;
  if(tool==='inspect'){inspectTile={x,y};updateInspector();mapDirty=true;return;}
  if(tool==='pan') return;
  const sig=x+':'+y+':'+tool;if(sig===lastPaint)return;lastPaint=sig;
  if(tool==='district'){
    if(cell.type==='water')return;cell.district=districtBrush;mapDirty=true;return;
  }
  if(tool==='bulldoze'){
    if(['empty','water'].includes(cell.type))return;
    if(city.funds<5)return showToast('Need $5 to demolish.');
    city.funds-=5;city.grid[y][x]=tileBase(cell.terrain==='water'?'water':'empty');invalidate();return;
  }
  const upgrade=isRoad(cell.type)&&['road','avenue'].includes(tool)&&tool!==cell.type&&cell.type!=='bridge';
  if(tool==='bridge'&&cell.type!=='water')return showToast('Bridges are built over river tiles.');
  if(cell.type!=='empty'&&!(tool==='bridge'&&cell.type==='water')&&!upgrade)return;
  const meta=BUILD[tool];if(!meta)return;
  const cost=upgrade?Math.max(0,meta.cost-BUILD[cell.type].cost):meta.cost;
  if(city.funds<cost)return showToast('Not enough money.');
  city.funds-=cost;
  const next=tileBase(tool);next.district=cell.district;next.density=isZone(tool)?density:0;next.terrain=cell.terrain;
  city.grid[y][x]=next;invalidate();
}
function paintLine(a,b,tool){
  let {x,y}=a;const dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1;let err=dx-dy;
  for(let i=0;i<W+H+100;i++){
    build(x,y,tool);if(x===b.x&&y===b.y)break;
    const e=2*err;if(e>-dy){err-=dy;x+=sx;}if(e<dx){err+=dx;y+=sy;}
  }
}
let lastTile=null,dragTool='road';
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==2&&e.button!==1)return;
  e.preventDefault();canvas.setPointerCapture(e.pointerId);pointerDown=true;lastPaint='';
  dragTool=e.button===2?'bulldoze':selected;
  dragStart={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y};
  if(e.button===1||e.shiftKey)dragTool='pan';
  lastTile=pointerTile(e);if(dragTool!=='pan')build(lastTile.x,lastTile.y,dragTool);
});
canvas.addEventListener('pointermove',e=>{
  const p=pointerTile(e);$('coords').textContent=p.x+', '+p.y;
  if(pointerDown&&dragTool==='pan'){
    camera.x=dragStart.cx+e.clientX-dragStart.x;camera.y=dragStart.cy+e.clientY-dragStart.y;applyCamera();return;
  }
  if(pointerDown&&lastTile){paintLine(lastTile,p,dragTool);lastTile=p;}
  const c=city.grid[p.y]?.[p.x];
  if(!c||e.pointerType==='touch')return;
  const tip=$('tooltip'),r=canvas.parentElement.getBoundingClientRect();
  tip.style.left=clamp(e.clientX-r.left+14,8,Math.max(8,r.width-190))+'px';
  tip.style.top=clamp(e.clientY-r.top+12,8,Math.max(8,r.height-120))+'px';
  tip.textContent=BUILD[c.type].name+(c.level?' • Level '+c.level:'')+(isZone(c.type)?' • '+(c.connected?'Road access':'No road access'):'');
  tip.classList.remove('hidden');
});
function endDrag(){pointerDown=false;lastPaint='';lastTile=null;dragStart=null;}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('lostpointercapture',endDrag);
canvas.addEventListener('pointerleave',()=>{$('tooltip').classList.add('hidden');});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function applyCamera(){
  const shell=canvas.parentElement,fit=Math.min(shell.clientWidth/canvas.width,shell.clientHeight/canvas.height);
  const width=canvas.width*fit,height=canvas.height*fit;
  camera.x=clamp(camera.x,-Math.max(0,(width*camera.zoom-shell.clientWidth)/2),Math.max(0,(width*camera.zoom-shell.clientWidth)/2));
  camera.y=clamp(camera.y,-Math.max(0,(height*camera.zoom-shell.clientHeight)/2),Math.max(0,(height*camera.zoom-shell.clientHeight)/2));
  canvas.style.width=width+'px';canvas.style.height=height+'px';
  canvas.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;
  $('zoomLabel').textContent=Math.round(camera.zoom*100)+'%';
}
canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=clamp(camera.zoom*(e.deltaY<0?1.12:1/1.12),1,3);applyCamera();},{passive:false});
new ResizeObserver(applyCamera).observe(canvas.parentElement);

function updateRoadConnectivity(){
  if(!networkDirty)return;
  roadTiles=roadNetwork(city.grid);cars=[];trafficLoads.clear();tripOrigins=[];tripDestinations=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const c=city.grid[y][x];if(!c.connected)continue;
    const access=neighbors(x,y).find(([nx,ny])=>isRoad(city.grid[ny][nx].type)&&city.grid[ny][nx].connected);
    if(!access)continue;
    if(c.type==='residential')tripOrigins.push({road:access,x,y});
    if(['commercial','industrial'].includes(c.type))tripDestinations.push({road:access,x,y});
  }
  fields=coverageFields(city.grid,SERVICE_SPECS);networkDirty=false;
}

function utilityPass(){
  let pCap=0,wCap=0,pUse=0,wUse=0;
  for(const row of city.grid) for(const c of row){
    if(c.type==="power"&&c.connected) pCap+=900;
    if(c.type==="wind"&&c.connected) pCap+=200;
    if(c.type==="waterTower"&&c.connected) wCap+=750;
    if(["residential","commercial","industrial"].includes(c.type)){
      const scale=Math.max(1,c.level)*(c.density?2.5:1);
      pUse+=3.5*scale; wUse+=2.7*scale;
    }
  }
  city.power={cap:pCap,use:pUse};
  city.water={cap:wCap,use:wUse};
  const powerOK=pUse===0||pCap>=pUse;
  const waterOK=wUse===0||wCap>=wUse;
  for(const row of city.grid) for(const c of row){
    if(["residential","commercial","industrial"].includes(c.type)){
      c.powered=powerOK&&c.connected&&pCap>0; c.watered=waterOK&&c.connected&&wCap>0;
    }
  }
}

function environmentPass(){
  let landSum=0,pollutionSum=0,zoneCount=0,eduSum=0,healthSum=0,crimeSum=0;
  const greenMul=city.policies.green?.72:1;
  const budgetMul=city.serviceBudget/100;

  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const c=city.grid[y][x];
    let pollution=0;
    let land=45;
    let edu=20;
    let health=55;
    let crime=10;

    const idx=y*W+x;
    pollution=(fields.industrial?.[idx]||0)+(fields.power?.[idx]||0);
    land+=(fields.park?.[idx]||0)+(fields.water?.[idx]||0);
    if(districtPolicy(c)==='green'){pollution*=.7;land+=6;}
    if(districtPolicy(c)==='business'){pollution*=1.15;land-=3;}
    pollution*=greenMul;
    if(serviceNear(x,y,"recycle",6)) pollution*=.72;
    if(serviceNear(x,y,"school",6)) edu+=38*budgetMul;
    if(city.policies.education) edu+=18;
    if(serviceNear(x,y,"hospital",7)) health+=26*budgetMul;
    health-=pollution*.42;
    if(serviceNear(x,y,"police",7)) crime-=12*budgetMul;
    crime+=Math.max(0,c.level-1)*4;
    if(c.type==="industrial") land-=14;
    if(c.connected) land+=7;
    land-=pollution*.5;
    land+=serviceNear(x,y,"park",5)?8:0;
    land+=serviceNear(x,y,"hospital",7)?4:0;
    land+=serviceNear(x,y,"police",7)?3:0;
    land+=serviceNear(x,y,"school",6)?4:0;

    c.pollution=clamp(pollution,0,100);
    c.land=clamp(land,0,100);
    c.education=clamp(edu,0,100);
    c.health=clamp(health,0,100);
    c.crime=clamp(crime,0,100);

    if(["residential","commercial","industrial"].includes(c.type)){
      zoneCount++;
      landSum+=c.land; pollutionSum+=c.pollution; eduSum+=c.education; healthSum+=c.health; crimeSum+=c.crime;
    }
  }
  city.landValue=zoneCount?landSum/zoneCount:50;
  city.pollutionAvg=zoneCount?pollutionSum/zoneCount:0;
  city.education=zoneCount?eduSum/zoneCount:0;
  city.health=zoneCount?healthSum/zoneCount:50;
  city.crime=zoneCount?crimeSum/zoneCount:0;
}

function simulateZones(develop=true){
  city.lastPopulation=city.population;
  let pop=0,jobs=0,roads=0,avenues=0;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const c=city.grid[y][x];
    if(develop)c.age++;
    if(c.type==="road"&&c.connected) roads++;
    if((c.type==="avenue"||c.type==="bridge")&&c.connected) avenues++;
    if(!["residential","commercial","industrial"].includes(c.type)) continue;

    const demand=c.type==="residential"?city.demands.res:c.type==="commercial"?city.demands.com:city.demands.ind;
    const tax=c.type==="residential"?city.taxes.res:c.type==="commercial"?city.taxes.com:city.taxes.ind;
    let quality=(c.land*.36+c.health*.18+c.education*.12+(100-c.crime)*.12+demand*.22);
    quality-=Math.max(0,tax-10)*5;
    if(!c.connected) quality-=65;
    if(!c.powered) quality-=35;
    if(!c.watered) quality-=35;
    if(city.weather==="Heatwave") quality-=5;
    if(city.weather==="Storm") quality-=4;

    if(districtPolicy(c)==='business'&&c.type!=='residential')quality+=10;
    if(c.density&&c.education<45)quality-=12;
    if(develop)c.distress=quality<24?Math.min(100,c.distress+1):Math.max(0,c.distress-2);
    const grow=clamp((quality-25)/110,0,.55);
    if(develop&&c.connected&&c.powered&&c.watered&&Math.random()<grow*.22 && c.level<4) c.level++;
    if(develop&&c.distress>=8)c.level=Math.max(0,c.level-1);
    if(develop&&((quality<24 && Math.random()<.12) || (!c.connected&&Math.random()<.09))) c.level=Math.max(0,c.level-1);

    if(c.type==="residential"){
      c.residents=c.level?Math.round([7,20,48,95][c.level-1]*(c.density?2.5:1)):0;
      pop+=c.residents;
    }else{
      c.jobs=c.level?(c.type==="commercial"?[5,15,36,70][c.level-1]:[8,23,52,100][c.level-1])*(c.density?2.5:1):0;
      c.jobs=Math.round(c.jobs);
      jobs+=c.jobs;
    }
  }

  city.population=pop;
  city.jobs=jobs;
  city.employed=Math.min(pop,jobs);
  const unemployment=pop?Math.max(0,(pop-city.employed)/pop):0;
  let transitStops=0;for(const row of city.grid)for(const c of row)if(c.connected)transitStops+=c.type==="bus"?1:c.type==="metro"?4:0;
  city.transitRiders=Math.round(Math.min(pop*.55,transitStops*(city.policies.freeTransit?75:50)));
  const roadCapacity=roads*18+avenues*42+city.transitRiders*.4;
  const pressure=(pop+jobs)/(Math.max(1,roadCapacity));
  city.traffic=Math.round(clamp(100-pressure*30+(city.policies.freeTransit?10:0),28,100));

  const utilityPenalty=(city.power.use>city.power.cap?16:0)+(city.water.use>city.water.cap?16:0);
  city.happiness=Math.round(clamp(
    62 + city.landValue*.12 + city.health*.1 + city.education*.06 - city.crime*.18 -
    unemployment*30 - (100-city.traffic)*.17 - city.pollutionAvg*.12 - utilityPenalty -
    Math.max(0,city.taxes.res-11)*2.1,5,100
  ));

  const jobGap=jobs-pop;
  city.demands.res=Math.round(clamp(58+jobGap*.018+(city.happiness-50)*.35-(city.taxes.res-9)*5,0,100));
  city.demands.com=Math.round(clamp(30+pop*.012-count("commercial")*5-(city.taxes.com-9)*4,0,100));
  city.demands.ind=Math.round(clamp(42+pop*.01-count("industrial")*6-(city.taxes.ind-9)*4,0,100));
}

function economyDay(){
  let upkeep=0;
  for(const row of city.grid) for(const c of row) upkeep+=(BUILD[c.type]?.upkeep||0)*(isZone(c.type)||isRoad(c.type)?1:city.serviceBudget/100);


  const resIncome=city.population*(city.taxes.res/100)*1.6;
  let comJobs=0,indJobs=0;
  for(const row of city.grid) for(const c of row){
    if(c.type==="commercial") comJobs+=c.jobs;
    if(c.type==="industrial") indJobs+=c.jobs;
  }
  const taxIncome=resIncome+comJobs*(city.taxes.com/100)*3.5+indJobs*(city.taxes.ind/100)*3;
  let policyCost=0;
  if(city.policies.green) policyCost+=60;
  if(city.policies.freeTransit) policyCost+=90;
  if(city.policies.education) policyCost+=80;

  let debtPayment=0;
  if(city.debt>0){
    debtPayment=Math.min(city.debt,100);
    city.debt-=debtPayment;
  }

  city.cashflow=Math.round(taxIncome-upkeep-policyCost-debtPayment);
  city.funds+=city.cashflow;
  city.history.push({population:city.population,cashflow:city.cashflow});if(city.history.length>40)city.history.shift();
  if(city.funds<-10000) city.funds=-10000;

  city.day++;
  if(city.day>360){city.day=1;city.year++}

  weatherRoll();
  disasterRoll();
  checkMission();
  checkMilestones();

  if((city.day-city.autosaveDay+360)%5===0){
    if(storeCity("metroforge-v5-autosave")){city.autosaveDay=city.day;$("autosaveText").textContent="Autosaved Y"+city.year+" D"+city.day;}
  }
}

function weatherRoll(){
  if(city.day%7!==0) return;
  const roll=Math.random();
  if(roll<.56) city.weather="Clear";
  else if(roll<.72) city.weather="Cloudy";
  else if(roll<.86) city.weather="Rain";
  else if(roll<.95) city.weather="Storm";
  else city.weather="Heatwave";
  city.temperature=Math.round(city.weather==="Heatwave"?rand(93,103):city.weather==="Rain"?rand(55,72):rand(62,88));
  rain=[];
  if(city.weather==="Rain"||city.weather==="Storm"){
    for(let i=0;i<150;i++) rain.push({x:rand(0,canvas.width),y:rand(0,canvas.height),s:rand(5,12)});
  }
}

function disasterRoll(){
  if(city.population<150) return;
  if(Math.random()>.025) return;
  const candidates=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const t=city.grid[y][x].type;
    if(["residential","commercial","industrial","power","waterTower"].includes(t)) candidates.push([x,y]);
  }
  if(!candidates.length) return;
  const [x,y]=candidates[rint(0,candidates.length-1)];
  const c=city.grid[y][x];

  if(city.weather==="Storm" && nearWater(x,y,3)){
    if(serviceNear(x,y,"fire",7) && Math.random()<.55){
      showEvent("Flood Warning","Emergency services prevented major damage.");
      return;
    }
    city.grid[y][x]=tileBase("empty");invalidate();
    city.funds-=500;
    showEvent("Flash Flood","A riverside property was lost. Emergency cost: $500.");
    return;
  }

  if(serviceNear(x,y,"fire",7) && Math.random()<.78){
    showEvent("Building Fire","Fire crews contained the incident with no major damage.");
    return;
  }
  city.grid[y][x]=tileBase("empty");invalidate();
  city.funds-=350;
  showEvent("Building Fire","A structure was destroyed. Emergency cost: $350.");
}

function checkMilestones(){
  MILESTONES.forEach((m,i)=>{
    if(city.population>=m.pop && !city.milestones.includes(i)){
      city.milestones.push(i);
      city.funds+=m.reward;
      showEvent("Milestone: "+m.title,"Population "+m.pop.toLocaleString()+" reached. Reward "+money(m.reward)+".");
    }
  });
}

function checkMission(){
  const m=city.mission;
  if(!m || m.complete) return;
  let done=false;
  if(m.id==="pop") done=city.population>=m.target;
  if(m.id==="happy") done=city.happiness>=m.target;
  if(m.id==="jobs") done=city.jobs>=m.target;
  if(m.id==="transit") done=city.transitRiders>=m.target;
  if(m.id==="green") done=city.population>=100 && city.pollutionAvg<=m.target;
  if(done){
    city.funds+=m.reward;
    m.complete=true;
    showEvent("Mission Complete",m.title+" rewarded "+money(m.reward)+".");
    city.mission=newMission(city);
  }
}

function simulationStep(develop=true){
  updateRoadConnectivity();
  utilityPass();
  environmentPass();
  simulateZones(develop);
  mapDirty=true;
}

function updateCars(){
  const target=Math.min(90,Math.floor((city.population+city.jobs)/35));
  spawnAccumulator+=animationDt;
  if(spawnAccumulator>.15&&cars.length<target&&tripOrigins.length&&tripDestinations.length){
    spawnAccumulator=0;
    // Limit path searches per frame; vehicles have actual home-to-job destinations.
    const home=tripOrigins[rint(0,tripOrigins.length-1)],job=tripDestinations[rint(0,tripDestinations.length-1)];
    if(city.grid[home.y][home.x].level&&city.grid[job.y][job.x].level){
      const path=shortestRoadPath(city.grid,home.road,job.road);
      if(path.length>1)cars.push({path,index:0,t:0,s:rand(1.3,2.3),color:['#ffd35e','#f7fafc','#68d8df','#ee8ba0'][rint(0,3)]});
    }
  }
  while(cars.length>target)cars.pop();
  trafficLoads.clear();
  for(const car of cars){
    const p=car.path[car.index],c=city.grid[p[1]][p[0]];
    car.t+=animationDt*city.speed*car.s*(c.type==='avenue'?1.4:1)*Math.max(.35,city.traffic/100);
    if(car.t>=1){car.t-=1;car.index++;if(car.index>=car.path.length-1){car.path.reverse();car.index=0;}}
    const key=p[1]*W+p[0];trafficLoads.set(key,(trafficLoads.get(key)||0)+1);
  }
  trafficPaintAccumulator+=animationDt;if(overlay==='traffic'&&trafficPaintAccumulator>.2){mapDirty=true;trafficPaintAccumulator=0;}
}

function zoneColor(type){
  if(type==="residential") return "#55cf7c";
  if(type==="commercial") return "#55a9ff";
  return "#e7b74b";
}

function drawBaseCell(c,x,y){
  const px=x*TILE,py=y*TILE;
  let color=c.type==='empty'?((x*13+y*7)%5===0?'#48735a':'#41694f'):BUILD[c.type].color;
  if(overlay==='land'&&c.type!=='water'){const v=c.land/100;color=`rgb(${190-120*v},${90+145*v},${70+40*v})`;}
  if(overlay==='pollution'&&c.type!=='water'){const v=c.pollution/100;color=`rgb(${55+190*v},${115-55*v},${70-20*v})`;}
  if(overlay==='traffic'&&c.type!=='water'){
    const v=clamp((trafficLoads.get(y*W+x)||0)/4,0,1);color=isRoad(c.type)?`rgb(${90+150*v},${150-80*v},70)`:'#284737';
  }
  if(overlay==='services'&&c.type!=='water'){const v=clamp((c.health+c.education+100-c.crime)/300,0,1);color=`rgb(${120-50*v},${90+120*v},${120+70*v})`;}
  ctx.fillStyle=color;ctx.fillRect(px,py,TILE,TILE);
  ctx.strokeStyle='rgba(0,0,0,.09)';ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1);
  if(c.district&&c.type!=='water'){
    ctx.fillStyle=['','rgba(89,210,255,.18)','rgba(255,190,75,.18)','rgba(194,106,255,.18)'][c.district];ctx.fillRect(px+1,py+1,TILE-2,TILE-2);
  }
  if(c.type==='water'){ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(px+4,py+7,12,2);ctx.fillRect(px+9,py+17,11,2);return;}
  if(isRoad(c.type)){
    ctx.fillStyle=overlay==='traffic'?color:c.type==='bridge'?'#738697':c.type==='avenue'?'#3b4654':'#46525a';ctx.fillRect(px,py,TILE,TILE);
    const links=neighbors(x,y).filter(([a,b])=>isRoad(city.grid[b][a].type));
    ctx.strokeStyle=c.connected?'#ddce8c':'#e99591';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();
    for(const [a,b]of links){ctx.moveTo(px+TILE/2,py+TILE/2);ctx.lineTo(px+TILE/2+(a-x)*TILE/2,py+TILE/2+(b-y)*TILE/2);}
    ctx.stroke();ctx.setLineDash([]);
    if(c.type==='bridge'){ctx.fillStyle='#c8d8de';ctx.fillRect(px,py+1,TILE,2);ctx.fillRect(px,py+TILE-3,TILE,2);}
    if(links.length>=3){ctx.fillStyle='#a9c9c5';ctx.fillRect(px+3,py+3,3,3);}return;
  }
  if(isZone(c.type)){
    if(!c.level){ctx.fillStyle='rgba(255,255,255,.17)';ctx.fillRect(px+4,py+4,TILE-8,TILE-8);}
    else {
      const high=c.density,h=8+c.level*2,width=high?17:13,bx=px+(high?4:6),by=py+TILE-4-h;
      ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(bx+3,by+4,width,h);
      ctx.fillStyle=c.distress>=8?'#646c72':c.type==='residential'?'#d4ddd2':c.type==='commercial'?'#adc5d4':'#d6c3a2';ctx.fillRect(bx,by,width,h);
      ctx.fillStyle=zoneColor(c.type);ctx.fillRect(bx-1,by-3,width+2,4);
      ctx.fillStyle='#426070';for(let wy=by+5;wy<by+h-2;wy+=5)for(let wx=bx+3;wx<bx+width-2;wx+=5)ctx.fillRect(wx,wy,2,3);
      if(high){ctx.fillStyle='#778fa1';ctx.fillRect(bx+width-5,by-6,4,3);}
    }
    if(!c.connected||!c.powered||!c.watered){ctx.fillStyle='#ff6878';ctx.fillRect(px+19,py+3,4,4);}return;
  }
  if(c.type==='park'){
    for(const [dx,dy]of [[8,8],[17,15],[7,19]]){ctx.fillStyle='#253f35';ctx.fillRect(px+dx,py+dy,2,4);ctx.fillStyle='#a0ce7a';ctx.beginPath();ctx.arc(px+dx,py+dy-2,4,0,Math.PI*2);ctx.fill();}return;
  }
  const icon={wind:'✥',power:'⚡',waterTower:'💧',fire:'F',police:'P',school:'S',hospital:'+',bus:'B',metro:'M',recycle:'R'}[c.type];
  if(icon){ctx.fillStyle='#e4ebe9';ctx.fillRect(px+4,py+5,TILE-8,TILE-9);ctx.fillStyle='#254b5b';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(icon,px+TILE/2,py+17);}
}

function drawCars(){
  if(overlay!=='none'&&overlay!=='traffic')return;
  for(const car of cars){
    const a=car.path[car.index],b=car.path[car.index+1];if(!b)continue;
    const x=(a[0]+(b[0]-a[0])*car.t)*TILE+TILE/2+(b[1]-a[1])*3;
    const y=(a[1]+(b[1]-a[1])*car.t)*TILE+TILE/2-(b[0]-a[0])*3;
    ctx.fillStyle=car.color;ctx.fillRect(x-2,y-2,b[0]===a[0]?3:6,b[0]===a[0]?6:3);
  }
}

function drawWeatherAndNight(){
  const hour=city.hour;
  let darkness=0;
  if(hour<6||hour>20) darkness=.4;
  else if(hour<8||hour>18) darkness=.18;
  if(darkness){
    ctx.fillStyle="rgba(3,8,20,"+darkness+")";
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  if(city.weather==="Rain"||city.weather==="Storm"){
    ctx.strokeStyle=city.weather==="Storm"?"rgba(190,220,255,.42)":"rgba(180,220,255,.3)";
    ctx.lineWidth=1;
    for(const p of rain){
      p.y+=p.s*city.speed*animationDt*60*(city.paused?0:1);
      p.x-=1.3*city.speed*animationDt*60*(city.paused?0:1);
      if(p.y>canvas.height){p.y=-10;p.x=rand(0,canvas.width)}
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-4,p.y+8);ctx.stroke();
    }
  }
}

function draw(){
  if(mapDirty){
    const main=ctx;ctx=mapCtx;ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)drawBaseCell(city.grid[y][x],x,y);
    ctx=main;mapDirty=false;
  }
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(mapLayer,0,0);
  drawCars();drawWeatherAndNight();
  if(inspectTile){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(inspectTile.x*TILE+1,inspectTile.y*TILE+1,TILE-2,TILE-2);ctx.lineWidth=1;}
}

function updateUI(){
  updateInspector();updateAdviser();drawTrends();
  $("funds").textContent=money(city.funds);
  $("cashflow").textContent=(city.cashflow>=0?"+":"")+money(city.cashflow)+"/day";
  $("population").textContent=city.population.toLocaleString();
  $("popTrend").textContent=(city.population-city.lastPopulation>=0?"+":"")+(city.population-city.lastPopulation);
  $("happiness").textContent=city.happiness+"%";
  $("healthMini").textContent="Health "+Math.round(city.health)+"%";
  $("traffic").textContent=city.traffic+"%";
  $("crimeMini").textContent="Crime "+Math.round(city.crime)+"%";
  $("dateText").textContent="Y"+city.year+" • Day "+city.day+" • "+String(Math.floor(city.hour)).padStart(2,"0")+":00";
  $("weatherText").textContent=city.weather+" • "+city.temperature+"°F";

  $("powerStat").textContent=Math.round(city.power.use)+" / "+city.power.cap+" MW";
  $("waterStat").textContent=Math.round(city.water.use)+" / "+city.water.cap+" ML";
  $("jobsStat").textContent=city.employed.toLocaleString()+" / "+city.jobs.toLocaleString();
  $("educationStat").textContent=Math.round(city.education)+"%";
  $("healthStat").textContent=Math.round(city.health)+"%";
  $("landStat").textContent=Math.round(city.landValue);
  $("pollutionStat").textContent=Math.round(city.pollutionAvg)+"%";
  $("transitStat").textContent=city.transitRiders.toLocaleString()+" riders";

  [["res",city.demands.res],["com",city.demands.com],["ind",city.demands.ind]].forEach(([k,v])=>{
    $(k+"Demand").style.width=v+"%";
    $(k+"DemandLabel").textContent=v+"%";
  });

  const alerts=[];
  const disconnected=city.grid.flat().filter(c=>!c.connected&&!isRoad(c.type)&&!["empty","water"].includes(c.type)).length;
  if(disconnected)alerts.push(["warn",disconnected+" properties need a connected road."]);
  if(city.power.use>city.power.cap) alerts.push(["bad","⚡ Not enough electricity."]);
  if(city.water.use>city.water.cap) alerts.push(["bad","💧 Not enough water."]);
  if(city.population>0 && city.jobs<city.population*.55) alerts.push(["warn","💼 The city needs more jobs."]);
  if(city.traffic<65) alerts.push(["warn","🚗 Congestion is hurting the economy."]);
  if(city.pollutionAvg>45) alerts.push(["warn","🌫 Pollution is becoming severe."]);
  if(city.crime>35) alerts.push(["warn","🚓 Crime is rising."]);
  if(city.health<45) alerts.push(["warn","🏥 Health services are weak."]);
  if(city.debt>0) alerts.push(["","🏦 Outstanding city debt: "+money(city.debt)]);
  if(city.funds<2500) alerts.push(["warn","💰 Treasury is running low."]);
  if(!alerts.length) alerts.push(["","✅ City systems are stable."]);
  $("alerts").innerHTML=alerts.map(([c,t])=>'<div class="alert '+c+'">'+t+"</div>").join("");

  $("milestones").innerHTML=MILESTONES.map((m,i)=>
    '<div class="milestone '+(city.milestones.includes(i)?"done":"")+'">'+
    (city.milestones.includes(i)?"✓ ":"")+m.title+" • "+m.pop.toLocaleString()+"<br><small>"+money(m.reward)+" reward</small></div>"
  ).join("");

  const m=city.mission;
  if(m){
    $("missionCard").innerHTML="<strong>"+m.title+"</strong><span>"+m.text.replace("{target}",m.target.toLocaleString())+
      "</span><br><small>Reward "+money(m.reward)+"</small>";
  }
}

function gameLoop(now){
  const dt=Math.min(.05,(now-lastFrame)/1000);
  lastFrame=now;animationDt=dt;
  if(networkDirty){updateRoadConnectivity();utilityPass();mapDirty=true;}
  if(!city.paused){
    city.hour+=dt*city.speed*1.7;
    if(city.hour>=24){
      city.hour-=24;
      economyDay();
    }
    simAccumulator+=dt*city.speed;
    if(simAccumulator>.7){
      simulationStep();
      simAccumulator-=.7;
    }
    updateCars();
  }
  draw();
  uiAccumulator+=dt;if(uiAccumulator>=.25){updateUI();uiAccumulator=0;}
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

document.querySelectorAll(".speed").forEach(b=>b.onclick=()=>{
  city.speed=Number(b.dataset.speed);
  city.paused=false;
  document.querySelectorAll(".speed").forEach(x=>x.classList.toggle("active",x===b));
  $("pauseBtn").classList.remove("active");
});
$("pauseBtn").onclick=()=>{city.paused=!city.paused;$("pauseBtn").classList.toggle("active",city.paused)};

document.querySelectorAll(".overlay").forEach(b=>b.onclick=()=>{
  overlay=b.dataset.overlay;mapDirty=true;
  $("overlayLegend").textContent={none:"City view • red dots indicate access or utility problems",land:"Land value • red = low, green = high",traffic:"Traffic • green = clear, red = busy road segment",pollution:"Pollution • green = clean, red = polluted",services:"Services • brighter tiles = stronger health, education and safety"}[overlay];
  document.querySelectorAll(".overlay").forEach(x=>x.classList.toggle("active",x===b));
});

[["res","resTax"],["com","comTax"],["ind","indTax"]].forEach(([k,id])=>{
  const el=$(id);
  el.oninput=()=>{
    city.taxes[k]=Number(el.value);
    $(k+"TaxLabel").textContent=el.value+"%";
  };
});
$("serviceBudget").oninput=e=>{
  city.serviceBudget=Number(e.target.value);mapDirty=true;
  $("serviceBudgetLabel").textContent=e.target.value+"%";
};
$("greenPolicy").onchange=e=>city.policies.green=e.target.checked;
$("freeTransitPolicy").onchange=e=>city.policies.freeTransit=e.target.checked;
$("educationPolicy").onchange=e=>city.policies.education=e.target.checked;

function syncControls(){
  $("resTax").value=city.taxes.res;$("resTaxLabel").textContent=city.taxes.res+"%";
  $("comTax").value=city.taxes.com;$("comTaxLabel").textContent=city.taxes.com+"%";
  $("indTax").value=city.taxes.ind;$("indTaxLabel").textContent=city.taxes.ind+"%";
  $("serviceBudget").value=city.serviceBudget;$("serviceBudgetLabel").textContent=city.serviceBudget+"%";
  $("greenPolicy").checked=!!city.policies.green;
  $("freeTransitPolicy").checked=!!city.policies.freeTransit;
  $("educationPolicy").checked=!!city.policies.education;
}

function storeCity(key){
  try{localStorage.setItem(key,JSON.stringify({version:5,city}));return true;}
  catch{$('autosaveText').textContent='Save unavailable — export a backup';showToast('Browser storage unavailable. Use Export.');return false;}
}
function loadRaw(raw){
  const next=parseSave(raw,freshCity(),Object.keys(BUILD),W,H);
  if(next.mission){const template=MISSIONS.find(m=>m.id===next.mission.id);next.mission={...template,...next.mission};}
  city=next;cars=[];rain=[];if(city.weather==="Rain"||city.weather==="Storm")for(let i=0;i<150;i++)rain.push({x:rand(0,canvas.width),y:rand(0,canvas.height),s:rand(5,12)});simAccumulator=0;inspectTile=null;invalidate();simulationStep(false);syncControls();syncV5Controls();updateUI();
}
$('saveBtn').onclick=()=>{if(storeCity('metroforge-v5-save'))showToast('City saved.');};
$('loadBtn').onclick=()=>{
  try{
    const raw=localStorage.getItem('metroforge-v5-save')||localStorage.getItem('metroforge-v5-autosave')||localStorage.getItem('metroforge-v4-save')||localStorage.getItem('metroforge-v4-autosave');
    if(!raw)return showToast('No saved city found.');loadRaw(raw);showToast('City loaded. V4 saves migrate to V5.');
  }catch{showToast('Invalid save. Your current city was kept.');}
};
$("loanBtn").onclick=()=>{
  if(city.debt>=30000) return showToast("Loan limit reached.");
  city.funds+=10000;
  city.debt+=12000;
  showEvent("Municipal Loan","Received $10,000. Total repayment added: $12,000.");
};
$("rerollMission").onclick=()=>{
  if(city.funds<250) return showToast("Need $250 to reroll.");
  city.funds-=250;
  city.mission=newMission(city);
  showToast("New mission assigned.");
};
$("newBtn").onclick=()=>{
  if(confirm("Generate a brand-new MetroForge V5 city? Unsaved progress will be lost.")){
    city=freshCity();cars=[];rain=[];inspectTile=null;invalidate();simulationStep();syncControls();syncV5Controls();showToast("New procedural city generated.");
  }
};

window.addEventListener('beforeunload',()=>storeCity('metroforge-v5-autosave'));
document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(document.hidden)storeCity('metroforge-v5-autosave');});

function syncV5Controls(){
  Array.from($('districtSelect').options).slice(0,3).forEach((o,i)=>o.textContent=city.districtNames[i]+' · '+['cyan','amber','violet'][i]);
  $('districtName').disabled=!districtBrush;$('districtPolicy').disabled=!districtBrush;
  $('districtName').value=city.districtNames[Math.max(0,districtBrush-1)];
  $('districtPolicy').value=city.districtPolicies[Math.max(0,districtBrush-1)];
  $('pauseBtn').classList.toggle('active',city.paused);
  document.querySelectorAll('.speed').forEach(b=>b.classList.toggle('active',!city.paused&&Number(b.dataset.speed)===city.speed));
}
function updateInspector(){
  const box=$('inspector');if(!inspectTile){box.textContent='Choose Inspect, then select any property. Red dots mark road or utility problems.';return;}
  const {x,y}=inspectTile,c=city.grid[y][x];
  const lines=[BUILD[c.type].name+' • '+x+', '+y];
  if(isZone(c.type))lines.push((c.density?'High':'Low')+' density • Level '+c.level+'/4',c.residents+' residents • '+c.jobs+' jobs',c.distress>=8?'Abandoned — restore utilities and road access':'Development pressure: '+c.distress+'/8',c.powered?'Power connected':'Needs electricity',c.watered?'Water connected':'Needs water');
  if(!['water','empty'].includes(c.type))lines.push(c.connected?'Connected to highway':'No highway access');
  lines.push('Land value '+Math.round(c.land)+' • Pollution '+Math.round(c.pollution)+'%',c.district?'District: '+city.districtNames[c.district-1]:'Outside a district');
  box.replaceChildren(...lines.map((line,i)=>{const e=document.createElement(i===0?'strong':'div');e.textContent=line;return e;}));
}
function updateAdviser(){
  let advice='Expand homes and jobs together. Parks and schools encourage taller buildings.';
  if(!count('residential'))advice='Start here: extend the highway, zone homes and jobs along it, then add power and water.';
  else if(!city.power.cap)advice='Build a power plant or wind turbine next to a connected road.';
  else if(!city.water.cap)advice='Add a water tower next to a connected road so homes can grow.';
  else if(city.jobs<city.population*.6)advice='Your city needs jobs. Zone shops and industry along connected roads.';
  else if(city.traffic<65)advice='Upgrade busy roads to avenues. Add connected bus stops or metro stations.';
  else if(city.cashflow<0)advice='Expenses exceed taxes. Grow your tax base and avoid adding unnecessary services.';
  $('adviser').textContent=advice;
}
function drawTrends(){
  const c=$('trendCanvas'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
  if(city.history.length<2)return;
  const max=Math.max(100,...city.history.map(h=>h.population));g.strokeStyle='#7edbb6';g.lineWidth=2;g.beginPath();
  city.history.forEach((h,i)=>{const x=4+i/(city.history.length-1)*(c.width-8),y=c.height-4-h.population/max*(c.height-8);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();
}
$('densitySelect').onchange=e=>{density=Number(e.target.value);showToast(density?'New zones support 2.5× capacity; education helps them grow.':'New zones use low density.');};
$('districtSelect').onchange=e=>{districtBrush=Number(e.target.value);syncV5Controls();};
$('districtName').onchange=e=>{if(districtBrush){city.districtNames[districtBrush-1]=e.target.value.trim().slice(0,24)||'District '+districtBrush;syncV5Controls();}};
$('districtPolicy').onchange=e=>{if(districtBrush){city.districtPolicies[districtBrush-1]=e.target.value;mapDirty=true;}};
$('zoomIn').onclick=()=>{camera.zoom=clamp(camera.zoom*1.2,1,3);applyCamera();};
$('zoomOut').onclick=()=>{camera.zoom=clamp(camera.zoom/1.2,1,3);applyCamera();};
$('resetView').onclick=()=>{camera={zoom:1,x:0,y:0};applyCamera();};
$('exportBtn').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:5,city})],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='metroforge-v5-city.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('importBtn').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>3e6){showToast('Save file is too large.');e.target.value='';return;}
  try{loadRaw(await f.text());showToast('City imported.');}catch{showToast('Invalid save. Current city was kept.');}e.target.value='';};
for(const id of ['buildTab','cityTab','mapTab'])$(id).onclick=()=>{
  document.body.dataset.mobilePanel=id==='buildTab'?'build':id==='cityTab'?'city':'map';
  document.querySelectorAll('.mobile-tabs button').forEach(b=>b.classList.toggle('active',b.id===id));
};
window.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();$('pauseBtn').click();}
  const shortcuts={r:'road',a:'avenue',b:'bulldoze',i:'inspect',p:'pan',h:'residential',c:'commercial',f:'industrial'};
  if(shortcuts[e.key.toLowerCase()])setTool(shortcuts[e.key.toLowerCase()]);
  if(e.key==='Escape'){inspectTile=null;setTool('inspect');}
});
$('demoBtn').onclick=()=>{
  if(!confirm('Start a fresh showcase city? Save or export your current city first.'))return;
  city=freshCity();
  const put=(x,y,type,level=0)=>{const t=tileBase(type);t.level=level;city.grid[y][x]=t;};
  for(let x=0;x<27;x++)put(x,27,'avenue');
  for(const y of [9,15,21])for(let x=5;x<27;x++)put(x,y,'road');
  for(const x of [5,12,19,26])for(let y=9;y<27;y++)put(x,y,'avenue');
  for(const y of [10,14,16,20,22,26])for(let x=6;x<26;x++){
    if(isRoad(city.grid[y][x].type))continue;
    const type=x>20?'industrial':y===20?'commercial':'residential';put(x,y,type,2);city.grid[y][x].district=x>20?3:x>12?2:1;
  }
  for(const [x,y,t]of [[6,8,'wind'],[7,8,'wind'],[8,8,'waterTower'],[13,8,'school'],[14,8,'park'],[15,8,'hospital'],[20,8,'power'],[21,8,'recycle'],[6,16,'police'],[13,16,'fire'],[6,22,'bus'],[13,22,'bus'],[20,22,'metro']])put(x,y,t);
  cars=[];rain=[];inspectTile=null;invalidate();simulationStep();city.funds=50000;city.paused=true;syncControls();syncV5Controls();updateUI();showToast('Showcase loaded and paused. Press Play to grow your city.');
};
simulationStep();syncControls();syncV5Controls();updateUI();applyCamera();
