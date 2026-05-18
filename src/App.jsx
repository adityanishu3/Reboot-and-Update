import { useState, useEffect } from "react";
import { supabase } from './supabase'
/* ══════════════════════════════════════════════════════════════════
   ANIMATION ENGINE
══════════════════════════════════════════════════════════════════ */
const ANIM = `
  @keyframes scan    { to { transform: rotate(360deg); } }
  @keyframes gpulse  { 0%,100%{opacity:.35} 50%{opacity:.9} }
  @keytml dash       { from{stroke-dashoffset:28} to{stroke-dashoffset:0} }
  @keyframes dash    { from{stroke-dashoffset:28} to{stroke-dashoffset:0} }
  @keyframes tscroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes fadein  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ringon  { from{stroke-dashoffset:440} to{stroke-dashoffset:var(--offset)} }
  @keyframes riskpls { 0%,100%{background:rgba(255,61,113,.06)} 50%{background:rgba(255,61,113,.18)} }
  @keyframes ambpls  { 0%,100%{background:rgba(255,171,0,.05)} 50%{background:rgba(255,171,0,.15)} }
  @keyframes cyanpls { 0%,100%{background:rgba(0,229,255,.04)} 50%{background:rgba(0,229,255,.12)} }
  * { box-sizing:border-box; margin:0; padding:0; }
  ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(0,229,255,.3);border-radius:2px}
  input[type=range]{-webkit-appearance:none;height:3px;border-radius:2px;outline:none;cursor:pointer}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;cursor:pointer}
  textarea{resize:vertical}
`;

/* ══════════════════════════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════════════════════════ */
const T = {
  bg:"#030c18", grid:"rgba(0,229,255,0.03)", surface:"rgba(0,15,40,0.8)",
  glass:"rgba(0,80,160,0.08)", border:"rgba(0,229,255,0.12)", borderAm:"rgba(255,171,0,0.14)",
  cyan:"#00e5ff", cyanD:"rgba(0,229,255,0.5)", cyanDim:"rgba(0,229,255,0.12)",
  amber:"#ffab00", amberD:"rgba(255,171,0,0.5)", amberDim:"rgba(255,171,0,0.12)",
  green:"#00e676", greenD:"rgba(0,230,118,0.5)", greenDim:"rgba(0,230,118,0.1)",
  red:"#ff3d71", redD:"rgba(255,61,113,0.5)", redDim:"rgba(255,61,113,0.1)",
  violet:"#a07aff",
  txt:"rgba(200,225,245,0.9)", txtD:"rgba(160,195,230,0.55)", txtB:"#e8f4ff",
  mono:"'Courier New',monospace",
};

/* ══════════════════════════════════════════════════════════════════
   DOMAIN DATA
══════════════════════════════════════════════════════════════════ */
const DOMAINS = [
  {id:"wave",  label:"WAVE FORCES INTEL",      short:"WAVE",  domain:"offshore", c:"#00e5ff"},
  {id:"sacs",  label:"SACS STRUCTURAL OPS",    short:"SACS",  domain:"offshore", c:"#18cfff"},
  {id:"api",   label:"API RP 2A COMMAND",      short:"API",   domain:"offshore", c:"#36b8f0"},
  {id:"offgeo",label:"MARINE FOUNDATION SYS",  short:"M.GEO", domain:"offshore", c:"#60a8e8"},
  {id:"rcc",   label:"INDUSTRIAL CIVIL SYS",   short:"CIVIL", domain:"onshore",  c:"#ffab00"},
  {id:"steel", label:"STEEL STRUCTURE OPS",    short:"STEEL", domain:"onshore",  c:"#ffc840"},
  {id:"ongeo", label:"FOUNDATION ANALYSIS",    short:"FOUND", domain:"onshore",  c:"#e09000"},
  {id:"epc",   label:"EPC WORKFLOW INTEL",     short:"EPC",   domain:"shared",   c:"#00e676"},
];
const DEPS = { sacs:["wave"], api:["sacs"], offgeo:["api"], steel:["rcc"], ongeo:["rcc"], epc:["wave","rcc"] };

/* ══════════════════════════════════════════════════════════════════
   REVIEW SCENARIOS
══════════════════════════════════════════════════════════════════ */
const SCENARIOS = [
  { id:"sacs01", domain:"offshore", label:"SACS IN-PLACE ANALYSIS",
    class:"OFFSHORE · STRUCTURAL ANALYSIS OPS", urgency:"CRITICAL",
    doc:`SACS in-place analysis · Fixed 4-leg jacket · 30m WD · Arabian Sea

 ◈  Peak chord UC = 0.94 (API limit = 1.0)
 ◈  Wave height applied: Hs = 5.2m  [Design Basis: 100-yr Hs = 6.8m]
 ◈  Hydrodynamic coefficient: Cd = 0.65 (all members, no marine growth)
 ◈  Wave direction: 0° only — no omnidirectional analysis performed
 ◈  Pile connections: PINNED — no soil springs modelled
 ◈  Load combo: Dead + Wave (100-yr) only — wind & current excluded
 ◈  Marine growth: not specified in input file`,
    sp:`You are evaluating an offshore structural engineering technical authority candidate's review of a SACS in-place analysis report. The 6 critical issues are: (1) Wave height 5.2m below design basis 100-yr value 6.8m — non-conservative, violates API RP 2A Section 2.3.1; (2) Cd=0.65 for clean member — marine growth demands Cd~1.05 per API RP 2A Section 2.3.1b; (3) Unidirectional wave only — API RP 2A requires omnidirectional analysis minimum 8 directions; (4) Pinned pile model — non-conservative, API RP 2A Section 6.7 requires p-y t-z Q-z soil springs; (5) Load combination incomplete — API RP 2A Table 2.3.4 requires wave+wind+current combined; (6) Marine growth not modelled increases hydrodynamic loading significantly. Score: Accuracy (did they identify real correct issues?), Completeness (how many of 6 caught?), Code citation (API RP 2A sections cited?), Engineering judgment (severity classification, authoritative language), Professional standard. Return ONLY valid JSON no markdown: {"overallScore":0-100,"accuracy":0-100,"completeness":0-100,"codeCitation":0-100,"judgment":0-100,"issuesFound":0-6,"verdict":"PASS|CONDITIONAL PASS|FAIL","feedback":"concise 2-sentence summary","strengths":["item"],"gaps":["item"]}` },
  { id:"rcc01", domain:"onshore", label:"COMPRESSOR FOUNDATION REVIEW",
    class:"ONSHORE · INDUSTRIAL CIVIL OPS", urgency:"HIGH",
    doc:`RCC design calc package · Gas compressor foundation
 Loads: 2500 kN vertical · 180 kN horizontal (operating)

 ◈  Foundation: 3.5×3.5×1.2m isolated raft, medium-dense sand (φ=32°)
 ◈  Bearing capacity (Terzaghi): 320 kN/m²  |  Applied: 204 kN/m²
 ◈  Calculated FOS = 320/204 = 1.57  [IS 6403 minimum = 2.5 for gross]
 ◈  Reinforcement: T20@150 both ways top & bottom · Cover: 40mm
 ◈  Concrete M25 · Steel Fe415
 ◈  Settlement analysis: NOT provided
 ◈  Site: Seismic Zone III — seismic analysis: NOT performed
 ◈  IS 456 minimum reinforcement check: NOT shown`,
    sp:`You are evaluating an onshore civil engineering technical authority candidate's review of an RCC compressor foundation design package. The 5 critical issues are: (1) Bearing capacity FOS = 1.57 — BELOW IS 6403 mandatory minimum of 2.5 (gross) or 3.0 (net) — MAJOR non-compliance; (2) Settlement analysis missing — IS 1904 and IS 6403 both require settlement verification for industrial foundations — MAJOR omission; (3) Seismic Zone III — IS 1893 Part 1 seismic analysis mandatory for machine foundation — not performed — MAJOR; (4) Minimum reinforcement per IS 456 Clause 26.5.2.1 not demonstrated — potential under-reinforcement — MAJOR; (5) Cover 40mm inadequate — IS 456 Table 16 requires 50mm minimum for moderate industrial exposure — MINOR. Score on: Accuracy, Completeness (5 issues), IS code citation quality (IS 456, IS 6403, IS 1904, IS 1893), Engineering judgment, Professional standard. Return ONLY valid JSON no markdown: {"overallScore":0-100,"accuracy":0-100,"completeness":0-100,"codeCitation":0-100,"judgment":0-100,"issuesFound":0-5,"verdict":"PASS|CONDITIONAL PASS|FAIL","feedback":"concise 2-sentence summary","strengths":["item"],"gaps":["item"]}` },
  { id:"geo01", domain:"shared", label:"GEOTECHNICAL REPORT REVIEW",
    class:"FOUNDATION INTELLIGENCE OPS", urgency:"HIGH",
    doc:`Site investigation report · Nearshore platform site · 12m WD · Arabian Sea
 Platform footprint: 40m × 40m

 ◈  Boreholes: 2 only — depth 30m each
 ◈  In-situ testing: SPT only (no CPT, no vane shear in clay)
 ◈  Profile: 0–8m silty sand | 8–22m soft–medium clay | 22–30m dense sand
 ◈  Clay Su = 45 kPa (single lab test — no sensitivity data)
 ◈  Liquefaction assessment: NOT performed (Seismic Zone III)
 ◈  Pile design: API RP 2A parameters — no local soil calibration
 ◈  Geophysical survey: NOT performed — scour unassessed
 ◈  Report age: 5 years — validity for current design: not addressed`,
    sp:`You are evaluating a geotechnical report review by a civil/offshore engineering technical authority candidate. The 5 critical issues are: (1) Only 2 boreholes for 40×40m footprint — grossly inadequate, API RP 2A Commentary C6.1 recommends minimum 4 for offshore structures — MAJOR; (2) No CPT data — SPT alone insufficient for clay characterisation, single Su value from one test is statistically unreliable — MAJOR; (3) Liquefaction assessment missing — mandatory for Zone III seismic site with sand layers, IS 1893 and API RP 2A Section 2.3.6 both require it — MAJOR; (4) No geophysical survey — scour is critical failure mode for nearshore marine structures, unacceptable omission — MAJOR; (5) API skin friction parameters used without local calibration — Arabian Sea calcareous soils exhibit friction degradation, uncalibrated API method may be unconservative — MAJOR. Return ONLY valid JSON no markdown: {"overallScore":0-100,"accuracy":0-100,"completeness":0-100,"codeCitation":0-100,"judgment":0-100,"issuesFound":0-5,"verdict":"PASS|CONDITIONAL PASS|FAIL","feedback":"concise 2-sentence summary","strengths":["item"],"gaps":["item"]}` },
];

