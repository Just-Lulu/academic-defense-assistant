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
  BookOpen,
} from "lucide-react";
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
  const isActive = (path: string) =>
    path === "/app" ? location.pathname === "/app" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <BookOpen className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display text-base font-bold text-sidebar-accent-foreground">
              SuperviseAI
            </span>
          )}
        </div>

        {/* Core */}
        <SidebarGroup>
          <SidebarGroupLabel>Core Modules</SidebarGroupLabel>
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
          <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
