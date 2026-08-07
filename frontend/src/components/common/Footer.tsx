import * as React from "react"
import { Link } from "react-router-dom"


export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-12 md:py-16">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-col items-center space-y-2 md:items-start">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight text-primary">
                CoWork<span className="text-foreground">Hub</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Book Smarter. Work Better. Enterprise coworking space management platform.
            </p>
          </div>

          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/spaces" className="hover:text-foreground">
              Browse Spaces
            </Link>
          </nav>
        </div>

        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CoWork Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
