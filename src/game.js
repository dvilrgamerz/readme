const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
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
  ["road","🛣️"],["avenue","🛤️"],["residential","🏠"],["commercial","🏪"],
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
let viewScale = 1;
let cars = [];
let rain = [];

function tileBase(type="empty"){
  return {
    type, level:0, residents:0, jobs:0, age:0,
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
    autosaveDay:0
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

function isRoad(type){
  return type==="road" || type==="avenue";
}

function serviceNear(x,y,type,radius){
  for(let yy=Math.max(0,y-radius);yy<=Math.min(H-1,y+radius);yy++){
    for(let xx=Math.max(0,x-radius);xx<=Math.min(W-1,x+radius);xx++){
      if(city.grid[yy][xx].type===type && Math.abs(xx-x)+Math.abs(yy-y)<=radius) return true;
    }
  }
  return false;
}

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
  const meta = tool==="bulldoze" ? {name:"Bulldoze"} : BUILD[tool];
  $("selectedName").textContent = meta?.name || tool;
  $("modeHint").textContent = tool==="district" ? "Paint districts by clicking land" : tool==="bulldoze" ? "Remove buildings and roads" : "Drag to build "+(meta?.name||tool);
}

function makeTools(){
  const g = $("toolGrid");
  g.innerHTML="";
  for(const [key,icon] of TOOLS){
    const meta = key==="bulldoze" ? {name:"Bulldoze",cost:5} : BUILD[key];
    const b = document.createElement("button");
    b.className="tool";
    b.dataset.tool=key;
    b.innerHTML="<strong>"+icon+" "+meta.name+"</strong><span>"+(meta.cost ? money(meta.cost) : "Free")+"</span>";
    b.onclick=()=>setTool(key);
    g.appendChild(b);
  }
  setTool("road");
}
makeTools();

function pointerTile(e){
  const r=canvas.getBoundingClientRect();
  return {
    x:Math.floor((e.clientX-r.left)*(canvas.width/r.width)/TILE),
    y:Math.floor((e.clientY-r.top)*(canvas.height/r.height)/TILE)
  };
}

function build(x,y,tool=selected){
  const cell = city.grid[y]?.[x];
  if(!cell) return;
  const sig=x+":"+y+":"+tool;
  if(sig===lastPaint) return;
  lastPaint=sig;

  if(tool==="district"){
    if(cell.type==="water") return;
    cell.district=(cell.district+1)%4;
    showToast(cell.district===0 ? "District cleared" : "District "+city.districtNames[cell.district-1]);
    return;
  }

  if(tool==="bulldoze"){
    if(cell.type==="empty" || cell.type==="water") return;
    if(city.funds<5) return showToast("Not enough money.");
    city.funds-=5;
    city.grid[y][x]=tileBase("empty");
    return;
  }

  if(cell.type!=="empty") return;
  const meta=BUILD[tool];
  if(!meta) return;
  if(city.funds<meta.cost) return showToast("Not enough money.");
  city.funds-=meta.cost;
  city.grid[y][x]=tileBase(tool);
}

canvas.addEventListener("mousedown",e=>{
  e.preventDefault();
  pointerDown=true; lastPaint="";
  const p=pointerTile(e);
  build(p.x,p.y,e.button===2?"bulldoze":selected);
});
canvas.addEventListener("mousemove",e=>{
  const p=pointerTile(e);
  $("coords").textContent=p.x+", "+p.y;
  const cell=city.grid[p.y]?.[p.x];
  if(cell){
    const tip=$("tooltip");
    tip.style.left=Math.min(e.offsetX+14,canvas.parentElement.clientWidth-220)+"px";
    tip.style.top=Math.min(e.offsetY+12,canvas.parentElement.clientHeight-110)+"px";
    tip.innerHTML="<strong>"+BUILD[cell.type].name+"</strong>"+
      (cell.level ? "<br>Level "+cell.level : "")+
      (cell.residents ? "<br>"+cell.residents+" residents" : "")+
      (cell.jobs ? "<br>"+cell.jobs+" jobs" : "")+
      "<br>Land value "+Math.round(cell.land)+
      "<br>Pollution "+Math.round(cell.pollution)+"%"+
      (cell.district ? "<br>District: "+city.districtNames[cell.district-1] : "");
    tip.classList.remove("hidden");
  }
  if(pointerDown) build(p.x,p.y,e.buttons===2?"bulldoze":selected);
});
canvas.addEventListener("mouseleave",()=>{$("tooltip").classList.add("hidden");pointerDown=false;lastPaint=""});
window.addEventListener("mouseup",()=>{pointerDown=false;lastPaint=""});
canvas.addEventListener("contextmenu",e=>e.preventDefault());
canvas.addEventListener("wheel",e=>{
  e.preventDefault();
  viewScale=clamp(viewScale+(e.deltaY<0?.08:-.08),.78,1.3);
  canvas.style.width=(canvas.width*viewScale)+"px";
},{passive:false});

function updateRoadConnectivity(){
  const seen=new Set();
  const q=[];
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      if((x===0||y===H-1||y===0) && isRoad(city.grid[y][x].type)){
        q.push([x,y]);
        seen.add(x+","+y);
      }
    }
  }
  while(q.length){
    const [x,y]=q.shift();
    for(const [nx,ny] of neighbors(x,y)){
      const key=nx+","+ny;
      if(!seen.has(key) && isRoad(city.grid[ny][nx].type)){
        seen.add(key); q.push([nx,ny]);
      }
    }
  }
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const c=city.grid[y][x];
    if(isRoad(c.type)) c.connected=seen.has(x+","+y);
    else if(["residential","commercial","industrial","park","fire","police","school","hospital","bus","metro","recycle","power","waterTower"].includes(c.type)){
      c.connected=neighbors(x,y).some(([nx,ny])=>isRoad(city.grid[ny][nx].type)&&city.grid[ny][nx].connected);
    }
  }
}

