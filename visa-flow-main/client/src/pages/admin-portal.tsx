import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2, Eye, EyeOff, Copy, UserPlus, RefreshCw, Download } from "lucide-react";

const COUNTRIES = ["USA","China","UK","Canada","Australia","India","Japan","Germany","France","Brazil","Russia","UAE","Singapore","South Korea","Mexico"];

function Avatar({ name, size=32 }: { name:string; size?:number }) {
  const colors=["#6c5dd3","#3dd598","#ff9f43","#4d9de0","#ff6b6b","#ffd166","#9b59b6","#e67e22"];
  const color=colors[name.charCodeAt(0)%colors.length];
  const initials=name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,6);
  return <div style={{width:size,height:size,borderRadius:"50%",background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:700,flexShrink:0}}>{initials}</div>;
}

function StatusBadge({status}:{status:string}) {
  const m:Record<string,{bg:string,color:string,label:string}>={
    granted:{bg:"#e0faf2",color:"#00a86b",label:"Granted"},
    pending:{bg:"#fff9e0",color:"#d4a000",label:"Pending"},
    denied:{bg:"#ffe8e8",color:"#e53535",label:"Denied"},
    document_review:{bg:"#ede9ff",color:"#6c5dd3",label:"In Review"},
    security_check:{bg:"#ede9ff",color:"#6c5dd3",label:"In Review"},
    risk_assessment:{bg:"#fff3e0",color:"#ff9f43",label:"Risk Check"},
    blockchain_entry:{bg:"#e0f0ff",color:"#4d9de0",label:"Blockchain"},
  };
  const cfg=m[status]||{bg:"#f0f4ff",color:"#718096",label:status};
  return <span style={{background:cfg.bg,color:cfg.color,padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{cfg.label}</span>;
}

const ADMIN_TABS = [
  {id:"overview",icon:"📊",label:"Overview"},
  {id:"applications",icon:"📋",label:"Applications"},
  {id:"officers",icon:"🛡️",label:"Officers"},
  {id:"applicants",icon:"👥",label:"Applicants"},
  {id:"feedback",icon:"💬",label:"Feedback"},
  {id:"blockchain",icon:"⛓️",label:"Blockchain"},
  {id:"system",icon:"⚙️",label:"System"},
];

export default function AdminPortal() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [createOfficerOpen, setCreateOfficerOpen] = useState(false);
  const [visibleCreds, setVisibleCreds] = useState<Set<number>>(new Set());
  const [newOfficer, setNewOfficer] = useState({fullName:"",email:"",password:"",country:""});
  const [deleteConfirm, setDeleteConfirm] = useState<{type:string,id:number,name:string}|null>(null);

  const { data: apps=[], isLoading: appsLoading } = useQuery<any[]>({
    queryKey:["/api/applications/all"],
    queryFn:async()=>{const token=localStorage.getItem("token");const res=await fetch("/api/applications/all",{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)return[];return res.json();},
    refetchInterval:30000,
  });
  const { data: users=[], isLoading:usersLoading } = useQuery<any[]>({
    queryKey:["/api/admin/users"],
    queryFn:async()=>{const token=localStorage.getItem("token");const res=await fetch("/api/admin/users",{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)return[];return res.json();},
  });
  const { data: stats } = useQuery<any>({
    queryKey:["/api/stats/overview"],
    queryFn:async()=>{const token=localStorage.getItem("token");const res=await fetch("/api/stats/overview",{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)return{};return res.json();},
    refetchInterval:30000,
  });
  const { data: feedback=[] } = useQuery<any[]>({
    queryKey:["/api/feedback"],
    queryFn:async()=>{const token=localStorage.getItem("token");const res=await fetch("/api/feedback",{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)return[];return res.json();},
  });
  const { data: blockchain=[] } = useQuery<any[]>({
    queryKey:["/api/blockchain/ledger"],
    queryFn:async()=>{const token=localStorage.getItem("token");const res=await fetch("/api/blockchain/ledger",{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)return[];return res.json();},
  });

  const officers = users.filter(u=>u.role==="officer");
  const applicants = users.filter(u=>u.role==="applicant");

  const createOfficerMutation = useMutation({
    mutationFn:async()=>{
      if(!newOfficer.fullName||!newOfficer.email||!newOfficer.password||!newOfficer.country)throw new Error("All fields required");
      if(newOfficer.password.length<6)throw new Error("Password must be at least 6 characters");
      const token=localStorage.getItem("token");
      const res=await fetch("/api/admin/officers",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(newOfficer)});
      if(!res.ok){const e=await res.json();throw new Error(e.message||"Failed");}
      return res.json();
    },
    onSuccess:()=>{
      toast({title:"✅ Officer Created",description:`${newOfficer.fullName} added successfully`});
      qc.invalidateQueries({queryKey:["/api/admin/users"]});
      setCreateOfficerOpen(false);
      setNewOfficer({fullName:"",email:"",password:"",country:""});
    },
    onError:(e:Error)=>toast({title:"Error",description:e.message,variant:"destructive"}),
  });

  const deleteOfficerMutation = useMutation({
    mutationFn:async(id:number)=>{const token=localStorage.getItem("token");const res=await fetch(`/api/admin/officers/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error("Failed");},
    onSuccess:()=>{toast({title:"Officer Deleted"});qc.invalidateQueries({queryKey:["/api/admin/users"]});setDeleteConfirm(null);},
    onError:(e:Error)=>toast({title:"Error",description:e.message,variant:"destructive"}),
  });

  const deleteAppMutation = useMutation({
    mutationFn:async(id:number)=>{const token=localStorage.getItem("token");const res=await fetch(`/api/admin/applications/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error("Failed");},
    onSuccess:()=>{toast({title:"Application Deleted"});qc.invalidateQueries({queryKey:["/api/applications/all"]});qc.invalidateQueries({queryKey:["/api/stats/overview"]});setDeleteConfirm(null);},
    onError:(e:Error)=>toast({title:"Error",description:e.message,variant:"destructive"}),
  });

  const assignCountryMutation = useMutation({
    mutationFn:async({id,country}:{id:number,country:string})=>{const token=localStorage.getItem("token");const res=await fetch(`/api/admin/users/${id}/assign-country`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({country})});if(!res.ok)throw new Error("Failed");return res.json();},
    onSuccess:()=>{toast({title:"Country Assigned"});qc.invalidateQueries({queryKey:["/api/admin/users"]});},
    onError:()=>toast({title:"Error",variant:"destructive"}),
  });

  const grantMutation = useMutation({
    mutationFn:async(id:number)=>{const token=localStorage.getItem("token");const res=await fetch(`/api/officer/applications/${id}/grant`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({notes:"Approved by admin"})});if(!res.ok)throw new Error("Failed");return res.json();},
    onSuccess:()=>{toast({title:"✅ Visa Granted"});qc.invalidateQueries({queryKey:["/api/applications/all"]});qc.invalidateQueries({queryKey:["/api/stats/overview"]});},
    onError:()=>toast({title:"Error",variant:"destructive"}),
  });

  const denyMutation = useMutation({
    mutationFn:async(id:number)=>{const token=localStorage.getItem("token");const res=await fetch(`/api/officer/applications/${id}/deny`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({notes:"Denied by admin",reason:"Does not meet requirements"})});if(!res.ok)throw new Error("Failed");return res.json();},
    onSuccess:()=>{toast({title:"❌ Application Denied"});qc.invalidateQueries({queryKey:["/api/applications/all"]});qc.invalidateQueries({queryKey:["/api/stats/overview"]});},
    onError:()=>toast({title:"Error",variant:"destructive"}),
  });

  const toggleCreds=(id:number)=>setVisibleCreds(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const copyText=(t:string,label:string)=>{navigator.clipboard.writeText(t);toast({title:`${label} copied`});};

  const filteredApps = apps.filter(a=>{
    const q=search.toLowerCase();
    const ms=!q||String(a.id).includes(q)||a.visaType?.includes(q)||a.destinationCountry?.toLowerCase().includes(q)||(a.applicantName||"").toLowerCase().includes(q);
    const mst=filterStatus==="all"||a.status===filterStatus;
    const mc=filterCountry==="all"||a.destinationCountry===filterCountry;
    return ms&&mst&&mc;
  });

  const visaBreakdown = ["tourist","student","work","business","transit"].map(t=>({type:t,count:apps.filter(a=>a.visaType===t).length})).filter(v=>v.count>0);
  const countryBreakdown = COUNTRIES.map(c=>({country:c,count:apps.filter(a=>a.destinationCountry===c).length})).filter(v=>v.count>0).sort((a,b)=>b.count-a.count).slice(0,9);

  const overviewStats = [
    {icon:"📋",label:"Total Applications",value:stats?.total??apps.length,color:"#6c5dd3",bg:"#ede9ff"},
    {icon:"✅",label:"Visa Granted",value:stats?.granted??0,color:"#3dd598",bg:"#e0faf2"},
    {icon:"⏳",label:"Under Review",value:stats?.inReview??0,color:"#ff9f43",bg:"#fff3e0"},
    {icon:"🚫",label:"Denied",value:stats?.denied??0,color:"#ff6b6b",bg:"#ffe8e8"},
    {icon:"🛡️",label:"Active Officers",value:officers.length,color:"#4d9de0",bg:"#e0f0ff"},
    {icon:"👥",label:"Registered Applicants",value:applicants.length,color:"#9b59b6",bg:"#f3e8ff"},
    {icon:"⛓️",label:"Blockchain Records",value:blockchain.length,color:"#e67e22",bg:"#fef3e0"},
    {icon:"🔴",label:"High Risk",value:stats?.highRisk??apps.filter(a=>a.riskLevel==="high").length,color:"#ff6b6b",bg:"#ffe8e8"},
  ];

  return (
    <div style={{background:"#f0f4ff",minHeight:"100vh"}}>
      {/* Header */}
      <div className="vf-header">
        <h1 style={{fontSize:18,fontWeight:700,color:"#1a2035"}}>Admin <span style={{color:"#6c5dd3"}}>Control Panel</span></h1>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>qc.invalidateQueries()}
            style={{height:36,padding:"0 14px",border:"1px solid #e8edf8",borderRadius:10,background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:6,color:"#718096"}}>
            <RefreshCw style={{width:14,height:14}}/>Refresh
          </button>
          <button onClick={()=>setCreateOfficerOpen(true)}
            style={{height:36,padding:"0 16px",background:"#6c5dd3",color:"#fff",borderRadius:10,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <UserPlus style={{width:14,height:14}}/>Add Officer
          </button>
        </div>
      </div>

      <div style={{padding:"20px 24px"}}>
        {/* Tabs */}
        <div style={{display:"flex",gap:2,background:"#fff",border:"1px solid #e8edf8",borderRadius:12,padding:4,marginBottom:20,overflowX:"auto"}}>
          {ADMIN_TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{height:34,padding:"0 16px",borderRadius:9,fontSize:13,fontWeight:500,cursor:"pointer",border:"none",whiteSpace:"nowrap",
                background:tab===t.id?"#6c5dd3":"transparent",color:tab===t.id?"#fff":"#718096"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab==="overview"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
              {overviewStats.map(s=>(
                <div key={s.label} className="vf-card" style={{padding:"18px 20px"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:10}}>{s.icon}</div>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0",marginBottom:4}}>{s.label.toUpperCase()}</div>
                  <div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {/* Visa type breakdown */}
              <div className="vf-card" style={{padding:"20px 24px"}}>
                <div style={{fontWeight:700,fontSize:15,color:"#1a2035",marginBottom:16}}>📊 Visa Type Distribution</div>
                {visaBreakdown.length===0?<div style={{color:"#a0aec0",textAlign:"center",padding:"20px 0"}}>No data</div>:
                  visaBreakdown.map(v=>{
                    const colors:Record<string,string>={tourist:"#6c5dd3",student:"#3dd598",work:"#ff9f43",business:"#4d9de0",transit:"#ff6b6b"};
                    const total=apps.length||1;
                    return(
                      <div key={v.type} style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:13,color:"#718096",textTransform:"capitalize"}}>{v.type} Visa</span>
                          <span style={{fontSize:13,fontWeight:700,color:"#1a2035"}}>{v.count} ({Math.round(v.count/total*100)}%)</span>
                        </div>
                        <div style={{height:6,background:"#e8edf8",borderRadius:99,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${v.count/total*100}%`,background:colors[v.type]||"#6c5dd3",borderRadius:99}}/>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
              {/* Country breakdown */}
              <div className="vf-card" style={{padding:"20px 24px"}}>
                <div style={{fontWeight:700,fontSize:15,color:"#1a2035",marginBottom:16}}>🌍 Top Destination Countries</div>
                {countryBreakdown.length===0?<div style={{color:"#a0aec0",textAlign:"center",padding:"20px 0"}}>No data</div>:
                  countryBreakdown.map((c,i)=>(
                    <div key={c.country} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={{fontSize:12,color:"#a0aec0",width:20,textAlign:"right"}}>#{i+1}</span>
                      <span style={{flex:1,fontSize:13,color:"#1a2035",fontWeight:500}}>{c.country}</span>
                      <div style={{width:80,height:5,background:"#e8edf8",borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${c.count/(countryBreakdown[0]?.count||1)*100}%`,background:"#6c5dd3",borderRadius:99}}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:"#6c5dd3",width:24,textAlign:"right"}}>{c.count}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* APPLICATIONS */}
        {tab==="applications"&&(
          <div>
            {/* Filters */}
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{position:"relative",flex:1,minWidth:200}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#a0aec0"}}>🔍</span>
                <input placeholder="Search by ID, name, visa type, country..." value={search} onChange={e=>setSearch(e.target.value)}
                  style={{width:"100%",height:38,paddingLeft:32,paddingRight:12,border:"1px solid #e8edf8",borderRadius:10,fontSize:13,outline:"none",background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                style={{height:38,padding:"0 12px",border:"1px solid #e8edf8",borderRadius:10,fontSize:13,background:"#fff",cursor:"pointer",color:"#1a2035"}}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="document_review">Under Review</option>
                <option value="granted">Granted</option>
                <option value="denied">Denied</option>
              </select>
              <select value={filterCountry} onChange={e=>setFilterCountry(e.target.value)}
                style={{height:38,padding:"0 12px",border:"1px solid #e8edf8",borderRadius:10,fontSize:13,background:"#fff",cursor:"pointer",color:"#1a2035"}}>
                <option value="all">All Countries</option>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{fontSize:13,color:"#a0aec0"}}>{filteredApps.length} results</span>
            </div>

            <div className="vf-card" style={{overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #e8edf8"}}>
                    {["APP ID","APPLICANT","VISA TYPE","COUNTRY","RISK","STATUS","CREATED","ACTIONS"].map(h=>(
                      <th key={h} style={{padding:"10px 14px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0",textAlign:"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appsLoading?<tr><td colSpan={8} style={{padding:40,textAlign:"center",color:"#a0aec0"}}>Loading...</td></tr>:
                  filteredApps.length===0?<tr><td colSpan={8} style={{padding:48,textAlign:"center",color:"#a0aec0"}}>No applications found</td></tr>:
                  filteredApps.map(app=>{
                    const canDecide=!["granted","denied"].includes(app.status);
                    const riskColor=app.riskLevel==="high"?"#ff6b6b":app.riskLevel==="medium"?"#ff9f43":"#3dd598";
                    return(
                      <tr key={app.id} style={{borderBottom:"1px solid #f0f4ff"}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8f9ff"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                        <td style={{padding:"12px 14px"}}><span style={{color:"#6c5dd3",fontWeight:700,fontSize:13}}>#{String(app.id).padStart(4,"0")}</span></td>
                        <td style={{padding:"12px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <Avatar name={app.applicantName||`User${app.userId}`} size={28}/>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>{app.applicantName||`User #${app.userId}`}</div>
                              <div style={{fontSize:11,color:"#a0aec0"}}>{app.applicantEmail||""}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"12px 14px",fontSize:13,textTransform:"capitalize"}}>{app.visaType} Visa</td>
                        <td style={{padding:"12px 14px",fontSize:13,color:"#718096"}}>{app.destinationCountry}</td>
                        <td style={{padding:"12px 14px"}}>
                          {app.riskScore!=null?(
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{width:50,height:4,background:"#e8edf8",borderRadius:99,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${app.riskScore}%`,background:riskColor,borderRadius:99}}/>
                              </div>
                              <span style={{fontSize:12,fontWeight:700,color:riskColor}}>{app.riskScore?.toFixed(0)}%</span>
                            </div>
                          ):<span style={{color:"#a0aec0",fontSize:12}}>—</span>}
                        </td>
                        <td style={{padding:"12px 14px"}}><StatusBadge status={app.status}/></td>
                        <td style={{padding:"12px 14px",fontSize:12,color:"#a0aec0"}}>{new Date(app.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</td>
                        <td style={{padding:"12px 14px"}}>
                          <div style={{display:"flex",gap:5}}>
                            {canDecide&&<>
                              <button onClick={()=>grantMutation.mutate(app.id)} disabled={grantMutation.isPending}
                                style={{width:26,height:26,borderRadius:7,background:"#e0faf2",color:"#3dd598",border:"none",cursor:"pointer",fontWeight:700,fontSize:13}}>✓</button>
                              <button onClick={()=>denyMutation.mutate(app.id)} disabled={denyMutation.isPending}
                                style={{width:26,height:26,borderRadius:7,background:"#ffe8e8",color:"#ff6b6b",border:"none",cursor:"pointer",fontWeight:700,fontSize:13}}>✕</button>
                            </>}
                            <button onClick={()=>setDeleteConfirm({type:"application",id:app.id,name:`App #${app.id}`})}
                              style={{width:26,height:26,borderRadius:7,background:"#ffe8e8",color:"#ff6b6b",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <Trash2 style={{width:11,height:11}}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OFFICERS */}
        {tab==="officers"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:14,color:"#718096"}}>{officers.length} officers registered</div>
              <button onClick={()=>setCreateOfficerOpen(true)}
                style={{height:36,padding:"0 16px",background:"#6c5dd3",color:"#fff",borderRadius:10,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                <UserPlus style={{width:13,height:13}}/>Add Officer
              </button>
            </div>
            <div className="vf-card" style={{overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #e8edf8"}}>
                    {["OFFICER","EMAIL","ASSIGNED COUNTRY","CREDENTIALS","ACTIONS"].map(h=>(
                      <th key={h} style={{padding:"10px 16px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0",textAlign:"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersLoading?<tr><td colSpan={5} style={{padding:40,textAlign:"center",color:"#a0aec0"}}>Loading...</td></tr>:
                  officers.length===0?<tr><td colSpan={5} style={{padding:40,textAlign:"center",color:"#a0aec0"}}>No officers yet. Add one!</td></tr>:
                  officers.map(o=>{
                    const credsVisible=visibleCreds.has(o.id);
                    return(
                      <tr key={o.id} style={{borderBottom:"1px solid #f0f4ff"}}>
                        <td style={{padding:"14px 16px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <Avatar name={o.fullName} size={32}/>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>{o.fullName}</div>
                              <div style={{fontSize:11,color:"#a0aec0"}}>{o.assignedCountry||"Unassigned"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"14px 16px",fontSize:12,color:"#718096",fontFamily:"monospace"}}>{o.email}</td>
                        <td style={{padding:"14px 16px"}}>
                          <select value={o.assignedCountry||""} onChange={e=>assignCountryMutation.mutate({id:o.id,country:e.target.value})}
                            style={{height:30,padding:"0 10px",border:"1px solid #e8edf8",borderRadius:8,fontSize:12,background:"#fff",cursor:"pointer",color:"#1a2035"}}>
                            <option value="">Select Country</option>
                            {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{padding:"14px 16px"}}>
                          <button onClick={()=>toggleCreds(o.id)}
                            style={{height:28,padding:"0 12px",borderRadius:8,border:"1px solid #e8edf8",background:"#f8f9ff",color:"#718096",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                            {credsVisible?<EyeOff style={{width:12,height:12}}/>:<Eye style={{width:12,height:12}}/>}
                            {credsVisible?"Hide":"View"} Creds
                          </button>
                          {credsVisible&&(
                            <div style={{marginTop:8,background:"#f8f9ff",border:"1px solid #e8edf8",borderRadius:8,padding:"10px 12px",fontSize:12}}>
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                                <span style={{color:"#a0aec0",width:50}}>Email:</span>
                                <span style={{fontFamily:"monospace",color:"#1a2035",flex:1}}>{o.email}</span>
                                <button onClick={()=>copyText(o.email,"Email")} style={{background:"none",border:"none",cursor:"pointer",color:"#6c5dd3"}}><Copy style={{width:11,height:11}}/></button>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <span style={{color:"#a0aec0",width:50}}>Pass:</span>
                                <span style={{fontFamily:"monospace",color:"#1a2035",flex:1}}>{o.plainPassword||"(not stored)"}</span>
                                {o.plainPassword&&<button onClick={()=>copyText(o.plainPassword,"Password")} style={{background:"none",border:"none",cursor:"pointer",color:"#6c5dd3"}}><Copy style={{width:11,height:11}}/></button>}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{padding:"14px 16px"}}>
                          <button onClick={()=>setDeleteConfirm({type:"officer",id:o.id,name:o.fullName})}
                            style={{width:28,height:28,borderRadius:8,background:"#ffe8e8",color:"#ff6b6b",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Trash2 style={{width:12,height:12}}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* APPLICANTS */}
        {tab==="applicants"&&(
          <div className="vf-card" style={{overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid #f0f4ff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1a2035"}}>👥 Registered Applicants</div>
              <span style={{background:"#ede9ff",color:"#6c5dd3",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{applicants.length} total</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{borderBottom:"1px solid #e8edf8"}}>
                  {["#","NAME","EMAIL","NATIONALITY","PASSPORT","JOINED","APPLICATIONS"].map(h=>(
                    <th key={h} style={{padding:"10px 16px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0",textAlign:"left"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applicants.length===0?<tr><td colSpan={7} style={{padding:40,textAlign:"center",color:"#a0aec0"}}>No applicants yet</td></tr>:
                applicants.map((u,i)=>{
                  const userApps=apps.filter(a=>a.userId===u.id);
                  return(
                    <tr key={u.id} style={{borderBottom:"1px solid #f0f4ff"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8f9ff"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#a0aec0"}}>{i+1}</td>
                      <td style={{padding:"12px 16px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <Avatar name={u.fullName} size={28}/>
                          <span style={{fontWeight:600,fontSize:13}}>{u.fullName}</span>
                        </div>
                      </td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#718096",fontFamily:"monospace"}}>{u.email}</td>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#718096"}}>{u.nationality||"—"}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#718096",fontFamily:"monospace"}}>{u.passportNumber||"—"}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#a0aec0"}}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{padding:"12px 16px"}}>
                        <span style={{background:"#ede9ff",color:"#6c5dd3",padding:"2px 8px",borderRadius:20,fontSize:12,fontWeight:600}}>{userApps.length} apps</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* FEEDBACK */}
        {tab==="feedback"&&(
          <div className="vf-card" style={{overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid #f0f4ff",fontWeight:700,fontSize:15,color:"#1a2035"}}>💬 User Feedback ({feedback.length})</div>
            {feedback.length===0?<div style={{padding:48,textAlign:"center",color:"#a0aec0"}}>No feedback submitted yet</div>:(
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #e8edf8"}}>
                    {["#","USER","EMAIL","FEEDBACK","DATE"].map(h=>(
                      <th key={h} style={{padding:"10px 16px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0",textAlign:"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((f,i)=>(
                    <tr key={f.id} style={{borderBottom:"1px solid #f0f4ff"}}>
                      <td style={{padding:"12px 16px",color:"#a0aec0",fontSize:12}}>{i+1}</td>
                      <td style={{padding:"12px 16px",fontWeight:600,fontSize:13}}>{f.userName}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#718096",fontFamily:"monospace"}}>{f.userEmail}</td>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#1a2035",maxWidth:400}}>
                        <p style={{margin:0,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"as any}}>{f.message}</p>
                      </td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#a0aec0",whiteSpace:"nowrap"}}>{new Date(f.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* BLOCKCHAIN */}
        {tab==="blockchain"&&(
          <div className="vf-card" style={{overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid #f0f4ff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1a2035"}}>⛓️ Blockchain Visa Ledger</div>
              <span style={{background:"#e0f0ff",color:"#4d9de0",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{blockchain.length} records</span>
            </div>
            {blockchain.length===0?<div style={{padding:48,textAlign:"center",color:"#a0aec0"}}>No blockchain records yet</div>:(
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #e8edf8"}}>
                    {["BLOCK #","VISA NUMBER","HOLDER","VISA TYPE","ISSUED","EXPIRES","TX ID"].map(h=>(
                      <th key={h} style={{padding:"10px 16px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0",textAlign:"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blockchain.map(b=>(
                    <tr key={b.id} style={{borderBottom:"1px solid #f0f4ff"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8f9ff"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                      <td style={{padding:"12px 16px"}}><span style={{background:"#e0f0ff",color:"#4d9de0",padding:"2px 8px",borderRadius:8,fontSize:12,fontWeight:700}}>#{b.blockIndex}</span></td>
                      <td style={{padding:"12px 16px",fontFamily:"monospace",fontSize:12,color:"#6c5dd3",fontWeight:600}}>{b.visaNumber}</td>
                      <td style={{padding:"12px 16px",fontWeight:600,fontSize:13}}>{b.holderName}</td>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#718096",textTransform:"capitalize"}}>{b.visaType}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#718096"}}>{new Date(b.issuedAt).toLocaleDateString()}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#718096"}}>{b.expiresAt}</td>
                      <td style={{padding:"12px 16px",fontSize:11,color:"#a0aec0",fontFamily:"monospace",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{b.txId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SYSTEM */}
        {tab==="system"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div className="vf-card" style={{padding:"20px 24px"}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1a2035",marginBottom:16}}>⚙️ System Health</div>
              {[
                {label:"Database",status:"Healthy",color:"#3dd598",dot:"#3dd598"},
                {label:"API Server",status:"Online",color:"#3dd598",dot:"#3dd598"},
                {label:"Blockchain Node",status:blockchain.length>0?"Active":"Idle",color:blockchain.length>0?"#3dd598":"#ff9f43",dot:blockchain.length>0?"#3dd598":"#ff9f43"},
                {label:"AI Services (Gemini)",status:"Connected",color:"#3dd598",dot:"#3dd598"},
                {label:"File Storage (Supabase)",status:"Active",color:"#3dd598",dot:"#3dd598"},
              ].map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f0f4ff"}}>
                  <span style={{fontSize:13,color:"#718096"}}>{s.label}</span>
                  <span style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:s.color}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:s.dot,display:"inline-block"}}/>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="vf-card" style={{padding:"20px 24px"}}>
              <div style={{fontWeight:700,fontSize:15,color:"#1a2035",marginBottom:16}}>📊 Database Statistics</div>
              {[
                {label:"Total Applications",value:apps.length},
                {label:"Registered Officers",value:officers.length},
                {label:"Registered Applicants",value:applicants.length},
                {label:"Blockchain Records",value:blockchain.length},
                {label:"Feedback Entries",value:feedback.length},
                {label:"Granted Visas",value:apps.filter(a=>a.status==="granted").length},
              ].map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:8,background:"#f8f9ff",marginBottom:8}}>
                  <span style={{fontSize:13,color:"#718096"}}>{s.label}</span>
                  <span style={{fontSize:15,fontWeight:800,color:"#1a2035"}}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Officer Dialog */}
      <Dialog open={createOfficerOpen} onOpenChange={setCreateOfficerOpen}>
        <DialogContent style={{maxWidth:460}}>
          <DialogHeader><DialogTitle>🛡️ Create Immigration Officer</DialogTitle></DialogHeader>
          <div style={{display:"flex",flexDirection:"column",gap:14,paddingTop:4}}>
            {[
              {key:"fullName",label:"FULL NAME",placeholder:"e.g. John Smith",type:"text"},
              {key:"email",label:"EMAIL ADDRESS",placeholder:"e.g. john@visa.gov",type:"email"},
              {key:"password",label:"PASSWORD",placeholder:"Min. 6 characters",type:"password"},
            ].map(f=>(
              <div key={f.key}>
                <Label style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0"}}>{f.label} *</Label>
                <input type={f.type} placeholder={f.placeholder} value={(newOfficer as any)[f.key]}
                  onChange={e=>setNewOfficer(o=>({...o,[f.key]:e.target.value}))}
                  style={{width:"100%",height:42,border:"1px solid #e8edf8",borderRadius:10,padding:"0 14px",fontSize:13,outline:"none",marginTop:6,boxSizing:"border-box"}}/>
              </div>
            ))}
            <div>
              <Label style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#a0aec0"}}>ASSIGNED COUNTRY *</Label>
              <select value={newOfficer.country} onChange={e=>setNewOfficer(o=>({...o,country:e.target.value}))}
                style={{width:"100%",height:42,border:"1px solid #e8edf8",borderRadius:10,padding:"0 14px",fontSize:13,outline:"none",marginTop:6,background:"#fff",cursor:"pointer"}}>
                <option value="">Select destination country...</option>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter style={{marginTop:8}}>
            <button onClick={()=>{setCreateOfficerOpen(false);setNewOfficer({fullName:"",email:"",password:"",country:""}); }}
              style={{height:38,padding:"0 16px",border:"1px solid #e8edf8",borderRadius:10,background:"#fff",cursor:"pointer",fontSize:13,color:"#718096"}}>Cancel</button>
            <button onClick={()=>createOfficerMutation.mutate()} disabled={createOfficerMutation.isPending}
              style={{height:38,padding:"0 24px",border:"none",borderRadius:10,background:"#6c5dd3",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>
              {createOfficerMutation.isPending?"Creating...":"Create Officer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={()=>setDeleteConfirm(null)}>
        <DialogContent style={{maxWidth:400}}>
          <DialogHeader><DialogTitle style={{color:"#ff6b6b"}}>⚠️ Confirm Delete</DialogTitle></DialogHeader>
          <p style={{fontSize:14,color:"#718096"}}>
            Are you sure you want to delete <strong style={{color:"#1a2035"}}>{deleteConfirm?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <button onClick={()=>setDeleteConfirm(null)}
              style={{height:38,padding:"0 16px",border:"1px solid #e8edf8",borderRadius:10,background:"#fff",cursor:"pointer",fontSize:13,color:"#718096"}}>Cancel</button>
            <button onClick={()=>{
                if(!deleteConfirm)return;
                if(deleteConfirm.type==="officer")deleteOfficerMutation.mutate(deleteConfirm.id);
                else deleteAppMutation.mutate(deleteConfirm.id);
              }}
              disabled={deleteOfficerMutation.isPending||deleteAppMutation.isPending}
              style={{height:38,padding:"0 24px",border:"none",borderRadius:10,background:"#ff6b6b",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>
              {(deleteOfficerMutation.isPending||deleteAppMutation.isPending)?"Deleting...":"Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