/* ══════════════════════════════════════════════════════════════════
   PIPELINES
══════════════════════════════════════════════════════════════════ */
const OFF_PIPE = [
  {l:"ENV. CRITERIA",dep:"wave"},{l:"WAVE LOADING",dep:"wave"},{l:"SACS MODEL",dep:"sacs"},
  {l:"API CHECK",dep:"api"},{l:"FATIGUE OPS",dep:"sacs"},{l:"PILE ANALYSIS",dep:"offgeo"},
  {l:"FAB. REVIEW",dep:"epc"},{l:"MTO VERIFY",dep:"epc"},{l:"TECH. REVIEW",dep:"epc"},
];
const ON_PIPE = [
  {l:"SOIL REPORT",dep:"ongeo"},{l:"FOUND. PHIL.",dep:"ongeo"},{l:"RCC DESIGN",dep:"rcc"},
  {l:"PIPE RACK",dep:"steel"},{l:"IFC DRAWINGS",dep:"epc"},{l:"BOQ VERIFY",dep:"epc"},
  {l:"VENDOR REV.",dep:"epc"},{l:"CQ RESOLVE",dep:"epc"},{l:"FINAL APPROV.",dep:"epc"},
];

/* ══════════════════════════════════════════════════════════════════
   INTELLIGENCE ENGINE
══════════════════════════════════════════════════════════════════ */
const sc = (scores, id) => scores[id] || 0;
const computeStatus = scores => {
  const locked={}, warned={};
  Object.entries(DEPS).forEach(([dom,deps]) => {
    const mn = Math.min(...deps.map(d => sc(scores,d)));
    if(mn < 20) locked[dom]=true; else if(mn < 40) warned[dom]=true;
  });
  return {locked,warned};
};
const ORI  = s => Math.round(sc(s,"wave")*.30 + sc(s,"sacs")*.30 + sc(s,"api")*.25 + sc(s,"offgeo")*.15);
const ONI  = s => Math.round(sc(s,"rcc")*.35 + sc(s,"steel")*.25 + sc(s,"ongeo")*.20 + sc(s,"epc")*.20);
const AUTH = s => Math.round(ORI(s)*.65 + ONI(s)*.35);
const REVD = s => Math.max(0, Math.round(100 - Object.values(s).reduce((a,b)=>a+b,0)/Object.values(s).length));
const CONF = s => {
  const a = AUTH(s);
  if(a>=80) return {label:"AUTHORITY ACTIVE",c:T.green};
  if(a>=55) return {label:"DEVELOPING",c:T.cyan};
  if(a>=30) return {label:"REBUILDING",c:T.amber};
  return {label:"CRITICAL GAP",c:T.red};
};
const getRisks = (s, status) => {
  const r=[];
  if(sc(s,"wave")<30) r.push({lv:"CRITICAL",msg:"Wave Forces gap → SACS environmental loading model compromised",dom:"offshore"});
  if(sc(s,"wave")>40 && sc(s,"sacs")<25) r.push({lv:"CRITICAL",msg:"Wave competency undeployed → SACS operations inaccessible",dom:"offshore"});
  if(sc(s,"sacs")>40 && sc(s,"api")<25) r.push({lv:"HIGH",msg:"SACS results cannot be code-checked — API RP 2A mastery required",dom:"offshore"});
  if(sc(s,"rcc")<25) r.push({lv:"HIGH",msg:"Industrial Civil Systems gap → Foundation Analysis & Steel Ops blocked",dom:"onshore"});
  if(sc(s,"epc")<20) r.push({lv:"MEDIUM",msg:"EPC Workflow competency below minimum — review authority impaired",dom:"shared"});
  if(Object.keys(status.locked).length>2) r.push({lv:"CRITICAL",msg:`${Object.keys(status.locked).length} systems LOCKED — dependency cascade failure detected`,dom:"system"});
  return r.slice(0,4);
};
const getMentorRecs = (s,status) => {
  const recs=[];
  const lowest = DOMAINS.filter(d=>!status.locked[d.id]).sort((a,b)=>sc(s,a.id)-sc(s,b.id))[0];
  if(lowest) recs.push({priority:"PRIMARY",msg:`Prioritise: ${lowest.label} — currently at ${sc(s,lowest.id)}%. This is your highest-leverage action.`,c:T.cyan});
  if(sc(s,"wave")<50 && sc(s,"sacs")>sc(s,"wave")) recs.push({priority:"DEPENDENCY",msg:"SACS competency exceeds Wave Forces understanding — structural gap. Return to wave theory fundamentals.",c:T.amber});
  if(sc(s,"rcc")>60 && sc(s,"steel")<40) recs.push({priority:"DEPLOY",msg:"RCC mastery ready. Unlock Steel Structure Ops — pipe rack design is your next productivity multiplier.",c:T.green});
  if(AUTH(s)>60) recs.push({priority:"ADVANCE",msg:"Technical authority threshold approaching. Begin Technical Review simulations to validate engineering judgment.",c:T.violet});
  return recs.slice(0,3);
};

