import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AgentLoginPage } from "@/pages/agent/AgentLogin";
import { AgentRepeatClientsPage } from "@/pages/agent/RepeatClients";
import { AgentSettingsPage } from "@/pages/agent/Settings";
import { AgentTransactionDocumentsPage } from "@/pages/agent/TransactionDocuments";
import { AgentTriagePage } from "@/pages/agent/Triage";
import { ClientLoginPage } from "@/pages/client/ClientLogin";
import { ClientPortfolioPage } from "@/pages/client/Portfolio";
import { ClientProfilePage } from "@/pages/client/Profile";
import { ClientTransactionDocumentsPage } from "@/pages/client/TransactionDocuments";
import { LandingPage } from "@/pages/Landing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/agent/login" element={<AgentLoginPage />} />
        <Route path="/agent/triage" element={<AgentTriagePage />} />
        <Route path="/agent/repeat-clients" element={<AgentRepeatClientsPage />} />
        <Route path="/agent/settings" element={<AgentSettingsPage />} />
        <Route path="/agent/transactions/:transactionId/documents" element={<AgentTransactionDocumentsPage />} />
        <Route path="/client/login" element={<ClientLoginPage />} />
        <Route path="/client/portfolio" element={<ClientPortfolioPage />} />
        <Route path="/client/profile" element={<ClientProfilePage />} />
        <Route path="/client/transactions/:transactionId/documents" element={<ClientTransactionDocumentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
