"use client"
import { useState } from "react"
import type React from "react"

import { MessageSquare, User, MapPin, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface ComplaintFormProps {
  onNavigate: (page: string) => void
}

export default function ComplaintForm({ onNavigate }: ComplaintFormProps) {
  const [formData, setFormData] = useState({
    studentId: "",
    complaintType: "",
    location: "",
    description: "",
    reporterName: "",
    reporterContact: "",
    incidentDate: "",
    isAnonymous: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [referenceId, setReferenceId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    // The complaint schema has no dedicated fields for these, so they are
    // kept with the description where a reviewer will read them.
    const contextLines = [
      formData.reporterName ? `Reporter: ${formData.reporterName}` : null,
      formData.reporterContact ? `Contact: ${formData.reporterContact}` : null,
      formData.studentId ? `Student ID involved: ${formData.studentId}` : null,
      formData.incidentDate ? `Incident date: ${formData.incidentDate}` : null,
    ].filter(Boolean)

    const description = [formData.description.trim(), ...contextLines].filter(Boolean).join("\n")

    try {
      const response = await fetch("/api/complaint/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${formData.complaintType || "General"} complaint`,
          description,
          category: formData.complaintType,
          location: formData.location || undefined,
          isAnonymous: formData.isAnonymous,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Your complaint could not be submitted.")
      }

      setReferenceId(result.data?.referenceId ?? null)
      setIsSubmitted(true)
    } catch (error: any) {
      setSubmitError(error?.message || "Your complaint could not be submitted. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <div className="size-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="size-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-blue-800 mb-2">Complaint Submitted</h2>
            <p className="text-blue-700 mb-4">
              Your complaint has been submitted successfully. The student will be notified to verify this report.
            </p>
            {referenceId && (
              <p className="text-sm text-blue-600 mb-6">
                Reference ID: <span className="font-mono font-semibold">{referenceId}</span>
              </p>
            )}
            <div className="space-y-3">
              <Button
                onClick={() => onNavigate("login")}
                className="w-full bg-[#B41F23] hover:bg-[#B41F23]/90 text-white"
              >
                Go to Login
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                Submit Another Complaint
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-[#837E6B] text-white">
              <MessageSquare className="size-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">File a Complaint</h1>
          <p className="text-muted-foreground">Report non-emergency issues using student ID</p>
        </div>

        {/* Info Banner */}
        <Card className="border-[#8C897A] bg-gradient-to-r from-[#8C897A]/5 to-[#8C897A]/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <User className="size-5 text-[#8C897A] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Anonymous Complaint System</p>
                <p className="text-muted-foreground">
                  You can file a complaint on behalf of a student using their Student ID. The student will receive a
                  notification to verify if this complaint was made by them or someone they know.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complaint Form */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Complaint Details</CardTitle>
            <CardDescription className="text-muted-foreground">
              Fill in the details of the complaint you want to report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID (Person involved)</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="Enter the student ID of the person involved"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">This student will be notified to verify the complaint</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaintType">Complaint Type</Label>
                <Select
                  value={formData.complaintType}
                  onValueChange={(value) => setFormData({ ...formData, complaintType: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select complaint type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="bullying">Bullying</SelectItem>
                    <SelectItem value="discrimination">Discrimination</SelectItem>
                    <SelectItem value="misconduct">Academic Misconduct</SelectItem>
                    <SelectItem value="property">Property Damage</SelectItem>
                    <SelectItem value="noise">Noise Complaint</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidentDate">Incident Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="incidentDate"
                    type="date"
                    className="pl-10"
                    value={formData.incidentDate}
                    onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="location"
                    type="text"
                    placeholder="Where did this incident occur?"
                    className="pl-10"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed description of the incident..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporterName">Your Name (Optional)</Label>
                <Input
                  id="reporterName"
                  type="text"
                  placeholder="Enter your name (optional for anonymous reporting)"
                  value={formData.reporterName}
                  onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporterContact">Your Contact (Optional)</Label>
                <Input
                  id="reporterContact"
                  type="text"
                  placeholder="Phone or email for follow-up (optional)"
                  value={formData.reporterContact}
                  onChange={(e) => setFormData({ ...formData, reporterContact: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isAnonymous"
                  checked={formData.isAnonymous}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAnonymous: checked })}
                />
                <Label htmlFor="isAnonymous" className="text-sm">
                  Submit anonymously (I can verify this was me later)
                </Label>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg border border-red-300 bg-red-50 text-sm text-red-700"
                >
                  {submitError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#837E6B] hover:bg-[#837E6B]/90 text-white font-semibold"
                disabled={isSubmitting || !formData.complaintType || !formData.description.trim()}
              >
                {isSubmitting ? (
                  <>
                    <MessageSquare className="size-4 mr-2 animate-spin" />
                    Submitting Complaint...
                  </>
                ) : (
                  <>
                    <MessageSquare className="size-4 mr-2" />
                    Submit Complaint
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back to Login */}
        <div className="text-center">
          <Button variant="outline" onClick={() => onNavigate("login")} className="border-border text-foreground">
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  )
}
