"use client"
import {
  Home,
  FileText,
  CheckCircle,
  Bus,
  Settings,
  Eye,
  Edit,
  Clock,
  Users,
  AlertTriangle,
  Filter,
  Search,
  Bell,
  User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

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
  },
]

// Navigation items
const navigationItems = [
  {
    title: "Home",
    url: "#",
    icon: Home,
    isActive: true,
  },
  {
    title: "All Reports",
    url: "#",
    icon: FileText,
  },
  {
    title: "Resolved",
    url: "#",
    icon: CheckCircle,
  },
  {
    title: "Bus Tracker",
    url: "#",
    icon: Bus,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]

function AdminSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <AlertTriangle className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">SafeZone</span>
                <span className="text-xs">Admin Dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

function StatusBadge({ status }: { status: string }) {
  const getVariant = (status: string) => {
    switch (status) {
      case "Resolved":
        return "default"
      case "In Progress":
        return "secondary"
      case "Pending":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <Badge variant={getVariant(status)} className="text-xs">
      {status}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const getVariant = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "secondary"
      case "Low":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <Badge variant={getVariant(priority)} className="text-xs">
      {priority}
    </Badge>
  )
}

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white px-4 shadow-sm">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#353535]">Admin Dashboard</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="size-4" />
                <span className="absolute -top-1 -right-1 size-3 bg-[#B41F23] rounded-full"></span>
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
          <main className="flex-1 space-y-6 p-4 md:p-6">
            {/* Analytics Section */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="shadow-md bg-white border-[#8C897A]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#837E6B]">Reports Today</CardTitle>
                  <FileText className="size-4 text-[#B41F23]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#353535]">12</div>
                  <p className="text-xs text-[#837E6B]">+3 from yesterday</p>
                </CardContent>
              </Card>

              <Card className="shadow-md bg-white border-[#8C897A]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#837E6B]">Resolved</CardTitle>
                  <CheckCircle className="size-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#353535]">8</div>
                  <p className="text-xs text-[#837E6B]">67% resolution rate</p>
                </CardContent>
              </Card>

              <Card className="shadow-md bg-white border-[#8C897A]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#837E6B]">Avg Response Time</CardTitle>
                  <Clock className="size-4 text-[#8C897A]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#353535]">4.2m</div>
                  <p className="text-xs text-[#837E6B]">-30s from yesterday</p>
                </CardContent>
              </Card>

              <Card className="shadow-md bg-white border-[#8C897A]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#837E6B]">Active Staff</CardTitle>
                  <Users className="size-4 text-[#383838]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#353535]">15</div>
                  <p className="text-xs text-[#837E6B]">On duty now</p>
                </CardContent>
              </Card>
            </div>

            {/* Reports Management */}
            <Card className="shadow-md bg-white border-[#8C897A]/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-[#353535]">Report Management</CardTitle>
                    <CardDescription className="text-[#837E6B]">
                      Manage and track all campus safety reports
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[#837E6B]" />
                      <Input placeholder="Search reports..." className="pl-8 w-64" />
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
                    <Button variant="outline" size="icon">
                      <Filter className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Anonymous</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsData.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.id}</TableCell>
                        <TableCell>{report.category}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{report.time}</div>
                            <div className="text-[#837E6B]">{report.date}</div>
                          </div>
                        </TableCell>
                        <TableCell>{report.location}</TableCell>
                        <TableCell>
                          {report.anonymous ? (
                            <Badge variant="outline" className="text-xs">
                              Anonymous
                            </Badge>
                          ) : (
                            <span className="text-[#837E6B] text-sm">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={report.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={report.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="size-8">
                              <Eye className="size-4" />
                              <span className="sr-only">View report</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8">
                              <Edit className="size-4" />
                              <span className="sr-only">Update status</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
