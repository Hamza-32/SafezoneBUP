"use client"
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  Bus,
  Clock,
  CheckCircle,
  Shield,
  MapPin,
  Bell,
  User,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Sample student reports data
const studentReports = [
  {
    id: "RPT-001",
    category: "Medical Emergency",
    status: "Resolved",
    timestamp: "2 hours ago",
    anonymous: false,
  },
  {
    id: "RPT-003",
    category: "Suspicious Activity",
    status: "Pending",
    timestamp: "1 day ago",
    anonymous: true,
  },
  {
    id: "RPT-005",
    category: "Infrastructure Issue",
    status: "Pending",
    timestamp: "3 days ago",
    anonymous: false,
  },
]

// Sample bus locations
const busLocations = [
  { id: "BUS-01", route: "Campus Loop", location: "Library Stop", eta: "3 min" },
  { id: "BUS-02", route: "Dormitory Route", location: "Student Center", eta: "7 min" },
  { id: "BUS-03", route: "Parking Shuttle", location: "Lot C", eta: "12 min" },
]

function StatusBadge({ status }: { status: string }) {
  const variant = status === "Resolved" ? "default" : "destructive"
  const icon = status === "Resolved" ? CheckCircle : Clock
  const Icon = icon

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="size-3" />
      {status}
    </Badge>
  )
}

export default function StudentDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#B41F23] text-white">
            <Shield className="size-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#353535]">SafeZone</h1>
            <p className="text-xs text-[#837E6B]">Campus Safety</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            <span className="absolute -top-1 -right-1 size-2 bg-[#B41F23] rounded-full"></span>
            <span className="sr-only">Notifications</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="size-4" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[#353535]">Stay Safe on Campus</h2>
          <p className="text-[#837E6B]">Report emergencies, track incidents, and stay informed about campus safety.</p>
        </div>

        {/* Emergency Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Report Emergency */}
          <Card className="border-2 border-[#B41F23] bg-gradient-to-r from-[#B41F23]/5 to-[#B41F23]/10 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <AlertTriangle className="size-12 text-[#B41F23] mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-[#353535] mb-2">Report Emergency</h3>
                  <p className="text-sm text-[#837E6B] mb-4">Report any emergency situation immediately</p>
                </div>

                <div className="flex items-center space-x-2 justify-center">
                  <Switch id="anonymous" />
                  <Label htmlFor="anonymous" className="text-sm text-[#837E6B]">
                    Submit Anonymously
                  </Label>
                </div>

                <Button
                  size="lg"
                  className="w-full bg-[#B41F23] hover:bg-[#B41F23]/90 text-white font-semibold animate-pulse-glow"
                >
                  <AlertTriangle className="size-5 mr-2" />
                  Report Emergency
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Call */}
          <Card className="border-2 border-[#B41F23] bg-gradient-to-r from-[#B41F23]/5 to-[#B41F23]/10 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <Phone className="size-12 text-[#B41F23] mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-[#353535] mb-2">Emergency Call</h3>
                  <p className="text-sm text-[#837E6B] mb-4">Direct line to campus security</p>
                </div>

                <Button
                  size="lg"
                  className="w-full bg-[#B41F23] hover:bg-[#B41F23]/90 text-white font-semibold animate-glow"
                >
                  <Phone className="size-5 mr-2" />
                  Call Security
                </Button>

                <p className="text-xs text-center text-[#837E6B]">Emergency: (555) 911 | Security: (555) 123-4567</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Safety Stats */}
        <Card className="shadow-md bg-white border-[#8C897A]/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#353535] flex items-center gap-2">
              <Shield className="size-5 text-[#B41F23]" />
              Today's Safety Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">5</div>
                <p className="text-sm text-green-700">Cases Solved Today</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">2.3m</div>
                <p className="text-sm text-blue-700">Avg Response Time</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">12</div>
                <p className="text-sm text-purple-700">Staff On Duty</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Anonymous Complaint */}
          <Card className="shadow-md bg-white border-[#8C897A]/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <MessageSquare className="size-8 text-[#837E6B] mx-auto mb-3" />
              <h3 className="font-semibold text-[#353535] mb-2">Anonymous Complaint</h3>
              <p className="text-sm text-[#837E6B] mb-4">Report non-emergency issues</p>
              <Button variant="outline" className="w-full border-[#8C897A] text-[#353535]">
                Submit Complaint
              </Button>
            </CardContent>
          </Card>

          {/* Bus Tracker */}
          <Card className="shadow-md bg-white border-[#8C897A]/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Bus className="size-8 text-[#837E6B] mx-auto mb-3" />
              <h3 className="font-semibold text-[#353535] mb-2">Campus Bus Tracker</h3>
              <p className="text-sm text-[#837E6B] mb-4">Track bus locations</p>
              <Button variant="outline" className="w-full border-[#8C897A] text-[#353535]">
                View Bus Locations
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* My Reports */}
        <Card className="shadow-md bg-white border-[#8C897A]/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-[#353535]">My Reports</CardTitle>
              <Button variant="ghost" size="sm" className="text-[#837E6B]">
                View All
              </Button>
            </div>
            <CardDescription className="text-[#837E6B]">Track your submitted reports and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border border-[#8C897A]/20 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[#353535]">{report.category}</h4>
                      {report.anonymous && (
                        <Badge variant="outline" className="text-xs">
                          Anonymous
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#837E6B]">
                      <Clock className="size-4" />
                      {report.timestamp}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={report.status} />
                    <Button variant="ghost" size="icon" className="size-8">
                      <Eye className="size-4" />
                      <span className="sr-only">View details</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bus Locations */}
        <Card className="shadow-md bg-white border-[#8C897A]/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#353535] flex items-center gap-2">
              <Bus className="size-5 text-[#837E6B]" />
              Campus Bus Locations
            </CardTitle>
            <CardDescription className="text-[#837E6B]">
              Real-time bus tracking (placeholder for map integration)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {busLocations.map((bus) => (
                <div
                  key={bus.id}
                  className="flex items-center justify-between p-3 border border-[#8C897A]/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-[#837E6B] rounded-full flex items-center justify-center">
                      <Bus className="size-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#353535]">{bus.route}</h4>
                      <div className="flex items-center gap-1 text-sm text-[#837E6B]">
                        <MapPin className="size-3" />
                        {bus.location}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#353535]">{bus.eta}</div>
                    <div className="text-xs text-[#837E6B]">ETA</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-[#837E6B]">🗺️ Interactive map integration coming soon</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