/* ══════════════════════════════════════════════════════════════════
   RADAR CHART
══════════════════════════════════════════════════════════════════ */
function Radar({scores}) {
  const cx=170,cy=170,R=130,N=8;
  const ang = i => (i/N)*2*Math.PI - Math.PI/2;
  const pt  = (i,r) => [cx+r*Math.cos(ang(i)), cy+r*Math.sin(ang(i))];
  const ids = ["wave","sacs","api","offgeo","rcc","steel","ongeo","epc"];
  const vals = ids.map(id => (scores[id]||0)/100);
  const poly = vals.map((v,i) => pt(i,R*v));
  const str  = pts => pts.map(p=>p.join(",")).join(" ");
  const grids= [.25,.5,.75,1];
  const lbls = ["WAVE","SACS","API","M.GEO","CIVIL","STEEL","FOUND","EPC"];
  const cols = ["#00e5ff","#18cfff","#36b8f0","#60a8e8","#ffab00","#ffc840","#e09000","#00e676"];
  return (
    <svg width={340} height={340} viewBox="0 0 340 340">
      <defs>
        <radialGradient id="rg" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(0,100,200,.15)"/>
          <stop offset="100%" stopColor="rgba(0,20,60,.4)"/>
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R+10} fill="url(#rg)"/>
      {grids.map((g,i)=>(
        <polygon key={i} points={str(Array.from({length:N},(_,j)=>pt(j,R*g)))}
          fill="none" stroke={`rgba(0,229,255,${.04+i*.025})`} strokeWidth={1}
          strokeDasharray={i<3?"5 5":""}/>
      ))}
      {Array.from({length:N},(_,i)=>{
        const [x2,y2]=pt(i,R);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(0,229,255,.08)" strokeWidth={1}/>;
      })}
      <polygon points={str(poly)} fill="rgba(0,229,255,.10)" stroke={T.cyan} strokeWidth={1.5}/>
      {poly.slice(0,4).map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={vals[i]>.05?5:2} fill="#00e5ff" opacity={.9}
          style={{filter:"drop-shadow(0 0 5px #00e5ff)"}}/>
      ))}
      {poly.slice(4).map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={vals[i+4]>.05?5:2} fill="#ffab00" opacity={.9}
          style={{filter:"drop-shadow(0 0 5px #ffab00)"}}/>
      ))}
      {Array.from({length:N},(_,i)=>{
        const [x,y]=pt(i,R+22);
        const anc = x<cx-8?"end":x>cx+8?"start":"middle";
        return(
          <text key={i} x={x} y={y} textAnchor={anc} fontSize={9} fill={cols[i]}
            fontFamily={T.mono} fontWeight="bold" letterSpacing={1}>{lbls[i]}</text>
        );
      })}
      <g style={{animation:"scan 9s linear infinite",transformOrigin:`${cx}px ${cy}px`}}>
        <line x1={cx} y1={cy} x2={cx} y2={cy-R} stroke="rgba(0,229,255,.6)" strokeWidth={1.5}
          style={{filter:"drop-shadow(0 0 6px rgba(0,229,255,.9))"}}/>
        <line x1={cx} y1={cy} x2={cx} y2={cy+8} stroke="rgba(0,229,255,.15)" strokeWidth={1}/>
      </g>
      <circle cx={cx} cy={cy} r={5} fill={T.cyan} style={{filter:"drop-shadow(0 0 8px #00e5ff)"}}/>
      <circle cx={cx} cy={cy} r={16} fill="none" stroke="rgba(0,229,255,.15)" strokeWidth={1}
        strokeDasharray="3 3" style={{animation:"scan 25s linear infinite reverse",transformOrigin:`${cx}px ${cy}px`}}/>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DEPENDENCY GRAPH
══════════════════════════════════════════════════════════════════ */
const NPOS = {
  wave:  {x:70,  y:80},  sacs:  {x:200, y:45},  api:   {x:330, y:80},
  offgeo:{x:400, y:170}, epc:   {x:215, y:195},
  rcc:   {x:70,  y:310}, steel: {x:200, y:345},  ongeo: {x:330, y:310},
};
const EDGES = [
  ["wave","sacs","offshore"],["sacs","api","offshore"],["api","offgeo","offshore"],
  ["offgeo","epc","offshore"],["wave","epc","cross"],
  ["rcc","steel","onshore"],["rcc","ongeo","onshore"],["rcc","epc","cross"],
];

