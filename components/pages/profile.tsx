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
  // These are the four columns PUT /api/auth/profile accepts. The form used
  // to send name/email/phone/department/personalNumber/address, which shares
  // not one field with the schema, so Zod stripped the whole body and every
  // save returned 400 "No fields to update". department and address were
  // never storable at all — the users table has no such columns.
  const [formData, setFormData] = useState({
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    phoneNumber: userData.phoneNumber || "",
    studentId: userData.studentId || "",
  })

  const handleSave = () => {
    // Send only what changed, so a blank optional field is left alone rather
    // than overwriting a stored value with an empty string.
    const changed: Record<string, string> = {}
    if (formData.firstName.trim()) changed.firstName = formData.firstName.trim()
    if (formData.lastName.trim()) changed.lastName = formData.lastName.trim()
    if (formData.phoneNumber.trim()) changed.phoneNumber = formData.phoneNumber.trim()
    if (formData.studentId.trim()) changed.studentId = formData.studentId.trim()

    onUpdateProfile(changed)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      phoneNumber: userData.phoneNumber || "",
      studentId: userData.studentId || "",
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
                <Label htmlFor="firstName">First Name</Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <User className="size-4 text-muted-foreground" />
                    <span>{userData.firstName || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <User className="size-4 text-muted-foreground" />
                    <span>{userData.lastName || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                  <Mail className="size-4 text-muted-foreground" />
                  <span>{userData.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your address identifies your account and cannot be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>{userData.phoneNumber || "Not provided"}</span>
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
                  <Label htmlFor="studentId">Student ID</Label>
                  {isEditing ? (
                    <Input
                      id="studentId"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                      <GraduationCap className="size-4 text-muted-foreground" />
                      <span>{userData.studentId || "Not provided"}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Statistics */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Account</CardTitle>
            <CardDescription>What this account is and how it stands</CardDescription>
          </CardHeader>
          <CardContent>
            {/* These four tiles were the literals 12 / 8 / 3 / 45 — "Total
                Reports", "Verified Reports", "Pending Verification" and "Days
                Active" — shown identically to every user regardless of what
                they had actually done. Nothing counted reports here, so the
                figures are replaced with facts the account record carries. */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-[#B41F23] mb-1">
                  {userData.createdAt
                    ? Math.max(
                        0,
                        Math.floor(
                          (Date.now() - new Date(userData.createdAt).getTime()) / 86400000
                        )
                      )
                    : "—"}
                </div>
                <p className="text-sm text-muted-foreground">Days since joining</p>
              </div>
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {userData.isVerified ? "Verified" : "Pending"}
                </div>
                <p className="text-sm text-muted-foreground">Account status</p>
              </div>
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1 capitalize">
                  {userData.role || "student"}
                </div>
                <p className="text-sm text-muted-foreground">Role</p>
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