function utilityPass(){
  let pCap=0,wCap=0,pUse=0,wUse=0;
  for(const row of city.grid) for(const c of row){
    if(c.type==="power") pCap+=900;
    if(c.type==="waterTower") wCap+=750;
    if(["residential","commercial","industrial"].includes(c.type)){
      const scale=Math.max(1,c.level);
      pUse+=3.5*scale; wUse+=2.7*scale;
    }
  }
  city.power={cap:pCap,use:pUse};
  city.water={cap:wCap,use:wUse};
  const powerOK=pUse===0||pCap>=pUse;
  const waterOK=wUse===0||wCap>=wUse;
  for(const row of city.grid) for(const c of row){
    if(["residential","commercial","industrial"].includes(c.type)){
      c.powered=powerOK; c.watered=waterOK;
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

    for(let yy=Math.max(0,y-5);yy<=Math.min(H-1,y+5);yy++){
      for(let xx=Math.max(0,x-5);xx<=Math.min(W-1,x+5);xx++){
        const d=Math.abs(xx-x)+Math.abs(yy-y);
        if(d>5) continue;
        const t=city.grid[yy][xx].type;
        if(t==="industrial") pollution+=Math.max(0,8-d);
        if(t==="power") pollution+=Math.max(0,14-d*2);
        if(t==="recycle") pollution+=Math.max(0,4-d);
        if(t==="park") land+=Math.max(0,8-d);
        if(t==="water" && d<=2) land+=2;
      }
    }
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

function simulateZones(){
  city.lastPopulation=city.population;
  let pop=0,jobs=0,roads=0,avenues=0;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const c=city.grid[y][x];
    c.age++;
    if(c.type==="road") roads++;
    if(c.type==="avenue") avenues++;
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

    const grow=clamp((quality-25)/110,.01,.55);
    if(Math.random()<grow*.13 && c.level<4) c.level++;
    if((quality<24 && Math.random()<.12) || (!c.connected&&Math.random()<.09)) c.level=Math.max(0,c.level-1);

    if(c.type==="residential"){
      c.residents=c.level?[7,20,48,95][c.level-1]:0;
      pop+=c.residents;
    }else{
      c.jobs=c.level?(c.type==="commercial"?[5,15,36,70][c.level-1]:[8,23,52,100][c.level-1]):0;
      jobs+=c.jobs;
    }
  }

  city.population=pop;
  city.jobs=jobs;
  city.employed=Math.min(pop,jobs);
  const unemployment=pop?Math.max(0,(pop-city.employed)/pop):0;
  const transitStops=count("bus")+count("metro")*4;
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
  for(const row of city.grid) for(const c of row) upkeep+=(BUILD[c.type]?.upkeep||0);
  upkeep*=city.serviceBudget/100;

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
  if(city.funds<-10000) city.funds=-10000;

  city.day++;
  city.hour=8;
  if(city.day>360){city.day=1;city.year++}

  weatherRoll();
  disasterRoll();
  checkMission();
  checkMilestones();

  if((city.day-city.autosaveDay+360)%5===0){
    localStorage.setItem("metroforge-v4-autosave",JSON.stringify(city));
    city.autosaveDay=city.day;
    $("autosaveText").textContent="Autosaved Y"+city.year+" D"+city.day;
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
    city.grid[y][x]=tileBase("empty");
    city.funds-=500;
    showEvent("Flash Flood","A riverside property was lost. Emergency cost: $500.");
    return;
  }

  if(serviceNear(x,y,"fire",7) && Math.random()<.78){
    showEvent("Building Fire","Fire crews contained the incident with no major damage.");
    return;
  }
  city.grid[y][x]=tileBase("empty");
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
    setTimeout(()=>{city.mission=newMission(city)},1200);
  }
}

function simulationStep(){
  updateRoadConnectivity();
  utilityPass();
  environmentPass();
  simulateZones();
}

function updateCars(){
  const roadTiles=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(isRoad(city.grid[y][x].type)&&city.grid[y][x].connected) roadTiles.push([x,y]);

  const target=Math.min(80,Math.floor((city.population+city.jobs)/80));
  while(cars.length<target && roadTiles.length){
    const [x,y]=roadTiles[rint(0,roadTiles.length-1)];
    cars.push({x,y,px:x,py:y,tx:x,ty:y,t:1,s:rand(.03,.07),dir:0});
  }
  while(cars.length>target) cars.pop();

  for(const car of cars){
    car.t+=car.s*city.speed;
    if(car.t>=1){
      car.x=car.tx;car.y=car.ty;car.px=car.x;car.py=car.y;car.t=0;
      const opts=neighbors(car.x,car.y).filter(([nx,ny])=>isRoad(city.grid[ny][nx].type)&&city.grid[ny][nx].connected);
      if(opts.length){
        const [nx,ny]=opts[rint(0,opts.length-1)];
        car.tx=nx;car.ty=ny;
      }
    }
  }
}

function zoneColor(type){
  if(type==="residential") return "#55cf7c";
  if(type==="commercial") return "#55a9ff";
  return "#e7b74b";
}

function drawBaseCell(c,x,y){
  const px=x*TILE, py=y*TILE;
  let color=BUILD[c.type].color;

  if(overlay==="land" && c.type!=="water"){
    const v=c.land/100;
    color="rgb("+Math.round(190-120*v)+","+Math.round(90+145*v)+","+Math.round(70+40*v)+")";
  }
  if(overlay==="pollution" && c.type!=="water"){
    const v=c.pollution/100;
    color="rgb("+Math.round(55+190*v)+","+Math.round(115-55*v)+","+Math.round(70-20*v)+")";
  }
  if(overlay==="traffic" && c.type!=="water"){
    if(isRoad(c.type)){
      const v=(100-city.traffic)/100;
      color="rgb("+Math.round(90+150*v)+","+Math.round(150-80*v)+",70)";
    } else color="#284737";
  }
  if(overlay==="services" && c.type!=="water"){
    const score=clamp((c.health+c.education+(100-c.crime))/300,0,1);
    color="rgb("+Math.round(120-50*score)+","+Math.round(90+120*score)+","+Math.round(120+70*score)+")";
  }

  ctx.fillStyle=color;
  ctx.fillRect(px,py,TILE,TILE);
  ctx.strokeStyle="rgba(0,0,0,.11)";
  ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1);

  if(c.district>0 && c.type!=="water"){
    const ds=["","rgba(89,210,255,.11)","rgba(255,190,75,.12)","rgba(194,106,255,.12)"];
    ctx.fillStyle=ds[c.district];
    ctx.fillRect(px+1,py+1,TILE-2,TILE-2);
  }

  if(c.type==="water"){
    ctx.fillStyle="rgba(255,255,255,.12)";
    ctx.fillRect(px+4,py+7,12,2);
    ctx.fillRect(px+9,py+17,11,2);
    return;
  }

  if(isRoad(c.type)){
    ctx.fillStyle=c.type==="avenue"?"#313a47":"#363c45";
    ctx.fillRect(px,py,TILE,TILE);
    ctx.strokeStyle=c.connected?"#d2c267":"#8b5e5e";
    ctx.setLineDash([4,4]);
    ctx.beginPath();
    ctx.moveTo(px+2,py+TILE/2);
    ctx.lineTo(px+TILE-2,py+TILE/2);
    ctx.stroke();
    ctx.setLineDash([]);
    if(c.type==="avenue"){
      ctx.strokeStyle="#d7dfe9";
      ctx.globalAlpha=.45;
      ctx.beginPath();ctx.moveTo(px+2,py+8);ctx.lineTo(px+TILE-2,py+8);ctx.stroke();
      ctx.globalAlpha=1;
    }
    return;
  }

  if(["residential","commercial","industrial"].includes(c.type)){
    ctx.fillStyle=c.level?"#14202f":"rgba(255,255,255,.17)";
    const h=4+c.level*4;
    ctx.fillRect(px+5,py+TILE-5-h,TILE-10,h);
    if(c.level){
      ctx.fillStyle=zoneColor(c.type);
      ctx.globalAlpha=.65;
      ctx.fillRect(px+7,py+TILE-8-h,3,3);
      ctx.fillRect(px+13,py+TILE-8-h,3,3);
      ctx.globalAlpha=1;
    }
    if(!c.connected){
      ctx.fillStyle="#ff6878";ctx.fillRect(px+19,py+3,3,3);
    }
    return;
  }

  const icon={park:"●",power:"⚡",waterTower:"💧",fire:"F",police:"P",school:"S",hospital:"+",bus:"B",metro:"M",recycle:"R"}[c.type];
  if(icon){
    ctx.fillStyle="#06101b";
    ctx.font="bold 13px system-ui";
    ctx.textAlign="center";
    ctx.fillText(icon,px+TILE/2,py+17);
  }
}

