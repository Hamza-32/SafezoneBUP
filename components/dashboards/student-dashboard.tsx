"use client"
import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  Shield,
  MapPin,
  Bell,
  User,
  Eye,
  ChevronRight,
  Activity,
  FileText,
  Heart,
  Search,
  Calendar,
  TrendingUp,
  Zap
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import apiClient from "@/lib/api-client"

// Sample student reports data
// Loaded from /api/emergency/my-reports. This was a hardcoded three-item
// array and the component never called an API, so a student who filed a real
// report saw three invented ones instead of their own.
interface MyReport {
  id: number
  referenceId: string | null
  title: string
  category: string
  status: string
  isAnonymous: boolean
  createdAt: string
}

/** Map the API's lowercase status onto the badge's vocabulary. */
function toBadgeStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Resolved",
  }
  return map[status] || "Pending"
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "unknown"

  const minutes = Math.floor((Date.now() - then) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} minutes ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`

  const days = Math.floor(hours / 24)
  return days === 1 ? "1 day ago" : `${days} days ago`
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    "Resolved": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: CheckCircle },
    "Pending": { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: Clock },
    "In Progress": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Activity },
  }
  const { bg, text, icon: Icon } = config[status as keyof typeof config] || config["Pending"]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

interface StudentDashboardProps {
  user?: {
    id: number
    firstName: string
    lastName: string
    email: string
    role: string
    studentId?: string
  }
}

export default function StudentDashboard({ user }: StudentDashboardProps = {}) {
  const [reports, setReports] = useState<MyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await apiClient.getMyEmergencyReports()
        const data = (response as any).data ?? response
        if (cancelled) return

        setReports(Array.isArray(data) ? data : data?.reports ?? [])
        setLoadError(null)
      } catch (error: any) {
        if (cancelled) return
        console.error("Failed to load reports:", error)
        setLoadError(
          error?.status === 401
            ? "Sign in to see your reports."
            : "Could not load your reports. Retry in a moment."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Welcome back{user ? `, ${user.firstName}` : ''}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Your safety dashboard for BUP campus
              </p>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-xs text-muted-foreground">Reports Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">2</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">15</p>
                  <p className="text-xs text-muted-foreground">Safety Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">&lt;5m</p>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Actions */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Report Emergency Card */}
          <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <AlertTriangle className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Report Emergency</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Instantly alert campus security about any emergency
                    </p>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Now
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                <div className="hidden sm:block opacity-10">
                  <Shield className="h-32 w-32 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Call Card */}
          <Card className="border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <Phone className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Emergency Contacts</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      999 reaches police, fire and ambulance, toll free, at any hour
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="bg-primary hover:bg-primary/90">
                      <a href="tel:999">
                        <Heart className="h-4 w-4 mr-2" />
                        Call 999
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                    >
                      <a href="tel:+8809666790799">
                        <Phone className="h-4 w-4 mr-2" />
                        BUP
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: MessageSquare, label: "File Complaint", color: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-600 dark:text-orange-400" },
            { icon: Search, label: "Lost & Found", color: "bg-cyan-100 dark:bg-cyan-900/30", iconColor: "text-cyan-600 dark:text-cyan-400" },
            { icon: MapPin, label: "Check-In", color: "bg-pink-100 dark:bg-pink-900/30", iconColor: "text-pink-600 dark:text-pink-400" },
            { icon: Heart, label: "Discussion", color: "bg-indigo-100 dark:bg-indigo-900/30", iconColor: "text-indigo-600 dark:text-indigo-400" },
          ].map((action, index) => (
            <Card key={index} className="cursor-pointer card-hover group">
              <CardContent className="p-4 text-center">
                <div className={`h-12 w-12 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                </div>
                <p className="font-medium text-foreground text-sm">{action.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My Reports Section */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  My Reports
                </CardTitle>
                <CardDescription>Track the status of your submitted reports</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-accent">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading && (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading your reports…</p>
              )}
              {!loading && loadError && (
                <p className="py-8 text-center text-sm text-primary">{loadError}</p>
              )}
              {!loading && !loadError && reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{report.title || report.category}</h4>
                        {report.isAnonymous && (
                          <Badge variant="outline" className="text-xs">Anonymous</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{report.referenceId || `#${report.id}`}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{relativeTime(report.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={toBadgeStatus(report.status)} />
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {!loading && !loadError && reports.length === 0 && (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">No reports yet</h3>
                <p className="text-sm text-muted-foreground">Your submitted reports will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Safety Status */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Campus Safety Status
            </CardTitle>
            <CardDescription>Current safety metrics for BUP campus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response Rate</span>
                  <span className="font-semibold text-foreground">98%</span>
                </div>
                <Progress value={98} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cases Resolved</span>
                  <span className="font-semibold text-foreground">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">User Satisfaction</span>
                  <span className="font-semibold text-foreground">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">12 Security Staff On Duty</p>
                  <p className="text-sm text-muted-foreground">24/7 campus monitoring active</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
