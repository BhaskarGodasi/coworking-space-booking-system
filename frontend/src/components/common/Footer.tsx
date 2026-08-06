import * as React from "react"
import { Link } from "react-router-dom"


export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight text-primary">
                CoWork<span className="text-foreground">Hub</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Book Smarter. Work Better. Enterprise coworking space management platform.
            </p>
            <div className="flex gap-4">
              <Link to="#" className="text-muted-foreground hover:text-foreground text-sm font-medium">
                Twitter
              </Link>
              <Link to="#" className="text-muted-foreground hover:text-foreground text-sm font-medium">
                LinkedIn
              </Link>
            </div>
          </div>
          
          <div>
            <h3 className="mb-4 text-sm font-semibold">Product</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/spaces" className="hover:text-foreground">Browse Spaces</Link></li>
              <li><a href="#" className="hover:text-foreground">Pricing</a></li>
              <li><a href="#" className="hover:text-foreground">Features</a></li>
              <li><a href="#" className="hover:text-foreground">Integration</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="mb-4 text-sm font-semibold">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">About Us</a></li>
              <li><a href="#" className="hover:text-foreground">Careers</a></li>
              <li><a href="#" className="hover:text-foreground">Blog</a></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="mb-4 text-sm font-semibold">Legal</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CoWork Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
