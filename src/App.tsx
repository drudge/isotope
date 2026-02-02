import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Zones from "@/pages/Zones";
import Cache from "@/pages/Cache";
import Blocked from "@/pages/Blocked";
import Apps from "@/pages/Apps";
import DnsClient from "@/pages/DnsClient";
import Logs from "@/pages/Logs";
import Dhcp from "@/pages/Dhcp";
import Administration from "@/pages/Administration";
import Cluster from "@/pages/Cluster";
import Settings from "@/pages/Settings";
import About from "@/pages/About";

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="isotope-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/zones" element={<Zones />} />
              <Route path="/zones/:zoneName" element={<Zones />} />
              <Route
                path="/zones/:zoneName/:recordName/:recordType/:recordValue/edit"
                element={<Zones />}
              />
              <Route path="/cache" element={<Cache />} />
              <Route path="/allowed" element={<Navigate to="/blocked?tab=allowed" replace />} />
              <Route path="/blocked" element={<Blocked />} />
              <Route path="/apps" element={<Apps />} />
              <Route path="/dns-client" element={<DnsClient />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/dhcp" element={<Dhcp />} />
              <Route path="/administration" element={<Administration />} />
              <Route path="/cluster" element={<Cluster />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
