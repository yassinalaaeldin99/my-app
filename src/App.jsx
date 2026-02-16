import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Mobile detection hook ───────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rand = (min, max, dec = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(dec));
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const RISK_COLOR = (r) => (r < 30 ? "#00e5c0" : r < 60 ? "#f5a623" : "#ff3b5c");
const RISK_COLOR_HEX = (r) => (r < 30 ? 0x00e5c0 : r < 60 ? 0xf5a623 : 0xff3b5c);
const RISK_LABEL = (r) => (r < 30 ? "NOMINAL" : r < 60 ? "WATCH" : "CRITICAL");

// ─── Subsystem meta ───────────────────────────────────────────────────────────
const SUBSYSTEM_META = {
  eng:      { name:"Engine Systems",    icon:"⚙",  color:"#00e5c0" },
  struct:   { name:"Structural Health", icon:"🔩", color:"#f5a623" },
  avionics: { name:"Avionics",          icon:"📡", color:"#00e5c0" },
  fuel:     { name:"Fuel Systems",      icon:"⛽", color:"#0076ff" },
  fltctrl:  { name:"Flight Controls",  icon:"🕹",  color:"#c06fff" },
  cabin:    { name:"Cabin Systems",     icon:"🛋", color:"#00e5c0" },
};

// ─── Per-flight data ──────────────────────────────────────────────────────────
const FLIGHT_DATA = {
  "EK205": {
    sensors3d:[
      { id:"eng1",    name:"Engine 1 — Inner Left",  subsystem:"eng",     pos:[-1.7,-0.6,0.5],  risk:18, signals:["N1: 88.4%","EGT: 619 °C","Oil: 40 PSI"],        note:"All parameters nominal. EGT +6 °C above ISA baseline." },
      { id:"eng2",    name:"Engine 2 — Outer Left",  subsystem:"eng",     pos:[-3.2,-0.6,0.3],  risk:14, signals:["N1: 88.1%","EGT: 616 °C","Vib: 0.4 IPS"],       note:"Cleanest engine run of the day. Zero anomalies." },
      { id:"eng3",    name:"Engine 3 — Inner Right", subsystem:"eng",     pos:[1.7,-0.6,0.5],   risk:16, signals:["N1: 88.3%","EGT: 618 °C","Oil: 41 PSI"],        note:"Nominal. Vibration within limits." },
      { id:"eng4",    name:"Engine 4 — Outer Right", subsystem:"eng",     pos:[3.2,-0.6,0.3],   risk:20, signals:["N1: 87.9%","EGT: 622 °C","Vib: 0.6 IPS"],       note:"Minor EGT rise. Monitoring. Within dispatch limits." },
      { id:"wingL",   name:"Wing Flex — Port",       subsystem:"struct",  pos:[-3.6,0.0,0.2],   risk:28, signals:["Flex: 4.2°","Fatigue: 48%","Stress: 38%"],       note:"Moderate flex at cruise altitude. Normal for A380 at FL380." },
      { id:"wingR",   name:"Wing Flex — Starboard",  subsystem:"struct",  pos:[3.6,0.0,0.2],    risk:26, signals:["Flex: 4.1°","Fatigue: 46%","Stress: 36%"],       note:"Symmetric to port side. Within design envelope." },
      { id:"frame47", name:"Frame 47 — Structural",  subsystem:"struct",  pos:[0.0,0.0,0.4],    risk:22, signals:["Stress: 38%","Cycles: 9,120","Δ: +0.2σ"],        note:"Low stress accumulation. No anomalies detected." },
      { id:"avionics",name:"Avionics Bay",            subsystem:"avionics",pos:[0.0,0.1,3.9],    risk:7,  signals:["IRS drift: 0.002 NM/hr","ADC: OK","FMS: OK"],     note:"Excellent navigation accuracy. IRS triple-redundancy confirmed." },
      { id:"fuel_c",  name:"Center Fuel Tank",        subsystem:"fuel",    pos:[0.0,-0.35,0.1],  risk:11, signals:["Imbalance: 62 kg","Pump: 41 PSI","Temp: −43 °C"], note:"Near-perfect balance. Fuel temp nominal for altitude." },
      { id:"fuel_L",  name:"Left Wing Tank",          subsystem:"fuel",    pos:[-2.1,-0.1,0.2],  risk:9,  signals:["Level: 52%","Flow: 2.3 kg/min","Temp: −44 °C"],   note:"Fuel load nominal. Symmetric flow confirmed." },
      { id:"fuel_R",  name:"Right Wing Tank",         subsystem:"fuel",    pos:[2.1,-0.1,0.2],   risk:8,  signals:["Level: 51%","Flow: 2.3 kg/min","Temp: −44 °C"],   note:"Nominal. Crossfeed valve response time within spec." },
      { id:"fltctrl", name:"Elevator Actuator",       subsystem:"fltctrl", pos:[0.0,0.4,-4.1],   risk:12, signals:["Latency: 8 ms","Travel: ±28°","Response: 99.8%"], note:"Excellent actuator response. No anomalies on this leg." },
      { id:"rudder",  name:"Rudder PCU",              subsystem:"fltctrl", pos:[0.0,1.0,-3.6],   risk:10, signals:["Travel: ±27°","PCU: 3000 PSI","Temp: 21 °C"],     note:"Nominal. Hydraulic pressure steady." },
      { id:"cabin",   name:"Cabin Pressurization",    subsystem:"cabin",   pos:[0.0,0.3,0.9],    risk:9,  signals:["Diff: 8.4 PSI","Rate: −290 fpm","Temp: 22 °C"],   note:"Excellent pressurization. Pack efficiency 98.2%." },
      { id:"smoke",   name:"Smoke & Fire Detectors",  subsystem:"cabin",   pos:[0.0,0.35,-1.2],  risk:6,  signals:["Status: ARMED","Test: PASS","Zones: 12/12 OK"],   note:"All zones armed and tested. No alerts." },
      { id:"gear",    name:"Landing Gear — MLG",      subsystem:"struct",  pos:[0.0,-0.55,1.1],  risk:8,  signals:["Strut: 3.4 in","Brake: 160 °C","Wear: 18%"],      note:"Gear retracted and locked. Brake temp cooling normally." },
    ],
    subsystems:[
      { id:"eng",      name:"Engine Systems",    icon:"⚙",  signals:["N1 Fan Speed","EGT Temp","Oil Pressure","Vibration FFT"], risk:18, trend:"stable", failureWindow:null,       aiNote:"EGT margin at +14 °C above baseline. All 4 engines nominal. Step climb to FL400 completed 12 min ago — fuel saving confirmed.", badge:"4 engines · 96 sensors" },
      { id:"fuel",     name:"Fuel Systems",      icon:"⛽", signals:["Fuel Flow L/R","Tank Imbalance","Pump Pressure","Crossfeed"], risk:11, trend:"stable", failureWindow:null,    aiNote:"Fuel balance excellent at 62 kg asymmetry. Flow rate 48.2 t/hr total. Crossfeed valves responding within spec.", badge:"6 tanks · 42 sensors" },
      { id:"avionics", name:"Avionics",          icon:"📡", signals:["IRS Drift","ADC Accuracy","TCAS Status","FMS Compute"],    risk:7,  trend:"stable", failureWindow:null,       aiNote:"IRS drift 0.002 NM/hr — best in fleet today. TCAS clear. FMS computing step-descent profile for EGLL approach.", badge:"3 IRS units · 18 sensors" },
      { id:"struct",   name:"Structural Health", icon:"🔩", signals:["Wing Flex","Fuselage Stress","Landing Gear Load","Fatigue Cycles"], risk:26, trend:"stable", failureWindow:null, aiNote:"Normal cruise loads at FL400. Wing flex within A380 design envelope. No anomalous fatigue accumulation on this leg.", badge:"Frame series · 210 sensors" },
      { id:"cabin",    name:"Cabin Systems",     icon:"🛋", signals:["Pressurization","Pack Temps","O₂ Masks","Smoke Detectors"], risk:9,  trend:"stable", failureWindow:null,      aiNote:"Cabin differential 8.4 PSI. Pack efficiency 98.2% — above fleet average. All 489 PAX zones nominal.", badge:"2 packs · 88 sensors" },
      { id:"fltctrl",  name:"Flight Controls",  icon:"🕹",  signals:["Elevator Actuator","Aileron Response","Spoiler Deploy","Rudder Travel"], risk:12, trend:"stable", failureWindow:null, aiNote:"All surfaces responding within 8 ms. No ACARS advisories on this leg. Triple-redundant systems all online.", badge:"Triple redundant · 124 sensors" },
    ],
    emissions:[
      { label:"Fuel Burned",    value:"61.4 t",   unit:"so far",     delta:-3.2 },
      { label:"CO₂ Emitted",   value:"94.1 t",   unit:"total",      delta:-5.1 },
      { label:"g / Seat-km",   value:"38.4",     unit:"efficiency", delta:-6.2 },
      { label:"SAF Blend",     value:"4.1%",     unit:"this flight", delta:+1.4 },
    ],
    actions:[
      { id:1, type:"CLIMB PROFILE", priority:"HIGH", saving:"1.8 t CO₂", desc:"Step climb from FL380→FL400 completed at MIMKU. Drag reduced 3.1%. AI-predicted saving confirmed." },
      { id:2, type:"SPEED PROFILE", priority:"MED",  saving:"0.9 t CO₂", desc:"Reduce CI from 90 to 70 for final 800 NM. Arrives 6 min later, saves 360 kg fuel." },
      { id:3, type:"ROUTING",       priority:"MED",  saving:"1.2 t CO₂", desc:"Slight 40 NM deviation north of planned track captures 38-kt jetstream benefit." },
    ],
    weather:[
      { region:"North Atlantic Track",  type:"Jet Stream",     severity:"moderate", impact:"−18 min", co2Impact:"−3.2 t", status:"FAVORABLE" },
      { region:"EGLL TMA",              type:"Light Winds",    severity:"light",    impact:"−4 min",  co2Impact:"−0.6 t", status:"FAVORABLE" },
      { region:"Bay of Biscay FL400",   type:"Smooth Air",     severity:"none",     impact:"0 min",   co2Impact:"0 t",    status:"NOMINAL"   },
      { region:"MIMKU → EGLL",          type:"Tailwind",       severity:"light",    impact:"−8 min",  co2Impact:"−1.1 t", status:"FAVORABLE" },
    ],
    alerts:[
      { time:"12:41:08", sys:"ENGINE",    sev:"ok",   msg:"All 4 engines within 4 °C EGT spread. Step climb fuel saving 1.82 t confirmed by FMS." },
      { time:"12:28:14", sys:"FUEL",      sev:"info", msg:"Center tank balance 62 kg — within optimal 50 kg target. No crossfeed required." },
      { time:"12:11:00", sys:"AVIONICS",  sev:"ok",   msg:"IRS accuracy 0.002 NM/hr. Best performance in fleet today." },
      { time:"11:58:22", sys:"CARBON",    sev:"info", msg:"Step climb to FL400 approved and executed. AI saving 1.82 t CO₂ confirmed." },
      { time:"11:44:01", sys:"WEATHER",   sev:"ok",   msg:"Jetstream at FL400 providing 38-kt tailwind. ETA LHR now 14:08 UTC." },
      { time:"11:30:00", sys:"CABIN",     sev:"ok",   msg:"Pack efficiency 98.2%. Best cabin air quality metrics for this route in 30 days." },
    ],
    report:{ id:"EK205", route:"DXB→LHR", aircraft:"B777-300ER", grade:"A+", crew:"Capt. Hassan, F/O Chen", landed:"14:08 UTC", duration:"6h 53m", nm:"3,414 NM",
      safety:["Zero safety anomalies across 480-sensor array. Cleanest flight on this route in 14 days.","Step climb to FL400 approved and executed flawlessly. No ATC restrictions encountered.","Turbulence NIL throughout. No PAX comfort events recorded."],
      perf:["ECON speed adherence 99.1% — fleet record for this leg.","Step climb saved 1.82 t fuel vs flight plan. AI routing contributed additional 0.9 t saving.","Arrived 7 min ahead of schedule. Gate turnround starts on time."],
      maint:["No maintenance actions arising. All systems within limits.","Engine borescopes next due at 10,000 FH — 1,800 FH remaining.","Gear wear 18% — well within service interval."],
      fuel:["Total fuel burn: 61,420 kg. vs plan: −840 kg (−1.4%). Exceptional efficiency.","CO₂ emitted: 94.1 t. Seat-km efficiency: 38.4 g — 13.3% below fleet average.","SAF blend: 4.1%. Net CO₂ offset: 3.9 t. Best carbon performance on DXB–LHR this month."],
    },
  },

  "EK412": {
    sensors3d:[
      { id:"eng1",    name:"Engine 1 — Inner Left",  subsystem:"eng",     pos:[-1.7,-0.6,0.5],  risk:42, signals:["N1: 90.1%","EGT: 641 °C","Oil: 36 PSI"],        note:"⚠ EGT running 22 °C above ISA. Oil pressure trending low. Schedule inspection." },
      { id:"eng2",    name:"Engine 2 — Outer Left",  subsystem:"eng",     pos:[-3.2,-0.6,0.3],  risk:38, signals:["N1: 89.4%","EGT: 634 °C","Vib: 0.9 IPS"],       note:"Elevated vibration FFT. Fan blade inspection recommended at next opportunity." },
      { id:"eng3",    name:"Engine 3 — Inner Right", subsystem:"eng",     pos:[1.7,-0.6,0.5],   risk:29, signals:["N1: 89.8%","EGT: 628 °C","Oil: 39 PSI"],        note:"Nominal but elevated cruise demand. Long route loads accumulating." },
      { id:"eng4",    name:"Engine 4 — Outer Right", subsystem:"eng",     pos:[3.2,-0.6,0.3],   risk:31, signals:["N1: 89.6%","EGT: 630 °C","Vib: 0.7 IPS"],       note:"Within limits. EGT spread across engines is 13 °C — slightly above 10 °C target." },
      { id:"wingL",   name:"Wing Flex — Port",       subsystem:"struct",  pos:[-3.6,0.0,0.2],   risk:52, signals:["Flex: 5.1°","Fatigue: 68%","Stress: 51%"],       note:"⚠ Elevated flex due to heavy fuel load. Fatigue accumulation above 14-day average." },
      { id:"wingR",   name:"Wing Flex — Starboard",  subsystem:"struct",  pos:[3.6,0.0,0.2],    risk:49, signals:["Flex: 4.9°","Fatigue: 65%","Stress: 48%"],       note:"High flex consistent with MTOW departure. Continue monitoring past EDDM." },
      { id:"frame47", name:"Frame 47 — Structural",  subsystem:"struct",  pos:[0.0,0.0,0.4],    risk:61, signals:["Stress: 58%","Cycles: 14,880","Δ: +1.2σ"],       note:"🔴 CRITICAL — Fatigue threshold breach predicted 340–380 FH. Maintenance mandatory at next ground stop." },
      { id:"avionics",name:"Avionics Bay",            subsystem:"avionics",pos:[0.0,0.1,3.9],    risk:14, signals:["IRS drift: 0.006 NM/hr","ADC: OK","FMS: OK"],     note:"IRS drift slightly elevated for long-haul. Within limits. GNSS cross-check passing." },
      { id:"fuel_c",  name:"Center Fuel Tank",        subsystem:"fuel",    pos:[0.0,-0.35,0.1],  risk:33, signals:["Imbalance: 218 kg","Pump: 35 PSI","Temp: −40 °C"], note:"Tank imbalance 218 kg — above 150 kg advisory threshold. Crossfeed recommended." },
      { id:"fuel_L",  name:"Left Wing Tank",          subsystem:"fuel",    pos:[-2.1,-0.1,0.2],  risk:28, signals:["Level: 41%","Flow: 3.1 kg/min","Temp: −41 °C"],   note:"Slightly higher flow rate on port. Consistent with engine 1/2 EGT deviation." },
      { id:"fuel_R",  name:"Right Wing Tank",         subsystem:"fuel",    pos:[2.1,-0.1,0.2],   risk:22, signals:["Level: 43%","Flow: 2.9 kg/min","Temp: −42 °C"],   note:"Flow nominal. Port/starboard differential tracking." },
      { id:"fltctrl", name:"Elevator Actuator",       subsystem:"fltctrl", pos:[0.0,0.4,-4.1],   risk:44, signals:["Latency: 22 ms","Travel: ±28°","Response: 97.1%"], note:"⚠ Actuator latency 22 ms — above 18 ms advisory. Trend increasing over last 3 hours." },
      { id:"rudder",  name:"Rudder PCU",              subsystem:"fltctrl", pos:[0.0,1.0,-3.6],   risk:19, signals:["Travel: ±27°","PCU: 2980 PSI","Temp: 24 °C"],     note:"PCU pressure slightly below nominal. Within limits. Advisory generated." },
      { id:"cabin",   name:"Cabin Pressurization",    subsystem:"cabin",   pos:[0.0,0.3,0.9],    risk:18, signals:["Diff: 8.1 PSI","Rate: −320 fpm","Temp: 23 °C"],   note:"Pack B temp slightly elevated at cruise. Monitor cabin temp complaints." },
      { id:"smoke",   name:"Smoke & Fire Detectors",  subsystem:"cabin",   pos:[0.0,0.35,-1.2],  risk:8,  signals:["Status: ARMED","Test: PASS","Zones: 12/12 OK"],   note:"All zones armed. No alerts." },
      { id:"gear",    name:"Landing Gear — MLG",      subsystem:"struct",  pos:[0.0,-0.55,1.1],  risk:11, signals:["Strut: 3.1 in","Brake: 140 °C","Wear: 31%"],      note:"Gear retracted and locked. Brake wear approaching 35% service advisory." },
    ],
    subsystems:[
      { id:"eng",      name:"Engine Systems",    icon:"⚙",  signals:["N1 Fan Speed","EGT Temp","Oil Pressure","Vibration FFT"], risk:42, trend:"up",    failureWindow:null,         aiNote:"EGT deviations on engines 1 & 2 above ISA baseline. Oil pressure on Eng 1 at lower limit. Extended range operation increasing load — aerosense-ai recommends borescope at JFK turnaround.", badge:"4 engines · 96 sensors" },
      { id:"fuel",     name:"Fuel Systems",      icon:"⛽", signals:["Fuel Flow L/R","Tank Imbalance","Pump Pressure","Crossfeed"], risk:33, trend:"up", failureWindow:null,          aiNote:"Tank imbalance 218 kg above 150 kg threshold. Crossfeed valve advisory sent to crew. Heavy departure weight driving elevated flow rates across all tanks.", badge:"6 tanks · 42 sensors" },
      { id:"avionics", name:"Avionics",          icon:"📡", signals:["IRS Drift","ADC Accuracy","TCAS Status","FMS Compute"],    risk:14, trend:"stable", failureWindow:null,         aiNote:"IRS drift 0.006 NM/hr for long-haul — within limits. GNSS integrity high over Atlantic. FMS computing RNAV approach for KJFK 22L.", badge:"3 IRS units · 18 sensors" },
      { id:"struct",   name:"Structural Health", icon:"🔩", signals:["Wing Flex","Fuselage Stress","Landing Gear Load","Fatigue Cycles"], risk:61, trend:"up", failureWindow:"340–380 FH", aiNote:"🔴 CRITICAL: Frame 47 fatigue accumulation accelerating. +1.2σ above 30-day mean. AeroSense-AI predicts threshold breach in 340–380 FH. Ground maintenance mandatory at JFK.", badge:"Frame 47 · 210 sensors" },
      { id:"cabin",    name:"Cabin Systems",     icon:"🛋", signals:["Pressurization","Pack Temps","O₂ Masks","Smoke Detectors"], risk:18, trend:"up",  failureWindow:null,          aiNote:"Pack B outlet temp +2.8 °C above target. Cabin temp in zones 3–4 slightly warm. Passenger comfort advisory issued to Cabin Senior.", badge:"2 packs · 88 sensors" },
      { id:"fltctrl",  name:"Flight Controls",  icon:"🕹",  signals:["Elevator Actuator","Aileron Response","Spoiler Deploy","Rudder Travel"], risk:44, trend:"up", failureWindow:null, aiNote:"Elevator actuator latency trending up — now 22 ms vs 18 ms limit. Three consecutive readings above threshold. ACARS advisory sent. Engineers briefed for JFK arrival.", badge:"Triple redundant · 124 sensors" },
    ],
    emissions:[
      { label:"Fuel Burned",    value:"88.2 t",   unit:"so far",      delta:+3.8 },
      { label:"CO₂ Emitted",   value:"127.3 t",  unit:"total",       delta:+2.1 },
      { label:"g / Seat-km",   value:"52.1",     unit:"efficiency",  delta:+4.4 },
      { label:"SAF Blend",     value:"2.8%",     unit:"this flight", delta:-0.6 },
    ],
    actions:[
      { id:1, type:"ROUTING",       priority:"HIGH", saving:"4.2 t CO₂", desc:"Shift 80 NM north of planned track to exploit 55-kt jetstream at FL390. Est. fuel save 1,620 kg." },
      { id:2, type:"SPEED PROFILE", priority:"HIGH", saving:"2.1 t CO₂", desc:"Reduce CI from 80 to 60 at FL370. Arrives 4 min later, saves 820 kg, avoids Mid-Atlantic CAT zone." },
      { id:3, type:"DESCENT IDLE",  priority:"MED",  saving:"0.8 t CO₂", desc:"Begin idle descent 12 NM earlier than planned. ATC slot confirmed at KJFK for extended approach." },
    ],
    weather:[
      { region:"Mid-Atlantic FL370",  type:"CAT Turbulence", severity:"moderate", impact:"+11 min", co2Impact:"+2.1 t", status:"AVOID"    },
      { region:"KJFK TMA",            type:"Crosswind",      severity:"moderate", impact:"+8 min",  co2Impact:"+1.4 t", status:"MONITOR"  },
      { region:"North Atlantic Opt",  type:"Jet Stream",     severity:"strong",   impact:"−22 min", co2Impact:"−4.2 t", status:"REROUTE"  },
      { region:"Newfoundland FL390",  type:"Smooth Air",     severity:"none",     impact:"0 min",   co2Impact:"0 t",    status:"NOMINAL"  },
    ],
    alerts:[
      { time:"12:41:08", sys:"STRUCTURAL", sev:"warn", msg:"Frame 47 fatigue +1.2σ. Maintenance mandatory at JFK. AEROSENSE-AI confidence: 94%." },
      { time:"12:39:55", sys:"FUEL",       sev:"warn", msg:"Port tank imbalance 218 kg. Crossfeed valve advisory issued to crew." },
      { time:"12:37:22", sys:"FLIGHT CTRL",sev:"warn", msg:"Elevator actuator latency 22 ms — above 18 ms limit. Engineers briefed for JFK arrival." },
      { time:"12:28:14", sys:"ENGINE",     sev:"warn", msg:"Eng 1 EGT 22 °C above ISA. Oil pressure at lower limit. Borescope requested at JFK." },
      { time:"12:20:01", sys:"WEATHER",    sev:"info", msg:"Reroute to capture jetstream recommended. Saves 4.2 t CO₂. Crew notified." },
      { time:"12:11:00", sys:"CARBON",     sev:"info", msg:"Current emissions 127.3 t CO₂. 2.1 t above plan due to heavy payload and CAT avoidance." },
    ],
    report:{ id:"EK412", route:"DXB→JFK", aircraft:"B777-300ER", grade:"C+", crew:"Capt. Al-Farsi, F/O Johnson", landed:"IN FLIGHT", duration:"est. 14h 05m", nm:"6,837 NM",
      safety:["Frame 47 structural fatigue threshold breach predicted 340–380 FH. Maintenance mandatory at JFK ground stop.","Elevator actuator latency trending above advisory limit. Engineers on standby at KJFK.","Engine 1 EGT deviation +22 °C. Oil pressure at lower limit — within dispatch but advisory generated."],
      perf:["Heavy departure weight driving +3.8% fuel burn above plan. Long-route demand elevated.","CAT avoidance manoeuvre added 11 min and 2.1 t CO₂ above plan.","ECON adherence 91.2% — crew managed speed well given ATC restrictions."],
      maint:["Frame 47 — mandatory ground inspection at JFK. Part order raised. ETA on-site: 2h post-arrival.","Elevator actuator — hydraulic seal inspection on arrival. ACARS log attached.","Engine 1 borescope scheduled at JFK. Oil sample requested."],
      fuel:["Total fuel burn (est.): 88,200 kg. vs plan: +3,340 kg (+3.9%). CAT deviation and payload.","CO₂ emitted: 127.3 t. Seat-km efficiency: 52.1 g — 17.8% above fleet target.","SAF blend: 2.8%. Lowest on fleet today. Recommend SAF uplift at JFK."],
    },
  },

  "EK508": {
    sensors3d:[
      { id:"eng1",    name:"Engine 1 — Inner Left",  subsystem:"eng",     pos:[-1.7,-0.6,0.5],  risk:11, signals:["N1: 0%","EGT: 22 °C","Oil: 42 PSI"],          note:"Engine shutdown. Ground state. Oil pressure nominal with external servicing." },
      { id:"eng2",    name:"Engine 2 — Outer Left",  subsystem:"eng",     pos:[-3.2,-0.6,0.3],  risk:9,  signals:["N1: 0%","EGT: 21 °C","Vib: 0.0 IPS"],         note:"Cold soak complete. Pre-flight vibration checks scheduled 40 min before departure." },
      { id:"eng3",    name:"Engine 3 — Inner Right", subsystem:"eng",     pos:[1.7,-0.6,0.5],   risk:10, signals:["N1: 0%","EGT: 22 °C","Oil: 41 PSI"],           note:"Ground state nominal." },
      { id:"eng4",    name:"Engine 4 — Outer Right", subsystem:"eng",     pos:[3.2,-0.6,0.3],   risk:12, signals:["N1: 0%","EGT: 23 °C","Vib: 0.0 IPS"],          note:"Minor oil residue detected on nacelle. Engineers investigating. Non-dispatch-critical." },
      { id:"wingL",   name:"Wing Flex — Port",       subsystem:"struct",  pos:[-3.6,0.0,0.2],   risk:8,  signals:["Flex: 0.2°","Fatigue: 28%","Stress: 12%"],      note:"Ground state. Droop confirming full fuel load. Healthy structural margin." },
      { id:"wingR",   name:"Wing Flex — Starboard",  subsystem:"struct",  pos:[3.6,0.0,0.2],    risk:8,  signals:["Flex: 0.2°","Fatigue: 27%","Stress: 11%"],      note:"Symmetric to port. Full fuel load. Ready for departure." },
      { id:"frame47", name:"Frame 47 — Structural",  subsystem:"struct",  pos:[0.0,0.0,0.4],    risk:14, signals:["Stress: 18%","Cycles: 6,440","Δ: −0.1σ"],       note:"Below average fatigue for airframe age. Healthy aircraft." },
      { id:"avionics",name:"Avionics Bay",            subsystem:"avionics",pos:[0.0,0.1,3.9],    risk:6,  signals:["IRS align: 98%","ADC: OK","FMS: LOADED"],        note:"IRS aligning on GPU power. FMS Sydney route loaded. Full alignment in 8 min." },
      { id:"fuel_c",  name:"Center Fuel Tank",        subsystem:"fuel",    pos:[0.0,-0.35,0.1],  risk:7,  signals:["Level: 88%","Pump: 44 PSI","Temp: +28 °C"],     note:"Full fuel load. Ambient temp. Density crosscheck complete." },
      { id:"fuel_L",  name:"Left Wing Tank",          subsystem:"fuel",    pos:[-2.1,-0.1,0.2],  risk:6,  signals:["Level: 100%","Flow: 0 kg/min","Temp: +28 °C"],   note:"Fully loaded. Fuelling complete. Seals checked." },
      { id:"fuel_R",  name:"Right Wing Tank",         subsystem:"fuel",    pos:[2.1,-0.1,0.2],   risk:6,  signals:["Level: 100%","Flow: 0 kg/min","Temp: +28 °C"],   note:"Fully loaded. Symmetric with port." },
      { id:"fltctrl", name:"Elevator Actuator",       subsystem:"fltctrl", pos:[0.0,0.4,-4.1],   risk:9,  signals:["Latency: 9 ms","Travel: ±28°","Response: 99.9%"], note:"Ground test completed. All surfaces tested through full range of motion." },
      { id:"rudder",  name:"Rudder PCU",              subsystem:"fltctrl", pos:[0.0,1.0,-3.6],   risk:8,  signals:["Travel: ±27°","PCU: 3000 PSI","Temp: 38 °C"],    note:"Nominal. Pre-flight hydraulic check passed." },
      { id:"cabin",   name:"Cabin Pressurization",    subsystem:"cabin",   pos:[0.0,0.3,0.9],    risk:7,  signals:["Diff: 0 PSI","Rate: 0 fpm","Temp: 24 °C"],       note:"Cabin on GPU air. Pre-flight checks in progress. 501 PAX boarding." },
      { id:"smoke",   name:"Smoke & Fire Detectors",  subsystem:"cabin",   pos:[0.0,0.35,-1.2],  risk:6,  signals:["Status: ARMED","Test: PASS","Zones: 12/12 OK"],  note:"Pre-flight test completed. All armed." },
      { id:"gear",    name:"Landing Gear — MLG",      subsystem:"struct",  pos:[0.0,-0.55,1.1],  risk:6,  signals:["Strut: 4.1 in","Brake: 28 °C","Wear: 14%"],      note:"Cold brakes. Low wear. Full fuel load strut extension normal." },
    ],
    subsystems:[
      { id:"eng",      name:"Engine Systems",    icon:"⚙",  signals:["N1 Fan Speed","EGT Temp","Oil Pressure","Vibration FFT"], risk:11, trend:"stable", failureWindow:null,    aiNote:"All 4 engines in ground cold state. Minor oil trace on Eng 4 nacelle — engineers investigating. Pre-flight vibration checks due 40 min pre-departure.", badge:"4 engines · 96 sensors" },
      { id:"fuel",     name:"Fuel Systems",      icon:"⛽", signals:["Fuel Flow L/R","Tank Imbalance","Pump Pressure","Crossfeed"], risk:7, trend:"stable", failureWindow:null,  aiNote:"Full fuel load for ultra-long-haul SYD route. All tanks topped — 148,600 kg total. Density crosscheck and seals verified by engineering.", badge:"6 tanks · 42 sensors" },
      { id:"avionics", name:"Avionics",          icon:"📡", signals:["IRS Drift","ADC Accuracy","TCAS Status","FMS Compute"],    risk:6,  trend:"stable", failureWindow:null,    aiNote:"IRS aligning on GPU power — 8 min to full alignment. FMS Sydney route loaded with AEROSENSE-AI recommended profile: FL410 step, CI 60.", badge:"3 IRS units · 18 sensors" },
      { id:"struct",   name:"Structural Health", icon:"🔩", signals:["Wing Flex","Fuselage Stress","Landing Gear Load","Fatigue Cycles"], risk:10, trend:"stable", failureWindow:null, aiNote:"Healthy aircraft — below average fatigue for airframe age. Full fuel load creating normal ground droop. All structural margins within design envelope.", badge:"Frame series · 210 sensors" },
      { id:"cabin",    name:"Cabin Systems",     icon:"🛋", signals:["Pressurization","Pack Temps","O₂ Masks","Smoke Detectors"], risk:7,  trend:"stable", failureWindow:null,   aiNote:"501 PAX boarding. Cabin on GPU air conditioning. Packs will start on engine start. Pre-flight safety checks complete.", badge:"2 packs · 88 sensors" },
      { id:"fltctrl",  name:"Flight Controls",  icon:"🕹",  signals:["Elevator Actuator","Aileron Response","Spoiler Deploy","Rudder Travel"], risk:9, trend:"stable", failureWindow:null, aiNote:"Pre-flight control surface check complete. All surfaces tested through full range. No anomalies. Flight controls ready for departure.", badge:"Triple redundant · 124 sensors" },
    ],
    emissions:[
      { label:"Pre-flight CO₂",  value:"0 t",      unit:"emitted",     delta:0   },
      { label:"APU Saved",       value:"0.6 t",    unit:"GPU used",    delta:-100 },
      { label:"Est. Flight CO₂", value:"182.4 t",  unit:"projected",   delta:-2.1 },
      { label:"SAF Uplift",      value:"5.2%",     unit:"planned",     delta:+2.4 },
    ],
    actions:[
      { id:1, type:"GROUND OPS",    priority:"HIGH", saving:"0.6 t CO₂", desc:"GPU in use instead of APU during 38-min boarding window. Saving confirmed: 0.6 t CO₂ vs APU baseline." },
      { id:2, type:"CLIMB PROFILE", priority:"HIGH", saving:"6.4 t CO₂", desc:"AI-optimised climb profile: CI 60, step to FL390 at LUVDA, FL410 at VIMAP. Est. save 6.4 t CO₂ vs standard profile." },
      { id:3, type:"ROUTING",       priority:"MED",  saving:"3.8 t CO₂", desc:"Southern polar track via YMMB STAR avoids forecast headwind over Great Australian Bight." },
      { id:4, type:"AIRCRAFT SWAP", priority:"LOW",  saving:"11.4 t CO₂", desc:"A380 at 96% load factor is optimal choice. Seat-per-kg ratio far superior to B777 alternative." },
    ],
    weather:[
      { region:"Gulf of Oman Dep",      type:"Tailwind",    severity:"light",    impact:"−6 min",  co2Impact:"−1.1 t", status:"FAVORABLE" },
      { region:"Australian East Coast",  type:"Headwind",   severity:"moderate", impact:"+18 min", co2Impact:"+3.6 t", status:"REROUTE"   },
      { region:"Southern Indian Ocean",  type:"Smooth Air", severity:"none",     impact:"0 min",   co2Impact:"0 t",    status:"NOMINAL"   },
      { region:"YSSY TMA",               type:"Sea Breeze", severity:"light",    impact:"−3 min",  co2Impact:"−0.5 t", status:"FAVORABLE" },
    ],
    alerts:[
      { time:"12:41:08", sys:"FUEL",      sev:"ok",   msg:"Full fuel load confirmed: 148,600 kg. Density crosscheck passed. GPU fuelling complete." },
      { time:"12:38:22", sys:"GROUND OPS",sev:"info", msg:"GPU active. APU off. CO₂ saving 0.6 t confirmed during boarding." },
      { time:"12:30:00", sys:"AVIONICS",  sev:"info", msg:"IRS alignment complete. FMS AEROSENSE-AI route loaded. Fuel saving profile active." },
      { time:"12:21:00", sys:"ENGINE",    sev:"info", msg:"Eng 4 minor oil trace on nacelle. Engineers inspecting. Non-dispatch-critical per MEL." },
      { time:"12:10:00", sys:"CARBON",    sev:"info", msg:"Projected flight CO₂: 182.4 t. AI optimised profile saves est. 10.2 t vs standard routing." },
      { time:"12:00:00", sys:"CABIN",     sev:"ok",   msg:"501 PAX boarding. Cabin pre-flight checks complete. GPU air conditioning nominal." },
    ],
    report:{ id:"EK508", route:"DXB→SYD", aircraft:"A380-800", grade:"A", crew:"Capt. Williams, F/O Al-Maktoum", landed:"PRE-FLIGHT", duration:"est. 14h 35m", nm:"7,480 NM",
      safety:["All pre-flight checks complete. Minor Eng 4 oil trace — MEL cleared, non-dispatch-critical.","Flight controls tested through full range of motion. No anomalies.","501 PAX boarded. Emergency equipment checks complete."],
      perf:["AI-optimised route and climb profile loaded. Projected saving: 10.2 t CO₂ vs standard.","Departure slot secured 8 min early by AEROSENSE-AI scheduling engine.","GPU used throughout boarding — 0.6 t CO₂ APU saving achieved."],
      maint:["Eng 4 oil trace — note raised for SYD arrival inspection. Non-dispatch-critical.","All other systems within limits. No open MEL items.","Next scheduled C-check: 2,840 FH remaining."],
      fuel:["Uplift: 148,600 kg. Full ultra-long-haul load. Density and quantity confirmed.","Projected CO₂: 182.4 t. SAF blend 5.2% — highest on fleet today.","AI climb profile targets 38.8 g/seat-km — 12.1% below route average."],
    },
  },

  "EK118": {
    sensors3d:[
      { id:"eng1",    name:"Engine 1 — Inner Left",  subsystem:"eng",     pos:[-1.7,-0.6,0.5],  risk:5,  signals:["N1: 0%","EGT: 180 °C","Oil: 41 PSI"],           note:"Post-flight cooling. EGT normalising. Oil pressure good after engine shutdown." },
      { id:"eng2",    name:"Engine 2 — Outer Left",  subsystem:"eng",     pos:[-3.2,-0.6,0.3],  risk:5,  signals:["N1: 0%","EGT: 172 °C","Vib: 0.0 IPS"],          note:"Cooling normally. No residual vibration. Last recorded 0.4 IPS in cruise." },
      { id:"eng3",    name:"Engine 3 — Inner Right", subsystem:"eng",     pos:[1.7,-0.6,0.5],   risk:6,  signals:["N1: 0%","EGT: 183 °C","Oil: 40 PSI"],            note:"Slightly slower EGT cool-down. Consistent with crosswind landing. Normal." },
      { id:"eng4",    name:"Engine 4 — Outer Right", subsystem:"eng",     pos:[3.2,-0.6,0.3],   risk:5,  signals:["N1: 0%","EGT: 174 °C","Vib: 0.0 IPS"],           note:"Post-flight nominal. Engine logbook updated." },
      { id:"wingL",   name:"Wing Flex — Port",       subsystem:"struct",  pos:[-3.6,0.0,0.2],   risk:9,  signals:["Flex: 0.4°","Fatigue: 42%","Stress: 18%"],        note:"Post-landing ground state. Fatigue accumulation logged from this leg." },
      { id:"wingR",   name:"Wing Flex — Starboard",  subsystem:"struct",  pos:[3.6,0.0,0.2],    risk:9,  signals:["Flex: 0.4°","Fatigue: 40%","Stress: 17%"],        note:"Symmetric. Normal post-flight state." },
      { id:"frame47", name:"Frame 47 — Structural",  subsystem:"struct",  pos:[0.0,0.0,0.4],    risk:12, signals:["Stress: 22%","Cycles: 8,820","Δ: +0.1σ"],         note:"Marginal fatigue increase this leg. Next scheduled inspection in 1,180 FH." },
      { id:"avionics",name:"Avionics Bay",            subsystem:"avionics",pos:[0.0,0.1,3.9],    risk:4,  signals:["IRS drift: 0.018 NM/hr","ADC: OK","FMS: OK"],     note:"IRS accumulated 6h44m drift — 0.018 NM/hr end-of-flight. Within limits." },
      { id:"fuel_c",  name:"Center Fuel Tank",        subsystem:"fuel",    pos:[0.0,-0.35,0.1],  risk:5,  signals:["Remaining: 4,820 kg","Pump: OFF","Temp: +22 °C"],  note:"Fuel reserves at destination: 4,820 kg above minimum. Good planning margin." },
      { id:"fuel_L",  name:"Left Wing Tank",          subsystem:"fuel",    pos:[-2.1,-0.1,0.2],  risk:4,  signals:["Remaining: 12%","Flow: 0 kg/min","Temp: +20 °C"],  note:"Post-flight. Fuelling service to commence." },
      { id:"fuel_R",  name:"Right Wing Tank",         subsystem:"fuel",    pos:[2.1,-0.1,0.2],   risk:4,  signals:["Remaining: 13%","Flow: 0 kg/min","Temp: +20 °C"],  note:"Post-flight. Symmetric residual." },
      { id:"fltctrl", name:"Elevator Actuator",       subsystem:"fltctrl", pos:[0.0,0.4,-4.1],   risk:6,  signals:["Latency: 10 ms","Travel: ±28°","Response: 99.6%"], note:"Post-flight normal. No anomalies recorded in flight. Crosswind landing loads within limits." },
      { id:"rudder",  name:"Rudder PCU",              subsystem:"fltctrl", pos:[0.0,1.0,-3.6],   risk:5,  signals:["Travel: ±27°","PCU: 3000 PSI","Temp: 26 °C"],     note:"Post-flight nominal. Crosswind correction logged." },
      { id:"cabin",   name:"Cabin Pressurization",    subsystem:"cabin",   pos:[0.0,0.3,0.9],    risk:14, signals:["Diff: 0 PSI","Rate: 0 fpm","Temp: 24 °C"],         note:"Pack B outlet overshoot of 2.2 °C logged. Schedule trim valve inspection. Non-critical." },
      { id:"smoke",   name:"Smoke & Fire Detectors",  subsystem:"cabin",   pos:[0.0,0.35,-1.2],  risk:4,  signals:["Status: SAFE","Test: PASS","Zones: 12/12 OK"],    note:"Post-flight SAFE state. All zones disarmed normally on block-in." },
      { id:"gear",    name:"Landing Gear — MLG",      subsystem:"struct",  pos:[0.0,-0.55,1.1],  risk:8,  signals:["Strut: 3.9 in","Brake: 310 °C","Wear: 23%"],      note:"Brake temp elevated post-crosswind landing. Cooling within normal range. Wear within limits." },
    ],
    subsystems:[
      { id:"eng",      name:"Engine Systems",    icon:"⚙",  signals:["N1 Fan Speed","EGT Temp","Oil Pressure","Vibration FFT"], risk:6,  trend:"stable", failureWindow:null, aiNote:"All engines in post-flight cooling state. No anomalies recorded during flight. EGT exceedance +6 °C on Eng 3 during take-off — within dispatch limits. Logged.", badge:"4 engines · 96 sensors" },
      { id:"fuel",     name:"Fuel Systems",      icon:"⛽", signals:["Fuel Flow L/R","Tank Imbalance","Pump Pressure","Crossfeed"], risk:5, trend:"stable", failureWindow:null, aiNote:"Total burn: 36,820 kg vs plan +340 kg. ATC holds account for 220 kg variance. End-of-flight reserves: 4,820 kg above minimum. Excellent fuel management.", badge:"6 tanks · 42 sensors" },
      { id:"avionics", name:"Avionics",          icon:"📡", signals:["IRS Drift","ADC Accuracy","TCAS Status","FMS Compute"],    risk:4,  trend:"stable", failureWindow:null, aiNote:"End-of-flight IRS drift 0.018 NM/hr — within limits for 6h44m leg. GNSS assisted throughout. All navigation systems performed nominally.", badge:"3 IRS units · 18 sensors" },
      { id:"struct",   name:"Structural Health", icon:"🔩", signals:["Wing Flex","Fuselage Stress","Landing Gear Load","Fatigue Cycles"], risk:10, trend:"stable", failureWindow:null, aiNote:"Normal fatigue accumulation from this leg. Crosswind landing loads within limits. Next scheduled inspection 1,180 FH away.", badge:"Frame series · 210 sensors" },
      { id:"cabin",    name:"Cabin Systems",     icon:"🛋", signals:["Pressurization","Pack Temps","O₂ Masks","Smoke Detectors"], risk:14, trend:"up", failureWindow:null, aiNote:"Pack B temperature overshoot 2.2 °C logged during cruise. Trim valve inspection recommended within 80 FH. Non-critical — safety not affected.", badge:"2 packs · 88 sensors" },
      { id:"fltctrl",  name:"Flight Controls",  icon:"🕹",  signals:["Elevator Actuator","Aileron Response","Spoiler Deploy","Rudder Travel"], risk:6, trend:"stable", failureWindow:null, aiNote:"All surfaces performed nominally. Crosswind correction on landing required 18° rudder input — within limits. No anomalies on control surfaces.", badge:"Triple redundant · 124 sensors" },
    ],
    emissions:[
      { label:"Fuel Burned",    value:"36.8 t",  unit:"total",       delta:-1.4 },
      { label:"CO₂ Emitted",   value:"71.2 t",  unit:"total",       delta:-4.9 },
      { label:"g / Seat-km",   value:"42.1",    unit:"efficiency",  delta:-4.9 },
      { label:"SAF Blend",     value:"3.2%",    unit:"this flight", delta:+0.8 },
    ],
    actions:[
      { id:1, type:"POST-FLIGHT",   priority:"INFO", saving:"—", desc:"Flight complete. AEROSENSE-AI report generated and submitted to CAMO and Flight Ops." },
      { id:2, type:"NEXT FLIGHT",   priority:"MED",  saving:"0.8 t CO₂", desc:"Recommend SAF uplift to 4.5% for return leg. Supplier at CDG confirmed available." },
      { id:3, type:"MAINTENANCE",   priority:"MED",  saving:"—",          desc:"Pack B trim valve inspection due within 80 FH. Schedule at next A-check window." },
    ],
    weather:[
      { region:"DXB Departure",      type:"Calm",         severity:"none",    impact:"0 min",   co2Impact:"0 t",     status:"NOMINAL"   },
      { region:"EPKAT Waypoint",      type:"Light CAT",    severity:"light",   impact:"+3 min",  co2Impact:"+0.4 t",  status:"MONITOR"   },
      { region:"CDG Approach",        type:"Crosswind",    severity:"moderate",impact:"+6 min",  co2Impact:"+0.9 t",  status:"MONITOR"   },
      { region:"Overall Route",       type:"Favourable",   severity:"light",   impact:"−11 min", co2Impact:"−1.8 t",  status:"FAVORABLE" },
    ],
    alerts:[
      { time:"12:14:00", sys:"COMPLETE",  sev:"ok",   msg:"EK118 on blocks at CDG Gate D12. All passengers disembarked. Flight complete." },
      { time:"12:11:22", sys:"LANDING",   sev:"info", msg:"Crosswind landing 18° rudder correction. Within limits. Brake temp 310 °C post-stop." },
      { time:"12:08:01", sys:"FUEL",      sev:"ok",   msg:"Final fuel burn: 36,820 kg. vs plan +340 kg. ATC holds account for +220 kg variance." },
      { time:"11:55:14", sys:"CABIN",     sev:"info", msg:"Pack B temp overshoot 2.2 °C logged in cruise. Non-critical. Trim valve inspection recommended." },
      { time:"11:30:00", sys:"CARBON",    sev:"ok",   msg:"CO₂ total: 71.2 t. Seat-km efficiency 42.1 g — 4.9% below fleet average. Good performance." },
      { time:"06:12:00", sys:"DEPARTURE", sev:"ok",   msg:"EK118 departed DXB Gate D12 on time. AEROSENSE-AI route loaded." },
    ],
    report:{ id:"EK118", route:"DXB→CDG", aircraft:"B777-200LR", grade:"A", crew:"Capt. Al-Rashidi, F/O Müller", landed:"12:14 UTC", duration:"6h 44m", nm:"3,252 NM",
      safety:["No safety-critical anomalies detected across 480-sensor array.","Light turbulence at EPKAT, FL340. Peak g: 0.31. Seat-belt sign latency 18 sec — within limits.","Engine EGT exceedance +6 °C (Eng 3) during T/O. Within dispatch limits. Logged."],
      perf:["Step climb to FL380 delayed 22 min — ATC congestion. Additional burn: 140 kg. Not crew-attributable.","ECON speed adherence: 94.2% (target 97%). CI deviation during CLB phase.","Arrived 6 min ahead of revised schedule. Slot recovery by Crew commended."],
      maint:["Pack B temperature overshoot 2.2 °C. Trim valve inspection due within 80 FH.","All other systems within limits. No open MEL items.","Next A-check: 420 FH remaining."],
      fuel:["Total fuel burn: 36,820 kg. vs plan: +340 kg (+0.9%). ATC holds primary variance.","CO₂ emitted: 71.2 t. Seat-km efficiency: 42.1 g — fleet avg 44.3 g. Good performance.","SAF blend: 3.2%. Net CO₂ after SAF offset: 68.9 t. Pathway target: 38 g/seat-km by 2028."],
    },
  },
};

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function GaugeRing({ value, size=64, stroke=6, color }) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, dash=(value/100)*circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:"stroke-dasharray 1s ease" }}/>
    </svg>
  );
}
function TrendArrow({ dir }) {
  const m={up:{sym:"↑",col:"#ff3b5c"},down:{sym:"↓",col:"#00e5c0"},stable:{sym:"→",col:"#f5a623"}};
  const t=m[dir]||m.stable;
  return <span style={{ color:t.col, fontSize:13, fontFamily:"'DM Mono',monospace" }}>{t.sym} {dir.toUpperCase()}</span>;
}
function LivePulse({ color }) {
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:color, marginRight:6, animation:"pulse 1.6s infinite" }}/>;
}
function Badge({ children, color="#00e5c0" }) {
  return <span style={{ background:`${color}18`, border:`1px solid ${color}40`, color, fontSize:9, fontFamily:"'DM Mono',monospace", padding:"2px 7px", borderRadius:3, letterSpacing:1 }}>{children}</span>;
}
function SignalBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:10, color:"#999", fontFamily:"'DM Mono',monospace" }}>{label}</span>
        <span style={{ fontSize:10, color, fontFamily:"'DM Mono',monospace" }}>{value}</span>
      </div>
      <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
        <div style={{ height:3, width:`${(value/max)*100}%`, background:color, borderRadius:2, transition:"width 1s" }}/>
      </div>
    </div>
  );
}
function SubsystemCard({ sys, onClick, selected }) {
  const rc=RISK_COLOR(sys.risk);
  return (
    <div onClick={()=>onClick(sys)} style={{ background:selected?"rgba(0,229,192,0.07)":"rgba(255,255,255,0.03)", border:`1px solid ${selected?rc:"rgba(255,255,255,0.08)"}`, borderRadius:10, padding:"14px 16px", cursor:"pointer", transition:"all .2s", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, width:`${sys.risk}%`, height:2, background:rc, transition:"width 1s" }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#ccc", letterSpacing:2 }}>{sys.name.toUpperCase()}</span>
        <span style={{ fontSize:20 }}>{sys.icon}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ position:"relative" }}>
          <GaugeRing value={sys.risk} size={52} stroke={5} color={rc}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontFamily:"'DM Mono',monospace", color:rc }}>{sys.risk}</div>
        </div>
        <div>
          <div style={{ fontSize:11, color:rc, fontFamily:"'DM Mono',monospace", fontWeight:700, marginBottom:2 }}>{RISK_LABEL(sys.risk)}</div>
          <TrendArrow dir={sys.trend}/>
          {sys.failureWindow&&<div style={{ fontSize:9, color:"#ff3b5c", fontFamily:"'DM Mono',monospace", marginTop:3 }}>⚠ FAIL {sys.failureWindow}</div>}
        </div>
      </div>
      <div style={{ marginTop:8, fontSize:9, color:"#666", fontFamily:"'DM Mono',monospace" }}>{sys.badge}</div>
    </div>
  );
}

