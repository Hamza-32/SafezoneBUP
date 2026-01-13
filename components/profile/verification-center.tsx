"use client"
import { useState } from "react"
import { CheckCircle, XCircle, AlertTriangle, Eye, Clock, User, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Sample pending verifications
const pendingVerifications = [
  {
    id: "VER-001",
    type: "emergency",
    category: "Medical Emergency",
    reportedBy: "Anonymous",
    timestamp: "2 hours ago",
    location: "Library Building",
    description: "Student reported feeling dizzy and requested medical assistance",
    status: "pending",
    referenceId: "EMG-123456",
  },
  {
    id: "VER-002",
    type: "complaint",
    category: "Harassment",
    reportedBy: "John Smith",
    timestamp: "1 day ago",
    location: "Student Center",
    description: "Complaint about inappropriate behavior during study session",
    status: "pending",
    referenceId: "CMP-789012",
  },
  {
    id: "VER-003",
    type: "emergency",
    category: "Security Issue",
    reportedBy: "Campus Security",
    timestamp: "3 days ago",
    location: "Parking Lot B",
    description: "Suspicious activity reported near student vehicle",
    status: "verified",
    referenceId: "EMG-345678",
  },
]

interface VerificationCenterProps {
  userData: any
  onNavigate: (page: string) => void
}

export default function VerificationCenter({ userData, onNavigate }: VerificationCenterProps) {
  const [verifications, setVerifications] = useState(pendingVerifications)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const handleVerification = (id: string, action: "approve" | "decline") => {
    setVerifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action === "approve" ? "verified" : "declined" } : item)),
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="size-3" />
            Pending Verification
          </Badge>
        )
      case "verified":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="size-3" />
            Verified
          </Badge>
        )
      case "declined":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <XCircle className="size-3" />
            Declined
          </Badge>
        )
      default:
        return null
    }
  }

  const getTypeIcon = (type: string) => {
    return type === "emergency" ? AlertTriangle : MessageSquare
  }

  const getTypeColor = (type: string) => {
    return type === "emergency" ? "text-[#B41F23]" : "text-[#837E6B]"
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Verification Center</h1>
              <p className="text-muted-foreground">Review and verify reports made on your behalf</p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate("student-dashboard")}
              className="border-border text-foreground"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* User Info */}
        <Card className="shadow-md bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-[#B41F23] rounded-full flex items-center justify-center">
                <User className="size-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{userData.name}</h3>
                <p className="text-sm text-muted-foreground">Student ID: {userData.studentId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-[#8C897A] bg-gradient-to-r from-[#8C897A]/5 to-[#8C897A]/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-[#8C897A] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Verification Required</p>
                <p className="text-muted-foreground">
                  The following reports were made using your Student ID. Please verify if these were made by you or
                  someone you authorized. This helps us maintain accurate records and prevent misuse.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Reports Requiring Verification</h2>

          {verifications.filter((item) => item.status === "pending").length === 0 ? (
            <Card className="shadow-md bg-card border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle className="size-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending verifications at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {verifications
                .filter((item) => item.status === "pending")
                .map((item) => {
                  const TypeIcon = getTypeIcon(item.type)
                  return (
                    <Card key={item.id} className="shadow-md bg-card border-border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <TypeIcon className={`size-5 ${getTypeColor(item.type)} flex-shrink-0 mt-0.5`} />
                            <div>
                              <CardTitle className="text-base font-semibold text-foreground">{item.category}</CardTitle>
                              <CardDescription className="text-sm text-muted-foreground">
                                Reported by: {item.reportedBy} • {item.timestamp}
                              </CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-1">Location: {item.location}</p>
                            <p className="text-foreground">{item.description}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                                  <Eye className="size-4 mr-2" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Report Details</DialogTitle>
                                  <DialogDescription>Reference ID: {item.referenceId}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium text-foreground mb-1">Category</h4>
                                    <p className="text-muted-foreground">{item.category}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-foreground mb-1">Location</h4>
                                    <p className="text-muted-foreground">{item.location}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-foreground mb-1">Description</h4>
                                    <p className="text-muted-foreground">{item.description}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-foreground mb-1">Reported By</h4>
                                    <p className="text-muted-foreground">{item.reportedBy}</p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Separator orientation="vertical" className="h-6" />

                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleVerification(item.id, "approve")}
                            >
                              <CheckCircle className="size-4 mr-2" />
                              Verify (Yes, this was me)
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVerification(item.id, "decline")}
                            >
                              <XCircle className="size-4 mr-2" />
                              Decline (Not me)
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>

        {/* Verified Reports */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Verified Reports</h2>

          {verifications.filter((item) => item.status !== "pending").length === 0 ? (
            <Card className="shadow-md bg-card border-border">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No verified reports yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {verifications
                .filter((item) => item.status !== "pending")
                .map((item) => {
                  const TypeIcon = getTypeIcon(item.type)
                  return (
                    <Card key={item.id} className="shadow-sm bg-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TypeIcon className={`size-4 ${getTypeColor(item.type)}`} />
                            <div>
                              <h4 className="font-medium text-foreground">{item.category}</h4>
                              <p className="text-sm text-muted-foreground">
                                {item.timestamp} • {item.location}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
