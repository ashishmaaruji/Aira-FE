import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import TestAira from "@/components/TestAira";
import LiveMonitor from "@/components/LiveMonitor";
import CallReview from "@/components/CallReview";
import PromptTraining from "@/components/PromptTraining";
import QualificationSnapshot from "@/components/QualificationSnapshot";
import {
  Phone,
  Activity,
  FileText,
  MessageSquare,
  ClipboardList,
  Menu,
  X
} from "lucide-react";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navItems = [
    { to: "/", icon: Phone, label: "Test Aira", testId: "nav-test-aira" },
    { to: "/monitor", icon: Activity, label: "Live Monitor", testId: "nav-live-monitor" },
    { to: "/review", icon: FileText, label: "Call Review", testId: "nav-call-review" },
    { to: "/prompts", icon: MessageSquare, label: "Prompt Training", testId: "nav-prompts" },
    { to: "/qualification", icon: ClipboardList, label: "Qualification", testId: "nav-qualification" },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        data-testid="mobile-menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-gray-50">
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              Aira Control Tower
            </h1>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Operator Console</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={item.testId}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`
                }
              >
                <item.icon size={16} strokeWidth={1.5} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-gray-50">
            <div className="px-3 py-2 text-[10px] text-gray-400">
              <p>Spring Boot Backend</p>
              <p className="mt-0.5">Internal Use Only</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="flex-1 lg:ml-0 overflow-hidden">
        <div className="p-6 lg:p-8 pt-16 lg:pt-6 h-screen overflow-y-auto">{children}</div>
      </main>
    </div>
  );
};

function App() {
  return (
    <div className="App" data-testid="app-container">
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<TestAira />} />
            <Route path="/monitor" element={<LiveMonitor />} />
            <Route path="/review" element={<CallReview />} />
            <Route path="/prompts" element={<PromptTraining />} />
            <Route path="/qualification" element={<QualificationSnapshot />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  );
}

export default App;
