"use client"
import { useState } from "react"
import type React from "react"

import { Eye, EyeOff, Shield, User, UserCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface SignupProps {
  onSignup: (role: "admin" | "student", userData: any) => void
  onNavigate: (page: string) => void
}

export default function Signup({ onSignup, onNavigate }: SignupProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    studentId: "",
    department: "",
    adminCode: "",
    personalNumber: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!")
      return
    }

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      const userData = {
        id: formData.role === "admin" ? "ADM001" : "STU001",
        name: formData.name,
        email: formData.email,
        role: formData.role,
        studentId: formData.role === "student" ? formData.studentId : null,
        department: formData.department,
      }
      onSignup(formData.role as "admin" | "student", userData)
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
          <h1 className="text-2xl font-bold text-[#353535]">Join SafeZone</h1>
          <p className="text-[#837E6B]">Create your campus safety account</p>
        </div>

        {/* Signup Form */}
        <Card className="shadow-lg border-[#8C897A]/20">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#353535]">Create Account</CardTitle>
            <CardDescription className="text-[#837E6B]">Fill in your details to get started</CardDescription>
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
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center gap-2">
                        <User className="size-4" />
                        Student
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <UserCheck className="size-4" />
                        Authority/Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
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

              {formData.role === "student" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="Enter your student ID"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Enter your department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalNumber">
                      {formData.role === "student" ? "Personal Number" : "Admin ID"}
                    </Label>
                    <Input
                      id="personalNumber"
                      type="text"
                      placeholder={formData.role === "student" ? "Enter your personal number" : "Enter your admin ID"}
                      value={formData.personalNumber}
                      onChange={(e) => setFormData({ ...formData, personalNumber: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.role === "student"
                        ? "Required for account verification and anonymous report linking"
                        : "Required for admin account verification"}
                    </p>
                  </div>
                </>
              )}

              {formData.role === "admin" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="adminCode">Admin Authorization Code</Label>
                    <Input
                      id="adminCode"
                      type="text"
                      placeholder="Enter admin code"
                      value={formData.adminCode}
                      onChange={(e) => setFormData({ ...formData, adminCode: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalNumber">
                      {formData.role === "student" ? "Personal Number" : "Admin ID"}
                    </Label>
                    <Input
                      id="personalNumber"
                      type="text"
                      placeholder={formData.role === "student" ? "Enter your personal number" : "Enter your admin ID"}
                      value={formData.personalNumber}
                      onChange={(e) => setFormData({ ...formData, personalNumber: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.role === "student"
                        ? "Required for account verification and anonymous report linking"
                        : "Required for admin account verification"}
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
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
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className="text-center">
              <p className="text-sm text-[#837E6B]">
                Already have an account?{" "}
                <button onClick={() => onNavigate("login")} className="text-[#B41F23] font-medium hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
