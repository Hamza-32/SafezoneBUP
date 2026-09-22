"use client"
import { useState } from "react"
import { Shield, Moon, Sun, User, LogOut, Settings, Menu, X, AlertTriangle, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

interface NavbarProps {
  user?: any
  onNavigate: (page: string) => void
  onLogout?: () => void
}

export function Navbar({ user, onNavigate, onLogout }: NavbarProps) {
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const mainNavItems = [
    { label: "Home", page: "home" },
    { label: "About BUP", page: "bup-info" },
    { label: "Safety Resources", page: "safety-resources" },
  ]

  const safetyNavItems = [
    { label: "Discussion Board", page: "discussion-board" },
    { label: "Check-In", page: "safety-checkin" },
    { label: "Lost & Found", page: "lost-and-found" },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate("home")}
          >
            <div className="icon-tile h-10 w-10 bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Shield className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground tracking-tight">SafezoneBUP</h1>
              <p className="text-[10px] text-muted-foreground leading-none uppercase tracking-wider">Campus Safety</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {mainNavItems.map((item) => (
              <Button
                key={item.page}
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(item.page)}
                className="text-muted-foreground"
              >
                {item.label}
              </Button>
            ))}
            
            {/* Emergency Button */}
            <Button
              size="sm"
              onClick={() => onNavigate("emergency")}
              className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Emergency
            </Button>

            {/* Safety Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Safety Tools
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onNavigate("complaint")}>
                  File Complaint
                </DropdownMenuItem>
                {safetyNavItems.map((item) => (
                  <DropdownMenuItem key={item.page} onClick={() => onNavigate(item.page)}>
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {user ? (
              /* User Menu */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="hidden sm:inline font-medium">{user.name?.split(' ')[0] || user.firstName}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{user.name || `${user.firstName} ${user.lastName}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.role === "admin" ? "Administrator" : `Student ID: ${user.studentId}`}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigate(user.role === "admin" ? "admin-dashboard" : "student-dashboard")}>
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("verification")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Verification Center
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Login/Signup Buttons */
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onNavigate("login")}>
                  Log in
                </Button>
                <Button 
                  size="sm"
                  onClick={() => onNavigate("signup")} 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
                >
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-background">
          <div className="px-4 py-4 space-y-1">
            {/* Main Nav */}
            {mainNavItems.map((item) => (
              <Button
                key={item.page}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onNavigate(item.page)
                  setMobileMenuOpen(false)
                }}
              >
                {item.label}
              </Button>
            ))}
            
            {/* Emergency */}
            <Button
              className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
              onClick={() => {
                onNavigate("emergency")
                setMobileMenuOpen(false)
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Emergency
            </Button>

            <div className="pt-2 border-t mt-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Safety Tools</p>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onNavigate("complaint")
                  setMobileMenuOpen(false)
                }}
              >
                File Complaint
              </Button>
              {safetyNavItems.map((item) => (
                <Button
                  key={item.page}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    onNavigate(item.page)
                    setMobileMenuOpen(false)
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            {/* Auth Buttons for Mobile */}
            {!user && (
              <div className="pt-4 border-t mt-2 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onNavigate("login")
                    setMobileMenuOpen(false)
                  }}
                >
                  Log in
                </Button>
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => {
                    onNavigate("signup")
                    setMobileMenuOpen(false)
                  }}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
