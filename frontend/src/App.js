import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NoAccess from "@/pages/NoAccess";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import CustomerSupport from "@/pages/CustomerSupport";
import Operations from "@/pages/Operations";
import FrontendOps from "@/pages/FrontendOps";
import Finance from "@/pages/Finance";
import Admin from "@/pages/Admin";
import AiAssistant from "@/pages/AiAssistant";
import { canAccessSection, defaultPathForRole } from "@/lib/constants";

function Shell() {
  const { user } = useAuth();
  const role = user?.role;
  const home = defaultPathForRole(role);
  const can = (key) => canAccessSection(role, key);
  return (
    <AppProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to={home} replace />} />
              <Route path="/no-access" element={<NoAccess />} />
              {can("ai") && <Route path="/assistant" element={<AiAssistant />} />}
              {can("customer_support") && <Route path="/support" element={<CustomerSupport />} />}
              {can("operations") && <Route path="/operations" element={<Operations />} />}
              {can("frontend_ops") && <Route path="/frontend-ops" element={<FrontendOps />} />}
              {can("finance") && <Route path="/finance" element={<Finance />} />}
              {can("admin") && <Route path="/admin" element={<Admin />} />}
              <Route path="*" element={<Navigate to={home} replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </AppProvider>
  );
}

function Gate() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Public auth pages — available regardless of session state (email links)
  if (pathname === "/reset-password") return <ResetPassword />;
  if (pathname === "/forgot-password") return <ForgotPassword />;

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