function DepGraph({scores,status}) {
  const nodeColor = (id) => {
    if(status.locked[id]) return T.red;
    if(status.warned[id]) return T.amber;
    const s = scores[id]||0;
    if(s>=60) return T.green; if(s>=25) return T.cyan; return "rgba(100,130,170,.4)";
  };
  const nodeGlow = id => status.locked[id]?"drop-shadow(0 0 8px #ff3d71)":
    status.warned[id]?"drop-shadow(0 0 8px #ffab00)":
    (scores[id]||0)>=60?"drop-shadow(0 0 8px #00e676)":
    (scores[id]||0)>=25?"drop-shadow(0 0 8px #00e5ff)":"none";
  const edgePts = (id1,id2) => {
    const a=NPOS[id1],b=NPOS[id2];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.sqrt(dx*dx+dy*dy);
    const nx=dx/len,ny=dy/len,r=20;
    return {x1:a.x+nx*r,y1:a.y+ny*r,x2:b.x-nx*r,y2:b.y-ny*r};
  };
  const edgeColor = t => t==="offshore"?T.cyanD:t==="onshore"?T.amberD:"rgba(0,230,118,.4)";

  return (
    <svg width={470} height={390} viewBox="0 0 470 390">
      <defs>
        {["cyan","amber","green"].map(n=>(
          <marker key={n} id={`arr-${n}`} markerWidth={8} markerHeight={6} refX={7} refY={3} orient="auto">
            <polygon points="0 0,8 3,0 6"
              fill={n==="cyan"?"rgba(0,229,255,.7)":n==="amber"?"rgba(255,171,0,.7)":"rgba(0,230,118,.5)"}/>
          </marker>
        ))}
      </defs>
      {EDGES.map(([a,b,t],i)=>{
        const {x1,y1,x2,y2}=edgePts(a,b);
        const col = edgeColor(t);
        const arr = t==="offshore"?"arr-cyan":t==="onshore"?"arr-amber":"arr-green";
        return(
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={col} strokeWidth={1.5} strokeDasharray="8 5"
            markerEnd={`url(#${arr})`}
            style={{animation:`dash ${1.5+i*.3}s linear infinite`}}/>
        );
      })}
      {Object.entries(NPOS).map(([id,{x,y}])=>{
        const dom = DOMAINS.find(d=>d.id===id)?.domain||"shared";
        const s = scores[id]||0;
        const bc = nodeColor(id);
        return(
          <g key={id} style={{filter:nodeGlow(id)}}>
            <circle cx={x} cy={y} r={22} fill={`${bc}18`} stroke={bc} strokeWidth={1.5}/>
            <circle cx={x} cy={y} r={16} fill={`${bc}12`}/>
            <text x={x} y={y-1} textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fill={bc} fontFamily={T.mono} fontWeight="bold">{s}%</text>
            <text x={x} y={y+34} textAnchor="middle" fontSize={8} fill={T.txtD}
              fontFamily={T.mono} letterSpacing={1}>
              {DOMAINS.find(d=>d.id===id)?.short||id}
            </text>
            {status.locked[id] && (
              <text x={x} y={y-32} textAnchor="middle" fontSize={7} fill={T.red} fontFamily={T.mono}>LOCKED</text>
            )}
          </g>
        );
      })}
      <text x={5} y={14} fontSize={8} fill="rgba(0,229,255,.4)" fontFamily={T.mono}>OFFSHORE</text>
      <text x={5} y={360} fontSize={8} fill="rgba(255,171,0,.4)" fontFamily={T.mono}>ONSHORE</text>
      <text x={180} y={228} fontSize={8} fill="rgba(0,230,118,.4)" fontFamily={T.mono}>EPC HUB</text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   READINESS RING
══════════════════════════════════════════════════════════════════ */
function Ring({val,label,sub,color,size=80}) {
  const r=30,circ=2*Math.PI*r,off=circ*(1-val/100);
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={off}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{filter:`drop-shadow(0 0 6px ${color})`,transition:"stroke-dashoffset .6s ease"}}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          fontSize={13} fill={color} fontFamily={T.mono} fontWeight="bold">{val}%</text>
      </svg>
      <div style={{fontSize:10,color,fontFamily:T.mono,fontWeight:"bold",letterSpacing:1,textAlign:"center"}}>{label}</div>
      {sub&&<div style={{fontSize:9,color:T.txtD,fontFamily:T.mono,textAlign:"center"}}>{sub}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PIPELINE FLOW
══════════════════════════════════════════════════════════════════ */
function Pipeline({stages,scores,status,color,label}) {
  return(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:9,color,fontFamily:T.mono,letterSpacing:2,marginBottom:10}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:0,overflowX:"auto",paddingBottom:4}}>
        {stages.map((s,i)=>{
          const sc2=scores[s.dep]||0;
          const locked=status.locked[s.dep];
          const warned=status.warned[s.dep];
          const active=sc2>=50&&!locked;
          const nodeC = locked?T.red:warned?T.amber:active?T.green:"rgba(100,130,160,.3)";
          return(
            <div key={i} style={{display:"flex",alignItems:"center",flexShrink:0}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${nodeC}`,
                  background:`${nodeC}18`,display:"flex",alignItems:"center",justifyContent:"center",
                  filter:active?`drop-shadow(0 0 6px ${nodeC})`:"none",transition:"all .4s"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:nodeC,
                    opacity:active?.9:.4}}/>
                </div>
                <div style={{fontSize:7,color:nodeC,fontFamily:T.mono,textAlign:"center",
                  letterSpacing:.5,maxWidth:48,lineHeight:1.3}}>{s.l}</div>
              </div>
              {i<stages.length-1&&(
                <div style={{width:20,height:1.5,background:`${nodeC}40`,flexShrink:0,
                  marginBottom:18,position:"relative"}}>
                  {active&&<div style={{position:"absolute",top:-2,right:0,width:6,height:6,
                    borderTop:`1.5px solid ${nodeC}`,borderRight:`1.5px solid ${nodeC}`,
                    transform:"rotate(45deg)"}}/>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TELEMETRY BAR
══════════════════════════════════════════════════════════════════ */
function TelemetryBar({scores,status}) {
  const ori=ORI(scores),oni=ONI(scores),auth=AUTH(scores),rd=REVD(scores);
  const risks=getRisks(scores,status);
  const items = [
    `OFFSHORE RI: ${ori}%`, `ONSHORE RI: ${oni}%`, `AUTHORITY SCORE: ${auth}%`,
    `REVISION DEBT: ${rd}%`, `ACTIVE RISKS: ${risks.length}`,
    `LOCKED SYSTEMS: ${Object.keys(status.locked).length}`,
    `WAVE FORCES: ${scores.wave||0}%`, `SACS OPS: ${scores.sacs||0}%`,
    `API COMMAND: ${scores.api||0}%`, `INDUSTRIAL CIVIL: ${scores.rcc||0}%`,
    `EPC INTEL: ${scores.epc||0}%`,
  ];
  const full = [...items,...items].join("   ·   ");
  return(
    <div style={{overflow:"hidden",borderBottom:`1px solid ${T.border}`,
      background:"rgba(0,229,255,.03)"}}>
      <div style={{whiteSpace:"nowrap",animation:"tscroll 25s linear infinite",
        padding:"6px 0",fontSize:9,color:T.cyanD,fontFamily:T.mono,letterSpacing:1.5}}>
        {full}{"   ·   "}{full}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COMMAND CENTER
══════════════════════════════════════════════════════════════════ */
function CommandCenter({scores,status}) {
  const ori=ORI(scores),oni=ONI(scores),auth=AUTH(scores),rd=REVD(scores);
  const conf=CONF(scores);
  const risks=getRisks(scores,status);
  const recs=getMentorRecs(scores,status);
  const weak=DOMAINS.filter(d=>!status.locked[d.id]).sort((a,b)=>(scores[a.id]||0)-(scores[b.id]||0))[0];

  const KPI=({val,label,color,blink})=>(
    <div style={{textAlign:"center",padding:"10px 14px",borderRight:`1px solid ${T.border}`,
      animation:blink?"riskpls 2s ease-in-out infinite":"none",flex:1}}>
      <div style={{fontSize:22,fontWeight:900,color,fontFamily:T.mono,
        textShadow:`0 0 20px ${color}`}}>{val}</div>
      <div style={{fontSize:8,color:T.txtD,fontFamily:T.mono,letterSpacing:1.5,marginTop:3}}>{label}</div>
    </div>
  );

  return(
    <div style={{animation:"fadein .5s ease-out"}}>
      {/* KPI Strip */}
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,
        background:"rgba(0,10,30,.6)"}}>
        <KPI val={`${ori}%`} label="OFFSHORE READINESS" color={T.cyan} blink={ori<25}/>
        <KPI val={`${oni}%`} label="ONSHORE EPC READINESS" color={T.amber} blink={oni<25}/>
        <KPI val={`${auth}%`} label="AUTHORITY SCORE" color={auth>=60?T.green:auth>=35?T.cyan:T.red}/>
        <KPI val={conf.label} label="CONFIDENCE STATE" color={conf.c}/>
        <KPI val={`${rd}%`} label="REVISION DEBT" color={rd>60?T.red:rd>35?T.amber:T.green} blink={rd>70}/>
        <KPI val={risks.length||"NIL"} label="ACTIVE RISK ZONES" color={risks.length>2?T.red:risks.length>0?T.amber:T.green} blink={risks.length>2}/>
        <div style={{textAlign:"center",padding:"10px 14px",flex:1}}>
          <div style={{fontSize:13,fontWeight:900,color:T.red,fontFamily:T.mono,
            textShadow:`0 0 15px ${T.red}`,fontSize:11}}>
            {weak?weak.short:"—"}</div>
          <div style={{fontSize:8,color:T.txtD,fontFamily:T.mono,letterSpacing:1.5,marginTop:3}}>WEAK DEPENDENCY</div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:0,
        borderBottom:`1px solid ${T.border}`}}>
        {/* Radar */}
        <div style={{borderRight:`1px solid ${T.border}`,padding:"16px 8px",
          background:"rgba(0,229,255,.015)"}}>
          <div style={{fontSize:9,color:T.cyanD,fontFamily:T.mono,letterSpacing:2,marginBottom:4,padding:"0 8px"}}>
            ◈ COMPETENCY RADAR · DUAL DOMAIN
          </div>
          <Radar scores={scores}/>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:4,padding:"0 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:T.cyan,fontFamily:T.mono}}>
              <div style={{width:10,height:2,background:T.cyan}}/> OFFSHORE 65%
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:T.amber,fontFamily:T.mono}}>
              <div style={{width:10,height:2,background:T.amber}}/> ONSHORE 35%
            </div>
          </div>
        </div>

        {/* Dependency graph + Alerts */}
        <div style={{display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 12px 4px",borderBottom:`1px solid ${T.border}`,flex:1}}>
            <div style={{fontSize:9,color:T.cyanD,fontFamily:T.mono,letterSpacing:2,marginBottom:6}}>
              ◈ ENGINEERING DEPENDENCY NETWORK
            </div>
            <DepGraph scores={scores} status={status}/>
          </div>
        </div>
      </div>

      {/* Rings + Pipeline */}
      <div style={{display:"grid",gridTemplateColumns:"auto 1fr",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",gap:24,padding:"16px 24px",borderRight:`1px solid ${T.border}`,
          alignItems:"center"}}>
          <Ring val={ori} label="OFFSHORE RI" color={T.cyan} sub="65% WEIGHT"/>
          <Ring val={oni} label="ONSHORE RI" color={T.amber} sub="35% WEIGHT"/>
          <Ring val={auth} label="AUTHORITY" color={auth>=60?T.green:T.cyan} sub="COMPOSITE"/>
        </div>
        <div style={{padding:"16px 20px"}}>
          <div style={{fontSize:9,color:T.cyanD,fontFamily:T.mono,letterSpacing:2,marginBottom:10}}>
            ◈ EPC WORKFLOW TELEMETRY
          </div>
          <Pipeline stages={OFF_PIPE} scores={scores} status={status} color={T.cyanD} label="🌊 OFFSHORE REVIEW PIPELINE"/>
          <Pipeline stages={ON_PIPE} scores={scores} status={status} color={T.amberD} label="🏭 ONSHORE EPC PIPELINE"/>
        </div>
      </div>

      {/* Alerts + Mentor */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${T.border}`}}>
        <div style={{borderRight:`1px solid ${T.border}`,padding:"14px 16px"}}>
          <div style={{fontSize:9,color:T.red,fontFamily:T.mono,letterSpacing:2,marginBottom:10}}>
            ⚠ ACTIVE RISK INTELLIGENCE
          </div>
          {risks.length===0?(
            <div style={{fontSize:11,color:T.green,fontFamily:T.mono,padding:12,
              border:`1px solid ${T.greenD}`,borderRadius:6,background:T.greenDim}}>
              ALL SYSTEMS NOMINAL — No critical dependency failures detected
            </div>
          ):risks.map((r,i)=>(
            <div key={i} style={{padding:"8px 12px",marginBottom:8,borderRadius:6,
              border:`1px solid ${r.lv==="CRITICAL"?T.redD:r.lv==="HIGH"?T.amberD:T.cyanD}`,
              background:r.lv==="CRITICAL"?T.redDim:r.lv==="HIGH"?T.amberDim:T.cyanDim,
              animation:r.lv==="CRITICAL"?"riskpls 2s ease-in-out infinite":"none"}}>
              <div style={{fontSize:9,color:r.lv==="CRITICAL"?T.red:r.lv==="HIGH"?T.amber:T.cyan,
                fontFamily:T.mono,fontWeight:"bold",marginBottom:3}}>{r.lv} · {r.dom.toUpperCase()}</div>
              <div style={{fontSize:11,color:T.txt}}>{r.msg}</div>
            </div>
          ))}
        </div>
        <div style={{padding:"14px 16px"}}>
          <div style={{fontSize:9,color:T.violet,fontFamily:T.mono,letterSpacing:2,marginBottom:10}}>
            ◈ AI MENTOR INTELLIGENCE
          </div>
          {recs.map((r,i)=>(
            <div key={i} style={{padding:"8px 12px",marginBottom:8,borderRadius:6,
              border:`1px solid ${r.c}40`,background:`${r.c}08`}}>
              <div style={{fontSize:9,color:r.c,fontFamily:T.mono,fontWeight:"bold",marginBottom:3}}>{r.priority}</div>
              <div style={{fontSize:11,color:T.txt,lineHeight:1.6}}>{r.msg}</div>
            </div>
          ))}
          {recs.length===0&&(
            <div style={{fontSize:11,color:T.txtD,fontFamily:T.mono}}>
              Set competency scores in domain ops to activate AI recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REVIEW OPERATIONS — AI POWERED
══════════════════════════════════════════════════════════════════ */
function ReviewOps() {
  const [si,setSi] = useState(0);
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const [result,setResult] = useState(null);
  const scen = SCENARIOS[si];

  const evaluate = async () => {
    if(!input.trim()||loading) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system: scen.sp,
          messages:[{role:"user",content:`My engineering review comments:\n\n${input}`}]
        })
      });
      const data = await res.json();
      const text = (data.content||[]).map(b=>b.text||"").join("");
      const clean = text.replace(/```json|```/g,"").trim();
      setResult(JSON.parse(clean));
    } catch(e) {
      setResult({error:true,feedback:"Evaluation service error. Ensure valid JSON was returned.",overallScore:0});
    }
    setLoading(false);
  };

  const scoreColor = v => v>=75?T.green:v>=50?T.cyan:v>=25?T.amber:T.red;

  return(
    <div style={{animation:"fadein .5s ease-out"}}>
      {/* Header */}
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,
        background:"rgba(120,60,0,.06)"}}>
        <div style={{fontSize:9,color:T.amber,fontFamily:T.mono,letterSpacing:2,marginBottom:4}}>
          ◈ TECHNICAL REVIEW OPERATIONS · AI EVALUATION ENGINE
        </div>
        <div style={{fontSize:13,color:T.txtB,fontFamily:T.mono}}>
          Review engineering documents. Identify deficiencies. Cite codes. Receive AI judgment evaluation.
        </div>
      </div>

      {/* Scenario selector */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.border}`}}>
        {SCENARIOS.map((s,i)=>(
          <div key={i} onClick={()=>{setSi(i);setResult(null);setInput("");}}
            style={{flex:1,padding:"10px 14px",cursor:"pointer",
              borderRight:`1px solid ${T.border}`,
              background:si===i?"rgba(255,171,0,.06)":"transparent",
              borderBottom:si===i?`2px solid ${T.amber}`:"2px solid transparent",
              transition:"all .2s"}}>
            <div style={{fontSize:9,color:si===i?T.amber:T.txtD,fontFamily:T.mono,
              fontWeight:"bold",marginBottom:2,letterSpacing:1}}>{s.urgency}</div>
            <div style={{fontSize:11,color:si===i?T.txtB:T.txtD,fontFamily:T.mono}}>{s.label}</div>
            <div style={{fontSize:9,color:T.txtD,fontFamily:T.mono,marginTop:2}}>{s.class}</div>
          </div>
        ))}
      </div>

      {/* Document display */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",minHeight:400}}>
        <div style={{borderRight:`1px solid ${T.border}`,padding:"16px"}}>
          <div style={{fontSize:9,color:T.cyanD,fontFamily:T.mono,letterSpacing:2,marginBottom:12}}>
            ◈ ENGINEERING DOCUMENT · READ-ONLY
          </div>
          <div style={{background:"rgba(0,10,30,.8)",border:`1px solid ${T.border}`,
            borderRadius:6,padding:16,fontFamily:T.mono,fontSize:11,
            color:"rgba(0,229,255,.8)",lineHeight:2,whiteSpace:"pre-line"}}>
            {scen.doc}
          </div>
          <div style={{marginTop:12,padding:"8px 12px",background:"rgba(255,171,0,.06)",
            border:`1px solid ${T.borderAm}`,borderRadius:6,fontSize:10,color:T.amber,fontFamily:T.mono}}>
            ⚠ Identify all engineering deficiencies. Classify severity. Cite applicable codes. Write as a Technical Authority.
          </div>
        </div>

        {/* Input + result */}
        <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:9,color:T.amberD,fontFamily:T.mono,letterSpacing:2}}>
            ◈ YOUR REVIEW COMMENTS
          </div>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            placeholder={`Enter your technical review comments here...\n\nExample format:\n1. [MAJOR] Wave height discrepancy: Hs applied = X does not match design basis...\n   Code reference: API RP 2A Section Y\n\n2. [MINOR] Cover specification...`}
            style={{flex:1,minHeight:180,background:"rgba(0,10,30,.9)",
              border:`1px solid ${input.length>50?T.cyanD:T.border}`,borderRadius:6,
              color:T.txt,fontFamily:T.mono,fontSize:11,padding:14,lineHeight:1.8,
              outline:"none",transition:"border-color .3s"}}/>
          <button onClick={evaluate} disabled={loading||!input.trim()}
            style={{padding:"12px 0",background:loading?"rgba(0,229,255,.05)":"rgba(0,229,255,.08)",
              border:`1px solid ${loading||!input.trim()?"rgba(0,229,255,.15)":T.cyan}`,
              borderRadius:6,color:loading||!input.trim()?T.txtD:T.cyan,
              fontFamily:T.mono,fontSize:11,fontWeight:"bold",letterSpacing:2,cursor:loading||!input.trim()?"not-allowed":"pointer",
              transition:"all .3s"}}>
            {loading?"◈ EVALUATING ENGINEERING JUDGMENT...":"◈ SUBMIT FOR AI EVALUATION"}
          </button>

          {result&&!result.error&&(
            <div style={{animation:"fadein .4s ease-out"}}>
              {/* Verdict */}
              <div style={{padding:"10px 14px",borderRadius:6,marginBottom:10,
                border:`1px solid ${result.verdict==="PASS"?T.greenD:result.verdict==="CONDITIONAL PASS"?T.amberD:T.redD}`,
                background:result.verdict==="PASS"?T.greenDim:result.verdict==="CONDITIONAL PASS"?T.amberDim:T.redDim}}>
                <div style={{fontSize:11,fontWeight:"bold",fontFamily:T.mono,
                  color:result.verdict==="PASS"?T.green:result.verdict==="CONDITIONAL PASS"?T.amber:T.red}}>
                  VERDICT: {result.verdict}
                </div>
                <div style={{fontSize:10,color:T.txt,marginTop:4,lineHeight:1.6}}>{result.feedback}</div>
              </div>
              {/* Score breakdown */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                {[
                  {l:"ACCURACY",v:result.accuracy},{l:"COMPLETENESS",v:result.completeness},
                  {l:"CODE CITATION",v:result.codeCitation},{l:"JUDGMENT",v:result.judgment},
                  {l:"OVERALL",v:result.overallScore},{l:"ISSUES FOUND",v:`${result.issuesFound||0}/${scen.id.includes("sacs")?"6":"5"}`}
                ].map((m,i)=>(
                  <div key={i} style={{textAlign:"center",padding:"8px 4px",
                    border:`1px solid ${scoreColor(m.v)}30`,borderRadius:6,
                    background:`${scoreColor(m.v)}08`}}>
                    <div style={{fontSize:14,fontWeight:900,color:scoreColor(m.v),
                      fontFamily:T.mono,textShadow:`0 0 12px ${scoreColor(m.v)}`}}>{m.v}{typeof m.v==="number"?"%":""}</div>
                    <div style={{fontSize:8,color:T.txtD,fontFamily:T.mono,marginTop:2}}>{m.l}</div>
                  </div>
                ))}
              </div>
              {/* Strengths & Gaps */}
              {result.strengths?.length>0&&(
                <div style={{marginBottom:8}}>
                  {result.strengths.map((s,i)=>(
                    <div key={i} style={{fontSize:10,color:T.green,fontFamily:T.mono,padding:"2px 0"}}>✓ {s}</div>
                  ))}
                </div>
              )}
              {result.gaps?.length>0&&(
                <div>
                  {result.gaps.map((g,i)=>(
                    <div key={i} style={{fontSize:10,color:T.red,fontFamily:T.mono,padding:"2px 0"}}>✗ {g}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          {result?.error&&(
            <div style={{padding:12,border:`1px solid ${T.redD}`,borderRadius:6,
              background:T.redDim,fontSize:11,color:T.red,fontFamily:T.mono}}>{result.feedback}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DOMAIN OPS (Offshore + Onshore combined — tab inside)
══════════════════════════════════════════════════════════════════ */
function DomainOps({scores,setScores,status}) {
  const [domain,setDomain]=useState("offshore");
  const domDomains = DOMAINS.filter(d=>d.domain===domain||domain==="shared"&&d.domain==="shared");
  const allDoms = domain==="offshore"
    ? DOMAINS.filter(d=>d.domain==="offshore")
    : domain==="onshore"
    ? DOMAINS.filter(d=>d.domain==="onshore")
    : DOMAINS.filter(d=>d.domain==="shared");
  const showDoms = [...allDoms, ...DOMAINS.filter(d=>d.domain==="shared"&&domain!=="shared")];

  const sysInfo = {
    offshore:{
      title:"OFFSHORE READINESS COMMAND",
      sub:"Fixed jacket · WHP · Process platform · Helideck · Flare boom · Bridge",
      color:T.cyan, domains:DOMAINS.filter(d=>d.domain==="offshore"),
      systems:["Environmental Forces Intelligence","SACS Structural Analysis Operations",
        "API RP 2A Code Command","Marine Foundation Systems"],
    },
    onshore:{
      title:"INDUSTRIAL CIVIL SYSTEMS COMMAND",
      sub:"RCC industrial structures · Pipe racks · Equipment foundations · Estimation",
      color:T.amber, domains:DOMAINS.filter(d=>d.domain==="onshore"),
      systems:["Industrial RCC Design Systems","Steel Structure Operations",
        "Foundation Analysis Intelligence","EPC Workflow Engine"],
    },
  };

  const info = sysInfo[domain]||sysInfo.offshore;
  const displayDomains = info.domains;
  const sharedDom = DOMAINS.filter(d=>d.domain==="shared");

  const SliderRow = ({d}) => {
    const s=scores[d.id]||0;
    const locked=status.locked[d.id];
    const warned=status.warned[d.id];
    const sc2=locked?T.red:warned?T.amber:s>=60?T.green:s>=25?T.cyan:"rgba(100,150,200,.4)";
    return(
      <div style={{marginBottom:16,padding:"12px 14px",borderRadius:8,
        border:`1px solid ${sc2}25`,background:`${sc2}05`,
        animation:locked?"riskpls 2s ease-in-out infinite":warned?"ambpls 3s ease-in-out infinite":"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontSize:11,color:sc2,fontFamily:T.mono,fontWeight:"bold",letterSpacing:1}}>{d.label}</div>
            {locked&&<div style={{fontSize:9,color:T.red,fontFamily:T.mono,marginTop:2}}>
              LOCKED — Dependency failure: {DEPS[d.id]?.filter(dep=>(scores[dep]||0)<20).join(", ")}
            </div>}
            {warned&&!locked&&<div style={{fontSize:9,color:T.amber,fontFamily:T.mono,marginTop:2}}>
              DEPENDENCY WARNING — prerequisite competency low
            </div>}
          </div>
          <div style={{fontSize:24,fontWeight:900,color:sc2,fontFamily:T.mono,
            textShadow:`0 0 15px ${sc2}`,minWidth:52,textAlign:"right"}}>{s}%</div>
        </div>
        <input type="range" min={0} max={100} value={s} disabled={locked}
          onChange={e=>setScores(p=>({...p,[d.id]:+e.target.value}))}
          style={{width:"100%",accentColor:sc2,opacity:locked?.3:1,
            background:`linear-gradient(to right,${sc2} ${s}%,rgba(255,255,255,.08) ${s}%)`}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:8,
          color:T.txtD,fontFamily:T.mono,marginTop:4}}>
          <span>0%</span><span>FOUNDATION</span><span>CORE</span><span>ADVANCED</span><span>AUTHORITY</span>
        </div>
      </div>
    );
  };

  return(
    <div style={{animation:"fadein .5s ease-out"}}>
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
        {[["offshore","🌊 OFFSHORE READINESS COMMAND",T.cyan],
          ["onshore","🏭 INDUSTRIAL CIVIL COMMAND",T.amber]].map(([d,l,c])=>(
          <div key={d} onClick={()=>setDomain(d)}
            style={{flex:1,padding:"12px 20px",cursor:"pointer",
              background:domain===d?`${c}08`:"transparent",
              borderBottom:`2px solid ${domain===d?c:"transparent"}`,
              transition:"all .2s"}}>
            <div style={{fontSize:10,fontWeight:"bold",color:domain===d?c:T.txtD,
              fontFamily:T.mono,letterSpacing:1.5}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{padding:"16px 20px"}}>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:9,color:info.color,fontFamily:T.mono,letterSpacing:2,marginBottom:4}}>
            ◈ ACTIVE SYSTEMS
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {info.systems.map((s,i)=>(
              <div key={i} style={{padding:"4px 12px",borderRadius:12,fontSize:9,
                border:`1px solid ${info.color}40`,color:info.color,fontFamily:T.mono,
                background:`${info.color}08`}}>{s}</div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div>
            <div style={{fontSize:9,color:info.color,fontFamily:T.mono,letterSpacing:2,marginBottom:12}}>
              ◈ DOMAIN COMPETENCY CALIBRATION
            </div>
            {info.domains.map(d=><SliderRow key={d.id} d={d}/>)}
          </div>
          <div>
            <div style={{fontSize:9,color:T.greenD,fontFamily:T.mono,letterSpacing:2,marginBottom:12}}>
              ◈ SHARED SYSTEMS
            </div>
            {DOMAINS.filter(d=>d.domain==="shared").map(d=><SliderRow key={d.id} d={d}/>)}
            <div style={{marginTop:20,padding:"14px",borderRadius:8,
              border:`1px solid ${T.border}`,background:"rgba(0,10,30,.6)"}}>
              <div style={{fontSize:9,color:T.cyanD,fontFamily:T.mono,letterSpacing:2,marginBottom:8}}>
                READINESS SUMMARY
              </div>
              {[
                {l:"Offshore RI",v:ORI(scores),c:T.cyan},
                {l:"Onshore RI",v:ONI(scores),c:T.amber},
                {l:"Authority Score",v:AUTH(scores),c:T.green},
              ].map(m=>(
                <div key={m.l} style={{display:"flex",justifyContent:"space-between",
                  marginBottom:8,alignItems:"center"}}>
                  <span style={{fontSize:10,color:T.txtD,fontFamily:T.mono}}>{m.l}</span>
                  <div style={{flex:1,margin:"0 12px",height:4,background:"rgba(255,255,255,.06)",borderRadius:2}}>
                    <div style={{width:`${m.v}%`,height:"100%",background:m.c,borderRadius:2,transition:"width .5s"}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:"bold",color:m.c,fontFamily:T.mono,minWidth:36,textAlign:"right"}}>{m.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EPC WORKFLOW INTELLIGENCE
══════════════════════════════════════════════════════════════════ */
function EPCWorkflow({scores,status}) {
  const [active,setActive]=useState(null);
  const stageActive=(s)=>(scores[s.dep]||0)>=50&&!status.locked[s.dep];
  const stageColor=(s)=>{
    if(status.locked[s.dep]) return T.red;
    if(status.warned[s.dep]) return T.amber;
    return stageActive(s)?T.green:"rgba(80,120,160,.35)";
  };

  const PipelineRow=({stages,color,label,domain})=>(
    <div style={{marginBottom:24}}>
      <div style={{fontSize:9,color,fontFamily:T.mono,letterSpacing:2,marginBottom:12}}>
        ◈ {label}
      </div>
      <div style={{display:"flex",gap:2,alignItems:"flex-start",overflowX:"auto",paddingBottom:8}}>
        {stages.map((s,i)=>{
          const sc2=stageColor(s);
          const isA=stageActive(s);
          const isAct=active===`${domain}-${i}`;
          return(
            <div key={i} style={{display:"flex",alignItems:"center",flexShrink:0}}>
              <div onClick={()=>setActive(isAct?null:`${domain}-${i}`)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",
                  cursor:"pointer",minWidth:80,padding:"8px 4px",
                  background:isAct?`${sc2}15`:"transparent",
                  border:isAct?`1px solid ${sc2}50`:"1px solid transparent",
                  borderRadius:8,transition:"all .2s"}}>
                <div style={{width:44,height:44,borderRadius:"50%",
                  border:`2px solid ${sc2}`,background:`${sc2}12`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  filter:isA?`drop-shadow(0 0 8px ${sc2})`:"none",
                  marginBottom:8,transition:"all .4s"}}>
                  <div style={{fontSize:16,color:sc2,fontFamily:T.mono,
                    animation:isA?"gpulse 2s ease-in-out infinite":"none"}}>{i+1}</div>
                </div>
                <div style={{fontSize:8,color:sc2,fontFamily:T.mono,textAlign:"center",
                  letterSpacing:.5,lineHeight:1.4,fontWeight:"bold"}}>{s.l}</div>
                <div style={{fontSize:7,color:T.txtD,fontFamily:T.mono,marginTop:3,
                  padding:"1px 5px",border:`1px solid ${sc2}30`,borderRadius:3}}>
                  {isA?"ACTIVE":status.locked[s.dep]?"LOCKED":status.warned[s.dep]?"WARNING":"PENDING"}
                </div>
              </div>
              {i<stages.length-1&&(
                <div style={{width:16,height:2,background:`${sc2}50`,margin:"0 2px",
                  marginBottom:20,flexShrink:0}}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const activeInfo = active ? (active.startsWith("offshore")?
    OFF_PIPE[+active.split("-")[1]]:ON_PIPE[+active.split("-")[1]]) : null;
  const activeDomain = active?.startsWith("offshore")?"offshore":"onshore";

  return(
    <div style={{animation:"fadein .5s ease-out"}}>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,
        background:"rgba(0,80,40,.05)"}}>
        <div style={{fontSize:9,color:T.green,fontFamily:T.mono,letterSpacing:2,marginBottom:4}}>
          ◈ EPC WORKFLOW INTELLIGENCE · LIFECYCLE OPERATIONS
        </div>
        <div style={{fontSize:11,color:T.txtD,fontFamily:T.mono}}>
          Click any stage to inspect. Active stages require ≥50% competency in prerequisite domain.
        </div>
      </div>
      <div style={{padding:"20px 20px 0"}}>
        <PipelineRow stages={OFF_PIPE} color={T.cyanD} label="OFFSHORE TECHNICAL REVIEW PIPELINE" domain="offshore"/>
        <PipelineRow stages={ON_PIPE} color={T.amberD} label="ONSHORE EPC APPROVAL PIPELINE" domain="onshore"/>
      </div>

      {active&&activeInfo&&(
        <div style={{margin:"0 20px 20px",padding:"14px 16px",borderRadius:8,animation:"fadein .3s ease-out",
          border:`1px solid ${activeDomain==="offshore"?T.cyanD:T.amberD}`,
          background:`rgba(0,10,30,.8)`}}>
          <div style={{fontSize:9,color:activeDomain==="offshore"?T.cyan:T.amber,
            fontFamily:T.mono,letterSpacing:2,marginBottom:6}}>STAGE INTELLIGENCE · {activeInfo.l}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
            <div>
              <div style={{fontSize:9,color:T.txtD,fontFamily:T.mono,marginBottom:4}}>PREREQUISITE DOMAIN</div>
              <div style={{fontSize:12,color:T.txtB,fontFamily:T.mono,fontWeight:"bold"}}>{activeInfo.dep.toUpperCase()}</div>
              <div style={{fontSize:11,color:activeDomain==="offshore"?T.cyan:T.amber,fontFamily:T.mono}}>
                Current: {scores[activeInfo.dep]||0}%
              </div>
            </div>
            <div>
              <div style={{fontSize:9,color:T.txtD,fontFamily:T.mono,marginBottom:4}}>STAGE STATUS</div>
              <div style={{fontSize:12,fontWeight:"bold",fontFamily:T.mono,
                color:stageActive(activeInfo)?T.green:status.locked[activeInfo.dep]?T.red:T.amber}}>
                {stageActive(activeInfo)?"OPERATIONAL":status.locked[activeInfo.dep]?"LOCKED":"PREREQUISITE LOW"}
              </div>
            </div>
            <div>
              <div style={{fontSize:9,color:T.txtD,fontFamily:T.mono,marginBottom:4}}>UNLOCK REQUIREMENT</div>
              <div style={{fontSize:11,color:T.txt,fontFamily:T.mono}}>
                {activeInfo.dep.toUpperCase()} competency ≥ 50%
              </div>
              {(scores[activeInfo.dep]||0)<50&&(
                <div style={{fontSize:10,color:T.amber,fontFamily:T.mono,marginTop:4}}>
                  +{50-(scores[activeInfo.dep]||0)}% needed
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary metrics */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,
        borderTop:`1px solid ${T.border}`}}>
        {[["offshore",OFF_PIPE],[" onshore",ON_PIPE]].map(([d,pipe])=>{
          const active2=pipe.filter(s=>stageActive(s)).length;
          const dom=d.trim();
          return(
            <div key={d} style={{padding:"14px 20px",borderRight:dom==="offshore"?`1px solid ${T.border}`:"none"}}>
              <div style={{fontSize:9,color:dom==="offshore"?T.cyanD:T.amberD,
                fontFamily:T.mono,letterSpacing:2,marginBottom:10}}>
                {dom.toUpperCase()} PIPELINE STATUS
              </div>
              <div style={{display:"flex",gap:4,marginBottom:8}}>
                {pipe.map((s,i)=>(
                  <div key={i} style={{height:6,flex:1,borderRadius:1,
                    background:stageActive(s)?dom==="offshore"?T.cyan:T.amber:"rgba(255,255,255,.07)",
                    transition:"background .4s"}}/>
                ))}
              </div>
              <div style={{fontSize:11,color:T.txt,fontFamily:T.mono}}>
                {active2}/{pipe.length} stages operational
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AUTHORITY MATRIX
══════════════════════════════════════════════════════════════════ */
function AuthorityMatrix({scores,status}) {
  const auth=AUTH(scores),ori=ORI(scores),oni=ONI(scores);
  const levels=[
    {min:0,  max:20, label:"INACTIVE",     sub:"Technical domain not yet engaged",         c:"rgba(100,130,160,.5)"},
    {min:20, max:40, label:"REBUILDING",   sub:"Fundamental competency under development",  c:T.amber},
    {min:40, max:60, label:"DEVELOPING",   sub:"Core competency achieving operational level",c:T.cyan},
    {min:60, max:80, label:"COMPETENT",    sub:"Independent technical review capability",   c:"#00c8ff"},
    {min:80, max:95, label:"AUTHORITY",    sub:"Technical authority and discipline lead",   c:T.green},
    {min:95, max:101,label:"EXEMPLARY",    sub:"Elite offshore & onshore EPC mastery",      c:T.violet},
  ];
  const current = levels.find(l=>auth>=l.min&&auth<l.max)||levels[0];

  return(
    <div style={{animation:"fadein .5s ease-out"}}>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,
        background:"rgba(120,60,200,.04)"}}>
        <div style={{fontSize:9,color:T.violet,fontFamily:T.mono,letterSpacing:2,marginBottom:4}}>
          ◈ TECHNICAL AUTHORITY PROGRESSION MATRIX
        </div>
        <div style={{fontSize:11,color:T.txtD,fontFamily:T.mono}}>
          Engineering maturity across offshore and onshore EPC domains
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${T.border}`}}>
        <div style={{padding:"20px",borderRight:`1px solid ${T.border}`}}>
          <div style={{fontSize:9,color:T.violet,fontFamily:T.mono,letterSpacing:2,marginBottom:16}}>
            CURRENT STATUS
          </div>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:52,fontWeight:900,color:current.c,fontFamily:T.mono,
              textShadow:`0 0 30px ${current.c}`,lineHeight:1}}>{auth}%</div>
            <div style={{fontSize:16,color:current.c,fontFamily:T.mono,fontWeight:"bold",marginTop:8,letterSpacing:2}}>
              {current.label}
            </div>
            <div style={{fontSize:11,color:T.txtD,fontFamily:T.mono,marginTop:4}}>{current.sub}</div>
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:20}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:T.cyan,fontFamily:T.mono}}>{ori}%</div>
              <div style={{fontSize:9,color:T.txtD,fontFamily:T.mono,marginTop:2}}>OFFSHORE RI</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:T.amber,fontFamily:T.mono}}>{oni}%</div>
              <div style={{fontSize:9,color:T.txtD,fontFamily:T.mono,marginTop:2}}>ONSHORE RI</div>
            </div>
          </div>
        </div>

        <div style={{padding:"20px"}}>
          <div style={{fontSize:9,color:T.violet,fontFamily:T.mono,letterSpacing:2,marginBottom:16}}>
            PROGRESSION LADDER
          </div>
          {[...levels].reverse().map((l,i)=>{
            const isCurrent=auth>=l.min&&auth<l.max;
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,
                padding:"8px 12px",borderRadius:6,
                border:`1px solid ${isCurrent?l.c:l.c+"20"}`,
                background:isCurrent?`${l.c}12`:"transparent",transition:"all .3s"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:l.c,flexShrink:0,
                  boxShadow:isCurrent?`0 0 10px ${l.c}`:"none"}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:"bold",color:isCurrent?l.c:T.txtD,
                    fontFamily:T.mono,letterSpacing:1}}>{l.label}</div>
                  <div style={{fontSize:9,color:T.txtD,fontFamily:T.mono,marginTop:1}}>{l.sub}</div>
                </div>
                <div style={{fontSize:9,color:T.txtD,fontFamily:T.mono}}>{l.min}–{l.max}%</div>
                {isCurrent&&<div style={{fontSize:9,color:l.c,fontFamily:T.mono,
                  fontWeight:"bold"}}>◄ NOW</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain heatmap */}
      <div style={{padding:"16px 20px"}}>
        <div style={{fontSize:9,color:T.cyanD,fontFamily:T.mono,letterSpacing:2,marginBottom:14}}>
          ◈ COMPETENCY HEAT MATRIX
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {DOMAINS.map(d=>{
            const v=scores[d.id]||0;
            const c=d.domain==="offshore"?T.cyan:d.domain==="onshore"?T.amber:T.green;
            const intensity = v/100;
            return(
              <div key={d.id} style={{padding:"10px 8px",borderRadius:6,textAlign:"center",
                background:`${c}${Math.round(intensity*35).toString(16).padStart(2,"0")}`,
                border:`1px solid ${c}${Math.round(intensity*50+10).toString(16).padStart(2,"0")}`,
                transition:"all .4s"}}>
                <div style={{fontSize:18,fontWeight:900,color:c,fontFamily:T.mono,
                  textShadow:v>50?`0 0 12px ${c}`:"none"}}>{v}%</div>
                <div style={{fontSize:8,color:v>40?c:"rgba(150,180,210,.5)",
                  fontFamily:T.mono,fontWeight:"bold",letterSpacing:1,marginTop:3}}>{d.short}</div>
                <div style={{fontSize:7,color:T.txtD,fontFamily:T.mono,marginTop:2}}>
                  {d.domain.toUpperCase()}
                </div>
                <div style={{height:3,background:"rgba(255,255,255,.06)",borderRadius:2,marginTop:6}}>
                  <div style={{height:"100%",width:`${v}%`,background:c,borderRadius:2,transition:"width .5s"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════════════════ */
const INIT = {wave:28,sacs:0,api:0,offgeo:0,rcc:32,steel:15,ongeo:18,epc:22};
const VIEWS = [
  {id:"cmd",    label:"COMMAND CENTER",      icon:"◈"},
  {id:"review", label:"REVIEW OPS",          icon:"◉"},
  {id:"ops",    label:"DOMAIN OPS",          icon:"⬡"},
  {id:"pipe",   label:"EPC PIPELINE",        icon:"→"},
  {id:"matrix", label:"AUTHORITY MATRIX",    icon:"▲"},
];

export default function App() {
  const [view,setView]=useState("cmd");
  const [scores,setScores]=useState(INIT);
  const status=computeStatus(scores);
  const auth=AUTH(scores);

  useEffect(() => {
    fetchScores()
  }, [])
  
  async function fetchScores() {
    const { data, error } = await supabase
      .from('competency_scores')
      .select('*')
  
    console.log(data)
  
    if (error) {
      console.log(error)
    }
  }

  return(
    <>
      <style>{ANIM}</style>
      <div style={{
        minHeight:"100vh", background:T.bg,
        backgroundImage:`linear-gradient(${T.grid} 1px,transparent 1px),linear-gradient(90deg,${T.grid} 1px,transparent 1px)`,
        backgroundSize:"48px 48px",
        fontFamily:T.mono, color:T.txt,
      }}>
        {/* Header */}
        <div style={{background:"rgba(0,8,24,.92)",backdropFilter:"blur(8px)",
          borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,zIndex:100}}>
          {/* Title bar */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"8px 20px 0",borderBottom:`1px solid rgba(0,229,255,.06)`}}>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{display:"flex",borderRadius:4,overflow:"hidden",border:`1px solid ${T.border}`}}>
                <div style={{background:"rgba(0,229,255,.12)",padding:"3px 10px",
                  fontSize:9,color:T.cyan,fontWeight:"bold",letterSpacing:1}}>OFF 65%</div>
                <div style={{background:"rgba(255,171,0,.1)",padding:"3px 10px",
                  fontSize:9,color:T.amber,fontWeight:"bold",letterSpacing:1}}>ON 35%</div>
              </div>
              <div>
                <div style={{fontSize:8,color:T.cyanD,letterSpacing:2}}>⚓ UPSTREAM OIL & GAS · EPC TECHNICAL AUTHORITY OPERATING SYSTEM</div>
                <div style={{fontSize:13,fontWeight:"bold",color:T.txtB,letterSpacing:.5}}>
                  Offshore & Onshore Civil Structural · Authority Development Command
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:9,color:T.txtD}}>AUTHORITY SCORE</div>
                <div style={{fontSize:20,fontWeight:900,color:auth>=60?T.green:auth>=35?T.cyan:T.red,
                  fontFamily:T.mono,textShadow:`0 0 15px ${auth>=60?T.green:auth>=35?T.cyan:T.red}`}}>{auth}%</div>
              </div>
              <div style={{width:1,height:36,background:T.border}}/>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:9,color:T.txtD}}>CONFIDENCE</div>
                <div style={{fontSize:11,fontWeight:"bold",color:CONF(scores).c,letterSpacing:1}}>
                  {CONF(scores).label}
                </div>
              </div>
            </div>
          </div>
          {/* Nav */}
          <div style={{display:"flex",padding:"0 16px"}}>
            {VIEWS.map(v=>(
              <div key={v.id} onClick={()=>setView(v.id)}
                style={{padding:"9px 16px",cursor:"pointer",fontSize:10,fontWeight:"bold",
                  letterSpacing:1.5,
                  color:view===v.id?T.cyan:T.txtD,
                  borderBottom:`2px solid ${view===v.id?T.cyan:"transparent"}`,
                  transition:"all .2s",whiteSpace:"nowrap"}}>
                {v.icon} {v.label}
              </div>
            ))}
          </div>
          <TelemetryBar scores={scores} status={status}/>
        </div>

        {/* Content */}
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{border:`1px solid ${T.border}`,borderTop:"none",
            background:"rgba(0,8,24,.7)"}}>
            {view==="cmd"    && <CommandCenter  scores={scores} status={status}/>}
            {view==="review" && <ReviewOps/>}
            {view==="ops"    && <DomainOps scores={scores} setScores={setScores} status={status}/>}
            {view==="pipe"   && <EPCWorkflow scores={scores} status={status}/>}
            {view==="matrix" && <AuthorityMatrix scores={scores} status={status}/>}
          </div>
        </div>

        <div style={{textAlign:"center",padding:"16px",fontSize:8,
          color:"rgba(0,229,255,.2)",letterSpacing:2}}>
          EPC TECHNICAL AUTHORITY OS · OFFSHORE 65% · ONSHORE 35% · 12–15 MONTH PROGRAM
        </div>
      </div>
    </>
  );
}