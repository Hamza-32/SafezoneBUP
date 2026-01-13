"use client"
import { useState } from "react"
import {
  Home,
  FileText,
  CheckCircle,
  Settings,
  Eye,
  Edit,
  Clock,
  Users,
  AlertTriangle,
  Search,
  Bell,
  User,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronRight,
  MoreHorizontal,
  MapPin,
  Calendar,
  ArrowUpRight,
  BarChart3,
  Menu,
  X,
  LogOut
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"

// Sample reports data
const reportsData = [
  {
    id: "RPT-001",
    category: "Medical Emergency",
    time: "10:30 AM",
    date: "Today",
    anonymous: true,
    status: "In Progress",
    location: "Library Building",
    priority: "High",
    reporter: "Anonymous",
  },
  {
    id: "RPT-002",
    category: "Security Issue",
    time: "09:15 AM",
    date: "Today",
    anonymous: false,
    status: "Resolved",
    location: "Parking Lot A",
    priority: "Medium",
    reporter: "Rafiq Ahmed",
  },
  {
    id: "RPT-003",
    category: "Fire Alarm",
    time: "08:45 AM",
    date: "Today",
    anonymous: false,
    status: "Pending",
    location: "Dormitory B",
    priority: "High",
    reporter: "Fatima Khan",
  },
  {
    id: "RPT-004",
    category: "Suspicious Activity",
    time: "07:20 AM",
    date: "Today",
    anonymous: true,
    status: "Resolved",
    location: "Student Center",
    priority: "Low",
    reporter: "Anonymous",
  },
  {
    id: "RPT-005",
    category: "Infrastructure",
    time: "11:45 PM",
    date: "Yesterday",
    anonymous: false,
    status: "In Progress",
    location: "Engineering Building",
    priority: "Medium",
    reporter: "Hassan Ali",
  },
]

// Navigation items
const navigationItems = [
  { title: "Dashboard", url: "#", icon: Home, isActive: true },
  { title: "All Reports", url: "#", icon: FileText },
  { title: "Resolved", url: "#", icon: CheckCircle },
  { title: "Analytics", url: "#", icon: BarChart3 },
  { title: "Settings", url: "#", icon: Settings },
]

function StatusBadge({ status }: { status: string }) {
  const config = {
    "Resolved": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: CheckCircle },
    "In Progress": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Activity },
    "Pending": { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: Clock },
  }
  const { bg, text, icon: Icon } = config[status as keyof typeof config] || config["Pending"]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    "High": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    "Medium": "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    "Low": "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config[priority as keyof typeof config] || config["Low"]}`}>
      {priority}
    </span>
  )
}

interface AdminDashboardProps {
  user?: {
    id: number
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

export default function AdminDashboard({ user }: AdminDashboardProps = {}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState("Dashboard")

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">SafeZone</h2>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-3 px-3">MENU</p>
            {navigationItems.map((item) => (
              <button
                key={item.title}
                onClick={() => setActiveNav(item.title)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeNav === item.title
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                <User className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user ? `${user.firstName} ${user.lastName}` : 'Admin User'}
                </p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Welcome back{user ? `, ${user.firstName}` : ''}! 👋
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Monitor and manage campus safety reports
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search reports..." className="pl-9 w-64" />
              </div>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reports Today</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">12</p>
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-xs">
                      <TrendingUp className="h-3 w-3" />
                      <span>+25% from yesterday</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Resolved</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">8</p>
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-xs">
                      <CheckCircle className="h-3 w-3" />
                      <span>67% resolution rate</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">4.2m</p>
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-xs">
                      <TrendingDown className="h-3 w-3" />
                      <span>-30s improvement</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Staff On Duty</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">15</p>
                    <div className="flex items-center gap-1 mt-2 text-accent text-xs">
                      <Activity className="h-3 w-3" />
                      <span>All stations covered</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Performance */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Pending Actions */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Requires Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">High Priority</span>
                    <span className="text-xl font-bold text-yellow-600">3</span>
                  </div>
                  <Progress value={30} className="h-1.5" />
                </div>
                <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">In Progress</span>
                    <span className="text-xl font-bold text-blue-600">2</span>
                  </div>
                  <Progress value={20} className="h-1.5" />
                </div>
                <div className="p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Pending Review</span>
                    <span className="text-xl font-bold text-orange-600">5</span>
                  </div>
                  <Progress value={50} className="h-1.5" />
                </div>
                <Button variant="outline" className="w-full mt-2">
                  View All Pending
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Performance Overview</CardTitle>
                  <Select defaultValue="today">
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <span className="text-2xl font-bold text-green-600">98%</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">Response Rate</p>
                    <p className="text-xs text-muted-foreground">Target: 95%</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">4.8</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">Satisfaction</p>
                    <p className="text-xs text-muted-foreground">Out of 5.0</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <span className="text-2xl font-bold text-purple-600">92%</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">Cases Closed</p>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reports Table */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Reports</CardTitle>
                  <CardDescription>Manage and track all campus safety reports</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative sm:hidden md:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-9 w-48" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Report</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Reporter</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsData.map((report) => (
                      <tr key={report.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-foreground">{report.category}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono">{report.id}</span>
                              <span>•</span>
                              <Calendar className="h-3 w-3" />
                              <span>{report.time}, {report.date}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {report.location}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm">
                              {report.anonymous ? (
                                <Badge variant="outline" className="text-xs">Anonymous</Badge>
                              ) : (
                                report.reporter
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <PriorityBadge priority={report.priority} />
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Mark as Resolved</DropdownMenuItem>
                                <DropdownMenuItem>Assign Staff</DropdownMenuItem>
                                <DropdownMenuItem>Add Note</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">Archive</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {reportsData.map((report) => (
                  <div key={report.id} className="p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-foreground">{report.category}</h4>
                        <p className="text-xs text-muted-foreground font-mono">{report.id}</p>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {report.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        {report.time}, {report.date}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <PriorityBadge priority={report.priority} />
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">View</Button>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* View All Link */}
              <div className="mt-4 text-center">
                <Button variant="ghost" className="text-accent">
                  View All Reports
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
