"use client"
import { 
  AlertTriangle, 
  MessageSquare, 
  Phone, 
  Shield, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  MapPin,
  Clock,
  Heart,
  Search,
  Bell,
  ChevronRight,
  Sparkles,
  Lock,
  Eye,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface HomepageProps {
  onNavigate: (page: string) => void
}

export default function Homepage({ onNavigate }: HomepageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                Built for the Bangladesh University of Professionals
              </span>
            </div>
            
            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              Your Safety is Our
              <span className="block mt-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Top Priority
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Report an emergency in seconds — with or without an account. Reports reach
              campus security the moment they are submitted, and you can follow yours
              until it is resolved.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={() => onNavigate("emergency")}
                className="w-full sm:w-auto h-14 px-8 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-colors"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Report Emergency
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate("safety-resources")}
                className="w-full sm:w-auto h-14 px-8 text-base font-semibold border hover:bg-accent/5 hover:text-accent hover:border-accent transition-colors"
              >
                <Shield className="w-5 h-5 mr-2" />
                Safety Resources
              </Button>
            </div>

            {/* What the platform actually does.

               Deliberately capabilities rather than metrics. The numbers that
               used to sit here — a response time, a count of students, a
               response rate — were not measured anywhere, and on a safety page
               an invented response time is the kind of claim someone might
               rely on in an emergency. */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { icon: Eye, label: "Anonymous reporting" },
                { icon: Zap, label: "No account needed" },
                { icon: MapPin, label: "Shares your location" },
                { icon: Clock, label: "Open at any hour" },
              ].map((capability, index) => (
                <div key={index} className="flex flex-col items-center gap-2 text-center">
                  <div className="icon-tile w-10 h-10 bg-accent/10 text-accent">
                    <capability.icon className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium text-foreground">{capability.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--muted))" fillOpacity="0.3"/>
          </svg>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Quick Actions</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Access essential safety features with a single tap
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: AlertTriangle,
                title: "Emergency",
                description: "Report now",
                page: "emergency",
                urgent: true
              },
              {
                icon: MessageSquare,
                title: "File Complaint",
                description: "Report issues",
                page: "complaint",
                urgent: false
              },
              {
                icon: Search,
                title: "Lost & Found",
                description: "Find items",
                page: "lost-and-found",
                urgent: false
              },
              {
                icon: MapPin,
                title: "Check-In",
                description: "Share location",
                page: "safety-checkin",
                urgent: false
              }
            ].map((action, index) => (
              <Card 
                key={index}
                className={`cursor-pointer card-hover border ${
                  action.urgent 
                    ? 'border-primary/20 bg-primary/5' 
                    : 'hover:border-accent/30'
                }`}
                onClick={() => onNavigate(action.page)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`icon-tile w-14 h-14 mb-4 ${
                    action.urgent
                      ? 'bg-primary/10 text-primary'
                      : 'bg-accent/10 text-accent'
                  }`}>
                    <action.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Zap className="w-3 h-3 mr-1" />
              Powerful Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Stay Safe
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive safety tools designed specifically for the BUP campus community
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1 - Emergency Reporting */}
            <Card className="card-hover border hover:border-primary/40">
              <CardHeader className="pb-4">
                <div className="icon-tile w-12 h-12 bg-primary/10 text-primary mb-4">
                  <AlertTriangle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Instant Emergency Reporting</CardTitle>
                <CardDescription>
                  Report emergencies in seconds with or without an account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {["No login required", "GPS location sharing", "Real-time tracking", "Anonymous options"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Feature 2 - Discussion Board */}
            <Card className="card-hover border hover:border-accent/40">
              <CardHeader className="pb-4">
                <div className="icon-tile w-12 h-12 bg-accent/10 text-accent mb-4">
                  <Heart className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-xl">Anonymous Support</CardTitle>
                <CardDescription>
                  Share experiences and get support from the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {["Mental health support", "Peer discussions", "Moderated content", "Safe environment"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3 - Safety Check-In */}
            <Card className="card-hover border hover:border-accent/40">
              <CardHeader className="pb-4">
                <div className="icon-tile w-12 h-12 bg-accent/10 text-accent mb-4">
                  <Clock className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-xl">Safety Check-In</CardTitle>
                <CardDescription>
                  Let trusted contacts know you&apos;re safe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {["Automatic alerts", "Emergency contacts", "SOS trigger", "Travel monitoring"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Feature 4 - Smart Complaints */}
            <Card className="card-hover border hover:border-accent/40">
              <CardHeader className="pb-4">
                <div className="icon-tile w-12 h-12 bg-accent/10 text-accent mb-4">
                  <MessageSquare className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-xl">Smart Complaints</CardTitle>
                <CardDescription>
                  File complaints with student ID verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {["ID verification", "Track progress", "Anonymous filing", "Quick resolution"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Feature 5 - Lost & Found */}
            <Card className="card-hover border hover:border-accent/40">
              <CardHeader className="pb-4">
                <div className="icon-tile w-12 h-12 bg-accent/10 text-accent mb-4">
                  <Search className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-xl">Lost & Found</CardTitle>
                <CardDescription>
                  Report and find lost items on campus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {["Quick posting", "Category filters", "Contact privacy", "Location tracking"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Feature 6 - Resources */}
            <Card className="card-hover border hover:border-accent/40">
              <CardHeader className="pb-4">
                <div className="icon-tile w-12 h-12 bg-accent/10 text-accent mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-xl">Safety Resources</CardTitle>
                <CardDescription>
                  Access BUP safety guidelines and contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {["Emergency contacts", "Safety guides", "Helplines", "Campus resources"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-accent/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-accent/30 text-accent">
                Why SafezoneBUP?
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Built for the BUP Community
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                SafezoneBUP is designed specifically for Bangladesh University of Professionals, 
                with features tailored to our campus, our people, and our needs.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    icon: Lock,
                    title: "Privacy First",
                    description: "Your data is encrypted and your anonymity is protected"
                  },
                  {
                    icon: Zap,
                    title: "Routed immediately",
                    description: "Every responder on duty is notified the moment a report lands"
                  },
                  {
                    icon: Eye,
                    title: "Always open",
                    description: "Reports can be submitted at any hour, from any device"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="icon-tile w-10 h-10 bg-accent/10 text-accent flex-shrink-0">
                      <item.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What happens to a report, rather than invented counts.
               A student deciding whether to submit one wants to know where it
               goes, not how many others have used the service. */}
            <div className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    step: "1",
                    title: "You submit",
                    body: "From any device, signed in or not. Attach a location if you want to.",
                  },
                  {
                    step: "2",
                    title: "Security is notified",
                    body: "Every responder on duty receives the report as soon as it lands.",
                  },
                  {
                    step: "3",
                    title: "It gets picked up",
                    body: "A responder takes ownership, and the status changes as they act.",
                  },
                  {
                    step: "4",
                    title: "You can follow it",
                    body: "Signed-in reporters see their own reports through to resolution.",
                  },
                ].map((item) => (
                  <Card key={item.step} className="p-6 card-hover">
                    <div className="icon-tile w-8 h-8 mb-3 bg-primary/10 text-primary text-sm font-bold">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Contacts Banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-primary/5 border-y border-primary/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="icon-tile w-12 h-12 bg-primary/10 text-primary">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Emergency Contacts</h3>
                <p className="text-sm text-muted-foreground">BUP Security: +88024-9870-5700 | Medical: +88024-9870-5706</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => window.open("tel:+880249870700")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Security
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => onNavigate("safety-resources")}
              >
                All Contacts
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            An account lets you follow your reports through to resolution and keep your
            emergency contacts to hand. You do not need one to report an emergency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => onNavigate("signup")}
              className="h-14 px-8 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm hover:shadow transition-colors"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate("emergency")}
              className="h-14 px-8 text-base font-semibold border transition-colors"
            >
              Report Without Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="icon-tile w-10 h-10 bg-primary text-primary-foreground">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">SafezoneBUP</p>
                <p className="text-xs text-muted-foreground">Bangladesh University of Professionals</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SafezoneBUP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
