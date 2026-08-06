import * as React from "react"
import { Outlet } from "react-router-dom"
import { Navbar } from "../common/Navbar"
import { Footer } from "../common/Footer"

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col flex-1">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
