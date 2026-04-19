import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AgentLoginPage } from "@/pages/agent/AgentLogin";
import { ClientLoginPage } from "@/pages/client/ClientLogin";
import { LandingPage } from "@/pages/Landing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/agent/login" element={<AgentLoginPage />} />
        <Route path="/client/login" element={<ClientLoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
