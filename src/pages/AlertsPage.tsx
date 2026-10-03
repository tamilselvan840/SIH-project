import { AlertTriangle, ArrowRight, CheckCircle2, RotateCcw, UserPlus } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "../components/ui";
import { useAppState } from "../hooks/useAppState";
import type { AlertStage } from "../types";
import { useNavigate } from "react-router";

const stages: AlertStage[]=["Detected","Assigned","In Progress","Resolved","Verified"];
export default function AlertsPage(){
  const [state,setState]=useAppState();const navigate=useNavigate();
  const advance=(id:string)=>setState({...state,alerts:state.alerts.map(a=>{if(a.id!==id)return a;const next=stages[Math.min(stages.length-1,stages.indexOf(a.stage)+1)];return{...a,stage:next,assignee:next==="Assigned"?"Inspector Lakshmi":a.assignee};})});
  return <><PageHeader eyebrow="Alert → Resolve → Verify" title="Alerts & Issues" description="Lifecycle decisions are persisted locally. Resolved means pending proof; only successful reinspection can mark Verified."/><div className="human-note"><ShieldCheckIcon/><span><strong>AI only flags.</strong> Nothing is auto-penalised. “Compliance Restored” appears only after a new detection satisfies the requirement.</span></div>
  <div className="alert-board">{stages.map(stage=><Card key={stage}><div className="board-head"><span>{stage}</span><Badge tone={stage==="Verified"?"green":stage==="Detected"?"red":"amber"}>{state.alerts.filter(a=>a.stage===stage).length}</Badge></div>{state.alerts.filter(a=>a.stage===stage).map(alert=>{const proof=alert.evidenceId?state.evidence.find(e=>e.id===alert.evidenceId):undefined;const restored=proof?.complianceStatus==="COMPLIANT";return <div className="issue-card" key={alert.id}><div><Badge tone={alert.severity==="Critical"||alert.severity==="High"?"red":alert.severity==="Medium"?"amber":"blue"}>{alert.severity}</Badge><small>{alert.id}</small></div><h3>{alert.title}</h3><p>{alert.reason}</p><span>{state.centres.find(c=>c.id===alert.centreId)?.name}</span>{alert.assignee&&<span><UserPlus/> {alert.assignee}</span>}<div>{stage==="Resolved"?(restored?<Button onClick={()=>advance(alert.id)}><CheckCircle2/> Confirm compliance restored</Button>:<Button onClick={()=>navigate("/inspector")}><RotateCcw/> Run reinspection</Button>):stage!=="Verified"&&<Button variant="secondary" onClick={()=>advance(alert.id)}>{stage==="Detected"?"Assign":stage==="Assigned"?"Start work":stage==="In Progress"?"Mark resolved":"Verify"}<ArrowRight/></Button>}{stage==="Verified"&&<Badge tone="green"><CheckCircle2/> Human verified</Badge>}</div></div>})}</Card>)}</div></>;
}
function ShieldCheckIcon(){return <CheckCircle2/>}
