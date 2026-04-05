import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Target,
  Calendar,
  MessageSquare,
  Brain,
  Bot,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const coreItems = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Projects", url: "/app/projects", icon: FolderOpen },
  { title: "Documents", url: "/app/documents", icon: FileText },
  { title: "Milestones", url: "/app/milestones", icon: Target },
  { title: "Schedule", url: "/app/schedule", icon: Calendar },
  { title: "Messages", url: "/app/messages", icon: MessageSquare },
];

const aiItems = [
  { title: "Defense Simulator", url: "/app/defense-simulator", icon: Brain },
  { title: "AI Chatbot", url: "/app/chatbot", icon: Bot },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const isActive = (path: string) =>
    path === "/app" ? location.pathname === "/app" : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
          {!collapsed ? (
            <span className="font-display text-xl font-bold text-gradient-gold tracking-wider">ORPTS</span>
          ) : (
            <span className="font-display text-lg font-bold text-primary">O</span>
          )}
        </div>

        {/* Core */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase">Core Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/app"}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase">AI Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/app/settings")}>
              <NavLink to="/app/settings">
                <Settings className="h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
