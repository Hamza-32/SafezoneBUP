"use client"
import { useState } from "react"
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Shield, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface ProfileProps {
  userData: any
  onNavigate: (page: string) => void
  onUpdateProfile: (data: any) => void
}

export default function Profile({ userData, onNavigate, onUpdateProfile }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: userData.name || "",
    email: userData.email || "",
    phone: userData.phone || "",
    department: userData.department || "",
    personalNumber: userData.personalNumber || "",
    address: userData.address || "",
  })

  const handleSave = () => {
    onUpdateProfile(formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      name: userData.name || "",
      email: userData.email || "",
      phone: userData.phone || "",
      department: userData.department || "",
      personalNumber: userData.personalNumber || "",
      address: userData.address || "",
    })
    setIsEditing(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-16 bg-[#B41F23] rounded-full flex items-center justify-center">
                {userData.role === "admin" ? (
                  <Shield className="size-8 text-white" />
                ) : (
                  <GraduationCap className="size-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{userData.name}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant={userData.role === "admin" ? "destructive" : "secondary"}>
                    {userData.role === "admin" ? "Administrator" : "Student"}
                  </Badge>
                  {userData.studentId && <Badge variant="outline">ID: {userData.studentId}</Badge>}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate(userData.role === "admin" ? "admin-dashboard" : "student-dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Personal Information */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Personal Information</CardTitle>
                <CardDescription>Manage your account details and contact information</CardDescription>
              </div>
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="size-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-[#B41F23] hover:bg-[#B41F23]/90 text-white">
                    <Save className="size-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="size-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <User className="size-4 text-muted-foreground" />
                    <span>{userData.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <Mail className="size-4 text-muted-foreground" />
                    <span>{userData.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>{userData.phone || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalNumber">{userData.role === "admin" ? "Admin ID" : "Personal Number"}</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                  <Shield className="size-4 text-muted-foreground" />
                  <span>{userData.personalNumber || userData.adminId || "Not provided"}</span>
                </div>
                <p className="text-xs text-muted-foreground">This cannot be changed for security reasons</p>
              </div>

              {userData.role === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  {isEditing ? (
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                      <GraduationCap className="size-4 text-muted-foreground" />
                      <span>{userData.department || "Not provided"}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span>{userData.address || "Not provided"}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Statistics */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Account Statistics</CardTitle>
            <CardDescription>Your activity summary on SafeZone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-[#B41F23] mb-1">12</div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">8</div>
                <p className="text-sm text-muted-foreground">Verified Reports</p>
              </div>
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">3</div>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
              </div>
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-[#8C897A] mb-1">45</div>
                <p className="text-sm text-muted-foreground">Days Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
            <CardDescription>Common tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => onNavigate("verification")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Shield className="size-6 text-[#B41F23]" />
                <div className="text-center">
                  <div className="font-medium">Verification Center</div>
                  <div className="text-xs text-muted-foreground">Review pending reports</div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => onNavigate("emergency")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <User className="size-6 text-[#8C897A]" />
                <div className="text-center">
                  <div className="font-medium">Anonymous Report</div>
                  <div className="text-xs text-muted-foreground">Report anonymously</div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => onNavigate(userData.role === "admin" ? "admin-dashboard" : "student-dashboard")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Calendar className="size-6 text-[#383838]" />
                <div className="text-center">
                  <div className="font-medium">Dashboard</div>
                  <div className="text-xs text-muted-foreground">View your dashboard</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
