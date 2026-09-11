import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import CustomerSupport from "@/pages/CustomerSupport";
import Operations from "@/pages/Operations";
import FrontendOps from "@/pages/FrontendOps";
import Finance from "@/pages/Finance";
import Admin from "@/pages/Admin";
import AiAssistant from "@/pages/AiAssistant";

function Shell() {
  return (
    <AppProvider>
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
    </AppProvider>
  );
}

function Gate() {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }
  if (!user) return <Login />;
  return <Shell />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
