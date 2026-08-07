import * as React from "react"
import { Outlet, useLocation } from "react-router-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Menu, X } from "lucide-react"
import { Sidebar } from "../common/Sidebar"
import { Navbar } from "../common/Navbar"
import { Button } from "../ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb"

export function DashboardLayout() {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const location = useLocation()

  // Generate breadcrumbs based on pathname
  const pathnames = location.pathname.split("/").filter((x) => x)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        {/* Mobile sidebar drawer: the Sidebar's own "hidden md:flex" makes it
         * disappear entirely below md, so on small screens navigation is
         * only reachable through this slide-in panel. Built on the same
         * Radix dialog primitive as ConfirmDialog/BookingModal rather than
         * a dedicated drawer/sheet component, since no such primitive is
         * installed and this reuses what's already a project dependency. */}
        <DialogPrimitive.Root open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card shadow-lg md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-200"
              aria-describedby={undefined}
            >
              <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
              <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-sm p-1 text-muted-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="h-4 w-4" />
                <span className="sr-only">Close menu</span>
              </DialogPrimitive.Close>
              <Sidebar collapsed={false} setCollapsed={() => {}} onNavigate={() => setMobileSidebarOpen(false)} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <main className="flex-1 overflow-y-auto bg-muted/20 flex flex-col">
          <div className="p-4 md:p-8 flex-1">
            <div className="mb-6 flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 md:hidden"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href={pathnames[0] === "admin" ? "/admin" : "/dashboard"}>
                      {pathnames[0] === "admin" ? "Admin" : "Dashboard"}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {pathnames.length > 1 && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="capitalize">
                          {pathnames[1].replace("-", " ")}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