function drawCars(){
  if(overlay!=="none" && overlay!=="traffic") return;
  for(const car of cars){
    const x=(car.px+(car.tx-car.px)*car.t)*TILE+TILE/2;
    const y=(car.py+(car.ty-car.py)*car.t)*TILE+TILE/2;
    ctx.fillStyle="#ffd35e";
    ctx.fillRect(x-2,y-1,4,3);
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
      p.y+=p.s*city.speed;
      p.x-=1.3*city.speed;
      if(p.y>canvas.height){p.y=-10;p.x=rand(0,canvas.width)}
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-4,p.y+8);ctx.stroke();
    }
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) drawBaseCell(city.grid[y][x],x,y);
  drawCars();
  drawWeatherAndNight();
}

function updateUI(){
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
  lastFrame=now;
  if(!city.paused){
    city.hour+=dt*city.speed*1.7;
    if(city.hour>=24){
      city.hour-=24;
      economyDay();
    }
    simAccumulator+=dt*city.speed;
    if(simAccumulator>.7){
      simulationStep();
      simAccumulator=0;
    }
    updateCars();
  }
  draw();
  updateUI();
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
  overlay=b.dataset.overlay;
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
  city.serviceBudget=Number(e.target.value);
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

$("saveBtn").onclick=()=>{
  localStorage.setItem("metroforge-v4-save",JSON.stringify(city));
  showToast("City saved.");
};
$("loadBtn").onclick=()=>{
  const raw=localStorage.getItem("metroforge-v4-save")||localStorage.getItem("metroforge-v4-autosave");
  if(!raw) return showToast("No V4 save found.");
  try{
    city=JSON.parse(raw);
    if(!city.mission) city.mission=newMission(city);
    if(!city.policies) city.policies={green:false,freeTransit:false,education:false};
    syncControls();
    showToast("City loaded.");
  }catch(e){showToast("Save could not be loaded.");}
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
  if(confirm("Generate a brand-new MetroForge V4 city? Unsaved progress will be lost.")){
    city=freshCity();cars=[];rain=[];syncControls();showToast("New procedural city generated.");
  }
};

window.addEventListener("beforeunload",()=>localStorage.setItem("metroforge-v4-autosave",JSON.stringify(city)));
simulationStep();
syncControls();
