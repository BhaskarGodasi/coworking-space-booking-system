import React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Building2, CalendarCheck, ShieldCheck, ArrowRight, Search } from "lucide-react"
import { Button } from "../components/ui/button"

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 lg:py-48 overflow-hidden bg-muted/30">
        <div className="absolute inset-0 bg-grid-zinc-200/50 [mask-image:linear-gradient(to_bottom,white,transparent)] dark:bg-grid-zinc-800/50" />
        <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            CoWork Hub 2.0 is Live
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter max-w-4xl text-balance">
            Book Smarter. <span className="text-primary">Work Better.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[700px] text-balance">
            The enterprise-grade coworking space management platform. 
            Find the perfect environment for your team to thrive, collaborate, and innovate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-8">
            <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8" onClick={() => navigate("/spaces")}>
              <Search className="mr-2 h-5 w-5" />
              Find a Space
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8 bg-background" onClick={() => navigate("/register")}>
              Create Account
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-20 md:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything you need to manage your workspace</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Designed for modern professionals and enterprise teams. Our platform provides seamless booking, 
              real-time availability, and secure access.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl items-center gap-6 md:grid-cols-3 lg:gap-12">
            <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-card border shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Premium Spaces</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Access a curated network of high-quality workspaces designed for productivity and comfort.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-card border shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-2">
                <CalendarCheck className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold">Instant Booking</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Real-time availability calendar. Book spaces instantly with secure payment processing.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-card border shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 mb-2">
                <ShieldCheck className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold">Enterprise Security</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Role-based access control, secure authentication, and enterprise-grade data protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-20 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Ready to upgrade your workspace?
            </h2>
            <p className="max-w-[600px] md:text-xl/relaxed text-primary-foreground/80">
              Join thousands of professionals already using CoWork Hub to find their perfect space.
            </p>
            <Button size="lg" variant="secondary" className="mt-6 text-primary h-12 px-8" onClick={() => navigate("/register")}>
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
