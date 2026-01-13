"use client"

import { Home, AlertTriangle, Shield, User, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const navItems = [
    {
      label: "Home",
      page: "home",
      icon: Home,
    },
    {
      label: "Resources",
      page: "safety-resources",
      icon: Shield,
    },
    {
      label: "Emergency",
      page: "emergency",
      icon: AlertTriangle,
      highlight: true,
    },
    {
      label: "Profile",
      page: "profile",
      icon: User,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = currentPage === item.page
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                item.highlight && "text-destructive font-bold"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-none transition-all", // Square icons
                  isActive && !item.highlight && "bg-primary/10",
                  item.highlight && "bg-destructive text-destructive-foreground shadow-sm"
                )}
              >
                <item.icon className={cn("w-5 h-5", item.highlight && "w-6 h-6")} />
              </div>
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
