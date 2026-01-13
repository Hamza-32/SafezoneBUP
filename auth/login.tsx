"use client"
import { useState } from "react"
import type React from "react"

import { Eye, EyeOff, Shield, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    role: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      const userData = {
        id: formData.role === "admin" ? "ADM001" : "STU001",
        name: formData.role === "admin" ? "Admin User" : "John Doe",
        email: formData.email,
        role: formData.role,
        studentId: formData.role === "student" ? "STU2024001" : null,
      }
      onLogin(formData.role as "admin" | "student", userData)
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-[#B41F23] text-white">
              <Shield className="size-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#353535]">SafeZone</h1>
          <p className="text-[#837E6B]">Campus Safety Platform</p>
        </div>

        {/* Emergency Access Banner */}
        <Card className="border-[#B41F23] bg-gradient-to-r from-[#B41F23]/5 to-[#B41F23]/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-[#B41F23] flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-[#353535]">Emergency Access</p>
                <p className="text-[#837E6B]">
                  Need help immediately?{" "}
                  <button onClick={() => onNavigate("emergency")} className="text-[#B41F23] underline font-medium">
                    Report without login
                  </button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Form */}
        <Card className="shadow-lg border-[#8C897A]/20">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#353535]">Sign In</CardTitle>
            <CardDescription className="text-[#837E6B]">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Account Type</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Authority/Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4 text-[#837E6B]" />
                    ) : (
                      <Eye className="size-4 text-[#837E6B]" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#B41F23] hover:bg-[#B41F23]/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className="text-center">
              <p className="text-sm text-[#837E6B]">
                Don't have an account?{" "}
                <button onClick={() => onNavigate("signup")} className="text-[#B41F23] font-medium hover:underline">
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access */}
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            variant="outline"
            onClick={() => onNavigate("emergency")}
            className="border-[#B41F23] text-[#B41F23] hover:bg-[#B41F23]/5"
          >
            <AlertTriangle className="size-4 mr-2" />
            Emergency Help
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate("complaint")}
            className="border-[#8C897A] text-[#353535] hover:bg-[#8C897A]/5"
          >
            File Complaint
          </Button>
        </div>
      </div>
    </div>
  )
}
