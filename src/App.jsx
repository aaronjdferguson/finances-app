import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

// ─── Base Categories ──────────────────────────────────────────────────────────
const BASE_CATS = {
  Housing:{c:"#8b5cf6",i:"🏠"}, Groceries:{c:"#10b981",i:"🛒"}, Restaurants:{c:"#f59e0b",i:"🍽️"},
  Transport:{c:"#3b82f6",i:"🚗"}, Healthcare:{c:"#06b6d4",i:"❤️"}, Shopping:{c:"#ec4899",i:"🛍️"},
  Entertainment:{c:"#6366f1",i:"🎬"}, Utilities:{c:"#64748b",i:"⚡"}, "Personal Care":{c:"#14b8a6",i:"✂️"},
  Subscriptions:{c:"#f97316",i:"📱"}, Property:{c:"#a78bfa",i:"🏢"}, Income:{c:"#22c55e",i:"💵"},
  Transfer:{c:"#94a3b8",i:"↔️"}, Other:{c:"#475569",i:"📦"}
}
const getCustomCats = () => { try { return JSON.parse(localStorage.getItem("fos_custom_cats")||"{}") } catch { return {} } }
const saveCustomCats = cats => localStorage.setItem("fos_custom_cats", JSON.stringify(cats))
const getAllCats = customCats => ({ ...BASE_CATS, ...customCats })

const KW = {
  Groceries:["safeway","kroger","qfc","albertsons","whole foods","trader joe","costco","winco","fred meyer","sprouts","aldi","hmart","h mart","gmart","cookunity"],
  Transport:["shell","chevron","arco","bp","exxon","mobil","texaco","speedway","uber","lyft","parking","transit","fuel"],
  Restaurants:["mcdonald","burger king","subway","starbucks","dunkin","chipotle","domino","pizza","taco bell","kfc","ivar","panda express","sushi","restaurant","cafe","grubhub","doordash","gameway"],
  Shopping:["amazon","target","macy","nordstrom","tj maxx","marshalls","ross ","kohl","best buy","homegoods","ikea","ebay","walmart","wal-mart","value village","hot topic","academy sports","snapdoodle","temu","pet wants"],
  Utilities:["comcast","xfinity","puget sound","pud","at&t","verizon","t-mobile","centurylink","spectrum","electric","internet","snohomish county"],
  Subscriptions:["netflix","spotify","hulu","disney","apple.com","apple music","google play","microsoft","adobe","dropbox","amazon prime","youtube","gsuite","google *"],
  Healthcare:["cvs","walgreens","rite aid","pharmacy","medical","dental","hospital","clinic","providence","kaiser","optum","orthodontic","nova ortho","reverse.health"],
  Entertainment:["amc ","regal","cinemark","ticketmaster","eventbrite","steam","playstation","xbox","nintendo"],
  Property:["home depot","lowe","ace hardware","maintenance","repair","plumber","electrician","hardware","snyder greenwood","robert b devney"],
  Housing:["mortgage","rent payment","hoa ","homeowners"],
  "Personal Care":["great clips","supercuts","ulta","sephora","salon","spa","barber","nail ","molly's skin","skin care"],
  Income:["paycheck","direct deposit","payroll","salary","rent received","refund","redemption","cash auto"],
}
const autocat = d => { const s=(d||"").toLowerCase(); for(const[c,ks]of Object.entries(KW)){if(ks.some(k=>s.includes(k)))return c} return "Other" }
const IRS = {Business:0.67,Medical:0.21,Charity:0.14,Property:0.67,Personal:0}
const MTYPES = ["Business","Medical","Charity","Property","Personal"]
const AT = {checking:{i:"🏦",l:"Checking"},savings:{i:"💰",l:"Savings"},credit:{i:"💳",l:"Credit Card"},loan:{i:"🏠",l:"Loan/Mortgage"},investment:{i:"📈",l:"Investment"},property:{i:"🏢",l:"Property"}}
const MOS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const now=new Date(), cmo=now.getMonth(), cyr=now.getFullYear()
const fmt = n=>(n<0?"-$":"$")+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtK = n=>Math.abs(n)>=1000?"$"+(Math.abs(n)/1000).toFixed(1).replace(".0","")+"k":fmt(n)
const hav=(a,b,c,d)=>{const R=3958.8,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
const DEF_BUDGETS=[{cat:"Housing",budg:2200},{cat:"Groceries",budg:600},{cat:"Restaurants",budg:300},{cat:"Transport",budg:250},{cat:"Healthcare",budg:200},{cat:"Shopping",budg:400},{cat:"Entertainment",budg:150},{cat:"Utilities",budg:300},{cat:"Subscriptions",budg:80},{cat:"Personal Care",budg:100},{cat:"Property",budg:600}]
const CL_ITEMS=[
  {s:"Income",items:["W-2 from each employer","1099-NEC (freelance/contract)","1099-INT (bank interest)","1099-DIV (dividends)","1099-R (retirement distributions)","Rental income records"]},
  {s:"Deductions",items:["Mortgage interest (Form 1098)","Property tax records","Charitable donation receipts","Medical/dental receipts","Student loan interest (1098-E)","Mileage log (tracked above)"]},
  {s:"Property/Rental",items:["Rental income & expense records","Prior year depreciation schedule","Repair receipts (vault above)","Property insurance statements","HOA statements"]},
  {s:"Personal",items:["SSN for you and dependents","Prior year tax return","Bank routing # for refund","IP PIN if issued by IRS","Estimated tax payment records"]},
]

const bg="#111827",sdbg="#0d1117",card="#1f2937",bdr="#374151",t1="#f9fafb",t2="#9ca3af",acc="#8b5cf6"
const S={
  card:{background:card,border:`1px solid ${bdr}`,borderRadius:"12px",padding:"20px"},
  h1:{fontSize:"22px",fontWeight:"700",color:t1,margin:"0 0 4px"},
  h2:{fontSize:"14px",fontWeight:"600",color:t1,margin:"0 0 14px"},
  inp:{background:"#374151",border:`1px solid #4b5563`,color:t1,borderRadius:"8px",padding:"8px 12px",fontSize:"13px",width:"100%",boxSizing:"border-box"},
  sel:{background:"#374151",border:`1px solid #4b5563`,color:t1,borderRadius:"8px",padding:"8px 12px",fontSize:"13px"},
  btn:(c="purple")=>({background:{purple:acc,green:"#10b981",red:"#ef4444",gray:"#374151",blue:"#3b82f6",orange:"#f97316"}[c]||acc,color:t1,border:"none",borderRadius:"8px",padding:"9px 16px",cursor:"pointer",fontSize:"13px",fontWeight:"600"}),
  lbl:{fontSize:"12px",color:t2,marginBottom:"4px",display:"block"},
  tt:{background:card,border:`1px solid ${bdr}`,borderRadius:"8px",fontSize:"12px",color:t1},
  ntab:a=>({background:a?"#1f2937":"transparent",border:"none",borderLeft:a?`3px solid ${acc}`:"3px solid transparent",cursor:"pointer",color:a?acc:t2,fontSize:"13px",fontWeight:a?"600":"400",padding:"9px 14px",display:"flex",alignItems:"center",gap:"10px",width:"100%",marginBottom:"2px",textAlign:"left",borderRadius:a?"0 8px 8px 0":"0 8px 8px 0"}),
}
const NAVS=[{l:"Dashboard",i:"📊"},{l:"Accounts",i:"🏦"},{l:"Transactions",i:"↔️"},{l:"Budget",i:"📋"},{l:"Cash Flow",i:"📈"},{l:"Net Worth",i:"💎"},{l:"Goals",i:"🎯"},{l:"Mileage",i:"🚗"},{l:"Receipts",i:"🧾"},{l:"Tax Prep",i:"💼"}]

// ─── Category Selector Component ──────────────────────────────────────────────
function CatSelect({value, onChange, customCats, onAddCat, style={}}) {
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState("")
  const CATS = getAllCats(customCats)
  const handleAdd = () => {
    const name = newCat.trim()
    if (!name) return
    const updated = { ...customCats, [name]: { c: "#94a3b8", i: "🏷️" } }
    onAddCat(updated)
    onChange(name)
    setNewCat("")
    setAdding(false)
  }
  if (adding) return (
    <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
      <input autoFocus style={{ ...S.inp, ...style, minWidth:"120px" }} placeholder="New category name" value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleAdd();if(e.key==="Escape")setAdding(false)}}/>
      <button onClick={handleAdd} style={{ ...S.btn("green"), padding:"6px 10px", fontSize:"12px" }}>✓</button>
      <button onClick={()=>setAdding(false)} style={{ ...S.btn("gray"), padding:"6px 10px", fontSize:"12px" }}>✕</button>
    </div>
  )
  return (
    <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
      <select style={{ ...S.sel, ...style }} value={value} onChange={e=>onChange(e.target.value)}>
        {Object.keys(CATS).map(c=><option key={c}>{c}</option>)}
      </select>
      <button onClick={()=>setAdding(true)} title="Add new category" style={{ background:"#374151", border:`1px solid #4b5563`, color:t2, borderRadius:"8px", padding:"6px 10px", cursor:"pointer", fontSize:"14px", flexShrink:0 }}>+</button>
    </div>
  )
}

