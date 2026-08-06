import * as React from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "../common/Sidebar"
import { Navbar } from "../common/Navbar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb"

export function DashboardLayout() {
  const [collapsed, setCollapsed] = React.useState(false)
  const location = useLocation()

  // Generate breadcrumbs based on pathname
  const pathnames = location.pathname.split("/").filter((x) => x)
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="flex-1 overflow-y-auto bg-muted/20 flex flex-col">
          <div className="p-4 md:p-8 flex-1">
            <div className="mb-6">
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
