import { Calendar, Users, Book, School, Clock, DoorOpen, UserCog, Building } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const items = [
  { title: "Dashboard", url: "/", icon: Calendar },
  { title: "Faculty", url: "/faculty", icon: Users },
  { title: "Subjects", url: "/subjects", icon: Book },
  { title: "Sections", url: "/sections", icon: School },
  { title: "Classrooms", url: "/classrooms", icon: DoorOpen },
  { title: "Timetable", url: "/timetable", icon: Clock },
  { title: "Faculty Timetable", url: "/faculty-timetable", icon: UserCog },
  { title: "Classroom Timetable", url: "/classroom-timetable", icon: Building },
]

export function AppSidebar() {
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"

  return (
    <Sidebar collapsible="icon" className="group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0">
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Time Table Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}