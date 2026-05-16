import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import ProjectsPage from "./pages/ProjectsPage";
import DocumentsPage from "./pages/DocumentsPage";
import MilestonesPage from "./pages/MilestonesPage";
import SchedulePage from "./pages/SchedulePage";
import MessagesPage from "./pages/MessagesPage";
import DefenseSimulatorPage from "./pages/DefenseSimulatorPage";
import ChatbotPage from "./pages/ChatbotPage";
import SupervisorPage from "./pages/SupervisorPage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="milestones" element={<MilestonesPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="defense-simulator" element={<DefenseSimulatorPage />} />
              <Route path="chatbot" element={<ChatbotPage />} />
              <Route path="supervisor" element={<SupervisorPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="showcase" element={<ShowcasePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
