import { useState } from "react";
import { Check, Save, SlidersHorizontal } from "lucide-react";
import { Badge, Button, Card, PageHeader, StatusBadge } from "../components/ui";
import { useAppState } from "../hooks/useAppState";
import { evaluateCompliance } from "../services/complianceEngine";

export default function CompliancePage() {
  const [state, setState] = useAppState();
  const [saved, setSaved] = useState(false);
  const latest = state.evidence[0];
  const result = evaluateCompliance(state.requirements, latest?.detections || [], state.settings.confidenceThreshold);
  return <><PageHeader eyebrow="Rules, not guesses" title="Compliance Engine" description="Edit requirements and weights. Unsupported classes remain manual checks until a custom model is loaded." actions={<Button onClick={()=>{setState({...state});setSaved(true);setTimeout(()=>setSaved(false),1800);}}>{saved?<><Check/> Saved locally</>:<><Save/> Save requirements</>}</Button>}/>
    <div className="compliance-layout"><Card><div className="card-head"><div><h2>Infrastructure requirements</h2><p>Weights drive the overall compliance percentage</p></div><Badge tone="blue">{state.requirements.reduce((s,r)=>s+r.weight,0)} total weight</Badge></div><div className="requirement-editor">{state.requirements.map((req,index)=><div key={req.id}><span className={`check-icon ${req.supported?"verified":"pending"}`}>{req.supported?"AI":"M"}</span><span><strong>{req.label}</strong><small>{req.supported?`Model class: ${req.className}`:"Needs custom model or manual check"}</small></span><label>Required<input type="number" min="0" value={req.required} onChange={e=>{const requirements=[...state.requirements];requirements[index]={...req,required:Number(e.target.value)};setState({...state,requirements});}}/></label><label>Weight<input type="number" min="0" value={req.weight} onChange={e=>{const requirements=[...state.requirements];requirements[index]={...req,weight:Number(e.target.value)};setState({...state,requirements});}}/></label></div>)}</div></Card>
    <Card><div className="card-head"><div><h2>Latest centre result</h2><p>{latest?`${latest.id} · ${latest.source}`:"No inspection evidence yet"}</p></div><StatusBadge status={result.status}/></div>{latest?<div className="compliance-summary"><span className="score-ring"><strong>{result.percentage}</strong><small>/100</small></span><div>{result.items.map(item=><div key={item.requirement.id}><span>{item.requirement.label}</span><StatusBadge status={item.status}/></div>)}</div></div>:<div className="empty-panel"><SlidersHorizontal/><strong>Run an inspection first</strong><span>The engine will compare detections with these saved rules.</span></div>}</Card></div>
  </>;
}