// ─── Gemini helpers ───────────────────────────────────────────────────────────
const scanWithGemini = async (b64, mime) => {
  const res = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "receipt", data: b64, mime })
  })
  const { text, error } = await res.json()
  if (error) throw new Error(error)
  return JSON.parse(text.replace(/```json|```/g, "").trim())
}

const parsePDFWithGemini = async (b64) => {
  const res = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "pdf", data: b64, mime: "application/pdf" })
  })
  const { text, error } = await res.json()
  if (error) throw new Error(error)
  const match = text.replace(/```json|```/g, "").match(/\[[\s\S]*\]/)
  if (!match) throw new Error("Could not find transaction data in response")
  return JSON.parse(match[0])
}

// ─── PIN Screen ───────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const stored = localStorage.getItem("fos_pin")
  const isNew = !stored
  const [pin, setPin] = useState("")
  const [confirm, setConfirm] = useState("")
  const [step, setStep] = useState(isNew ? "create" : "enter")
  const [err, setErr] = useState("")
  const [shake, setShake] = useState(false)
  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 600) }
  const handleNum = n => {
    if (step === "enter") {
      const next = pin + n; setPin(next)
      if (next.length === 4) { if (next === stored) { onUnlock() } else { setErr("Incorrect PIN"); setPin(""); doShake() } }
    } else if (step === "create") {
      const next = pin + n; setPin(next)
      if (next.length === 4) setStep("confirm")
    } else if (step === "confirm") {
      const next = confirm + n; setConfirm(next)
      if (next.length === 4) {
        if (next === pin) { localStorage.setItem("fos_pin", pin); onUnlock() }
        else { setErr("PINs don't match — try again"); setPin(""); setConfirm(""); setStep("create"); doShake() }
      }
    }
  }
  const del = () => { if (step === "confirm") setConfirm(p=>p.slice(0,-1)); else setPin(p=>p.slice(0,-1)) }
  const cur = step === "confirm" ? confirm : pin
  const titles = { enter:"Enter PIN", create:"Create a PIN", confirm:"Confirm PIN" }
  const subs = { enter:"Enter your 4-digit PIN to continue", create:"Choose a 4-digit PIN to protect your app", confirm:"Re-enter your PIN to confirm" }
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ textAlign:"center", width:"100%", maxWidth:"320px" }}>
        <div style={{ fontSize:"40px", marginBottom:"12px" }}>💼</div>
        <div style={{ fontSize:"22px", fontWeight:"700", color:acc, marginBottom:"6px" }}>FinanceOS</div>
        <div style={{ fontSize:"15px", fontWeight:"600", color:t1, marginBottom:"6px" }}>{titles[step]}</div>
        <div style={{ fontSize:"13px", color:t2, marginBottom:"28px" }}>{subs[step]}</div>
        {err && <div style={{ background:"#7f1d1d", color:"#fca5a5", borderRadius:"8px", padding:"8px 14px", fontSize:"13px", marginBottom:"18px" }}>{err}</div>}
        <div style={{ display:"flex", justifyContent:"center", gap:"16px", marginBottom:"32px", transform:shake?"translateX(8px)":"none", transition:"transform 0.1s" }}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{ width:"16px", height:"16px", borderRadius:"50%", background:cur.length>i?acc:"#374151", border:`2px solid ${cur.length>i?acc:"#4b5563"}`, transition:"all 0.15s" }}/>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", maxWidth:"240px", margin:"0 auto" }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((n,i)=>(
            <button key={i} onClick={()=>n==="⌫"?del():n!==""&&handleNum(String(n))}
              style={{ height:"60px", borderRadius:"12px", border:`1px solid ${bdr}`, background:n===""?"transparent":card, color:n==="⌫"?t2:t1, fontSize:n==="⌫"?"20px":"22px", fontWeight:"600", cursor:n===""?"default":"pointer" }}
            >{n}</button>
          ))}
        </div>
        {step==="enter" && <button onClick={()=>{localStorage.removeItem("fos_pin");window.location.reload()}} style={{ background:"none", border:"none", color:"#4b5563", fontSize:"12px", cursor:"pointer", marginTop:"24px", display:"block", margin:"24px auto 0" }}>Forgot PIN? Reset app lock</button>}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />
  return <MainApp />
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function MainApp() {
  const [nav,setNav]=useState("Dashboard")
  const [open,setOpen]=useState(true)
  const [loading,setLoading]=useState(true)
  const [accts,setAccts]=useState([])
  const [txns,setTxns]=useState([])
  const [bud,setBud]=useState(DEF_BUDGETS)
  const [goals,setGoals]=useState([])
  const [trips,setTrips]=useState([])
  const [rcpts,setRcpts]=useState([])
  const [ckd,setCkd]=useState({})
  const [customCats,setCustomCats]=useState(getCustomCats())
  const [notif,setNotif]=useState(null)
  const toast=(msg,type="ok")=>{setNotif({msg,type});setTimeout(()=>setNotif(null),4500)}

  const handleAddCat = updated => { saveCustomCats(updated); setCustomCats(updated) }
  const CATS = getAllCats(customCats)

  useEffect(()=>{
    const load=async()=>{
      setLoading(true)
      try{
        const [a,t,b,g,tr,r,c]=await Promise.all([
          sb.from("accounts").select("*").order("id"),
          sb.from("transactions").select("*").order("created_at",{ascending:false}),
          sb.from("budgets").select("*"),
          sb.from("goals").select("*").order("created_at"),
          sb.from("trips").select("*").order("created_at",{ascending:false}),
          sb.from("receipts").select("*").order("created_at",{ascending:false}),
          sb.from("checklist").select("*"),
        ])
        if(a.data?.length)setAccts(a.data)
        if(t.data)setTxns(t.data)
        if(b.data?.length)setBud(b.data)
        if(g.data)setGoals(g.data)
        if(tr.data)setTrips(tr.data)
        if(r.data)setRcpts(r.data)
        const ckMap={};(c.data||[]).forEach(x=>ckMap[x.item_key]=x.checked);setCkd(ckMap)
      }catch(e){toast("Failed to load: "+e.message,"err")}
      setLoading(false)
    }
    load()
  },[])

  const ms=`${cyr}-${String(cmo+1).padStart(2,"0")}`
  const mT=txns.filter(t=>t.date?.startsWith(ms))
  const income=mT.filter(t=>t.amt>0&&t.cat!=="Transfer").reduce((s,t)=>s+t.amt,0)
  const expenses=Math.abs(mT.filter(t=>t.amt<0&&t.cat!=="Transfer").reduce((s,t)=>s+t.amt,0))
  const assets=accts.filter(a=>a.bal>0).reduce((s,a)=>s+a.bal,0)
  const liabs=Math.abs(accts.filter(a=>a.bal<0).reduce((s,a)=>s+a.bal,0))
  const nw=assets-liabs

  const addTxn=async row=>{const{data,error}=await sb.from("transactions").insert({...row,created_at:new Date().toISOString()}).select().single();if(!error&&data)setTxns(p=>[data,...p]);else toast("Save failed","err")}
  const delTxn=async id=>{await sb.from("transactions").delete().eq("id",id);setTxns(p=>p.filter(x=>x.id!==id))}
  const updTxn=async(id,row)=>{await sb.from("transactions").update(row).eq("id",id);setTxns(p=>p.map(x=>x.id===id?{...x,...row}:x))}
  const addAcct=async row=>{const{data,error}=await sb.from("accounts").insert(row).select().single();if(!error&&data)setAccts(p=>[...p,data]);else toast("Save failed","err")}
  const delAcct=async id=>{await sb.from("accounts").delete().eq("id",id);setAccts(p=>p.filter(x=>x.id!==id))}
  const updAcct=async(id,row)=>{await sb.from("accounts").update(row).eq("id",id);setAccts(p=>p.map(x=>x.id===id?{...x,...row}:x))}
  const updBudg=async(cat,budg)=>{await sb.from("budgets").update({budg}).eq("cat",cat);setBud(p=>p.map(x=>x.cat===cat?{...x,budg}:x))}
  const addGoal=async row=>{const{data,error}=await sb.from("goals").insert({...row,created_at:new Date().toISOString()}).select().single();if(!error&&data)setGoals(p=>[...p,data]);else toast("Save failed","err")}
  const delGoal=async id=>{await sb.from("goals").delete().eq("id",id);setGoals(p=>p.filter(x=>x.id!==id))}
  const updGoal=async(id,row)=>{await sb.from("goals").update(row).eq("id",id);setGoals(p=>p.map(x=>x.id===id?{...x,...row}:x))}
  const addTrip=async row=>{const{data,error}=await sb.from("trips").insert({...row,created_at:new Date().toISOString()}).select().single();if(!error&&data)setTrips(p=>[data,...p]);else toast("Save failed","err")}
  const delTrip=async id=>{await sb.from("trips").delete().eq("id",id);setTrips(p=>p.filter(x=>x.id!==id))}
  const addRcpt=async row=>{const{data,error}=await sb.from("receipts").insert({...row,created_at:new Date().toISOString()}).select().single();if(!error&&data)setRcpts(p=>[data,...p]);else toast("Save failed","err")}
  const delRcpt=async id=>{await sb.from("receipts").delete().eq("id",id);setRcpts(p=>p.filter(x=>x.id!==id))}
  const updRcpt=async(id,row)=>{await sb.from("receipts").update(row).eq("id",id);setRcpts(p=>p.map(x=>x.id===id?{...x,...row}:x))}
  const toggleCk=async key=>{const val=!ckd[key];setCkd(p=>({...p,[key]:val}));await sb.from("checklist").upsert({item_key:key,checked:val},{onConflict:"item_key"})}

  const p={accts,txns,bud,goals,trips,rcpts,ckd,mT,income,expenses,assets,liabs,nw,CATS,customCats,
    addTxn,delTxn,updTxn,addAcct,delAcct,updAcct,updBudg,addGoal,delGoal,updGoal,
    addTrip,delTrip,addRcpt,delRcpt,updRcpt,toggleCk,toast,handleAddCat}

  if(loading) return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:bg,minHeight:"100vh",color:t1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <div style={{fontSize:"36px"}}>💼</div>
      <div style={{fontSize:"16px",color:acc,fontWeight:"600"}}>Loading FinanceOS…</div>
      <div style={{fontSize:"13px",color:t2}}>Connecting to your database</div>
    </div>
  )

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Inter',system-ui,sans-serif",background:bg,color:t1,overflow:"hidden"}}>
      {notif&&<div style={{position:"fixed",top:16,right:16,zIndex:1000,background:notif.type==="err"?"#7f1d1d":"#14532d",color:notif.type==="err"?"#fca5a5":"#86efac",border:`1px solid ${notif.type==="err"?"#ef4444":"#22c55e"}`,borderRadius:"10px",padding:"10px 16px",fontSize:"13px",fontWeight:"500",maxWidth:"300px",boxShadow:"0 4px 20px rgba(0,0,0,.5)"}}>{notif.msg}</div>}
      {open&&<Sidebar nav={nav} setNav={setNav} nw={nw} accts={accts}/>}
      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{background:sdbg,borderBottom:`1px solid ${bdr}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
          <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",color:t2,cursor:"pointer",fontSize:"20px",padding:"2px 4px",lineHeight:"1"}}>☰</button>
          <span style={{color:t2,fontSize:"13px"}}>{NAVS.find(n=>n.l===nav)?.i} {nav}</span>
          <div style={{flex:1}}/>
          <span style={{fontSize:"11px",color:"#10b981",background:"#14532d44",border:"1px solid #22c55e44",padding:"3px 10px",borderRadius:"20px"}}>✦ Connected · data saves automatically</span>
        </div>
        <div style={{flex:1,overflow:"auto"}}>
          {nav==="Dashboard"&&<Dashboard {...p}/>}
          {nav==="Accounts"&&<Accounts {...p}/>}
          {nav==="Transactions"&&<Transactions {...p}/>}
          {nav==="Budget"&&<Budget {...p}/>}
          {nav==="Cash Flow"&&<CashFlow txns={txns}/>}
          {nav==="Net Worth"&&<NetWorthView {...p}/>}
          {nav==="Goals"&&<Goals {...p}/>}
          {nav==="Mileage"&&<Mileage {...p}/>}
          {nav==="Receipts"&&<Receipts {...p}/>}
          {nav==="Tax Prep"&&<TaxPrep {...p}/>}
        </div>
      </div>
    </div>
  )
}

function Sidebar({nav,setNav,nw,accts}){
  return(
    <div style={{width:"215px",background:sdbg,borderRight:`1px solid ${bdr}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"16px 16px 12px",borderBottom:`1px solid ${bdr}`}}>
        <div style={{fontSize:"17px",fontWeight:"800",color:acc,letterSpacing:"-0.02em"}}>💼 FinanceOS</div>
        <div style={{fontSize:"11px",color:t2,marginTop:"2px"}}>Personal Finance Dashboard</div>
      </div>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${bdr}`}}>
        <div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"4px"}}>Net Worth</div>
        <div style={{fontSize:"22px",fontWeight:"700",color:nw>=0?"#10b981":"#ef4444"}}>{fmt(nw)}</div>
      </div>
      <nav style={{flex:1,padding:"8px",overflowY:"auto"}}>
        {NAVS.map(n=><button key={n.l} onClick={()=>setNav(n.l)} style={S.ntab(nav===n.l)}><span style={{fontSize:"15px"}}>{n.i}</span>{n.l}</button>)}
      </nav>
      <div style={{padding:"8px",borderTop:`1px solid ${bdr}`,maxHeight:"190px",overflowY:"auto"}}>
        <div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.1em",padding:"4px 8px 6px"}}>Accounts</div>
        {accts.map(a=>(
          <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",fontSize:"12px"}}>
            <span style={{color:t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"110px"}}>{AT[a.type]?.i} {a.name?.split(" ")[0]}</span>
            <span style={{color:a.bal>=0?"#10b981":"#ef4444",fontWeight:"600",flexShrink:0,marginLeft:"4px"}}>{fmtK(a.bal)}</span>
          </div>
        ))}
        {accts.length===0&&<div style={{padding:"4px 8px",fontSize:"12px",color:"#4b5563"}}>No accounts yet</div>}
      </div>
    </div>
  )
}

function Dashboard({bud,txns,mT,income,expenses,nw,CATS}){
  const spend={},bSpent={}
  mT.filter(t=>t.amt<0&&t.cat!=="Transfer").forEach(t=>{spend[t.cat]=(spend[t.cat]||0)+Math.abs(t.amt);bSpent[t.cat]=(bSpent[t.cat]||0)+Math.abs(t.amt)})
  const pie=Object.entries(spend).map(([n,v])=>({name:n,value:Math.round(v*100)/100,color:CATS[n]?.c||"#555"})).sort((a,b)=>b.value-a.value)
  const sv=income-expenses
  const cfData=MOS.map((m,i)=>{
    const ms2=`${cyr}-${String(i+1).padStart(2,"0")}`
    const mTxns=txns.filter(t=>t.date?.startsWith(ms2))
    return{m,income:mTxns.filter(t=>t.amt>0&&t.cat!=="Transfer").reduce((s,t)=>s+t.amt,0),expenses:Math.abs(mTxns.filter(t=>t.amt<0&&t.cat!=="Transfer").reduce((s,t)=>s+t.amt,0))}
  })
  return(
    <div style={{padding:"22px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:"12px",marginBottom:"16px"}}>
        {[{l:"Net Worth",v:fmt(nw),c:nw>=0?"#10b981":"#ef4444"},{l:"Monthly Income",v:fmt(income),c:"#10b981"},{l:"Monthly Spending",v:fmt(expenses),c:"#f87171"},{l:"Savings Rate",v:`${income>0?Math.round(sv/income*100):0}%`,c:acc}].map(s=>(
          <div key={s.l} style={S.card}><div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>{s.l}</div><div style={{fontSize:"26px",fontWeight:"700",color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 0.8fr",gap:"14px",marginBottom:"14px"}}>
        <div style={S.card}>
          <div style={S.h2}>Spending by Category — {MOS[cmo]}</div>
          {pie.length===0?<p style={{color:t2,fontSize:"13px"}}>No spending data yet.</p>:(
            <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
              <div style={{width:"145px",height:"145px",flexShrink:0}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={42} outerRadius={64} dataKey="value" paddingAngle={2}>{pie.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={v=>[fmt(v),"Amount"]} contentStyle={S.tt}/></PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:"7px"}}>
                {pie.slice(0,6).map(e=>(
                  <div key={e.name} style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px"}}>
                    <div style={{width:"8px",height:"8px",borderRadius:"2px",background:e.color,flexShrink:0}}/>
                    <span style={{color:t2,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.name}</span>
                    <span style={{color:t1,fontWeight:"600"}}>{fmt(e.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={S.card}>
          <div style={S.h2}>Cash Flow — {cyr}</div>
          <ResponsiveContainer width="100%" height={148}>
            <BarChart data={cfData} barGap={1}>
              <XAxis dataKey="m" tick={{fill:t2,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip formatter={v=>[fmt(v)]} contentStyle={S.tt}/>
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[3,3,0,0]} maxBarSize={13}/>
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={13}/>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:"14px",justifyContent:"center",marginTop:"6px"}}>
            <span style={{fontSize:"11px",color:"#10b981"}}>● Income</span><span style={{fontSize:"11px",color:"#ef4444"}}>● Expenses</span>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
        <div style={S.card}>
          <div style={S.h2}>Recent Transactions</div>
          {mT.length===0?<p style={{color:t2,fontSize:"13px"}}>No transactions this month.</p>:
            mT.slice(0,7).map((t,i)=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 0",borderTop:i>0?`1px solid ${bdr}22`:""}}>
                <div style={{width:"34px",height:"34px",borderRadius:"10px",background:(CATS[t.cat]?.c||"#555")+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",flexShrink:0}}>{CATS[t.cat]?.i||"📦"}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:"13px",fontWeight:"500",color:t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.merch}</div><div style={{fontSize:"11px",color:t2}}>{t.cat} · {t.date?.slice(5)}</div></div>
                <div style={{fontWeight:"600",fontSize:"13px",color:t.amt>=0?"#10b981":t1,flexShrink:0}}>{t.amt>=0?"+":""}{fmt(Math.abs(t.amt))}</div>
              </div>
            ))
          }
        </div>
        <div style={S.card}>
          <div style={S.h2}>Budget Overview</div>
          {bud.slice(0,7).map(b=>{const sp=bSpent[b.cat]||0,pct=Math.min(sp/b.budg*100,100),ov=sp>b.budg;return(
            <div key={b.cat} style={{marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",fontSize:"12px"}}>
                <span style={{color:t2}}>{CATS[b.cat]?.i||"📦"} {b.cat}</span>
                <span style={{color:ov?"#ef4444":t1}}>{fmt(sp)}<span style={{color:t2}}> / {fmt(b.budg)}</span></span>
              </div>
              <div style={{background:"#374151",borderRadius:"99px",height:"5px"}}><div style={{background:ov?"#ef4444":CATS[b.cat]?.c||acc,borderRadius:"99px",height:"5px",width:`${pct}%`}}/></div>
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}

function Accounts({accts,addAcct,delAcct,updAcct,nw,assets,liabs}){
  const [show,setShow]=useState(false)
  const [n,setN]=useState({name:"",type:"checking",inst:"",bal:""})
  const add=async()=>{if(!n.name||n.bal==="")return;await addAcct({...n,bal:parseFloat(n.bal)});setN({name:"",type:"checking",inst:"",bal:""});setShow(false)}
  const grp={};accts.forEach(a=>{if(!grp[a.type])grp[a.type]=[];grp[a.type].push(a)})
  return(
    <div style={{padding:"22px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px"}}>
        <div><h1 style={S.h1}>Accounts</h1><p style={{color:t2,fontSize:"13px",margin:"4px 0 0"}}>{accts.length} accounts</p></div>
        <button onClick={()=>setShow(true)} style={S.btn()}>+ Add Account</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"18px"}}>
        {[{l:"Net Worth",v:fmt(nw),c:nw>=0?"#10b981":"#ef4444"},{l:"Total Assets",v:fmt(assets),c:"#10b981"},{l:"Total Liabilities",v:fmt(liabs),c:"#ef4444"}].map(s=>(
          <div key={s.l} style={S.card}><div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>{s.l}</div><div style={{fontSize:"24px",fontWeight:"700",color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      {accts.length===0&&<div style={{...S.card,textAlign:"center",padding:"40px"}}><div style={{fontSize:"32px",marginBottom:"12px"}}>🏦</div><p style={{color:t2}}>No accounts yet.</p></div>}
      {Object.entries(grp).map(([type,list])=>(
        <div key={type} style={{...S.card,marginBottom:"12px"}}>
          <div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>{AT[type]?.l}</div>
          {list.map((a,i)=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:"14px",padding:"12px 0",borderTop:i>0?`1px solid ${bdr}`:""}}>
              <div style={{width:"42px",height:"42px",borderRadius:"12px",background:acc+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{AT[type]?.i}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:"600",fontSize:"14px",color:t1}}>{a.name}</div><div style={{fontSize:"12px",color:t2}}>{a.inst}</div></div>
              <div style={{fontWeight:"700",fontSize:"16px",color:a.bal>=0?"#10b981":"#ef4444"}}>{fmt(a.bal)}</div>
              <input style={{...S.inp,width:"110px",padding:"5px 8px",fontSize:"12px"}} type="number" placeholder="Update $" onBlur={async e=>{if(e.target.value!==""){await updAcct(a.id,{bal:parseFloat(e.target.value)});e.target.value=""}}}/>
              <button onClick={()=>delAcct(a.id)} style={{...S.btn("red"),padding:"5px 10px",fontSize:"12px"}}>✕</button>
            </div>
          ))}
        </div>
      ))}
      {show&&<Modal title="Add Account" onClose={()=>setShow(false)}>
        {[{l:"Account Name",k:"name",t:"text",ph:"e.g. Chase Checking"},{l:"Institution",k:"inst",t:"text",ph:"e.g. Chase"},{l:"Balance",k:"bal",t:"number",ph:"Negative for loans/credit cards"}].map(f=>(
          <div key={f.k} style={{marginBottom:"12px"}}><label style={S.lbl}>{f.l}</label><input style={S.inp} type={f.t} placeholder={f.ph} value={n[f.k]} onChange={e=>setN(p=>({...p,[f.k]:e.target.value}))}/></div>
        ))}
        <div style={{marginBottom:"16px"}}><label style={S.lbl}>Account Type</label><select style={{...S.sel,width:"100%"}} value={n.type} onChange={e=>setN(p=>({...p,type:e.target.value}))}>{Object.entries(AT).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select></div>
        <div style={{display:"flex",gap:"8px"}}><button onClick={add} style={{...S.btn(),flex:1}}>Add Account</button><button onClick={()=>setShow(false)} style={{...S.btn("gray"),flex:1}}>Cancel</button></div>
      </Modal>}
    </div>
  )
}

function Transactions({txns,addTxn,delTxn,updTxn,accts,toast,CATS,customCats,handleAddCat}){
  const [q,setQ]=useState(""),[cf,setCf]=useState("All")
  const [n,setN]=useState({date:"",merch:"",amt:"",cat:"Other",aid:null,note:""})
  const csvRef=useRef(),pdfRef=useRef()
  const [pdfBusy,setPdfBusy]=useState(false)
  const add=async()=>{if(!n.merch||n.amt==="")return;await addTxn({...n,amt:parseFloat(n.amt),aid:n.aid?parseInt(n.aid):null});setN({date:"",merch:"",amt:"",cat:"Other",aid:null,note:""})}
  const handleCSV=async e=>{
    const file=e.target.files[0];if(!file)return
    const text=await file.text(),lines=text.trim().split("\n"),hdrs=lines[0].split(",").map(h=>h.trim().replace(/"/g,"").toLowerCase())
    const parsed=lines.slice(1).map((line,i)=>{
      const vals=line.split(",").map(v=>v.trim().replace(/"/g,"")),row={};hdrs.forEach((h,j)=>row[h]=vals[j]||"")
      const dk=hdrs.find(h=>h.includes("date")),des=hdrs.find(h=>h.includes("desc")||h.includes("name")||h.includes("memo")||h.includes("narr")),amt=hdrs.find(h=>h.includes("amount")||h.includes("amt"))
      const desc=row[des]||Object.values(row)[1]||""
      return{date:row[dk]||"",merch:desc,amt:parseFloat((row[amt]||"0").replace(/[^0-9.-]/g,""))||0,cat:autocat(desc),aid:null,note:""}
    }).filter(r=>r.merch&&r.merch.length>1)
    let count=0;for(const row of parsed){await addTxn(row);count++}
    toast(`✓ Imported ${count} transactions`);e.target.value=""
  }
  const handlePDF=async e=>{
    const file=e.target.files[0];if(!file)return
    setPdfBusy(true)
    try{
      const b64=await new Promise(res=>{const r=new FileReader();r.onload=ev=>res(ev.target.result.split(",")[1]);r.readAsDataURL(file)})
      const parsed=await parsePDFWithGemini(b64)
      if(!Array.isArray(parsed)||parsed.length===0)throw new Error("No transactions found — try CSV instead")
      let count=0
      for(const row of parsed){
        if(!row.merch||row.amt===undefined)continue
        await addTxn({date:row.date||"",merch:row.merch,amt:parseFloat(row.amt)||0,cat:row.cat||autocat(row.merch),aid:null,note:""})
        count++
      }
      toast(`✓ Imported ${count} transactions from PDF`)
    }catch(err){toast("PDF: "+err.message,"err")}
    setPdfBusy(false);e.target.value=""
  }
  const fil=txns.filter(t=>(q===""||t.merch?.toLowerCase().includes(q.toLowerCase())||t.cat?.toLowerCase().includes(q.toLowerCase()))&&(cf==="All"||t.cat===cf)).sort((a,b)=>(b.date||"").localeCompare(a.date||""))
  const incT=fil.filter(t=>t.amt>0&&t.cat!=="Transfer").reduce((s,t)=>s+t.amt,0)
  const expT=Math.abs(fil.filter(t=>t.amt<0&&t.cat!=="Transfer").reduce((s,t)=>s+t.amt,0))
  return(
    <div style={{padding:"22px"}}>
      <div style={{marginBottom:"14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div><h1 style={S.h1}>Transactions</h1><p style={{color:t2,fontSize:"13px",margin:"4px 0 0"}}>{fil.length} shown · ↑{fmt(incT)} · ↓{fmt(expT)}</p></div>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
          <input style={{...S.inp,flex:"1",minWidth:"140px"}} placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
          <select style={S.sel} value={cf} onChange={e=>setCf(e.target.value)}><option>All</option>{Object.keys(CATS).map(c=><option key={c}>{c}</option>)}</select>
          <input ref={csvRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleCSV}/>
          <input ref={pdfRef} type="file" accept=".pdf" style={{display:"none"}} onChange={handlePDF}/>
          <button onClick={()=>csvRef.current?.click()} style={{...S.btn("green"),whiteSpace:"nowrap"}}>📂 Import CSV</button>
          <button onClick={()=>pdfRef.current?.click()} disabled={pdfBusy} style={{...S.btn("purple"),whiteSpace:"nowrap"}}>{pdfBusy?"⏳ Reading…":"📄 Import PDF"}</button>
        </div>
      </div>
      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={{fontSize:"13px",fontWeight:"600",color:t1,marginBottom:"12px"}}>Add Transaction</div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"flex-end"}}>
          <input style={{...S.inp,width:"120px"}} type="date" value={n.date} onChange={e=>setN(p=>({...p,date:e.target.value}))}/>
          <input style={{...S.inp,flex:"1",minWidth:"130px"}} placeholder="Merchant / description" value={n.merch} onChange={e=>setN(p=>({...p,merch:e.target.value}))}/>
          <input style={{...S.inp,width:"120px"}} type="number" placeholder="Amount (neg=expense)" value={n.amt} onChange={e=>setN(p=>({...p,amt:e.target.value}))}/>
          <CatSelect value={n.cat} onChange={v=>setN(p=>({...p,cat:v}))} customCats={customCats} onAddCat={handleAddCat}/>
          {accts.length>0&&<select style={S.sel} value={n.aid||""} onChange={e=>setN(p=>({...p,aid:e.target.value}))}><option value="">Account</option>{accts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}
          <button style={S.btn("green")} onClick={add}>Add</button>
        </div>
      </div>
      <div style={S.card}>
        {fil.length===0?<p style={{color:t2,textAlign:"center",padding:"30px"}}>No transactions yet.</p>:
          fil.slice(0,100).map((t,i)=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 6px",borderBottom:i<Math.min(fil.length,100)-1?`1px solid ${bdr}22`:""}}>
              <div style={{width:"36px",height:"36px",borderRadius:"10px",background:(CATS[t.cat]?.c||"#555")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>{CATS[t.cat]?.i||"📦"}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:"13px",fontWeight:"500",color:t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.merch}</div><div style={{fontSize:"11px",color:t2}}>{t.date}</div></div>
              <CatSelect value={t.cat||"Other"} onChange={v=>updTxn(t.id,{cat:v})} customCats={customCats} onAddCat={handleAddCat} style={{fontSize:"11px",padding:"4px 7px"}}/>
              <div style={{fontWeight:"700",fontSize:"14px",color:t.amt>=0?"#10b981":t1,minWidth:"72px",textAlign:"right"}}>{t.amt>=0?"+":""}{fmt(Math.abs(t.amt||0))}</div>
              <button onClick={()=>delTxn(t.id)} style={{...S.btn("gray"),padding:"4px 8px",fontSize:"12px"}}>✕</button>
            </div>
          ))
        }
        {fil.length>100&&<p style={{textAlign:"center",color:t2,fontSize:"12px",padding:"12px"}}>Showing 100 of {fil.length} — use search to filter</p>}
      </div>
    </div>
  )
}

function Budget({txns,bud,updBudg,CATS}){
  const [edit,setEdit]=useState(null),[val,setVal]=useState("")
  const ms=`${cyr}-${String(cmo+1).padStart(2,"0")}`,sp={}
  txns.filter(t=>t.date?.startsWith(ms)&&t.amt<0&&t.cat!=="Transfer").forEach(t=>{sp[t.cat]=(sp[t.cat]||0)+Math.abs(t.amt)})
  const tB=bud.reduce((s,b)=>s+b.budg,0),tS=bud.reduce((s,b)=>s+(sp[b.cat]||0),0)
  return(
    <div style={{padding:"22px"}}>
      <h1 style={S.h1}>Budget</h1><p style={{color:t2,fontSize:"13px",margin:"4px 0 16px"}}>{MOS[cmo]} {cyr} · Click budget amount to edit</p>
      <div style={{...S.card,marginBottom:"18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}><span style={{fontWeight:"600",color:t1}}>Monthly Total</span><span style={{fontSize:"13px",color:t2}}>{fmt(tS)} of {fmt(tB)}</span></div>
        <div style={{background:"#374151",borderRadius:"99px",height:"10px",marginBottom:"14px"}}><div style={{background:tS>tB?"#ef4444":acc,borderRadius:"99px",height:"10px",width:`${Math.min(tS/tB*100,100)}%`}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
          {[{l:"Budgeted",v:fmt(tB),c:t1},{l:"Spent",v:fmt(tS),c:tS>tB?"#ef4444":t1},{l:"Remaining",v:fmt(tB-tS),c:tB-tS>=0?"#10b981":"#ef4444"}].map(s=>(
            <div key={s.l} style={{textAlign:"center",background:"#374151",borderRadius:"10px",padding:"12px"}}><div style={{fontSize:"10px",color:t2,marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div><div style={{fontSize:"18px",fontWeight:"700",color:s.c}}>{s.v}</div></div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"12px"}}>
        {bud.map(b=>{const s=sp[b.cat]||0,pct=Math.min(s/b.budg*100,100),ov=s>b.budg;return(
          <div key={b.cat} style={S.card}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
              <div style={{width:"38px",height:"38px",borderRadius:"10px",background:(CATS[b.cat]?.c||acc)+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>{CATS[b.cat]?.i||"📦"}</div>
              <div style={{flex:1}}><div style={{fontWeight:"600",fontSize:"14px",color:t1}}>{b.cat}</div><div style={{fontSize:"12px",color:ov?"#ef4444":"#10b981"}}>{ov?`$${(s-b.budg).toFixed(0)} over`:`$${(b.budg-s).toFixed(0)} left`}</div></div>
            </div>
            <div style={{background:"#374151",borderRadius:"99px",height:"7px",marginBottom:"10px"}}><div style={{background:ov?"#ef4444":CATS[b.cat]?.c||acc,borderRadius:"99px",height:"7px",width:`${pct}%`}}/></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"13px"}}>
              <span style={{color:ov?"#ef4444":t1,fontWeight:"600"}}>{fmt(s)}</span>
              {edit===b.cat
                ?<span style={{display:"flex",gap:"5px",alignItems:"center"}}><input style={{...S.inp,width:"76px",padding:"4px 8px",fontSize:"12px"}} type="number" value={val} onChange={e=>setVal(e.target.value)} autoFocus/><button onClick={async()=>{await updBudg(b.cat,parseFloat(val)||b.budg);setEdit(null)}} style={{...S.btn(),padding:"4px 9px",fontSize:"12px"}}>✓</button><button onClick={()=>setEdit(null)} style={{...S.btn("gray"),padding:"4px 7px",fontSize:"12px"}}>✕</button></span>
                :<span style={{color:t2,cursor:"pointer",fontSize:"12px"}} onClick={()=>{setEdit(b.cat);setVal(b.budg.toString())}}>Budget: {fmt(b.budg)} ✏️</span>
              }
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}

function CashFlow({txns}){
  const [sel,setSel]=useState(cmo)
  const cfData=MOS.map((m,i)=>{
    const ms=`${cyr}-${String(i+1).padStart(2,"0")}`
    const mt=txns.filter(t=>t.date?.startsWith(ms))
    return{m,income:mt.filter(t=>t.amt>0&&t.cat!=="Transfer").reduce((s,t)=>s+t.amt,0),expenses:Math.abs(mt.filter(t=>t.amt<0&&t.cat!=="Transfer").reduce((s,t)=>s+t.amt,0))}
  })
  const d=cfData[sel],net=d.income-d.expenses
  const ytdI=cfData.slice(0,cmo+1).reduce((s,d)=>s+d.income,0),ytdE=cfData.slice(0,cmo+1).reduce((s,d)=>s+d.expenses,0)
  return(
    <div style={{padding:"22px"}}>
      <h1 style={S.h1}>Cash Flow</h1><p style={{color:t2,fontSize:"13px",margin:"4px 0 16px"}}>Click a bar to see monthly detail</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px"}}>
        {[{l:`${MOS[sel]} Income`,v:fmt(d.income),c:"#10b981"},{l:`${MOS[sel]} Expenses`,v:fmt(d.expenses),c:"#ef4444"},{l:`${MOS[sel]} Net`,v:fmt(net),c:net>=0?"#10b981":"#ef4444"}].map(s=>(
          <div key={s.l} style={S.card}><div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>{s.l}</div><div style={{fontSize:"22px",fontWeight:"700",color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={S.h2}>Monthly Overview — {cyr}</div>
        <ResponsiveContainer width="100%" height={268}>
          <BarChart data={cfData} onClick={(_,i)=>typeof i==="number"&&setSel(i)} style={{cursor:"pointer"}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false}/>
            <XAxis dataKey="m" tick={{fill:t2,fontSize:12}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:t2,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"}/>
            <Tooltip formatter={v=>[fmt(v)]} contentStyle={S.tt} labelStyle={{color:t1}}/>
            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4,4,0,0]} maxBarSize={26}/>
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={26}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={S.card}>
        <div style={S.h2}>Year-to-Date</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
          {[{l:"YTD Income",v:fmt(ytdI),c:"#10b981"},{l:"YTD Expenses",v:fmt(ytdE),c:"#ef4444"},{l:"YTD Net",v:fmt(ytdI-ytdE),c:ytdI>ytdE?"#10b981":"#ef4444"}].map(s=>(
            <div key={s.l} style={{textAlign:"center",background:"#374151",borderRadius:"10px",padding:"14px"}}><div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"6px"}}>{s.l}</div><div style={{fontSize:"20px",fontWeight:"700",color:s.c}}>{s.v}</div></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NetWorthView({accts,nw,assets,liabs,txns}){
  const nwData=MOS.map((m,i)=>{
    const ms=`${cyr}-${String(i+1).padStart(2,"0")}`
    const net=txns.filter(t=>t.date?.startsWith(ms)).reduce((s,t)=>s+(t.cat!=="Transfer"?t.amt:0),0)
    return{m,net}
  })
  let running=nw
  const nwTrend=[...nwData].reverse().map((d,i)=>{const v=running;running-=d.net;return{m:d.m,nw:Math.round(v)}}).reverse()
  return(
    <div style={{padding:"22px"}}>
      <h1 style={S.h1}>Net Worth</h1><p style={{color:t2,fontSize:"13px",margin:"4px 0 16px"}}>Your complete financial picture</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px"}}>
        {[{l:"Net Worth",v:fmt(nw),c:nw>=0?"#10b981":"#ef4444"},{l:"Total Assets",v:fmt(assets),c:"#10b981"},{l:"Total Liabilities",v:fmt(liabs),c:"#ef4444"}].map(s=>(
          <div key={s.l} style={S.card}><div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>{s.l}</div><div style={{fontSize:"24px",fontWeight:"700",color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={S.h2}>Net Worth Trend — {cyr}</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={nwTrend}>
            <defs><linearGradient id="nwg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={acc} stopOpacity={0.35}/><stop offset="95%" stopColor={acc} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false}/>
            <XAxis dataKey="m" tick={{fill:t2,fontSize:12}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:t2,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"}/>
            <Tooltip formatter={v=>[fmt(v),"Net Worth"]} contentStyle={S.tt} labelStyle={{color:t1}}/>
            <Area type="monotone" dataKey="nw" stroke={acc} strokeWidth={2.5} fill="url(#nwg)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
        {[{label:"Assets",items:accts.filter(a=>a.bal>0),total:assets,c:"#10b981"},{label:"Liabilities",items:accts.filter(a=>a.bal<0),total:liabs,c:"#ef4444"}].map(g=>(
          <div key={g.label} style={S.card}>
            <div style={S.h2}>{g.label}</div>
            {g.items.length===0?<p style={{color:t2,fontSize:"13px"}}>None</p>:g.items.map((a,i)=>(
              <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:i>0?`1px solid ${bdr}33`:""}}>
                <div><div style={{fontSize:"14px",fontWeight:"500",color:t1}}>{a.name}</div><div style={{fontSize:"11px",color:t2}}>{AT[a.type]?.l}</div></div>
                <span style={{color:g.c,fontWeight:"700",fontSize:"14px"}}>{fmt(Math.abs(a.bal))}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 0",borderTop:`1px solid ${bdr}`,fontWeight:"700",fontSize:"15px"}}><span style={{color:t2}}>Total</span><span style={{color:g.c}}>{fmt(g.total)}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Goals({goals,addGoal,delGoal,updGoal}){
  const [show,setShow]=useState(false)
  const [n,setN]=useState({name:"",target:"",current:"",deadline:"",icon:"🎯",color:"#8b5cf6"})
  const add=async()=>{if(!n.name||!n.target)return;await addGoal({...n,target:+n.target,current:+n.current||0});setN({name:"",target:"",current:"",deadline:"",icon:"🎯",color:"#8b5cf6"});setShow(false)}
  return(
    <div style={{padding:"22px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px"}}>
        <div><h1 style={S.h1}>Goals</h1><p style={{color:t2,fontSize:"13px",margin:"4px 0 0"}}>{goals.length} active goals</p></div>
        <button onClick={()=>setShow(true)} style={S.btn()}>+ New Goal</button>
      </div>
      {goals.length===0&&<div style={{...S.card,textAlign:"center",padding:"40px"}}><div style={{fontSize:"32px",marginBottom:"12px"}}>🎯</div><p style={{color:t2}}>No goals yet.</p></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(285px,1fr))",gap:"14px"}}>
        {goals.map(g=>{const pct=Math.min((g.current||0)/(g.target||1)*100,100),rem=(g.target||0)-(g.current||0),done=pct>=100;return(
          <div key={g.id} style={{...S.card,border:done?`1px solid #10b98155`:`1px solid ${bdr}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
              <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                <div style={{width:"44px",height:"44px",borderRadius:"12px",background:(g.color||acc)+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"}}>{g.icon||"🎯"}</div>
                <div><div style={{fontWeight:"700",fontSize:"15px",color:t1}}>{g.name}</div><div style={{fontSize:"12px",color:t2}}>Due {g.deadline||"—"}</div></div>
              </div>
              <button onClick={()=>delGoal(g.id)} style={{background:"none",border:"none",color:t2,cursor:"pointer",fontSize:"18px",lineHeight:"1"}}>✕</button>
            </div>
            <div style={{background:"#374151",borderRadius:"99px",height:"10px",marginBottom:"10px"}}><div style={{background:done?"#10b981":g.color||acc,borderRadius:"99px",height:"10px",width:`${pct}%`}}/></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"6px"}}><span style={{color:t1,fontWeight:"700"}}>{fmt(g.current||0)} saved</span><span style={{color:acc,fontWeight:"700"}}>{pct.toFixed(0)}%</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:t2,marginBottom:"12px"}}><span>{done?"🎉 Goal reached!":fmt(rem)+" to go"}</span><span>Goal: {fmt(g.target||0)}</span></div>
            <input style={{...S.inp,fontSize:"12px",padding:"5px 8px"}} type="number" placeholder="Add $ contribution" onBlur={async e=>{if(e.target.value){await updGoal(g.id,{current:Math.min((g.current||0)+parseFloat(e.target.value),(g.target||0))});e.target.value=""}}}/>
          </div>
        )})}
      </div>
      {show&&<Modal title="New Goal" onClose={()=>setShow(false)}>
        {[{l:"Goal Name",k:"name",t:"text",ph:"e.g. Emergency Fund"},{l:"Target Amount ($)",k:"target",t:"number",ph:"25000"},{l:"Already Saved ($)",k:"current",t:"number",ph:"0"},{l:"Target Date",k:"deadline",t:"text",ph:"Dec 2025"},{l:"Icon (emoji)",k:"icon",t:"text",ph:"🎯"},{l:"Color (hex)",k:"color",t:"text",ph:"#8b5cf6"}].map(f=>(
          <div key={f.k} style={{marginBottom:"12px"}}><label style={S.lbl}>{f.l}</label><input style={S.inp} type={f.t} placeholder={f.ph} value={n[f.k]} onChange={e=>setN(p=>({...p,[f.k]:e.target.value}))}/></div>
        ))}
        <div style={{display:"flex",gap:"8px",marginTop:"4px"}}><button onClick={add} style={{...S.btn(),flex:1}}>Create Goal</button><button onClick={()=>setShow(false)} style={{...S.btn("gray"),flex:1}}>Cancel</button></div>
      </Modal>}
    </div>
  )
}

