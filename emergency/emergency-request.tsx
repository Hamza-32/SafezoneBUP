"use client"
import { useState } from "react"
import type React from "react"

import { AlertTriangle, Phone, MapPin, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface EmergencyRequestProps {
  onNavigate: (page: string) => void
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 2000)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="size-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">Emergency Reported</h2>
            <p className="text-green-700 mb-4">
              Your emergency request has been submitted successfully. Campus security has been notified.
            </p>
            <p className="text-sm text-green-600 mb-6">
              Reference ID: <span className="font-mono font-semibold">EMG-{Date.now().toString().slice(-6)}</span>
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => onNavigate("login")}
                className="w-full bg-[#B41F23] hover:bg-[#B41F23]/90 text-white"
              >
                Go to Login
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                Report Another Emergency
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-[#B41F23] text-white animate-pulse-glow">
              <AlertTriangle className="size-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#353535]">Emergency Request</h1>
          <p className="text-[#837E6B]">Report an emergency situation immediately</p>
        </div>

        {/* Emergency Contact Banner */}
        <Card className="border-[#B41F23] bg-gradient-to-r from-[#B41F23]/5 to-[#B41F23]/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="size-5 text-[#B41F23]" />
                <div>
                  <p className="font-medium text-[#353535]">Emergency Hotline</p>
                  <p className="text-sm text-[#837E6B]">Call immediately for life-threatening situations</p>
                </div>
              </div>
              <Button
                className="bg-[#B41F23] hover:bg-[#B41F23]/90 text-white animate-glow"
                onClick={() => window.open("tel:911")}
              >
                Call 911
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Form */}
        <Card className="shadow-lg border-[#8C897A]/20">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#353535] flex items-center gap-2">
              <Clock className="size-5 text-[#B41F23]" />
              Emergency Details
            </CardTitle>
            <CardDescription className="text-[#837E6B]">
              Provide as much information as possible to help us respond quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyType">Emergency Type</Label>
                <Select
                  value={formData.emergencyType}
                  onValueChange={(value) => setFormData({ ...formData, emergencyType: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select emergency type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">Medical Emergency</SelectItem>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="security">Security Threat</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="violence">Violence/Assault</SelectItem>
                    <SelectItem value="other">Other Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#837E6B]" />
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the emergency situation in detail..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="Your phone number for immediate contact"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isForSomeoneElse"
                  checked={formData.isForSomeoneElse}
                  onCheckedChange={(checked) => setFormData({ ...formData, isForSomeoneElse: checked })}
                />
                <Label htmlFor="isForSomeoneElse" className="text-sm">
                  I'm reporting this on behalf of someone else
                </Label>
              </div>

              {!formData.isForSomeoneElse && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isAnonymous"
                    checked={formData.isAnonymous}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAnonymous: checked })}
                  />
                  <Label htmlFor="isAnonymous" className="text-sm">
                    Submit this report anonymously (I can verify it later in my profile)
                  </Label>
                </div>
              )}

              {formData.isForSomeoneElse && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID (of the person in need)</Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="Enter student ID"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reporterName">Your Name (Reporter)</Label>
                    <Input
                      id="reporterName"
                      type="text"
                      placeholder="Enter your name"
                      value={formData.reporterName}
                      onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full bg-[#B41F23] hover:bg-[#B41F23]/90 text-white font-semibold animate-pulse-glow"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Clock className="size-4 mr-2 animate-spin" />
                    Submitting Emergency...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-4 mr-2" />
                    Submit Emergency Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back to Login */}
        <div className="text-center">
          <Button variant="outline" onClick={() => onNavigate("login")} className="border-[#8C897A] text-[#353535]">
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  )
}
