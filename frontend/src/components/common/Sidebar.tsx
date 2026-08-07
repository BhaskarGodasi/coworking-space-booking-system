import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Wrench,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { ConfirmDialog } from "./ConfirmDialog"
import { useAuthStore } from "../../store/authStore"
import { useLogout } from "../../hooks/useLogout"

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  /** Present only for the mobile drawer instance: called after a nav link
   * is clicked so the drawer closes, and drops the desktop-only
   * collapse/expand affordance and fixed-width behavior. */
  onNavigate?: () => void
}

export function Sidebar({ collapsed, setCollapsed, onNavigate }: SidebarProps) {
  const { user } = useAuthStore()
  const location = useLocation()
  const logout = useLogout()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const isAdmin = user?.role === "ADMIN"
  const isMobileDrawer = Boolean(onNavigate)

  const adminLinks = [
    { name: "Overview", path: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: "Spaces", path: "/admin/spaces", icon: <Building2 className="h-5 w-5" /> },
    { name: "Bookings", path: "/admin/bookings", icon: <Calendar className="h-5 w-5" /> },
    { name: "Maintenance", path: "/admin/maintenance", icon: <Wrench className="h-5 w-5" /> },
  ]

  const memberLinks = [
    { name: "My Bookings", path: "/dashboard", icon: <Calendar className="h-5 w-5" /> },
  ]

  const links = isAdmin ? adminLinks : memberLinks

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      setLogoutConfirmOpen(false)
    }
  }

  return (
    <aside
      className={cn(
        "bg-card flex flex-col h-full",
        isMobileDrawer
          ? "w-full"
          : cn("hidden md:flex border-r transition-all duration-300 h-[calc(100vh-4rem)]", collapsed ? "w-16" : "w-64")
      )}
    >
      <div className="flex items-center justify-between p-4 border-b h-16 shrink-0">
        {(!collapsed || isMobileDrawer) && (
          <span className="font-semibold text-sm truncate uppercase text-muted-foreground tracking-wider">
            {isAdmin ? "Admin Panel" : "Member Panel"}
          </span>
        )}
        {!isMobileDrawer && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 ml-auto", collapsed && "mx-auto")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="space-y-1 px-2">
          {links.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && !isMobileDrawer && "justify-center"
                )}
                title={collapsed && !isMobileDrawer ? link.name : undefined}
              >
                {link.icon}
                {(!collapsed || isMobileDrawer) && <span>{link.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-4 border-t shrink-0">
        <button
          onClick={() => setLogoutConfirmOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && !isMobileDrawer && "justify-center"
          )}
          title={collapsed && !isMobileDrawer ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {(!collapsed || isMobileDrawer) && <span>Logout</span>}
        </button>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Log out?"
        description="You'll need to log in again to access your dashboard and bookings."
        confirmLabel="Logout"
        destructive
        isConfirming={isLoggingOut}
        onConfirm={handleLogout}
      />
    </aside>
  )
}