function Mileage({trips,addTrip,delTrip,toast}){
  const [tracking,setTracking]=useState(false),[purpose,setPurpose]=useState(""),[type,setType]=useState("Property"),[curMi,setCurMi]=useState(0)
  const [m,setM]=useState({date:"",purpose:"",type:"Property",miles:""})
  const watchRef=useRef(null),posRef=useRef([])
  const start=()=>{
    if(!purpose.trim()){toast("Enter trip purpose first","err");return}
    if(!navigator.geolocation){toast("GPS not available","err");return}
    posRef.current=[];setCurMi(0);setTracking(true)
    watchRef.current=navigator.geolocation.watchPosition(
      pos=>{const p={lat:pos.coords.latitude,lon:pos.coords.longitude};if(posRef.current.length>0){const l=posRef.current[posRef.current.length-1];setCurMi(m=>m+hav(l.lat,l.lon,p.lat,p.lon))};posRef.current=[...posRef.current,p]},
      err=>toast("GPS: "+err.message,"err"),{enableHighAccuracy:true,maximumAge:5000,timeout:15000}
    )
  }
  const stop=()=>{
    if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current)
    setTracking(false)
    setCurMi(m=>{if(m>0.05){const mi=Math.round(m*100)/100;addTrip({date:new Date().toISOString().split("T")[0],purpose,type,miles:mi,ded:mi*(IRS[type]||0)});toast(`✓ Trip saved: ${m.toFixed(2)} mi`)}else toast("Trip too short","err");return 0})
    setPurpose("")
  }
  const addManual=async()=>{if(!m.purpose||!m.miles)return;const mi=parseFloat(m.miles);await addTrip({date:m.date||new Date().toISOString().split("T")[0],purpose:m.purpose,type:m.type,miles:mi,ded:mi*(IRS[m.type]||0)});setM({date:"",purpose:"",type:"Property",miles:""})}
  const tMi=trips.reduce((s,t)=>s+(t.miles||0),0),tDed=trips.reduce((s,t)=>s+(t.ded||0),0)
  return(
    <div style={{padding:"22px"}}>
      <h1 style={S.h1}>Mileage Tracker</h1>
      <p style={{color:t2,fontSize:"13px",margin:"4px 0 16px"}}>2025 IRS: Business/Property 67¢/mi · Medical 21¢/mi · Charity 14¢/mi</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px"}}>
        {[{l:"Total Miles",v:tMi.toFixed(1)+" mi",c:t1},{l:"Total Deduction",v:fmt(tDed),c:"#10b981"},{l:"Trips Logged",v:trips.length,c:acc}].map(s=>(
          <div key={s.l} style={S.card}><div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>{s.l}</div><div style={{fontSize:"24px",fontWeight:"700",color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={S.h2}>🛰️ GPS Tracker</div>
        <div style={{display:"flex",gap:"10px",flexWrap:"wrap",alignItems:"center",marginBottom:"12px"}}>
          <input style={{...S.inp,flex:1,minWidth:"200px"}} placeholder="Trip purpose (e.g. Apt supply run)" value={purpose} onChange={e=>setPurpose(e.target.value)} disabled={tracking}/>
          <select style={S.sel} value={type} onChange={e=>setType(e.target.value)} disabled={tracking}>{MTYPES.map(t=><option key={t}>{t}</option>)}</select>
          {!tracking?<button style={S.btn("green")} onClick={start}>▶ Start Trip</button>:<button style={{...S.btn("red"),animation:"pulse 1s infinite"}} onClick={stop}>⏹ Stop & Save</button>}
        </div>
        {tracking&&<div style={{background:"#0f2027",border:"1px solid #22c55e",borderRadius:"10px",padding:"14px",display:"flex",alignItems:"center",gap:"14px"}}><div style={{width:"10px",height:"10px",borderRadius:"99px",background:"#22c55e",boxShadow:"0 0 0 4px #22c55e33",flexShrink:0}}/><div><div style={{color:"#86efac",fontWeight:"700",fontSize:"22px"}}>{curMi.toFixed(2)} miles</div><div style={{color:t2,fontSize:"12px"}}>GPS active · keep screen on</div></div></div>}
      </div>
      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={S.h2}>✏️ Manual Trip</div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"flex-end"}}>
          <input style={{...S.inp,width:"120px"}} type="date" value={m.date} onChange={e=>setM(p=>({...p,date:e.target.value}))}/>
          <input style={{...S.inp,flex:"1",minWidth:"140px"}} placeholder="Purpose" value={m.purpose} onChange={e=>setM(p=>({...p,purpose:e.target.value}))}/>
          <select style={S.sel} value={m.type} onChange={e=>setM(p=>({...p,type:e.target.value}))}>{MTYPES.map(t=><option key={t}>{t}</option>)}</select>
          <input style={{...S.inp,width:"85px"}} type="number" placeholder="Miles" value={m.miles} onChange={e=>setM(p=>({...p,miles:e.target.value}))}/>
          <button style={S.btn("green")} onClick={addManual}>Add</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"14px"}}><div style={S.h2}>Trip Log ({trips.length})</div><div style={{textAlign:"right"}}><div style={{color:"#10b981",fontWeight:"700"}}>{fmt(tDed)}</div><div style={{fontSize:"12px",color:t2}}>{tMi.toFixed(1)} mi</div></div></div>
        {trips.length===0?<p style={{color:t2}}>No trips yet.</p>:(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
            <thead><tr>{["Date","Purpose","Type","Miles","Rate","Deduction",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:t2,borderBottom:`1px solid ${bdr}`,fontWeight:"600",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>)}</tr></thead>
            <tbody>{trips.map(t=>(
              <tr key={t.id}>
                <td style={{padding:"10px",borderBottom:`1px solid ${bdr}22`,color:t1}}>{t.date}</td>
                <td style={{padding:"10px",borderBottom:`1px solid ${bdr}22`,color:t1}}>{t.purpose}</td>
                <td style={{padding:"10px",borderBottom:`1px solid ${bdr}22`}}><span style={{background:acc+"22",color:acc,borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:"600"}}>{t.type}</span></td>
                <td style={{padding:"10px",borderBottom:`1px solid ${bdr}22`,color:t1}}>{(t.miles||0).toFixed(2)}</td>
                <td style={{padding:"10px",borderBottom:`1px solid ${bdr}22`,color:t2}}>${IRS[t.type]||0}/mi</td>
                <td style={{padding:"10px",borderBottom:`1px solid ${bdr}22`,color:"#10b981",fontWeight:"700"}}>{fmt(t.ded||0)}</td>
                <td style={{padding:"10px",borderBottom:`1px solid ${bdr}22`}}><button onClick={()=>delTrip(t.id)} style={{...S.btn("gray"),padding:"4px 8px",fontSize:"12px"}}>✕</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </div>
  )
}

function Receipts({rcpts,addRcpt,delRcpt,updRcpt,toast,CATS,customCats,handleAddCat}){
  const [busy,setBusy]=useState(false),[show,setShow]=useState(false),[zoom,setZoom]=useState(null)
  const [n,setN]=useState({date:"",merchant:"",amount:"",cat:"Other",note:""})
  const fileRef=useRef()
  const handleFile=async e=>{
    const file=e.target.files[0];if(!file)return
    setBusy(true)
    try{
      const b64=await new Promise(res=>{const r=new FileReader();r.onload=ev=>res(ev.target.result.split(",")[1]);r.readAsDataURL(file)})
      const path=`${Date.now()}_${file.name.replace(/\s/g,"_")}`
      const {error:upErr}=await sb.storage.from("receipts").upload(path,file,{upsert:true})
      let imageUrl=""
      if(!upErr){const {data:{publicUrl}}=sb.storage.from("receipts").getPublicUrl(path);imageUrl=publicUrl}
      let info={merchant:"",date:new Date().toISOString().split("T")[0],amount:0,category:"Other"}
      try{info=await scanWithGemini(b64,file.type)}catch(e){toast("AI scan failed — fill in manually","err")}
      await addRcpt({merchant:info.merchant||"",date:info.date||new Date().toISOString().split("T")[0],amount:info.amount||0,cat:info.category||"Other",note:"",image_url:imageUrl})
      toast(`✓ Receipt saved: ${info.merchant||"Unknown"}`)
    }catch(err){toast("Upload failed: "+err.message,"err")}
    setBusy(false);e.target.value=""
  }
  const addManual=async()=>{if(!n.merchant||!n.amount)return;await addRcpt({...n,amount:parseFloat(n.amount),image_url:""});setN({date:"",merchant:"",amount:"",cat:"Other",note:""});setShow(false)}
  const total=rcpts.reduce((s,r)=>s+(r.amount||0),0)
  return(
    <div style={{padding:"22px"}}>
      {zoom&&(
        <div onClick={()=>setZoom(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,cursor:"zoom-out",padding:"20px"}}>
          <img src={zoom} alt="receipt" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:"10px",objectFit:"contain"}}/>
          <div style={{position:"absolute",top:"16px",right:"20px",color:"#fff",fontSize:"32px",cursor:"pointer",lineHeight:1,background:"rgba(0,0,0,.5)",borderRadius:"50%",width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px",flexWrap:"wrap",gap:"10px"}}>
        <div><h1 style={S.h1}>Receipt Vault</h1><p style={{color:t2,fontSize:"13px",margin:"4px 0 0"}}>{rcpts.length} receipts · {fmt(total)} total · click photo to enlarge</p></div>
        <div style={{display:"flex",gap:"8px"}}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile}/>
          <button onClick={()=>fileRef.current?.click()} style={S.btn("green")} disabled={busy}>{busy?"⏳ Scanning…":"📷 Take / Upload Photo"}</button>
          <button onClick={()=>setShow(true)} style={S.btn("gray")}>✏️ Manual Entry</button>
        </div>
      </div>
      {rcpts.length===0?<div style={{...S.card,textAlign:"center",padding:"40px"}}><div style={{fontSize:"32px",marginBottom:"12px"}}>🧾</div><p style={{color:t2}}>No receipts yet.</p></div>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(245px,1fr))",gap:"14px"}}>
          {rcpts.map(r=>(
            <div key={r.id} style={S.card}>
              {r.image_url
                ?<img src={r.image_url} alt="receipt" onClick={()=>setZoom(r.image_url)} style={{width:"100%",borderRadius:"8px",marginBottom:"10px",maxHeight:"145px",objectFit:"cover",cursor:"zoom-in",transition:"opacity .2s"}} onMouseOver={e=>e.target.style.opacity=".85"} onMouseOut={e=>e.target.style.opacity="1"}/>
                :<div style={{width:"100%",height:"75px",borderRadius:"8px",marginBottom:"10px",background:"#374151",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px"}}>🧾</div>
              }
              <input style={{...S.inp,marginBottom:"6px",padding:"6px 10px",fontSize:"13px"}} value={r.merchant||""} onChange={e=>updRcpt(r.id,{merchant:e.target.value})} placeholder="Merchant"/>
              <div style={{display:"flex",gap:"6px",marginBottom:"6px"}}>
                <input style={{...S.inp,flex:1,padding:"6px 10px",fontSize:"13px"}} type="number" value={r.amount||""} onChange={e=>updRcpt(r.id,{amount:parseFloat(e.target.value)||0})} placeholder="Amount"/>
                <input style={{...S.inp,flex:1,padding:"6px 10px",fontSize:"12px"}} type="date" value={r.date||""} onChange={e=>updRcpt(r.id,{date:e.target.value})}/>
              </div>
              <div style={{marginBottom:"6px"}}>
                <CatSelect value={r.cat||"Other"} onChange={v=>updRcpt(r.id,{cat:v})} customCats={customCats} onAddCat={handleAddCat} style={{width:"100%",fontSize:"12px",padding:"6px 10px"}}/>
              </div>
              <input style={{...S.inp,marginBottom:"8px",padding:"6px 10px",fontSize:"12px"}} value={r.note||""} onChange={e=>updRcpt(r.id,{note:e.target.value})} placeholder="Notes (e.g. Apt 2B repair)"/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#10b981",fontWeight:"700",fontSize:"16px"}}>{fmt(r.amount||0)}</span>
                <button onClick={()=>delRcpt(r.id)} style={{...S.btn("red"),padding:"5px 10px",fontSize:"12px"}}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {show&&<Modal title="Manual Receipt Entry" onClose={()=>setShow(false)}>
        {[{l:"Merchant",k:"merchant",t:"text",ph:"e.g. Home Depot"},{l:"Amount ($)",k:"amount",t:"number",ph:"0.00"},{l:"Date",k:"date",t:"date",ph:""},{l:"Notes",k:"note",t:"text",ph:"e.g. Apt 2B repair"}].map(f=>(
          <div key={f.k} style={{marginBottom:"12px"}}><label style={S.lbl}>{f.l}</label><input style={S.inp} type={f.t} placeholder={f.ph} value={n[f.k]} onChange={e=>setN(p=>({...p,[f.k]:e.target.value}))}/></div>
        ))}
        <div style={{marginBottom:"16px"}}><label style={S.lbl}>Category</label><CatSelect value={n.cat} onChange={v=>setN(p=>({...p,cat:v}))} customCats={customCats} onAddCat={handleAddCat} style={{width:"100%"}}/></div>
        <div style={{display:"flex",gap:"8px"}}><button onClick={addManual} style={{...S.btn(),flex:1}}>Save Receipt</button><button onClick={()=>setShow(false)} style={{...S.btn("gray"),flex:1}}>Cancel</button></div>
      </Modal>}
    </div>
  )
}

function TaxPrep({txns,trips,rcpts,ckd,toggleCk,CATS}){
  const DCAT=["Healthcare","Property","Housing","Utilities"]
  const TMAP={Healthcare:"Medical & Dental",Property:"Property Repairs & Maint.",Housing:"Mortgage Interest",Utilities:"Property Utilities"}
  const dTxns=txns.filter(t=>t.amt<0&&DCAT.includes(t.cat))
  const byCat=DCAT.map(cat=>({cat,label:TMAP[cat],total:dTxns.filter(t=>t.cat===cat).reduce((s,t)=>s+Math.abs(t.amt),0)})).filter(c=>c.total>0)
  const txnDed=byCat.reduce((s,c)=>s+c.total,0)
  const mileDed=trips.reduce((s,t)=>s+(t.ded||0),0)
  const rcptDed=rcpts.filter(r=>["Property","Healthcare","Housing"].includes(r.cat)).reduce((s,r)=>s+(r.amount||0),0)
  const total=txnDed+mileDed+rcptDed
  const exportCSV=()=>{
    const rows=[["=== DEDUCTIBLE TRANSACTIONS ==="],["Category","TurboTax Section","Amount"],...byCat.map(c=>[c.cat,c.label,c.total.toFixed(2)]),[""],["=== MILEAGE ==="],["Date","Purpose","Type","Miles","IRS Rate","Deduction"],...trips.map(t=>[t.date,`"${t.purpose}"`,t.type,t.miles,IRS[t.type]||0,(t.ded||0).toFixed(2)]),[""],["=== RECEIPTS ==="],["Date","Merchant","Amount","Category","Notes"],...rcpts.map(r=>[r.date,`"${r.merchant}"`,r.amount,r.cat,`"${r.note}"`]),[""],["=== SUMMARY ==="],["Transaction Deductions",txnDed.toFixed(2)],["Mileage Deductions",mileDed.toFixed(2)],["Receipt Deductions",rcptDed.toFixed(2)],["TOTAL DEDUCTIONS",total.toFixed(2)],["Est. Tax Savings @ 22%",(total*0.22).toFixed(2)]]
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.join(",")).join("\n"));a.download=`tax_prep_${cyr}.csv`;a.click()
  }
  const totalCk=Object.values(ckd).filter(Boolean).length,totalItems=CL_ITEMS.reduce((s,g)=>s+g.items.length,0)
  return(
    <div style={{padding:"22px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}}>
        <div><h1 style={S.h1}>Tax Prep</h1><p style={{color:t2,fontSize:"13px",margin:"4px 0 0"}}>Tax year {cyr}</p></div>
        <button onClick={exportCSV} style={S.btn("green")}>⬇️ Export CSV for TurboTax</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px"}}>
        {[{l:"Transaction Deductions",v:fmt(txnDed),c:"#10b981"},{l:"Mileage Deductions",v:fmt(mileDed),c:"#3b82f6"},{l:"Receipt Deductions",v:fmt(rcptDed),c:acc},{l:"Total Est. Deductions",v:fmt(total),c:"#f59e0b"}].map(s=>(
          <div key={s.l} style={S.card}><div style={{fontSize:"10px",color:t2,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"8px"}}>{s.l}</div><div style={{fontSize:"20px",fontWeight:"700",color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={S.card}>
          <div style={S.h2}>Deductible Transactions</div>
          {byCat.length===0?<p style={{color:t2,fontSize:"13px"}}>No deductible transactions found.</p>:(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
              <thead><tr>{["Category","TurboTax Section","Amount"].map(h=><th key={h} style={{padding:"8px 6px",textAlign:"left",color:t2,borderBottom:`1px solid ${bdr}`,fontWeight:"600",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>)}</tr></thead>
              <tbody>{byCat.map(c=>(
                <tr key={c.cat}><td style={{padding:"10px 6px",borderBottom:`1px solid ${bdr}22`}}><span style={{background:(CATS[c.cat]?.c||"#555")+"22",color:CATS[c.cat]?.c||t2,borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:"600"}}>{CATS[c.cat]?.i||"📦"} {c.cat}</span></td><td style={{padding:"10px 6px",color:t2,borderBottom:`1px solid ${bdr}22`,fontSize:"12px"}}>{c.label}</td><td style={{padding:"10px 6px",color:"#10b981",fontWeight:"700",borderBottom:`1px solid ${bdr}22`}}>{fmt(c.total)}</td></tr>
              ))}</tbody>
            </table>
          )}
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 6px 0",borderTop:`1px solid ${bdr}`,fontWeight:"700",fontSize:"14px",marginTop:"6px"}}><span style={{color:t2}}>Total</span><span style={{color:"#10b981"}}>{fmt(txnDed)}</span></div>
        </div>
        <div style={S.card}>
          <div style={S.h2}>Mileage Summary</div>
          {["Property","Medical","Business","Charity"].map(ty=>{const ts=trips.filter(t=>t.type===ty),mi=ts.reduce((s,t)=>s+(t.miles||0),0),ded=mi*(IRS[ty]||0);if(!mi)return null;return(
            <div key={ty} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${bdr}22`,fontSize:"13px"}}>
              <span style={{color:t2}}>{ty} ({mi.toFixed(1)} mi × ${IRS[ty]}/mi)</span>
              <span style={{color:"#3b82f6",fontWeight:"700"}}>{fmt(ded)}</span>
            </div>
          )})}
          {trips.length===0&&<p style={{color:t2,fontSize:"13px"}}>No trips logged yet.</p>}
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 0",borderTop:`1px solid ${bdr}`,fontWeight:"700",fontSize:"14px",marginTop:"4px"}}><span style={{color:t2}}>Total</span><span style={{color:"#3b82f6"}}>{fmt(mileDed)}</span></div>
        </div>
      </div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={S.h2}>Document Checklist</div>
          <span style={{fontSize:"13px",color:totalCk===totalItems?"#10b981":t2,fontWeight:"600"}}>{totalCk}/{totalItems} gathered</span>
        </div>
        <div style={{background:"#374151",borderRadius:"99px",height:"6px",marginBottom:"16px"}}><div style={{background:totalCk===totalItems?"#10b981":acc,borderRadius:"99px",height:"6px",width:`${totalItems>0?Math.round(totalCk/totalItems*100):0}%`}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:"14px"}}>
          {CL_ITEMS.map(g=>(
            <div key={g.s}>
              <div style={{fontSize:"11px",color:t2,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px",fontWeight:"600"}}>{g.s}</div>
              {g.items.map(item=>{const k=g.s+"|"+item,done=!!ckd[k];return(
                <label key={item} style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",padding:"6px 8px",background:done?"#0f2027":"transparent",borderRadius:"8px",marginBottom:"4px"}}>
                  <input type="checkbox" checked={done} onChange={()=>toggleCk(k)} style={{display:"none"}}/>
                  <div style={{width:"16px",height:"16px",borderRadius:"4px",border:`2px solid ${done?"#22c55e":"#4b5563"}`,background:done?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:"#fff",flexShrink:0}}>{done?"✓":""}</div>
                  <span style={{fontSize:"12px",color:done?"#86efac":t2,textDecoration:done?"line-through":"none"}}>{item}</span>
                </label>
              )})}
            </div>
          ))}
        </div>
      </div>
      <p style={{color:"#4b5563",fontSize:"12px",textAlign:"center",marginTop:"14px"}}>⚠️ Estimates only · consult a tax professional · est. savings @ 22%: <strong style={{color:"#f59e0b"}}>{fmt(total*0.22)}</strong></p>
    </div>
  )
}

function Modal({title,children,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"20px"}} onClick={onClose}>
      <div style={{...S.card,width:"100%",maxWidth:"400px",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{...S.h2,marginBottom:"18px"}}>{title}</h3>
        {children}
      </div>
    </div>
  )
}