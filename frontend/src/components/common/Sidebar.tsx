import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { 
  LayoutDashboard, 
  Building2, 
  Calendar, 
  Wrench, 
  Settings, 
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { useAuthStore } from "../../store/authStore"

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  
  const isAdmin = user?.role === "ADMIN"

  const adminLinks = [
    { name: "Overview", path: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: "Spaces", path: "/admin/spaces", icon: <Building2 className="h-5 w-5" /> },
    { name: "Bookings", path: "/admin/bookings", icon: <Calendar className="h-5 w-5" /> },
    { name: "Maintenance", path: "/admin/maintenance", icon: <Wrench className="h-5 w-5" /> },
  ]

  const memberLinks = [
    { name: "My Bookings", path: "/dashboard", icon: <Calendar className="h-5 w-5" /> },
    { name: "Profile", path: "/dashboard/profile", icon: <User className="h-5 w-5" /> },
  ]

  const links = isAdmin ? adminLinks : memberLinks

  return (
    <aside 
      className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col h-[calc(100vh-4rem)]", // Header is 4rem
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b h-16 shrink-0">
        {!collapsed && (
          <span className="font-semibold text-sm truncate uppercase text-muted-foreground tracking-wider">
            {isAdmin ? "Admin Panel" : "Member Panel"}
          </span>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-8 w-8 ml-auto", collapsed && "mx-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="space-y-1 px-2">
          {links.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center"
                )}
                title={collapsed ? link.name : undefined}
              >
                {link.icon}
                {!collapsed && <span>{link.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t shrink-0">
        <button
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
