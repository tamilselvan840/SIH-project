import { Download, FileJson, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, PageHeader } from "../components/ui";
import { useAppState } from "../hooks/useAppState";

export default function ReportsPage(){
  const [state]=useAppState();
  function download(type:"json"|"csv"){
    const data=type==="json"?JSON.stringify({generatedAt:new Date().toISOString(),centres:state.centres,alerts:state.alerts,evidence:state.evidence},null,2):["Centre,District,Attendance,Compliance,Trust,Risk",...state.centres.map(c=>`"${c.name}",${c.district},${c.attendance},${c.compliance},${c.trust},${c.risk}`)].join("\n");
    const url=URL.createObjectURL(new Blob([data],{type:type==="json"?"application/json":"text/csv"}));const a=document.createElement("a");a.href=url;a.download=`smart-monitor-report.${type}`;a.click();URL.revokeObjectURL(url);
  }
  return <><PageHeader eyebrow="Resolve → Report" title="Monitoring Reports" description="Centre-wise compliance, attendance, issues and trust verification from persisted browser data." actions={<><Button variant="secondary" onClick={()=>download("json")}><FileJson/> Export JSON</Button><Button variant="secondary" onClick={()=>download("csv")}><Download/> Export CSV</Button><Button onClick={()=>window.print()}><Printer/> Print</Button></>}/>
  <Card className="print-report"><div className="report-title"><h2>SIH 2026 · Training Centre Assurance Summary</h2><span>Generated {new Date().toLocaleString()}</span></div><div className="report-summary"><div><strong>{state.centres.length}</strong><span>Centres</span></div><div><strong>{state.evidence.length}</strong><span>Inspections</span></div><div><strong>{state.alerts.filter(a=>a.stage!=="Verified").length}</strong><span>Pending issues</span></div><div><strong>{state.alerts.filter(a=>a.stage==="Verified").length}</strong><span>Verified resolved</span></div></div><div className="report-chart"><ResponsiveContainer><BarChart data={state.centres}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="district"/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="compliance" fill="#12A58F"/><Bar dataKey="attendance" fill="#3272c6"/></BarChart></ResponsiveContainer></div><div className="table-wrap"><table><thead><tr><th>Centre</th><th>Attendance</th><th>Compliance</th><th>Trust</th><th>Open issues</th><th>Risk</th></tr></thead><tbody>{state.centres.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>{c.district}</small></td><td>{c.attendance}%</td><td>{c.compliance}%</td><td>{c.trust}</td><td>{state.alerts.filter(a=>a.centreId===c.id&&a.stage!=="Verified").length}</td><td>{c.risk}</td></tr>)}</tbody></table></div></Card></>;
}