// ─── 3-D Aircraft Viewer ──────────────────────────────────────────────────────
function AircraftViewer3D({ sensors }) {
  const SENSORS_3D = sensors;
  const mountRef = useRef(null);
  const stateRef = useRef({ hoveredId:null, selectedId:null });
  const [selected, setSelected] = useState(null);

  useEffect(()=>{
    const mount = mountRef.current;
    if (!mount) return;
    const W=mount.clientWidth, H=mount.clientHeight;
    
    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.2) : Math.min(window.devicePixelRatio, 2);
    const geometryDetail = isMobile ? 12 : 24; // Reduce geometry segments on mobile

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias:!isMobile, 
      alpha:true, 
      powerPreference: "high-performance",
      stencil: false,
      depth: true
    });
    renderer.setSize(W,H);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000,0);
    if (isMobile) {
      renderer.shadowMap.enabled = false; // Disable shadows on mobile
    }
    mount.appendChild(renderer.domElement);

    // Scene / Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W/H, 0.1, 200);
    camera.position.set(10, 5, 14);
    camera.lookAt(0,0,0);

    // Lights
    scene.add(new THREE.AmbientLight(0x1a2a3a, 1.2));
    const key = new THREE.DirectionalLight(0x6699cc, 2.0);
    key.position.set(6,10,8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x00e5c0, 0.5);
    rim.position.set(-8,-3,-6);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0x334455, 0.6);
    fill.position.set(0,-8,4);
    scene.add(fill);

    // Grid floor - simpler on mobile
    const gridSize = isMobile ? 14 : 28;
    const grid = new THREE.GridHelper(gridSize, gridSize, 0x0a1828, 0x060e1a);
    grid.position.y = -3.5;
    scene.add(grid);

    // Materials
    const bodyMat   = new THREE.MeshPhongMaterial({ color:0x0d1e35, shininess:80, specular:0x2244aa });
    const wingMat   = new THREE.MeshPhongMaterial({ color:0x0b1a2e, shininess:60, specular:0x1a3366 });
    const engMat    = new THREE.MeshPhongMaterial({ color:0x070d17, shininess:100, specular:0x334455 });
    const glassMat  = new THREE.MeshPhongMaterial({ color:0x1a3a6a, transparent:true, opacity:0.5, shininess:150 });
    const liveryMat = new THREE.MeshPhongMaterial({ color:0x00e5c0, emissive:0x00e5c0, emissiveIntensity:0.15, transparent:true, opacity:0.55 });

    // Aircraft group
    const aircraft = new THREE.Group();
    scene.add(aircraft);

    // — Fuselage
    const fuseG = new THREE.CylinderGeometry(0.46,0.46,10,geometryDetail);
    const fuse = new THREE.Mesh(fuseG, bodyMat);
    fuse.rotation.x = Math.PI/2;
    aircraft.add(fuse);

    // — Nose cone
    const noseG = new THREE.ConeGeometry(0.46,2.1,geometryDetail);
    const nose = new THREE.Mesh(noseG, bodyMat);
    nose.rotation.x = -Math.PI/2;
    nose.position.z = 6.05;
    aircraft.add(nose);

    // — Nose tip (pitot) - skip on mobile for performance
    if (!isMobile) {
      const pitotG = new THREE.CylinderGeometry(0.025,0.025,0.5,8);
      const pitot = new THREE.Mesh(pitotG, new THREE.MeshPhongMaterial({ color:0xaabbcc, shininess:120 }));
      pitot.rotation.x = Math.PI/2;
      pitot.position.z = 7.35;
      aircraft.add(pitot);
    }

    // — Windshield
    const windG = new THREE.CylinderGeometry(0.28,0.40,0.5,isMobile ? 8 : 16,1,false,-0.3,1.1);
    const wind = new THREE.Mesh(windG, glassMat);
    wind.rotation.x = -1.1;
    wind.position.set(0,0.22,5.6);
    aircraft.add(wind);

    // — Tail taper
    const tailG = new THREE.ConeGeometry(0.36,1.5,geometryDetail);
    const tail = new THREE.Mesh(tailG, bodyMat);
    tail.rotation.x = Math.PI/2;
    tail.position.z = -5.75;
    aircraft.add(tail);

    // — APU exhaust - skip on mobile
    if (!isMobile) {
      const apuG = new THREE.CylinderGeometry(0.07,0.07,0.25,8);
      const apu = new THREE.Mesh(apuG, engMat);
      apu.rotation.x = Math.PI/2;
      apu.position.z = -5.95;
      aircraft.add(apu);
    }

    // — Livery stripe
    const stripeG = new THREE.CylinderGeometry(0.47,0.47,3.2,geometryDetail,1,true);
    const stripe = new THREE.Mesh(stripeG, liveryMat);
    stripe.rotation.x = Math.PI/2;
    stripe.position.z = 1.4;
    aircraft.add(stripe);

    // — Main wings
    const wingBoxG = new THREE.BoxGeometry(10.6,0.11,2.5);
    const wingBox = new THREE.Mesh(wingBoxG, wingMat);
    wingBox.position.set(0,-0.18,0.0);
    aircraft.add(wingBox);

    // — Wing leading-edge (thin angled strip each side)
    [[-1,0.42],[1,0.42]].forEach(([sign])=>{
      const leG = new THREE.BoxGeometry(0.08,0.08,2.0);
      const le = new THREE.Mesh(leG, new THREE.MeshPhongMaterial({ color:0x1a3a66, shininess:60 }));
      le.position.set(sign*4.5,-0.14,-0.3);
      le.rotation.y = sign*0.18;
      aircraft.add(le);
    });

    // — Winglets
    [-5.35,5.35].forEach((x,i)=>{
      const wlG = new THREE.BoxGeometry(0.10,0.88,0.52);
      const wl = new THREE.Mesh(wlG, wingMat);
      wl.position.set(x,0.26,0.0);
      wl.rotation.z = i===0?-0.28:0.28;
      aircraft.add(wl);
    });

    // — Horizontal stabilizers
    const hStabG = new THREE.BoxGeometry(4.6,0.08,1.05);
    const hStab = new THREE.Mesh(hStabG, wingMat);
    hStab.position.set(0,0.1,-4.65);
    aircraft.add(hStab);

    // — Vertical stabilizer
    const vStabG = new THREE.BoxGeometry(0.11,1.95,1.35);
    const vStab = new THREE.Mesh(vStabG, wingMat);
    vStab.position.set(0,1.08,-4.2);
    aircraft.add(vStab);

    // — Rudder accent line
    const radG = new THREE.BoxGeometry(0.015,1.9,0.04);
    const rad = new THREE.Mesh(radG, new THREE.MeshPhongMaterial({ color:0x00e5c0, emissive:0x00e5c0, emissiveIntensity:0.35 }));
    rad.position.set(0,1.08,-5.0);
    aircraft.add(rad);

    // — 4 Engines
    const engCfg = [
      { x:-1.85, y:-0.58, z:0.5 },
      { x:-3.35, y:-0.58, z:0.2 },
      { x: 1.85, y:-0.58, z:0.5 },
      { x: 3.35, y:-0.58, z:0.2 },
    ];
    const engineDetail = isMobile ? 12 : 20;
    engCfg.forEach(({ x,y,z })=>{
      // Pylon
      const pylG = new THREE.BoxGeometry(0.13,0.42,1.0);
      const pylMesh = new THREE.Mesh(pylG, wingMat);
      pylMesh.position.set(x, y+0.38, z);
      aircraft.add(pylMesh);
      // Nacelle
      const nacG = new THREE.CylinderGeometry(0.245,0.265,1.85,engineDetail);
      const nac = new THREE.Mesh(nacG, engMat);
      nac.rotation.x=Math.PI/2; nac.position.set(x,y,z);
      aircraft.add(nac);
      // Intake lip - skip on mobile
      if (!isMobile) {
        const lipG = new THREE.TorusGeometry(0.255,0.038,8,16);
        const lip = new THREE.Mesh(lipG, new THREE.MeshPhongMaterial({ color:0x0a1828, shininess:90 }));
        lip.position.set(x,y,z+0.93);
        aircraft.add(lip);
      }
      // Fan face
      const fanG = new THREE.CircleGeometry(0.215,engineDetail);
      const fan = new THREE.Mesh(fanG, new THREE.MeshPhongMaterial({ color:0x050b14, emissive:0x001122, emissiveIntensity:0.5 }));
      fan.position.set(x,y,z+0.95);
      aircraft.add(fan);
      // Exhaust nozzle
      const exG = new THREE.CylinderGeometry(0.19,0.14,0.38,isMobile ? 10 : 16);
      const ex = new THREE.Mesh(exG,engMat);
      ex.rotation.x=Math.PI/2; ex.position.set(x,y,z-1.02);
      aircraft.add(ex);
    });

    // — Sensor nodes
    const sensorMeshes = [];
    const sGroup = new THREE.Group();
    aircraft.add(sGroup);

    const sensorDetail = isMobile ? 8 : 14;
    SENSORS_3D.forEach((sensor)=>{
      const col = RISK_COLOR_HEX(sensor.risk);
      // Glow sphere
      const glowG = new THREE.SphereGeometry(0.22,sensorDetail,sensorDetail);
      const glowM = new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.11 });
      const glow = new THREE.Mesh(glowG,glowM);
      glow.position.set(...sensor.pos);
      sGroup.add(glow);
      // Core
      const coreG = new THREE.SphereGeometry(0.10,sensorDetail,sensorDetail);
      const coreM = new THREE.MeshPhongMaterial({ color:col, emissive:col, emissiveIntensity:0.75, shininess:60 });
      const core = new THREE.Mesh(coreG,coreM);
      core.position.set(...sensor.pos);
      core.userData = { sensor, glow, glowM, coreM };
      sGroup.add(core);
      sensorMeshes.push(core);
      // Connector stub - skip on mobile
      if (!isMobile) {
        const dir = new THREE.Vector3(...sensor.pos).normalize();
        const pts = [new THREE.Vector3(...sensor.pos), new THREE.Vector3(...sensor.pos).addScaledVector(dir,-0.22)];
        const lG = new THREE.BufferGeometry().setFromPoints(pts);
        sGroup.add(new THREE.Line(lG, new THREE.LineBasicMaterial({ color:col, transparent:true, opacity:0.35 })));
      }
    });

    // Mouse/Touch interaction
    let isDragging=false, dragDist=0, lastX=0, lastY=0, velX=0;
    const getXY = e=>{ 
      const r=mount.getBoundingClientRect(); 
      const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
      const clientY = e.touches ? e.touches[0]?.clientY : e.clientY;
      return [clientX-r.left, clientY-r.top]; 
    };

    const onDown = e=>{ 
      e.preventDefault();
      isDragging=true; 
      dragDist=0; 
      [lastX,lastY]=getXY(e); 
    };
    const onMove = e=>{
      e.preventDefault();
      const [cx,cy]=getXY(e);
      if(isDragging){
        const dx=cx-lastX, dy=cy-lastY;
        dragDist+=Math.abs(dx)+Math.abs(dy);
        aircraft.rotation.y+=dx*0.012;
        aircraft.rotation.x=clamp(aircraft.rotation.x+dy*0.006,-0.7,0.7);
        velX=dx*0.012;
        lastX=cx; lastY=cy;
      }
      // Hover hit-test (only for mouse)
      if(!e.touches){
        const mouse=new THREE.Vector2((cx/W)*2-1,-(cy/H)*2+1);
        const rc=new THREE.Raycaster();
        rc.setFromCamera(mouse,camera);
        const hits=rc.intersectObjects(sensorMeshes);
        stateRef.current.hoveredId = hits.length>0 ? hits[0].object.userData.sensor.id : null;
        mount.style.cursor = hits.length>0 ? "pointer" : "grab";
      }
    };
    const onUp = e=>{
      e.preventDefault();
      if(dragDist<6){
        const [cx,cy]=getXY(e);
        const mouse=new THREE.Vector2((cx/W)*2-1,-(cy/H)*2+1);
        const rc=new THREE.Raycaster();
        rc.setFromCamera(mouse,camera);
        const hits=rc.intersectObjects(sensorMeshes);
        setSelected(hits.length>0 ? hits[0].object.userData.sensor : null);
      }
      isDragging=false;
    };
    
    // Mouse events
    mount.addEventListener("mousedown",onDown);
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
    
    // Touch events
    mount.addEventListener("touchstart",onDown, { passive: false });
    mount.addEventListener("touchmove",onMove, { passive: false });
    mount.addEventListener("touchend",onUp, { passive: false });
    mount.addEventListener("touchcancel",onUp, { passive: false });

    // Animation loop - reduced frequency on mobile
    let rafId, t=0, lastFrameTime=0;
    const targetFPS = isMobile ? 30 : 60;
    const frameInterval = 1000 / targetFPS;
    
    const animate=(currentTime)=>{
      rafId=requestAnimationFrame(animate);
      
      // Throttle animation on mobile
      if (isMobile && currentTime - lastFrameTime < frameInterval) {
        return;
      }
      lastFrameTime = currentTime;
      
      t+=isMobile ? 0.024 : 0.016; // Slower animation on mobile
      if(!isDragging){ 
        aircraft.rotation.y+=velX*0.94; 
        velX*=0.94; 
        aircraft.rotation.y+=isMobile ? 0.0015 : 0.0025; // Slower auto-rotation
      }
      sensorMeshes.forEach((m,i)=>{
        const { sensor, glowM, coreM }=m.userData;
        const isSel=sensor.id===stateRef.current.selectedId;
        const isHov=sensor.id===stateRef.current.hoveredId;
        const animSpeed = isMobile ? 1.5 : 2.5;
        const p=0.88+0.28*Math.sin(t*animSpeed+i*0.62);
        m.scale.setScalar(isSel?1.6:isHov?1.3:p);
        coreM.emissiveIntensity=isSel?1.3:isHov?1.0:0.5+0.35*Math.sin(t*animSpeed+i*0.62);
        glowM.opacity=isSel?0.38:isHov?0.26:0.08+0.07*Math.sin(t*animSpeed+i*0.62);
      });
      renderer.render(scene,camera);
    };
    animate(0);

    const onResize=()=>{
      const nW=mount.clientWidth, nH=mount.clientHeight;
      camera.aspect=nW/nH; camera.updateProjectionMatrix();
      renderer.setSize(nW,nH);
    };
    window.addEventListener("resize",onResize);

    return ()=>{
      cancelAnimationFrame(rafId);
      mount.removeEventListener("mousedown",onDown);
      window.removeEventListener("mousemove",onMove);
      window.removeEventListener("mouseup",onUp);
      mount.removeEventListener("touchstart",onDown);
      mount.removeEventListener("touchmove",onMove);
      mount.removeEventListener("touchend",onUp);
      mount.removeEventListener("touchcancel",onUp);
      window.removeEventListener("resize",onResize);
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  },[]);

  // Keep ref in sync
  useEffect(()=>{ stateRef.current.selectedId = selected?.id; },[selected]);

  const subsystems = [...new Set(SENSORS_3D.map(s=>s.subsystem))];
  const isMobile = useIsMobile();
  
  return (
    <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr" : "1fr 340px", gap:isMobile ? 32 : 16 }}>
      {/* Canvas */}
      <div style={{ position:"relative" }}>
        {/* Legend */}
        {!isMobile && (
          <div style={{ position:"absolute", top:14, left:14, zIndex:10, display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:4 }}>SENSOR STATUS</div>
            {[["NOMINAL","#00e5c0"],["WATCH","#f5a623"],["CRITICAL","#ff3b5c"]].map(([lbl,col])=>(
              <div key={lbl} style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ width:9, height:9, borderRadius:"50%", background:col, display:"inline-block", boxShadow:`0 0 8px ${col}` }}/>
                <span style={{ fontSize:9, color:col, fontFamily:"'DM Mono',monospace" }}>{lbl}</span>
              </div>
            ))}
          </div>
        )}
        {/* Hint */}
        {!isMobile && (
          <div style={{ position:"absolute", bottom:14, left:14, zIndex:10 }}>
            <span style={{ fontSize:9, color:"#444", fontFamily:"'DM Mono',monospace" }}>DRAG TO ROTATE · CLICK SENSOR FOR DETAIL</span>
          </div>
        )}
        {/* Subsystem pills - hide on mobile */}
        {!isMobile && (
          <div style={{ position:"absolute", top:14, right:14, zIndex:10, display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end" }}>
            <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:2 }}>SUBSYSTEMS</div>
            {subsystems.map(sid=>{
              const meta=SUBSYSTEM_META[sid];
              const maxRisk=Math.max(...SENSORS_3D.filter(s=>s.subsystem===sid).map(s=>s.risk));
              const count=SENSORS_3D.filter(s=>s.subsystem===sid).length;
              return (
                <div key={sid} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(0,0,0,0.55)", border:`1px solid ${meta?.color??'#333'}22`, borderRadius:5, padding:"4px 10px" }}>
                  <span style={{ fontSize:11 }}>{meta?.icon}</span>
                  <span style={{ fontSize:9, color:"#888", fontFamily:"'DM Mono',monospace" }}>{meta?.name}</span>
                  <span style={{ fontSize:9, color:RISK_COLOR(maxRisk), fontFamily:"'DM Mono',monospace" }}>{count}×</span>
                </div>
              );
            })}
          </div>
        )}
        {/* Mobile legend below canvas */}
        {isMobile && (
          <div style={{ marginTop:24, display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap", padding:"0 8px" }}>
            {[["NOMINAL","#00e5c0"],["WATCH","#f5a623"],["CRITICAL","#ff3b5c"]].map(([lbl,col])=>(
              <div key={lbl} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ width:14, height:14, borderRadius:"50%", background:col, display:"inline-block", boxShadow:`0 0 8px ${col}` }}/>
                <span style={{ fontSize:14, color:col, fontFamily:"'DM Mono',monospace", fontWeight:500 }}>{lbl}</span>
              </div>
            ))}
          </div>
        )}
        <div ref={mountRef}
          style={{ width:"100%", height:isMobile ? 380 : 600, borderRadius:isMobile ? 20 : 12, overflow:"hidden", background:"radial-gradient(ellipse at 40% 30%, #0b1d30 0%, #030a14 65%)", border:"1px solid rgba(255,255,255,0.06)", cursor:"grab", touchAction:"none" }}
        />
        {isMobile && (
          <div style={{ marginTop:20, textAlign:"center", padding:"0 12px" }}>
            <span style={{ fontSize:13, color:"#666", fontFamily:"'DM Mono',monospace", lineHeight:1.6 }}>Touch and drag to rotate · Tap sensor for details</span>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div style={{ display:"flex", flexDirection:"column", gap:isMobile ? 28 : 12 }}>
        {selected ? (
          <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${RISK_COLOR(selected.risk)}35`, borderRadius:isMobile ? 20 : 12, padding:isMobile ? 28 : 20, flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:isMobile ? 24 : 14 }}>
              <div style={{ flex:1, paddingRight:isMobile ? 12 : 0 }}>
                <div style={{ fontSize:isMobile ? 12 : 8, color:"#555", letterSpacing:2, marginBottom:isMobile ? 10 : 5 }}>SELECTED SENSOR</div>
                <div style={{ fontSize:isMobile ? 20 : 14, fontFamily:"'Outfit',sans-serif", fontWeight:800, color:"#e0e8f0", lineHeight:1.4 }}>{selected.name}</div>
                <div style={{ fontSize:isMobile ? 14 : 10, color:"#666", marginTop:isMobile ? 8 : 4 }}>{SUBSYSTEM_META[selected.subsystem]?.icon} {SUBSYSTEM_META[selected.subsystem]?.name}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#888", borderRadius:10, padding:isMobile ? "10px 16px" : "4px 10px", cursor:"pointer", fontSize:isMobile ? 14 : 10, fontFamily:"'DM Mono',monospace", minWidth:isMobile ? 56 : "auto", minHeight:isMobile ? 48 : "auto" }}>✕</button>
            </div>
            {/* Gauge */}
            <div style={{ display:"flex", alignItems:"center", gap:isMobile ? 22 : 14, marginBottom:isMobile ? 24 : 16, padding:isMobile ? "20px 22px" : "12px 14px", background:"rgba(0,0,0,0.3)", borderRadius:isMobile ? 14 : 8 }}>
              <div style={{ position:"relative" }}>
                <GaugeRing value={selected.risk} size={isMobile ? 90 : 64} stroke={isMobile ? 9 : 6} color={RISK_COLOR(selected.risk)}/>
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile ? 20 : 13, fontFamily:"'DM Mono',monospace", color:RISK_COLOR(selected.risk), fontWeight:700 }}>{selected.risk}</div>
              </div>
              <div>
                <div style={{ fontSize:isMobile ? 18 : 13, color:RISK_COLOR(selected.risk), fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{RISK_LABEL(selected.risk)}</div>
                <div style={{ fontSize:isMobile ? 13 : 9, color:"#555", marginTop:isMobile ? 6 : 3 }}>Risk Score / 100</div>
                {!isMobile && (
                  <div style={{ fontSize:9, color:"#444", marginTop:6, fontFamily:"'DM Mono',monospace" }}>XYZ {selected.pos.map(v=>v.toFixed(1)).join(" · ")}</div>
                )}
              </div>
            </div>
            {/* Readings */}
            <div style={{ marginBottom:isMobile ? 24 : 14 }}>
              <div style={{ fontSize:isMobile ? 12 : 8, color:"#555", letterSpacing:2, marginBottom:isMobile ? 16 : 10 }}>LIVE READINGS</div>
              {selected.signals.map((sig,i)=>{
                const parts=sig.split(": ");
                return (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:isMobile ? "14px 18px" : "7px 10px", background:"rgba(0,0,0,0.25)", borderRadius:isMobile ? 10 : 5, marginBottom:isMobile ? 10 : 5 }}>
                    <span style={{ fontSize:isMobile ? 14 : 10, color:"#888", fontFamily:"'DM Mono',monospace" }}>{parts[0]}</span>
                    <span style={{ fontSize:isMobile ? 14 : 10, color:RISK_COLOR(selected.risk), fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{parts[1]}</span>
                  </div>
                );
              })}
            </div>
            {/* AI note */}
            <div style={{ background:"rgba(0,229,192,0.04)", border:"1px solid rgba(0,229,192,0.12)", borderRadius:isMobile ? 14 : 8, padding:isMobile ? 20 : 14 }}>
              <div style={{ fontSize:isMobile ? 12 : 8, color:"#00e5c0", letterSpacing:2, marginBottom:isMobile ? 14 : 8 }}>🤖 AI ANALYSIS</div>
              <p style={{ fontSize:isMobile ? 14 : 10, color:"#bbb", lineHeight:isMobile ? 1.9 : 1.85 }}>{selected.note}</p>
            </div>
          </div>
        ) : (
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:isMobile ? 20 : 12, padding:isMobile ? 24 : 18, flex:1, overflowY:"auto", maxHeight:isMobile ? "none" : 460 }}>
            <div style={{ fontSize:isMobile ? 13 : 9, color:"#555", letterSpacing:2, marginBottom:isMobile ? 22 : 14 }}>ALL SENSOR NODES — {SENSORS_3D.length} TOTAL</div>
            {SENSORS_3D.map(s=>{
              const rc=RISK_COLOR(s.risk);
              return (
                <div key={s.id} onClick={()=>setSelected(s)}
                  style={{ display:"flex", alignItems:"center", gap:isMobile ? 14 : 10, padding:isMobile ? "16px 20px" : "9px 12px", background:"rgba(0,0,0,0.2)", borderRadius:isMobile ? 12 : 7, marginBottom:isMobile ? 12 : 6, cursor:"pointer", border:`1px solid ${rc}15`, minHeight:isMobile ? 68 : "auto" }}
                  onMouseEnter={e=>!isMobile && (e.currentTarget.style.background="rgba(0,229,192,0.05)")}
                  onMouseLeave={e=>!isMobile && (e.currentTarget.style.background="rgba(0,0,0,0.2)")}>
                  <div style={{ width:isMobile ? 14 : 8, height:isMobile ? 14 : 8, borderRadius:"50%", background:rc, boxShadow:`0 0 6px ${rc}`, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:isMobile ? 15 : 10, color:"#ccc", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontWeight:isMobile ? 500 : 400 }}>{s.name}</div>
                    <div style={{ fontSize:isMobile ? 13 : 9, color:"#555", marginTop:isMobile ? 6 : 0 }}>{SUBSYSTEM_META[s.subsystem]?.icon} {SUBSYSTEM_META[s.subsystem]?.name}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:isMobile ? 16 : 11, color:rc, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{s.risk}</div>
                    <div style={{ fontSize:isMobile ? 11 : 8, color:"#444" }}>risk</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:isMobile ? 20 : 12, padding:isMobile ? 24 : 16 }}>
          <div style={{ fontSize:isMobile ? 13 : 9, color:"#555", letterSpacing:2, marginBottom:isMobile ? 20 : 12 }}>FLEET SENSOR SUMMARY</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:isMobile ? 14 : 8 }}>
            {[
              { lbl:"NOMINAL",  val:SENSORS_3D.filter(s=>s.risk<30).length,                    col:"#00e5c0" },
              { lbl:"WATCH",    val:SENSORS_3D.filter(s=>s.risk>=30&&s.risk<60).length,         col:"#f5a623" },
              { lbl:"CRITICAL", val:SENSORS_3D.filter(s=>s.risk>=60).length,                    col:"#ff3b5c" },
            ].map(({ lbl,val,col })=>(
              <div key={lbl} style={{ background:"rgba(0,0,0,0.3)", borderRadius:isMobile ? 14 : 8, padding:isMobile ? "20px 14px" : "10px 8px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:isMobile ? 40 : 28, fontWeight:800, color:col }}>{val}</div>
                <div style={{ fontSize:isMobile ? 11 : 8, color:col, letterSpacing:1.5, marginTop:isMobile ? 8 : 0 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Login History Storage ────────────────────────────────────────────────────
function saveLoginHistory(name, isAdmin = false) {
  const now = new Date();
  const loginEntry = {
    name,
    isAdmin,
    timestamp: now.toISOString(),
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
  };

  const history = JSON.parse(localStorage.getItem("aerosense_login_history") || "[]");
  history.unshift(loginEntry); // Add to beginning
  // Keep only last 100 entries
  if (history.length > 100) {
    history.pop();
  }
  localStorage.setItem("aerosense_login_history", JSON.stringify(history));

  // Also save current user
  localStorage.setItem("aerosense_current_user", JSON.stringify(loginEntry));
}

function getLoginHistory() {
  return JSON.parse(localStorage.getItem('aerosense_login_history') || '[]');
}

function getCurrentUser() {
  const user = localStorage.getItem('aerosense_current_user');
  return user ? JSON.parse(user) : null;
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onSuccess }) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState(0);
  const nameInputRef = useRef(null);
  const pwInputRef = useRef(null);

  useEffect(()=>{ nameInputRef.current?.focus(); },[]);
  useEffect(()=>{
    const iv = setInterval(()=>setDots(d=>(d+1)%4),500);
    return ()=>clearInterval(iv);
  },[]);

  const attempt = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(true);
      setShake(true);
      setTimeout(()=>{ setShake(false); setError(false); },700);
      return;
    }

    const isAdminLogin = trimmedName.toUpperCase() === "ADMIN" && pw === "sufian001";
    const isUserLogin = pw === "admin001" && !isAdminLogin;

    if (isAdminLogin || isUserLogin) {
      setLoading(true);
      // Save login history
      saveLoginHistory(trimmedName, isAdminLogin);
      setTimeout(() => {
        onSuccess(trimmedName, isAdminLogin);
      }, 1200);
    } else {
      setError(true); setShake(true);
      setTimeout(()=>{ setShake(false); setPw(""); setError(false); },700);
    }
  };

  const loadingDots = ".".repeat(dots);

  return (
    <div style={{ minHeight:"100vh", background:"#070c14", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Outfit',sans-serif", position:"relative", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        @keyframes rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes flicker{0%,100%{opacity:1}92%{opacity:1}93%{opacity:.4}94%{opacity:1}96%{opacity:.7}97%{opacity:1}}
        @keyframes gridPulse{0%,100%{opacity:0.03}50%{opacity:0.07}}
      `}</style>

      {/* Background grid */}
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,229,192,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,192,0.04) 1px,transparent 1px)", backgroundSize:"40px 40px", animation:"gridPulse 4s ease infinite", pointerEvents:"none" }}/>
      {/* Scanline */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,transparent,rgba(0,229,192,0.15),transparent)", animation:"scanline 3s linear infinite", pointerEvents:"none" }}/>
      {/* Vignette */}
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.7) 100%)", pointerEvents:"none" }}/>

      <div style={{ animation:"fadeIn .6s ease", zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", width:380 }}>
        {/* Logo */}
        <div style={{ marginBottom:40, textAlign:"center" }}>
          <div style={{ width:72, height:72, borderRadius:18, background:"linear-gradient(135deg,#00e5c0,#0076ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, margin:"0 auto 20px", boxShadow:"0 0 40px rgba(0,229,192,0.25)" }}>✈</div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:4, color:"#e0e8f0", animation:"flicker 8s infinite" }}>AEROSENSE-AI</div>
          <div style={{ fontSize:10, color:"#00e5c0", letterSpacing:3, marginTop:5, fontFamily:"'DM Mono',monospace" }}>AI FLIGHT INTELLIGENCE SYSTEM</div>
        </div>

        {/* Login box */}
        <div style={{ width:"100%", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,229,192,0.15)", borderRadius:16, padding:"36px 32px", backdropFilter:"blur(20px)" }}>
          <div style={{ fontSize:11, color:"#555", letterSpacing:3, marginBottom:24, fontFamily:"'DM Mono',monospace" }}>SECURE ACCESS · OPERATOR LOGIN</div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, color:"#666", letterSpacing:2, marginBottom:8, fontFamily:"'DM Mono',monospace" }}>YOUR NAME</div>
            <div style={{ animation:shake?"shake .4s ease":"none" }}>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={e=>{ setName(e.target.value); setError(false); }}
                onKeyDown={e=>e.key==="Enter"&&pwInputRef.current?.focus()}
                placeholder="Enter your name"
                style={{ width:"100%", padding:"11px 14px", background:"rgba(0,0,0,0.4)", border:`1px solid ${error?"#ff3b5c":name.length>0?"rgba(0,229,192,0.4)":"rgba(255,255,255,0.1)"}`, borderRadius:8, fontSize:13, color:"#e0e8f0", fontFamily:"'DM Mono',monospace", outline:"none", transition:"border .2s" }}
              />
            </div>
          </div>

          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:10, color:"#666", letterSpacing:2, marginBottom:8, fontFamily:"'DM Mono',monospace" }}>PASSWORD</div>
            <div style={{ animation:shake?"shake .4s ease":"none" }}>
              <input
                ref={pwInputRef}
                type="password"
                value={pw}
                onChange={e=>{ setPw(e.target.value); setError(false); }}
                onKeyDown={e=>e.key==="Enter"&&attempt()}
                placeholder="Enter password"
                style={{ width:"100%", padding:"11px 14px", background:"rgba(0,0,0,0.4)", border:`1px solid ${error?"#ff3b5c":pw.length>0?"rgba(0,229,192,0.4)":"rgba(255,255,255,0.1)"}`, borderRadius:8, fontSize:13, color:"#e0e8f0", fontFamily:"'DM Mono',monospace", outline:"none", transition:"border .2s", letterSpacing:pw.length>0?4:1 }}
              />
            </div>
            {error&&<div style={{ fontSize:10, color:"#ff3b5c", marginTop:8, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>⚠ {name.trim() ? "ACCESS DENIED — INVALID CREDENTIALS" : "PLEASE ENTER YOUR NAME"}</div>}
          </div>

          <button
            onClick={attempt}
            disabled={loading}
            style={{ width:"100%", padding:"13px", background:loading?"rgba(0,229,192,0.1)":"linear-gradient(135deg,rgba(0,229,192,0.15),rgba(0,118,255,0.15))", border:`1px solid ${loading?"rgba(0,229,192,0.3)":"rgba(0,229,192,0.4)"}`, borderRadius:10, fontSize:12, fontWeight:700, color:"#00e5c0", cursor:loading?"default":"pointer", letterSpacing:3, fontFamily:"'Outfit',sans-serif", transition:"all .2s" }}>
            {loading ? `AUTHENTICATING${loadingDots}` : "AUTHENTICATE →"}
          </button>
        </div>

        <div style={{ marginTop:24, fontSize:9, color:"#333", fontFamily:"'DM Mono',monospace", letterSpacing:2, textAlign:"center", lineHeight:1.8 }}>
          ENCRYPTED · EASA COMPLIANT · AUDIT LOGGED<br/>
          UNAUTHORIZED ACCESS IS A CRIMINAL OFFENCE
        </div>
      </div>
    </div>
  );
}

// ─── Flight Select Page ────────────────────────────────────────────────────────
const FLIGHT_DETAILS = [
  { id:"EK205", route:"DXB → LHR", from:"Dubai", to:"London Heathrow", aircraft:"A380-800", status:"EN ROUTE", progress:62, fuel:48.2, co2:94.1, risk:18, duration:"6h 55m", distance:"3,414 NM", altitude:"FL380", passengers:489, departure:"09:15", arrival:"14:10", color:"#00e5c0" },
  { id:"EK412", route:"DXB → JFK", from:"Dubai", to:"New York JFK",    aircraft:"B777-300ER",status:"EN ROUTE", progress:31, fuel:61.4, co2:127.3,risk:44, duration:"14h 05m",distance:"6,837 NM", altitude:"FL370", passengers:354, departure:"11:40", arrival:"18:45", color:"#f5a623" },
  { id:"EK508", route:"DXB → SYD", from:"Dubai", to:"Sydney",          aircraft:"A380-800",  status:"BOARDING", progress:0,  fuel:0,    co2:0,    risk:9,  duration:"14h 35m",distance:"7,480 NM", altitude:"—",     passengers:501, departure:"14:55", arrival:"07:30+1", color:"#00e5c0" },
  { id:"EK118", route:"DXB → CDG", from:"Dubai", to:"Paris CDG",       aircraft:"B777-200LR",status:"ARRIVED",  progress:100,fuel:36.8, co2:71.2, risk:0,  duration:"6h 44m", distance:"3,252 NM", altitude:"—",     passengers:266, departure:"06:00", arrival:"12:14", color:"#555" },
];

function FlightSelectPage({ currentUser, onSelect, onLogout, onViewHistory }) {
  const [hovered, setHovered] = useState(null);
  const [time, setTime] = useState(new Date());
  const isMobile = useIsMobile();
  useEffect(()=>{ const iv=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(iv); },[]);

  const nowStr = time.toLocaleTimeString("en-GB",{ hour:"2-digit", minute:"2-digit", second:"2-digit" })+" UTC";
  const dateStr = time.toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const userName = currentUser?.name || "OPERATOR";

  return (
    <div style={{ minHeight:"100vh", background:"#070c14", fontFamily:"'Outfit',sans-serif", color:"#e0e8f0", display:"flex", flexDirection:"column" }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
        @keyframes gridPulse{0%,100%{opacity:0.03}50%{opacity:0.06}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#00e5c030}
      `}</style>
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,229,192,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,192,0.035) 1px,transparent 1px)", backgroundSize:"48px 48px", animation:"gridPulse 5s ease infinite", pointerEvents:"none" }}/>
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at 50% 0%,rgba(0,118,255,0.06) 0%,transparent 60%)", pointerEvents:"none" }}/>

      {/* Header */}
      <div style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(0,229,192,0.1)", padding:isMobile ? "0 16px" : "0 40px", display:"flex", alignItems:"center", justifyContent:"space-between", height:isMobile ? 56 : 62, position:"sticky", top:0, zIndex:100, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,#00e5c0,#0076ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, boxShadow:"0 0 20px rgba(0,229,192,0.2)" }}>✈</div>
          <div>
            <div style={{ fontSize:14, fontWeight:800, letterSpacing:3 }}>AEROSENSE-AI</div>
            <div style={{ fontSize:9, color:"#00e5c0", letterSpacing:2, fontFamily:"'DM Mono',monospace" }}>AI FLIGHT INTELLIGENCE</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:isMobile ? 12 : 28, flexWrap:"wrap" }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace" }}>{dateStr.toUpperCase()}</div>
            <div style={{ fontSize:12, color:"#e0e8f0", fontFamily:"'DM Mono',monospace", marginTop:2 }}>{nowStr}</div>
          </div>
          {!isMobile && <div style={{ width:1, height:32, background:"rgba(255,255,255,0.08)" }}/>}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#00e5c0", animation:"pulse 1.6s infinite" }}/>
            <span style={{ fontSize:isMobile ? 11 : 10, color:"#00e5c0", fontFamily:"'DM Mono',monospace", fontWeight:500 }}>{userName.toUpperCase()}</span>
          </div>
          {!isMobile && <div style={{ width:1, height:32, background:"rgba(255,255,255,0.08)" }}/>}
          <div style={{ display:"flex", gap:isMobile ? 8 : 12, flexWrap:"wrap" }}>
            {currentUser?.isAdmin && (
              <button
                onClick={onViewHistory}
                style={{
                  background: "rgba(0,229,192,0.08)",
                  border: "1px solid rgba(0,229,192,0.2)",
                  color: "#00e5c0",
                  borderRadius: 7,
                  padding: isMobile ? "8px 12px" : "6px 14px",
                  cursor: "pointer",
                  fontSize: isMobile ? 10 : 10,
                  fontFamily: "'Outfit',sans-serif",
                  letterSpacing: 1,
                  minHeight: isMobile ? 44 : "auto",
                }}
              >
                📋 HISTORY
              </button>
            )}
            <button
              onClick={onLogout}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#666",
                borderRadius: 7,
                padding: isMobile ? "8px 12px" : "6px 14px",
                cursor: "pointer",
                fontSize: isMobile ? 10 : 10,
                fontFamily: "'Outfit',sans-serif",
                letterSpacing: 1,
                minHeight: isMobile ? 44 : "auto",
              }}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, padding:isMobile ? "40px 24px 48px" : "52px 40px 40px", animation:"fadeIn .5s ease", zIndex:1 }}>
        <div style={{ marginBottom:isMobile ? 40 : 48, textAlign:"center" }}>
          <div style={{ fontSize:isMobile ? 13 : 10, color:"#00e5c0", letterSpacing:isMobile ? 3 : 4, fontFamily:"'DM Mono',monospace", marginBottom:isMobile ? 20 : 12 }}>SELECT FLIGHT · OPERATIONAL DASHBOARD</div>
          <div style={{ fontSize:isMobile ? 36 : 36, fontWeight:800, letterSpacing:2, color:"#e0e8f0", marginBottom:isMobile ? 16 : 0 }}>Active Fleet Monitor</div>
          <div style={{ fontSize:isMobile ? 15 : 14, color:"#555", marginTop:isMobile ? 16 : 10, fontWeight:400, padding:isMobile ? "0 24px" : 0, lineHeight:1.6 }}>Choose a flight to open its full sensor dashboard, 3D map and analytics</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr" : "repeat(2,1fr)", gap:isMobile ? 32 : 20, maxWidth:1040, margin:"0 auto" }}>
          {FLIGHT_DETAILS.map((f,i)=>{
            const rc = RISK_COLOR(f.risk);
            const isHov = hovered===f.id;
            const isArrived = f.status==="ARRIVED";
            return (
              <div key={f.id}
                onMouseEnter={()=>setHovered(f.id)}
                onMouseLeave={()=>setHovered(null)}
                onClick={()=>!isArrived&&onSelect(f)}
                style={{ background:isHov&&!isArrived?"rgba(0,229,192,0.04)":"rgba(255,255,255,0.02)", border:`1px solid ${isHov&&!isArrived?rc:"rgba(255,255,255,0.07)"}`, borderRadius:isMobile ? 24 : 16, padding:isMobile ? 28 : 28, cursor:isArrived?"default":"pointer", transition:"all .25s", animation:`fadeIn .4s ease ${i*0.1}s both`, position:"relative", overflow:"hidden" }}>
                {/* Top glow bar */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${rc},transparent)`, opacity:isHov?0.8:0.3, transition:"opacity .3s" }}/>
                {/* Progress fill bg */}
                <div style={{ position:"absolute", bottom:0, left:0, width:`${f.progress}%`, height:"100%", background:`${rc}05`, pointerEvents:"none", transition:"width 1s" }}/>

                <div style={{ position:"relative" }}>
                  {/* Flight header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:isMobile ? 28 : 20 }}>
                    <div>
                      <div style={{ fontSize:isMobile ? 40 : 32, fontWeight:800, letterSpacing:2, color:"#e0e8f0", lineHeight:1 }}>{f.id}</div>
                      <div style={{ fontSize:isMobile ? 16 : 14, color:"#666", marginTop:isMobile ? 10 : 6, fontWeight:500 }}>{f.from} → {f.to}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:isMobile ? 11 : 9, background:`${rc}18`, border:`1px solid ${rc}40`, color:rc, padding:isMobile ? "8px 14px" : "4px 10px", borderRadius:isMobile ? 10 : 5, letterSpacing:2, fontFamily:"'DM Mono',monospace", display:"inline-block" }}>
                        {f.status==="EN ROUTE"&&<span style={{ width:isMobile ? 8 : 6, height:isMobile ? 8 : 6, borderRadius:"50%", background:rc, display:"inline-block", marginRight:6, animation:"pulse 1.4s infinite" }}/>}
                        {f.status}
                      </div>
                    </div>
                  </div>

                  {/* Aircraft + route info */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:isMobile ? 12 : 12, marginBottom:isMobile ? 28 : 20 }}>
                    {[{l:"AIRCRAFT",v:f.aircraft},{l:"DISTANCE",v:f.distance},{l:"DURATION",v:f.duration}].map(({l,v})=>(
                      <div key={l} style={{ background:"rgba(0,0,0,0.3)", borderRadius:isMobile ? 12 : 8, padding:isMobile ? "14px 12px" : "10px 12px" }}>
                        <div style={{ fontSize:isMobile ? 10 : 8, color:"#555", letterSpacing:2, fontFamily:"'DM Mono',monospace", marginBottom:isMobile ? 8 : 4 }}>{l}</div>
                        <div style={{ fontSize:isMobile ? 14 : 12, color:"#ccc", fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Times */}
                  <div style={{ display:"flex", alignItems:"center", gap:isMobile ? 16 : 12, marginBottom:isMobile ? 28 : 20 }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:isMobile ? 22 : 18, fontWeight:700, color:"#e0e8f0", fontFamily:"'DM Mono',monospace" }}>{f.departure}</div>
                      <div style={{ fontSize:isMobile ? 11 : 9, color:"#555", letterSpacing:1, marginTop:isMobile ? 6 : 0 }}>{f.from.toUpperCase().slice(0,3)}</div>
                    </div>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:isMobile ? 8 : 4 }}>
                      <div style={{ width:"100%", height:isMobile ? 3 : 1, background:"rgba(255,255,255,0.08)", position:"relative", borderRadius:1 }}>
                        {f.progress>0&&f.progress<100&&<div style={{ position:"absolute", left:`${f.progress}%`, top:isMobile ? -6 : -4, width:isMobile ? 12 : 8, height:isMobile ? 12 : 8, borderRadius:"50%", background:rc, boxShadow:`0 0 8px ${rc}`, transform:"translateX(-50%)" }}/>}
                        {f.progress>0&&<div style={{ position:"absolute", left:0, width:`${f.progress}%`, height:isMobile ? 3 : 1, background:`linear-gradient(90deg,${rc}60,${rc})`, borderRadius:1 }}/>}
                      </div>
                      <div style={{ fontSize:isMobile ? 11 : 8, color:"#444", fontFamily:"'DM Mono',monospace" }}>{f.altitude}</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:isMobile ? 22 : 18, fontWeight:700, color:"#e0e8f0", fontFamily:"'DM Mono',monospace" }}>{f.arrival}</div>
                      <div style={{ fontSize:isMobile ? 11 : 9, color:"#555", letterSpacing:1, marginTop:isMobile ? 6 : 0 }}>{f.to.toUpperCase().slice(0,3)}</div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:isMobile ? "wrap" : "nowrap", gap:isMobile ? 16 : 0 }}>
                    <div style={{ display:"flex", gap:isMobile ? 24 : 16 }}>
                      <div>
                        <div style={{ fontSize:isMobile ? 11 : 9, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace", marginBottom:isMobile ? 4 : 0 }}>PAX</div>
                        <div style={{ fontSize:isMobile ? 17 : 13, color:"#ccc", fontWeight:600 }}>{f.passengers}</div>
                      </div>
                      {f.co2>0&&<div>
                        <div style={{ fontSize:isMobile ? 11 : 9, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace", marginBottom:isMobile ? 4 : 0 }}>CO₂</div>
                        <div style={{ fontSize:isMobile ? 17 : 13, color:"#ccc", fontWeight:600 }}>{f.co2} t</div>
                      </div>}
                      <div>
                        <div style={{ fontSize:isMobile ? 11 : 9, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace", marginBottom:isMobile ? 4 : 0 }}>RISK</div>
                        <div style={{ fontSize:isMobile ? 17 : 13, color:rc, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{f.risk} <span style={{ fontSize:isMobile ? 11 : 9, color:rc }}>{RISK_LABEL(f.risk)}</span></div>
                      </div>
                    </div>
                    {!isArrived ? (
                      <div style={{ background:`${rc}15`, border:`1px solid ${rc}35`, borderRadius:isMobile ? 12 : 8, padding:isMobile ? "14px 28px" : "9px 20px", fontSize:isMobile ? 13 : 11, color:rc, fontWeight:700, letterSpacing:2, transition:"all .2s", opacity:isHov?1:0.7, minHeight:isMobile ? 50 : "auto", width:isMobile ? "100%" : "auto", textAlign:isMobile ? "center" : "left", marginTop:isMobile ? 12 : 0 }}>
                        OPEN DASHBOARD →
                      </div>
                    ) : (
                      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:isMobile ? 12 : 8, padding:isMobile ? "14px 28px" : "9px 20px", fontSize:isMobile ? 13 : 11, color:"#444", letterSpacing:2, width:isMobile ? "100%" : "auto", textAlign:isMobile ? "center" : "left", marginTop:isMobile ? 12 : 0 }}>
                        FLIGHT COMPLETE
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fleet summary row */}
        <div style={{ maxWidth:1040, margin:isMobile ? "48px auto 0" : "32px auto 0", display:"grid", gridTemplateColumns:isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:isMobile ? 18 : 14 }}>
          {[{l:"ACTIVE FLIGHTS",v:"2",c:"#00e5c0"},{l:"BOARDING",v:"1",c:"#f5a623"},{l:"COMPLETED TODAY",v:"1",c:"#555"},{l:"FLEET RISK AVG",v:"18",c:"#00e5c0"}].map(({l,v,c})=>(
            <div key={l} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:isMobile ? 16 : 10, padding:isMobile ? "24px 18px" : "16px 20px", textAlign:"center" }}>
              <div style={{ fontSize:isMobile ? 40 : 28, fontWeight:800, color:c }}>{v}</div>
              <div style={{ fontSize:isMobile ? 11 : 9, color:"#555", letterSpacing:2, fontFamily:"'DM Mono',monospace", marginTop:isMobile ? 10 : 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Login History Page ───────────────────────────────────────────────────────
function LoginHistoryPage({ onBack }) {
  const [history, setHistory] = useState([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    setHistory(getLoginHistory());
  }, []);

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  return (
    <div style={{ minHeight:"100vh", background:"#070c14", fontFamily:"'Outfit',sans-serif", color:"#e0e8f0", display:"flex", flexDirection:"column" }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes gridPulse{0%,100%{opacity:0.03}50%{opacity:0.06}}
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,229,192,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,192,0.035) 1px,transparent 1px)", backgroundSize:"48px 48px", animation:"gridPulse 5s ease infinite", pointerEvents:"none" }}/>

      {/* Header */}
      <div style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(0,229,192,0.1)", padding:isMobile ? "0 16px" : "0 40px", display:"flex", alignItems:"center", justifyContent:"space-between", height:isMobile ? 56 : 62, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:isMobile ? 12 : 16 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#888", borderRadius:isMobile ? 8 : 7, padding:isMobile ? "10px 14px" : "6px 12px", cursor:"pointer", fontSize:isMobile ? 11 : 10, fontFamily:"'Outfit',sans-serif", letterSpacing:1, display:"flex", alignItems:"center", gap:6, minHeight:isMobile ? 44 : "auto" }}>
            ← BACK
          </button>
          <div style={{ width:isMobile ? 36 : 30, height:isMobile ? 36 : 30, borderRadius:isMobile ? 9 : 7, background:"linear-gradient(135deg,#00e5c0,#0076ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile ? 18 : 15 }}>✈</div>
          <div>
            <div style={{ fontSize:isMobile ? 15 : 13, fontWeight:800, letterSpacing:2 }}>LOGIN HISTORY</div>
            <div style={{ fontSize:isMobile ? 10 : 9, color:"#00e5c0", letterSpacing:2, fontFamily:"'DM Mono',monospace" }}>AEROSENSE-AI · AUDIT LOG</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, padding:isMobile ? "32px 20px 40px" : "40px 40px 40px", animation:"fadeIn .5s ease", zIndex:1 }}>
        <div style={{ marginBottom:isMobile ? 32 : 40, textAlign:"center" }}>
          <div style={{ fontSize:isMobile ? 13 : 11, color:"#00e5c0", letterSpacing:isMobile ? 3 : 4, fontFamily:"'DM Mono',monospace", marginBottom:isMobile ? 16 : 12 }}>AUTHENTICATION LOG · SECURITY AUDIT</div>
          <div style={{ fontSize:isMobile ? 32 : 36, fontWeight:800, letterSpacing:2, color:"#e0e8f0" }}>Login History</div>
          <div style={{ fontSize:isMobile ? 13 : 14, color:"#555", marginTop:isMobile ? 12 : 10, fontWeight:400 }}>All operator login attempts and timestamps</div>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign:"center", padding:isMobile ? "60px 20px" : "80px 40px" }}>
            <div style={{ fontSize:isMobile ? 48 : 64, marginBottom:isMobile ? 20 : 24 }}>📋</div>
            <div style={{ fontSize:isMobile ? 18 : 20, color:"#666", marginBottom:isMobile ? 12 : 16 }}>No login history</div>
            <div style={{ fontSize:isMobile ? 13 : 14, color:"#444" }}>Login attempts will appear here</div>
          </div>
        ) : (
          <div style={{ maxWidth:900, margin:"0 auto", display:"flex", flexDirection:"column", gap:isMobile ? 14 : 12 }}>
            {history.map((entry, i) => {
              const dt = formatDateTime(entry.timestamp);
              return (
                <div key={i} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:isMobile ? 16 : 12, padding:isMobile ? 20 : 18, animation:`fadeIn .3s ease ${i*0.05}s both` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:isMobile ? 12 : 8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:isMobile ? 18 : 16, fontWeight:700, color:"#e0e8f0", marginBottom:isMobile ? 6 : 4 }}>{entry.name}</div>
                      <div style={{ fontSize:isMobile ? 12 : 11, color:"#666", fontFamily:"'DM Mono',monospace" }}>
                        {dt.date} · {dt.time}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:isMobile ? 10 : 8, height:isMobile ? 10 : 8, borderRadius:"50%", background:"#00e5c0", boxShadow:"0 0 8px #00e5c0" }}/>
                      <span style={{ fontSize:isMobile ? 11 : 10, color:"#00e5c0", fontFamily:"'DM Mono',monospace" }}>ACTIVE</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App (router) ────────────────────────────────────────────────────────
export default function AviationAI() {
  const [page, setPage] = useState("login"); // "login" | "select" | "dashboard" | "history"
  const [activeFlight, setActiveFlight] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  return (
    <>
      {page === "login" && (
        <LoginPage
          onSuccess={(name, isAdmin) => {
            const user = { name, isAdmin, timestamp: new Date().toISOString() };
            setCurrentUser(user);
            setPage(isAdmin ? "history" : "select");
          }}
        />
      )}
      {page === "select" && (
        <FlightSelectPage
          currentUser={currentUser}
          onSelect={(f) => {
            setActiveFlight(f);
            setPage("dashboard");
          }}
          onLogout={() => {
            setCurrentUser(null);
            localStorage.removeItem("aerosense_current_user");
            setPage("login");
          }}
          onViewHistory={() => currentUser?.isAdmin && setPage("history")}
        />
      )}
      {page === "dashboard" && <Dashboard flight={activeFlight} onBack={() => setPage("select")} />}
      {page === "history" && <LoginHistoryPage onBack={() => setPage("select")} />}
    </>
  );
}

// ─── Dashboard (was AviationAI) ───────────────────────────────────────────────
function Dashboard({ flight, onBack }) {
  const fd = FLIGHT_DATA[flight?.id] || FLIGHT_DATA["EK205"];
  const [tab, setTab] = useState("sensor3d");
  const [selectedSys, setSelectedSys] = useState(fd.subsystems[3]);
  const [subsystems, setSubsystems] = useState(fd.subsystems);
  const [expandedAction, setExpandedAction] = useState(null);
  const [sensorValues, setSensorValues] = useState({});
  const isMobile = useIsMobile();

  useEffect(()=>{
    const iv=setInterval(()=>{
      setSubsystems(p=>p.map(s=>({...s,risk:clamp(s.risk+rand(-2,2),0,99)})));
      setSensorValues({ n1:rand(87,91), egt:rand(618,624), vibration:rand(0.4,0.8), oilPressure:rand(38,42), fuelFlow:rand(2.1,2.4), tankImbalance:rand(130,160), wingFlex:rand(4.1,5.2), fuselageStress:rand(42,48) });
    },2000);
    return ()=>clearInterval(iv);
  },[]);

  const tabs = [
    { id:"sensor3d", label:"3D SENSOR MAP", badge:"NEW" },
    { id:"ops",       label:"LIVE OPS" },
    { id:"emissions", label:"EMISSIONS" },
    { id:"weather",   label:"WEATHER" },
    { id:"schedule",  label:"SCHEDULING" },
    { id:"report",    label:"FLIGHT REPORT" },
  ];

  const nowStr = new Date().toLocaleTimeString("en-GB",{ hour:"2-digit", minute:"2-digit", second:"2-digit" })+" UTC";

  return (
    <div style={{ background:"#070c14", minHeight:"100vh", fontFamily:"'Outfit',sans-serif", color:"#e0e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#00e5c030}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes gridPulse{0%,100%{opacity:0.03}50%{opacity:0.06}}
        .tab-btn{background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s}
      `}</style>
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(0,229,192,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,192,0.03) 1px,transparent 1px)", backgroundSize:"48px 48px", animation:"gridPulse 5s ease infinite", pointerEvents:"none" }}/>
      <div style={{ position:"fixed", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)", pointerEvents:"none", zIndex:9999 }}/>

      {/* Header */}
      <div style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(0,229,192,0.12)", padding:isMobile ? "0 16px" : "0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:isMobile ? "auto" : 58, minHeight:isMobile ? 60 : 58, position:"sticky", top:0, zIndex:100, flexWrap:"wrap", gap:isMobile ? 12 : 8, paddingTop:isMobile ? 12 : 0, paddingBottom:isMobile ? 12 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:isMobile ? 12 : 16, flexWrap:"wrap" }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#888", borderRadius:isMobile ? 8 : 7, padding:isMobile ? "10px 14px" : "6px 12px", cursor:"pointer", fontSize:isMobile ? 11 : 10, fontFamily:"'Outfit',sans-serif", letterSpacing:1, display:"flex", alignItems:"center", gap:6, minHeight:isMobile ? 44 : "auto" }}>
            ← FLIGHTS
          </button>
          {!isMobile && <div style={{ width:1, height:28, background:"rgba(255,255,255,0.08)" }}/>}
          <div style={{ width:isMobile ? 36 : 30, height:isMobile ? 36 : 30, borderRadius:isMobile ? 9 : 7, background:"linear-gradient(135deg,#00e5c0,#0076ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile ? 18 : 15 }}>✈</div>
          <div>
            <div style={{ fontSize:isMobile ? 15 : 13, fontWeight:800, letterSpacing:2 }}>
              {flight?.id} · {flight?.route}
              {!isMobile && <span style={{ fontSize:10, color:"#555", marginLeft:12, fontWeight:400 }}>{flight?.aircraft}</span>}
            </div>
            <div style={{ fontSize:isMobile ? 10 : 9, color:"#00e5c0", letterSpacing:2, fontFamily:"'DM Mono',monospace" }}>AEROSENSE-AI · FLIGHT INTELLIGENCE</div>
          </div>
        </div>
        {!isMobile && (
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {flight&&(
              <div style={{ display:"flex", gap:16 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace" }}>STATUS</div>
                  <div style={{ fontSize:10, color:RISK_COLOR(flight.risk), fontFamily:"'DM Mono',monospace" }}>
                    <LivePulse color={RISK_COLOR(flight.risk)}/>{flight.status}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace" }}>FLEET RISK</div>
                  <div style={{ fontSize:10, color:RISK_COLOR(flight.risk), fontFamily:"'DM Mono',monospace" }}>{flight.risk} — {RISK_LABEL(flight.risk)}</div>
                </div>
              </div>
            )}
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace" }}>SYSTEM TIME</div>
              <div style={{ fontSize:10, color:"#e0e8f0", fontFamily:"'DM Mono',monospace" }}>{nowStr}</div>
            </div>
            <div style={{ display:"flex", gap:4 }}>
              {["🔒 SECURE","📋 AUDIT ON"].map(l=>(
                <span key={l} style={{ fontSize:9, background:"rgba(0,229,192,0.08)", border:"1px solid rgba(0,229,192,0.2)", color:"#00e5c0", padding:"3px 8px", borderRadius:4, letterSpacing:1 }}>{l}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:isMobile ? "0 20px" : "0 28px", background:"rgba(0,0,0,0.3)", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {tabs.map(t=>(
          <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)}
            style={{ padding:isMobile ? "18px 20px" : "14px 20px", fontSize:isMobile ? 12 : 10, letterSpacing:isMobile ? 2 : 2.5, color:tab===t.id?"#00e5c0":"#555", borderBottom:tab===t.id?"2px solid #00e5c0":"2px solid transparent", fontWeight:tab===t.id?700:400, position:"relative", minHeight:isMobile ? 56 : "auto", whiteSpace:"nowrap" }}>
            {t.badge&&<span style={{ position:"absolute", top:isMobile ? 12 : 8, right:2, fontSize:isMobile ? 9 : 7, background:"#00e5c0", color:"#000", borderRadius:3, padding:"1px 4px", fontWeight:800 }}>{t.badge}</span>}
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:isMobile ? "32px 24px" : "24px 28px", animation:"fadeIn .3s ease", paddingBottom:isMobile ? 80 : 60 }}>

        {tab==="sensor3d"&&<AircraftViewer3D sensors={fd.sensors3d}/>}

        {tab==="ops"&&(
          <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr 1fr", gap:16 }}>
            <div style={{ gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {/* Current flight overview + subsystem risk breakdown */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${RISK_COLOR(flight.risk)}30`, borderRadius:10, padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:20, fontWeight:800 }}>{flight.id}</span>
                  <Badge color={flight.status==="ARRIVED"?"#555":flight.status==="BOARDING"?"#f5a623":"#00e5c0"}>{flight.status}</Badge>
                </div>
                <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>{flight.route} · {flight.aircraft}</div>
                <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, marginBottom:6 }}>
                  <div style={{ height:3, width:`${flight.progress}%`, background:flight.status==="ARRIVED"?"#00e5c0":"linear-gradient(90deg,#0076ff,#00e5c0)", borderRadius:2 }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#666" }}>
                  <span>FUEL {flight.fuel>0?flight.fuel+" t/hr":"GROUND"}</span>
                  <span>CO₂ {flight.co2>0?flight.co2+" t":"0 t"}</span>
                  <span style={{ color:RISK_COLOR(flight.risk) }}>RISK {flight.risk}</span>
                </div>
              </div>
              {["NOMINAL","WATCH","CRITICAL"].map((lbl,i)=>{
                const counts=[fd.subsystems.filter(s=>s.risk<30).length, fd.subsystems.filter(s=>s.risk>=30&&s.risk<60).length, fd.subsystems.filter(s=>s.risk>=60).length];
                const cols=["#00e5c0","#f5a623","#ff3b5c"];
                return (
                  <div key={lbl} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${cols[i]}20`, borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
                    <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:42, fontWeight:800, color:cols[i] }}>{counts[i]}</div>
                    <div style={{ fontSize:9, color:cols[i], letterSpacing:2, fontFamily:"'DM Mono',monospace", marginTop:4 }}>{lbl}</div>
                    <div style={{ fontSize:9, color:"#555", marginTop:4 }}>subsystems</div>
                  </div>
                );
              })}
            </div>
            <div style={{ gridColumn:"1/2", display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:2 }}>SUBSYSTEM HEALTH MATRIX</div>
              {subsystems.map(s=><SubsystemCard key={s.id} sys={s} onClick={setSelectedSys} selected={selectedSys?.id===s.id}/>)}
            </div>
            <div style={{ gridColumn:"2/3" }}>
              {selectedSys&&(
                <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${RISK_COLOR(selectedSys.risk)}30`, borderRadius:10, padding:20, height:"100%" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:4 }}>SELECTED SUBSYSTEM</div>
                      <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:24, fontWeight:800 }}>{selectedSys.icon} {selectedSys.name}</div>
                    </div>
                    <GaugeRing value={selectedSys.risk} size={72} stroke={7} color={RISK_COLOR(selectedSys.risk)}/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
                    {[{l:"RISK SCORE",v:selectedSys.risk+" / 100",c:RISK_COLOR(selectedSys.risk)},{l:"STATUS",v:RISK_LABEL(selectedSys.risk),c:RISK_COLOR(selectedSys.risk)},{l:"TREND",v:selectedSys.trend.toUpperCase(),c:"#aaa"},{l:"FAIL WINDOW",v:selectedSys.failureWindow||"NOT PREDICTED",c:selectedSys.failureWindow?"#ff3b5c":"#444"}].map(({l,v,c})=>(
                      <div key={l} style={{ background:"rgba(0,0,0,0.3)", borderRadius:6, padding:"8px 10px" }}>
                        <div style={{ fontSize:8, color:"#555", letterSpacing:1.5, marginBottom:3 }}>{l}</div>
                        <div style={{ fontSize:11, color:c, fontWeight:700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:8, color:"#555", letterSpacing:2, marginBottom:10 }}>LIVE SENSOR STREAMS</div>
                    {selectedSys.id==="eng"&&<><SignalBar label="N1 Fan Speed (%)" value={sensorValues.n1||88.4} max={100} color="#00e5c0"/><SignalBar label="EGT Temperature (°C)" value={sensorValues.egt||620} max={900} color="#f5a623"/><SignalBar label="Oil Pressure (PSI)" value={sensorValues.oilPressure||40} max={60} color="#00e5c0"/><SignalBar label="Vibration FFT (IPS)" value={sensorValues.vibration||0.6} max={2} color="#0076ff"/></>}
                    {selectedSys.id==="fuel"&&<><SignalBar label="Fuel Flow (kg/min)" value={sensorValues.fuelFlow||2.2} max={5} color="#00e5c0"/><SignalBar label="Tank Imbalance (kg)" value={sensorValues.tankImbalance||140} max={500} color="#f5a623"/></>}
                    {selectedSys.id==="struct"&&<><SignalBar label="Wing Flex (°)" value={sensorValues.wingFlex||4.6} max={10} color="#f5a623"/><SignalBar label="Fuselage Stress (%)" value={sensorValues.fuselageStress||45} max={100} color="#f5a623"/></>}
                    {!["eng","fuel","struct"].includes(selectedSys.id)&&selectedSys.signals.map((sig,i)=>(
                      <SignalBar key={sig} label={sig} value={rand(20,80)} max={100} color={["#00e5c0","#0076ff","#f5a623","#c06fff"][i%4]}/>
                    ))}
                  </div>
                  <div style={{ background:"rgba(0,229,192,0.04)", border:"1px solid rgba(0,229,192,0.12)", borderRadius:8, padding:14 }}>
                    <div style={{ fontSize:8, color:"#00e5c0", letterSpacing:2, marginBottom:8 }}>🤖 AI ROOT CAUSE ANALYSIS</div>
                    <p style={{ fontSize:11, color:"#bbb", lineHeight:1.7 }}>{selectedSys.aiNote}</p>
                  </div>
                </div>
              )}
            </div>
            <div style={{ gridColumn:"3/4", display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2 }}>AEROSENSE-AI ALERT FEED</div>
              {fd.alerts.map((a,i)=>{
                const col=a.sev==="warn"?"#f5a623":a.sev==="ok"?"#00e5c0":"#0076ff";
                return (
                  <div key={i} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${col}20`, borderRadius:8, padding:"10px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <Badge color={col}>{a.sys}</Badge>
                      <span style={{ fontSize:9, color:"#555", fontFamily:"'DM Mono',monospace" }}>{a.time}</span>
                    </div>
                    <p style={{ fontSize:10, color:"#bbb", lineHeight:1.6 }}>{a.msg}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="emissions"&&(
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {fd.emissions.map(e=>{
                const isPos = e.delta > 0;
                const goodIfPos = e.label.includes("SAF") || e.label.includes("Offset") || e.label.includes("Saved");
                const col = isPos ? (goodIfPos ? "#00e5c0" : "#ff3b5c") : (goodIfPos ? "#ff3b5c" : "#00e5c0");
                return (
                  <div key={e.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"18px 20px" }}>
                    <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:8, fontFamily:"'DM Mono',monospace" }}>{e.label.toUpperCase()}</div>
                    <div style={{ fontSize:34, fontWeight:800, color:"#e0e8f0", lineHeight:1 }}>{e.value}</div>
                    <div style={{ fontSize:10, color:"#666", marginBottom:10, marginTop:4 }}>{e.unit}</div>
                    <div style={{ fontSize:10, color:col, fontFamily:"'DM Mono',monospace" }}>{isPos?"↑":"↓"} {Math.abs(e.delta)}% vs fleet avg</div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:20 }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:16, fontFamily:"'DM Mono',monospace" }}>FLIGHT CARBON BREAKDOWN</div>
              {[
                { label:"Departure Phase",    pct:8  },
                { label:"Climb Phase",        pct:18 },
                { label:"Cruise Phase",       pct:62 },
                { label:"Descent & Approach", pct:9  },
                { label:"Ground / APU",       pct:3  },
              ].map(({ label, pct })=>(
                <div key={label} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:10, color:"#aaa" }}>{label}</span>
                    <span style={{ fontSize:10, color:"#00e5c0", fontFamily:"'DM Mono',monospace" }}>{pct}%</span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                    <div style={{ height:4, width:`${pct}%`, background:`linear-gradient(90deg,#0076ff,#00e5c0)`, borderRadius:2 }}/>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:20 }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:16, fontFamily:"'DM Mono',monospace" }}>AEROSENSE-AI DECARBONISATION ACTIONS</div>
              {fd.actions.map(a=>(
                <div key={a.id} onClick={()=>setExpandedAction(expandedAction===a.id?null:a.id)}
                  style={{ background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"12px 14px", marginBottom:8, cursor:"pointer", transition:"all .2s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(0,229,192,0.04)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.2)"}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <Badge color={a.priority==="HIGH"?"#ff3b5c":a.priority==="MED"?"#f5a623":a.priority==="INFO"?"#555":"#00e5c0"}>{a.priority}</Badge>
                      <Badge color="#0076ff">{a.type}</Badge>
                    </div>
                    <span style={{ fontSize:11, color:"#00e5c0", fontFamily:"'DM Mono',monospace" }}>{a.saving!=="—"?`−${a.saving}`:a.saving}</span>
                  </div>
                  {expandedAction===a.id&&<p style={{ fontSize:10, color:"#bbb", lineHeight:1.7, marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.06)" }}>{a.desc}</p>}
                </div>
              ))}
              <div style={{ marginTop:12, padding:"12px 14px", background:"rgba(0,229,192,0.04)", border:"1px solid rgba(0,229,192,0.12)", borderRadius:8 }}>
                <div style={{ fontSize:9, color:"#00e5c0", letterSpacing:2, marginBottom:4, fontFamily:"'DM Mono',monospace" }}>TOTAL POTENTIAL SAVING · THIS FLIGHT</div>
                <div style={{ fontSize:28, fontWeight:800, color:"#00e5c0" }}>
                  {fd.actions.filter(a=>a.saving!=="—").reduce((sum,a)=>sum+parseFloat(a.saving.replace(/[^\d.]/g,"")||0),0).toFixed(1)} t CO₂
                </div>
              </div>
            </div>

            <div style={{ gridColumn:"1/-1", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:20 }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:16, fontFamily:"'DM Mono',monospace" }}>ROUTE AIRPORTS · EMISSIONS CONTEXT</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
                {[{airport:"DXB",role:"Origin Hub",co2:"1,840 t/day"},{airport:"LHR",role:"Dest · EK205",co2:"620 t/day"},{airport:"JFK",role:"Dest · EK412",co2:"580 t/day"},{airport:"CDG",role:"Dest · EK118",co2:"410 t/day"},{airport:"SYD",role:"Dest · EK508",co2:"890 t/day"}].map(ap=>{
                  const isActive = flight.route.includes(ap.airport.slice(0,3));
                  return (
                    <div key={ap.airport} style={{ background:isActive?"rgba(0,229,192,0.06)":"rgba(0,0,0,0.3)", border:isActive?"1px solid rgba(0,229,192,0.25)":"1px solid transparent", borderRadius:8, padding:"14px 12px", textAlign:"center" }}>
                      <div style={{ fontSize:28, fontWeight:800, color:isActive?"#00e5c0":"#0076ff" }}>{ap.airport}</div>
                      <div style={{ fontSize:9, color:"#666", marginBottom:6 }}>{ap.role}</div>
                      <div style={{ fontSize:12, color:isActive?"#00e5c0":"#888" }}>{ap.co2}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab==="weather"&&(
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
            <div>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:12, fontFamily:"'DM Mono',monospace" }}>WEATHER INTELLIGENCE · {flight.id} · {flight.route}</div>
              {fd.weather.map((z,i)=>{
                const sev=z.status==="AVOID"?"#ff3b5c":z.status==="REROUTE"?"#f5a623":z.status==="FAVORABLE"?"#00e5c0":"#0076ff";
                return (
                  <div key={i} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${sev}25`, borderRadius:10, padding:18, marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:18, fontWeight:800 }}>{z.region}</div>
                        <div style={{ fontSize:9, color:"#666", marginTop:2 }}>{z.type} · Severity: {z.severity}</div>
                      </div>
                      <Badge color={sev}>{z.status}</Badge>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:6, padding:"8px 12px" }}>
                        <div style={{ fontSize:8, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace" }}>TIME IMPACT</div>
                        <div style={{ fontSize:14, color:z.impact.startsWith("-")?"#00e5c0":z.impact==="0 min"?"#666":"#ff3b5c", fontWeight:700 }}>{z.impact}</div>
                      </div>
                      <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:6, padding:"8px 12px" }}>
                        <div style={{ fontSize:8, color:"#555", letterSpacing:1, fontFamily:"'DM Mono',monospace" }}>CO₂ IMPACT</div>
                        <div style={{ fontSize:14, color:z.co2Impact.startsWith("-")?"#00e5c0":z.co2Impact==="0 t"?"#666":"#ff3b5c", fontWeight:700 }}>{z.co2Impact}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:18 }}>
                <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:12 }}>FORECAST MODEL INPUTS</div>
                {["Historical weather archive","Live METAR / TAF feeds","SIGMET / AIRMET alerts","ECMWF global forecast","NOAA RAFS ensemble","Turbulence nowcast (GTG)"].map((f,i)=>(
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <LivePulse color={i<3?"#00e5c0":"#0076ff"}/>
                    <span style={{ fontSize:10, color:"#bbb" }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:"rgba(0,229,192,0.04)", border:"1px solid rgba(0,229,192,0.14)", borderRadius:10, padding:18 }}>
                <div style={{ fontSize:8, color:"#00e5c0", letterSpacing:2, marginBottom:8 }}>🤖 AI WEATHER BRIEF</div>
                <p style={{ fontSize:10, color:"#bbb", lineHeight:1.8 }}>North Atlantic jet stream at FL390 offers exceptional tailwind window for westbound flights until 18:00Z. CAT zone over Czech Republic persists — EK412 reroute saves 2.1 t CO₂ and eliminates passenger discomfort risk.</p>
              </div>
            </div>
          </div>
        )}

        {tab==="schedule"&&(
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>AEROSENSE-AI SCHEDULING · {flight.id} STATUS</div>
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr 1fr", padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  {["FLIGHT","DEPARTURE","AIRCRAFT","GATE","STATUS","AI CONFIDENCE","RISK"].map(h=>(
                    <div key={h} style={{ fontSize:8, color:"#555", letterSpacing:2, fontFamily:"'DM Mono',monospace" }}>{h}</div>
                  ))}
                </div>
                {[
                  { flight:flight.id, dep:flight.departure||"—", aircraft:flight.aircraft, gate:flight.gate||"D12", status:flight.status==="EN ROUTE"?"ON TIME":flight.status==="BOARDING"?"+12 MIN":flight.status, confidence:flight.confidence||94, risk:flight.risk<30?"LOW":flight.risk<60?"MED":"HIGH" },
                ].map((s,i)=>{
                  const rc=s.risk==="LOW"?"#00e5c0":s.risk==="MED"?"#f5a623":"#ff3b5c";
                  return (
                    <div key={s.flight} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr 1fr", padding:"20px 16px", alignItems:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800 }}>{s.flight}</div>
                      <div style={{ fontSize:13, color:"#ccc", fontFamily:"'DM Mono',monospace" }}>{s.dep}</div>
                      <div style={{ fontSize:11, color:"#888" }}>{s.aircraft}</div>
                      <div style={{ fontSize:11, color:"#888" }}>{s.gate}</div>
                      <div><Badge color={s.status==="ON TIME"||s.status==="BOARDING"||s.status==="ARRIVED"?"#00e5c0":"#f5a623"}>{s.status}</Badge></div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ flex:1, height:3, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                          <div style={{ height:3, width:`${s.confidence}%`, background:"#0076ff", borderRadius:2 }}/>
                        </div>
                        <span style={{ fontSize:9, color:"#0076ff", whiteSpace:"nowrap", fontFamily:"'DM Mono',monospace" }}>{s.confidence}%</span>
                      </div>
                      <div style={{ fontSize:11, color:rc, fontFamily:"'DM Mono',monospace" }}>{s.risk}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:20 }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>SCHEDULING DECISION FACTORS</div>
              {[{label:"Sensor Health Scores",icon:"🔧",weight:"30%"},{label:"Maintenance Windows",icon:"🛠",weight:"20%"},{label:"Crew Availability",icon:"👨‍✈️",weight:"10%"},{label:"Weather Forecasts",icon:"🌩",weight:"15%"},{label:"Airport Congestion",icon:"🏗",weight:"10%"},{label:"Carbon Targets",icon:"🌿",weight:"15%"}].map(f=>(
                <div key={f.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"8px 12px", background:"rgba(0,0,0,0.2)", borderRadius:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span>{f.icon}</span>
                    <span style={{ fontSize:10, color:"#bbb" }}>{f.label}</span>
                  </div>
                  <span style={{ fontSize:10, color:"#00e5c0", fontFamily:"'DM Mono',monospace" }}>{f.weight}</span>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:20 }}>
              <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>AI INTERVENTIONS · {flight.id}</div>
              {fd.actions.map((it,i)=>(
                <div key={i} style={{ marginBottom:12, background:"rgba(0,0,0,0.2)", borderRadius:8, padding:14 }}>
                  <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                    <Badge color={it.priority==="HIGH"?"#ff3b5c":it.priority==="MED"?"#f5a623":"#555"}>{it.type}</Badge>
                    <span style={{ fontSize:10, color:"#00e5c0", marginLeft:"auto", fontFamily:"'DM Mono',monospace" }}>{it.saving}</span>
                  </div>
                  <p style={{ fontSize:10, color:"#bbb", lineHeight:1.6 }}>{it.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="report"&&(
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ gridColumn:"1/-1", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:9, color:"#555", letterSpacing:2, marginBottom:6, fontFamily:"'DM Mono',monospace" }}>AEROSENSE-AI · FLIGHT REPORT</div>
                  <div style={{ fontSize:28, fontWeight:800 }}>{fd.report.id} · {fd.report.route} · {fd.report.aircraft}</div>
                  <div style={{ fontSize:10, color:"#666", marginTop:4 }}>{fd.report.landed} · {fd.report.duration} · {fd.report.nm} · Crew: {fd.report.crew}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ textAlign:"center", marginRight:8 }}>
                    <div style={{ fontSize:44, fontWeight:800, color:fd.report.grade.startsWith("A")?"#00e5c0":fd.report.grade.startsWith("B")?"#f5a623":"#ff3b5c", lineHeight:1 }}>{fd.report.grade}</div>
                    <div style={{ fontSize:8, color:"#555", letterSpacing:2, fontFamily:"'DM Mono',monospace", marginTop:2 }}>AI GRADE</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <Badge color="#00e5c0">{flight.status==="ARRIVED"?"COMPLETED":"IN PROGRESS"}</Badge>
                    <Badge color="#0076ff">AI SIGNED</Badge>
                  </div>
                </div>
              </div>
            </div>
            {[
              { title:"SAFETY NOTES",     icon:"🛡", color:"#00e5c0", items:fd.report.safety },
              { title:"PERFORMANCE GAPS", icon:"📊", color:"#f5a623", items:fd.report.perf   },
              { title:"MAINTENANCE",      icon:"🔧", color:"#f5a623", items:fd.report.maint  },
              { title:"FUEL EFFICIENCY",  icon:"⛽", color:"#0076ff", items:fd.report.fuel   },
            ].map(sec=>(
              <div key={sec.title} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${sec.color}20`, borderRadius:10, padding:20 }}>
                <div style={{ fontSize:9, color:sec.color, letterSpacing:2, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>{sec.icon} {sec.title}</div>
                {sec.items.map((item,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:10, paddingBottom:10, borderBottom:i<sec.items.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
                    <div style={{ width:4, height:4, borderRadius:"50%", background:sec.color, marginTop:5, flexShrink:0 }}/>
                    <p style={{ fontSize:10, color:"#bbb", lineHeight:1.7 }}>{item}</p>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ gridColumn:"1/-1", background:"rgba(0,229,192,0.04)", border:"1px solid rgba(0,229,192,0.14)", borderRadius:10, padding:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:9, color:"#00e5c0", letterSpacing:2, marginBottom:6, fontFamily:"'DM Mono',monospace" }}>🤖 AEROSENSE-AI SUMMARY · MODEL v4.2.1</div>
                <p style={{ fontSize:11, color:"#bbb", lineHeight:1.8, maxWidth:760 }}>
                  {fd.report.safety[0]} {fd.report.perf[0]} {fd.report.fuel[fd.report.fuel.length-1]}
                </p>
              </div>
              <div style={{ textAlign:"center", flexShrink:0, marginLeft:28 }}>
                <div style={{ fontSize:52, fontWeight:800, color:fd.report.grade.startsWith("A")?"#00e5c0":fd.report.grade.startsWith("B")?"#f5a623":"#ff3b5c", lineHeight:1 }}>{fd.report.grade}</div>
                <div style={{ fontSize:8, color:"#555", letterSpacing:2, fontFamily:"'DM Mono',monospace", marginTop:4 }}>AI GRADE</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(12px)", borderTop:"1px solid rgba(255,255,255,0.05)", padding:"6px 28px", display:"flex", gap:28, alignItems:"center", zIndex:50 }}>
        {[{l:"AEROSENSE-AI",v:"v4.2.1 LIVE"},{l:"SENSOR NODES",v:`${fd.sensors3d.length} MAPPED`},{l:"FLIGHT",v:`${flight.id} · ${flight.route}`},{l:"STATUS",v:flight.status},{l:"AUDIT EVENTS",v:"1,247 logged"},{l:"ENCRYPTION",v:"AES-256 / TLS 1.3"},{l:"COMPLIANCE",v:"EASA / FAA / ICAO"}].map(({l,v})=>(
          <div key={l} style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:8, color:"#444", letterSpacing:1.5 }}>{l}</span>
            <span style={{ fontSize:8, color:"#00e5c0", fontFamily:"'DM Mono',monospace" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
