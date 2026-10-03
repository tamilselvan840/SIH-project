import { createBrowserRouter, Navigate } from "react-router";
import AppLayout from "../layouts/AppLayout";
import DashboardPage from "../pages/DashboardPage";
import InspectorPage from "../pages/InspectorPage";
import CompliancePage from "../pages/CompliancePage";
import TrustPage from "../pages/TrustPage";
import AlertsPage from "../pages/AlertsPage";
import AttendancePage from "../pages/AttendancePage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";

export const router = createBrowserRouter([{
  Component: AppLayout,
  children: [
    { index: true, element: <Navigate to="/dashboard" replace /> }, { path: "dashboard", Component: DashboardPage },
    { path: "inspector", Component: InspectorPage }, { path: "compliance", Component: CompliancePage },
    { path: "trust", Component: TrustPage }, { path: "alerts", Component: AlertsPage },
    { path: "attendance", Component: AttendancePage }, { path: "reports", Component: ReportsPage },
    { path: "settings", Component: SettingsPage }, { path: "*", element: <Navigate to="/dashboard" replace /> },
  ],
}]);
