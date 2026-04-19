import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AgentLoginPage } from "@/pages/agent/AgentLogin";
import { AgentTriagePage } from "@/pages/agent/Triage";
import { ClientLoginPage } from "@/pages/client/ClientLogin";
import { ClientPortfolioPage } from "@/pages/client/Portfolio";
import { LandingPage } from "@/pages/Landing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/agent/login" element={<AgentLoginPage />} />
        <Route path="/agent/triage" element={<AgentTriagePage />} />
        <Route path="/client/login" element={<ClientLoginPage />} />
        <Route path="/client/portfolio" element={<ClientPortfolioPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
