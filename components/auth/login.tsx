"use client"
import { useState } from "react"
import type React from "react"

import { Eye, EyeOff, Shield, AlertTriangle, ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface LoginProps {
  onLogin: (role: "admin" | "student", userData: any) => void
  onNavigate: (page: string) => void
}

export default function Login({ onLogin, onNavigate }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await onLogin("student", formData)
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-accent via-accent/90 to-primary/80 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-50" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SafezoneBUP</h1>
              <p className="text-white/70 text-sm">Campus Safety Platform</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome Back to<br />Your Safety Network
            </h2>
            <p className="text-white/80 text-lg max-w-md">
              Access your dashboard, track reports, and stay connected with campus security.
            </p>
          </div>

          <div className="space-y-4">
            {["Report without an account", "Follow your reports by reference code", "Anonymous reporting options"].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <span className="text-white/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/60 text-sm">
          © {new Date().getFullYear()} Bangladesh University of Professionals
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SafezoneBUP</h1>
            <p className="text-muted-foreground">Campus Safety Platform</p>
          </div>

          {/* Emergency Banner */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">Need immediate help?</p>
                  <button 
                    onClick={() => onNavigate("emergency")} 
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Report emergency without login →
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Login Form */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
              <p className="text-muted-foreground">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@bup.edu.bd"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <button type="button" className="text-xs text-accent hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-12 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button 
                onClick={() => onNavigate("signup")} 
                className="text-accent font-semibold hover:underline"
              >
                Create account
              </button>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => onNavigate("emergency")}
              className="h-12 border-primary/30 text-primary hover:bg-primary/5"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate("complaint")}
              className="h-12"
            >
              File Complaint
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
