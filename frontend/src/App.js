import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/context/AppContext";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import CustomerSupport from "@/pages/CustomerSupport";
import Operations from "@/pages/Operations";
import FrontendOps from "@/pages/FrontendOps";
import Finance from "@/pages/Finance";
import Admin from "@/pages/Admin";
import AiAssistant from "@/pages/AiAssistant";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="min-h-0 flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<Navigate to="/assistant" replace />} />
                <Route path="/assistant" element={<AiAssistant />} />
                <Route path="/support" element={<CustomerSupport />} />
                <Route path="/operations" element={<Operations />} />
                <Route path="/frontend-ops" element={<FrontendOps />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
