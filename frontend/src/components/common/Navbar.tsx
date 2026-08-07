import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Moon, Sun, Menu } from "lucide-react"

import { useTheme } from "./ThemeProvider"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { ConfirmDialog } from "./ConfirmDialog"
import { useAuthStore } from "../../store/authStore"
import { useLogout } from "../../hooks/useLogout"

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const { user, isRestoring } = useAuthStore()
  const navigate = useNavigate()
  const logout = useLogout()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const isAuthenticated = Boolean(user) && !isRestoring

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      setLogoutConfirmOpen(false)
      setMobileMenuOpen(false)
    }
  }

  // A session restored from the refresh cookie only carries id/role (see
  // authStore.ts) -- there's no name/email to show, so the avatar falls
  // back to the user's role initial rather than depending on a field that
  // may not be populated.
  const avatarInitial = user ? (user.firstName?.[0] ?? user.role[0]) : ""

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight text-primary">
              CoWork<span className="text-foreground">Hub</span>
            </span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link
              to="/"
              className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              to="/spaces"
              className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Spaces
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              className="mr-2"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            
            {isAuthenticated && user ? (
              <div className="hidden md:flex items-center space-x-2">
                {user.role === "ADMIN" ? (
                  <Button variant="outline" onClick={() => navigate("/admin")}>
                    Admin Dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>
                      Dashboard
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>
                      My Bookings
                    </Button>
                  </>
                )}
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{avatarInitial}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" onClick={() => setLogoutConfirmOpen(true)}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  Log in
                </Button>
                <Button onClick={() => navigate("/register")}>Sign up</Button>
              </div>
            )}
            
            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </nav>
        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="container md:hidden py-4 pb-6 space-y-4 border-b bg-background">
          <nav className="flex flex-col space-y-4">
            <Link
              to="/"
              className="text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/spaces"
              className="text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Spaces
            </Link>
            {isAuthenticated && user ? (
              <>
                <Link
                  to={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                  className="text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {user.role === "ADMIN" ? "Admin Dashboard" : "Dashboard"}
                </Link>
                {user.role !== "ADMIN" && (
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                )}
                <button
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="text-sm font-medium text-left text-destructive"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="text-sm font-medium text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

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
    </header>
  )
}
