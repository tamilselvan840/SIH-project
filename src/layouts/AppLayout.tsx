import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { Activity, Bell, Bot, ClipboardCheck, FileBarChart, LayoutDashboard, Menu, Moon, ScanFace, Settings, ShieldCheck, Sun, X } from "lucide-react";
import { Badge } from "../components/ui";
import { useAppState } from "../hooks/useAppState";
import { getModelStatus, subscribeModelStatus } from "../ai/modelLoader";
import { loadModel } from "../ai/objectDetector";

const nav = [
  ["/dashboard", "Dashboard", LayoutDashboard], ["/inspector", "AI Inspector", Bot], ["/compliance", "Compliance", ClipboardCheck],
  ["/trust", "Trust Layer", ShieldCheck], ["/alerts", "Alerts & Issues", Bell], ["/attendance", "Attendance", ScanFace],
  ["/reports", "Reports", FileBarChart], ["/settings", "Settings", Settings],
] as const;

export default function AppLayout() {
  const [state, setState] = useAppState();
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(getModelStatus);
  useEffect(() => subscribeModelStatus(setModel), []);
  useEffect(() => { document.documentElement.classList.toggle("dark", state.settings.theme === "dark"); }, [state.settings.theme]);
  useEffect(() => {
    localStorage.removeItem("stcm:face-enrollments:v1");
    void loadModel().catch(() => {});
  }, []);
  const shown = state.role === "manager" ? nav.filter(([path]) => ["/inspector", "/compliance", "/alerts", "/attendance", "/settings"].includes(path)) : nav;
  const mode = model.status === "loaded" ? "live" : model.status === "error" ? "error" : "loading";
  return <div className="app-shell">
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="side-brand"><span className="logo-mark"><ShieldCheck /></span><span>Smart Monitor<small>SIH 2026 prototype</small></span><button onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <div className="workflow-mini">DETECT <i /> VERIFY <i /> TRUST <i /> ALERT</div>
      <nav><div className="nav-label">Monitoring workspace</div>{shown.map(([to, label, Icon]) => <NavLink to={to} key={to} onClick={() => setOpen(false)}><Icon size={18}/><span>{label}</span>{label.includes("Alerts") && <b>{state.alerts.filter((a) => a.stage !== "Verified").length}</b>}</NavLink>)}</nav>
      <div className="sidebar-trust"><ShieldCheck/><strong>Evidence over claims</strong><span>Humans decide. Risk ranks where to look first.</span></div>
      <div className="side-user"><span className="avatar">TN</span><span><strong>{state.role === "authority" ? "Authority Console" : "Centre Manager"}</strong><small>Shared local demo data</small></span></div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close navigation overlay" />}
    <div className="main-column">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button>
        <div className="ai-status"><Badge tone={mode === "live" ? "green" : mode === "error" ? "red" : "amber"} dot>{mode === "live" ? "Live Browser AI" : mode === "error" ? "AI Error" : "Loading browser model"}</Badge><span>{model.message}</span></div>
        <div className="top-actions">
          <div className="role-switch"><span>ROLE VIEW</span><button className={state.role === "authority" ? "active" : ""} onClick={() => setState({ ...state, role: "authority" })}>Authority</button><button className={state.role === "manager" ? "active" : ""} onClick={() => setState({ ...state, role: "manager" })}>Centre Manager</button></div>
          <button onClick={() => setState({ ...state, settings: { ...state.settings, theme: state.settings.theme === "light" ? "dark" : "light" } })} aria-label="Toggle theme">{state.settings.theme === "light" ? <Moon/> : <Sun/>}</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </div>
  </div>;
}
