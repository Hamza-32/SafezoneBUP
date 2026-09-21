"use client"
import { useState } from "react"
import type React from "react"

import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Clock, 
  Shield, 
  ArrowLeft, 
  CheckCircle, 
  User, 
  MessageSquare,
  Eye,
  EyeOff,
  Loader2,
  Heart,
  Flame,
  AlertOctagon,
  Car,
  Siren
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface EmergencyRequestProps {
  onNavigate: (page: string) => void
}

const emergencyTypes = [
  { id: "medical", label: "Medical", icon: Heart, color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" },
  { id: "fire", label: "Fire", icon: Flame, color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
  { id: "security", label: "Security", icon: Shield, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  { id: "accident", label: "Accident", icon: Car, color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
  { id: "violence", label: "Violence", icon: AlertOctagon, color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  { id: "other", label: "Other", icon: Siren, color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
]

export default function EmergencyRequest({ onNavigate }: EmergencyRequestProps) {
  const [formData, setFormData] = useState({
    emergencyType: "",
    location: "",
    description: "",
    contactNumber: "",
    studentId: "",
    isForSomeoneElse: false,
    isAnonymous: false,
    reporterName: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [referenceId, setReferenceId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  /**
   * Best-effort coordinates for the responder.
   *
   * Never blocks the report: if the browser denies permission or takes too
   * long, the report still goes out with the typed location only.
   */
  const captureCoordinates = (): Promise<{ latitude: number; longitude: number } | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return Promise.resolve(null)
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      )
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    const typeLabel =
      emergencyTypes.find((type) => type.id === formData.emergencyType)?.label ?? "Emergency"

    // The report schema has no dedicated fields for these, so they are kept
    // with the description where a responder will actually read them.
    const contextLines = [
      formData.isForSomeoneElse ? "Reported on behalf of someone else." : null,
      formData.reporterName ? `Reporter: ${formData.reporterName}` : null,
      formData.contactNumber ? `Contact number: ${formData.contactNumber}` : null,
      formData.studentId ? `Student ID: ${formData.studentId}` : null,
    ].filter(Boolean)

    const description = [formData.description.trim(), ...contextLines].filter(Boolean).join("\n")

    try {
      const coordinates = await captureCoordinates()

      const response = await fetch("/api/emergency/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${typeLabel} emergency${formData.location ? ` at ${formData.location}` : ""}`,
          description: description || `${typeLabel} emergency reported.`,
          category: formData.emergencyType,
          location: formData.location,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          isAnonymous: formData.isAnonymous,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Your report could not be submitted.")
      }

      setReferenceId(result.data?.referenceId ?? null)
      setIsSubmitted(true)
    } catch (error: any) {
      // Never show a success screen for a report that did not reach the
      // server: someone in danger would believe help is on the way.
      setSubmitError(
        error?.message ||
          "Your report could not be submitted. Please call campus security directly."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-2 border-green-200 dark:border-green-800 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
            <CardContent className="p-8 text-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Emergency Reported</h2>
              <p className="text-muted-foreground mb-6">
                Your emergency request has been submitted successfully. Campus security has been notified and will respond immediately.
              </p>
              
              {referenceId && (
                <div className="p-4 rounded-xl bg-muted/50 mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Reference ID</p>
                  <p className="font-mono text-lg font-bold text-foreground">{referenceId}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Quote this reference when following up.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">Estimated response time: Under 5 minutes</span>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => onNavigate("login")}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={() => {
                    setIsSubmitted(false)
                    setReferenceId(null)
                    setSubmitError(null)
                    setFormData({
                      emergencyType: "",
                      location: "",
                      description: "",
                      contactNumber: "",
                      studentId: "",
                      isForSomeoneElse: false,
                      isAnonymous: false,
                      reporterName: "",
                    })
                  }} 
                  variant="outline" 
                  className="w-full"
                >
                  Report Another Emergency
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-primary-foreground hover:bg-white/10"
              onClick={() => onNavigate("login")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Emergency Report</h1>
                <p className="text-sm text-primary-foreground/80">BUP Campus Safety</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Emergency Hotline Card */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Emergency Hotline</h3>
                  <p className="text-sm text-muted-foreground">For life-threatening situations, call immediately</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 sm:flex-none border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <a href="tel:+8809666790799">
                    <Phone className="h-4 w-4 mr-2" />
                    BUP
                  </a>
                </Button>
                <Button
                  asChild
                  className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
                >
                  <a href="tel:999">
                    <Siren className="h-4 w-4 mr-2" />
                    999
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Form */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Emergency Details
            </CardTitle>
            <CardDescription>
              Provide as much information as possible for faster response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Emergency Type Selection */}
              <div className="space-y-3">
                <Label className="text-base">What type of emergency?</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {emergencyTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, emergencyType: type.id })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        formData.emergencyType === type.id
                          ? `${type.color} border-current scale-105`
                          : 'border-border hover:border-muted-foreground/30 bg-muted/30'
                      }`}
                    >
                      <type.icon className={`h-5 w-5 mx-auto mb-1 ${
                        formData.emergencyType === type.id ? '' : 'text-muted-foreground'
                      }`} />
                      <span className={`text-xs font-medium ${
                        formData.emergencyType === type.id ? '' : 'text-muted-foreground'
                      }`}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    type="text"
                    placeholder="Building name, room number, or specific location"
                    className="pl-10"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="Describe the emergency situation in detail. Include any injuries, number of people affected, or immediate dangers..."
                    rows={4}
                    className="resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                  <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                    {formData.description.length}/500
                  </span>
                </div>
              </div>

              {/* Contact Number */}
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Your Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contactNumber"
                    type="tel"
                    placeholder="+880 1XXX-XXXXXX"
                    className="pl-10"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Label htmlFor="isForSomeoneElse" className="cursor-pointer font-medium">
                        Reporting for someone else
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        You are not the person in the emergency
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="isForSomeoneElse"
                    checked={formData.isForSomeoneElse}
                    onCheckedChange={(checked) => setFormData({ ...formData, isForSomeoneElse: checked })}
                  />
                </div>

                {!formData.isForSomeoneElse && (
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        {formData.isAnonymous ? (
                          <EyeOff className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div>
                        <Label htmlFor="isAnonymous" className="cursor-pointer font-medium">
                          Submit anonymously
                        </Label>
                        <p className="text-xs text-muted-foreground">Your identity will be protected</p>
                      </div>
                    </div>
                    <Switch
                      id="isAnonymous"
                      checked={formData.isAnonymous}
                      onCheckedChange={(checked) => setFormData({ ...formData, isAnonymous: checked })}
                    />
                  </div>
                )}
              </div>

              {/* Additional fields when reporting for someone else */}
              {formData.isForSomeoneElse && (
                <div className="space-y-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Additional Information Required
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID (of the person in need)</Label>
                      <Input
                        id="studentId"
                        type="text"
                        placeholder="Enter student ID if known"
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reporterName">Your Name</Label>
                      <Input
                        id="reporterName"
                        type="text"
                        placeholder="Enter your name"
                        value={formData.reporterName}
                        onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submission failure. Shown in place of a success screen so
                  nobody is told help is coming when the report never sent. */}
              {submitError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-200">
                        Report not submitted
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{submitError}</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                        If this is an active emergency, call campus security directly instead of
                        retrying.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 emergency-pulse shadow-lg shadow-primary/25"
                disabled={isSubmitting || !formData.emergencyType}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting Emergency...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Submit Emergency Report
                  </>
                )}
              </Button>

              {/* Info text */}
              <p className="text-xs text-center text-muted-foreground">
                By submitting, you confirm that this is a genuine emergency. False reports may result in disciplinary action.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
