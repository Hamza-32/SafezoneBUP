"use client"
import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { BottomNav } from "@/components/bottom-nav"
import Homepage from "@/components/pages/homepage"
import Profile from "@/components/pages/profile"
import Login from "@/components/auth/login"
import Signup from "@/components/auth/signup"
import EmergencyRequest from "@/components/emergency/emergency-request"
import ComplaintForm from "@/components/emergency/complaint-form"
import VerificationCenter from "@/components/profile/verification-center"
import AdminDashboard from "@/components/dashboards/admin-dashboard"
import StudentDashboard from "@/components/dashboards/student-dashboard"
import SafetyResourceHub from "@/components/safety/resource-hub"
import AnonymousDiscussionBoard from "@/components/safety/anonymous-discussion"
import SafetyCheckin from "@/components/safety/check-in"
import LostAndFound from "@/components/safety/lost-and-found"
import BUPInfo from "@/components/pages/bup-info"
import apiClient from "@/lib/api-client"
import { toast } from "sonner"

export default function SafezoneBUPApp() {
  const [currentPage, setCurrentPage] = useState("home")
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from token on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("safezonebup-token")
        if (token) {
          apiClient.setToken(token)
          const response = await apiClient.getCurrentUser()
          
          // Extract user from the response - response is the full API response
          const userData = (response as any).data?.user || response.user
          
          if (userData) {
            setUser(userData)
          }
        }
      } catch (error) {
        console.error("Failed to load user:", error)
        // Clear invalid token
        localStorage.removeItem("safezonebup-token")
        apiClient.setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleLogin = async (role: "admin" | "student", loginData: any) => {
    try {
      setIsLoading(true)
      const response = await apiClient.login(loginData.email, loginData.password)
      
      // Extract user from the response - response is the full API response
      const userData = (response as any).data?.user || response.user
      
      if (!userData) {
        console.error("Full response:", response)
        throw new Error("User data not found in response")
      }
      
      setUser(userData)
      toast.success("Login successful!")
      
      // Navigate to appropriate dashboard based on user's role from the response
      if (userData.role === "admin") {
        setCurrentPage("admin-dashboard")
      } else if (userData.role === "student") {
        setCurrentPage("student-dashboard")
      } else {
        setCurrentPage("home")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      toast.error(error.message || "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (role: "admin" | "student", signupData: any) => {
    try {
      setIsLoading(true)
      const response = await apiClient.register({
        ...signupData,
        role
      })
      
      // Extract user from the response - response is the full API response
      const userData = (response as any).data?.user || response.user
      
      if (!userData) {
        console.error("Full response:", response)
        throw new Error("User data not found in response")
      }
      
      setUser(userData)
      toast.success("Registration successful!")
      
      if (userData.role === "admin") {
        setCurrentPage("admin-dashboard")
      } else if (userData.role === "student") {
        setCurrentPage("student-dashboard")
      } else {
        setCurrentPage("home")
      }
    } catch (error: any) {
      console.error("Signup error:", error)
      toast.error(error.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await apiClient.logout()
      setUser(null)
      setCurrentPage("home")
      toast.success("Logged out successfully")
    } catch (error: any) {
      console.error("Logout error:", error)
      // Still clear user data even if logout request fails
      setUser(null)
      setCurrentPage("home")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  const handleUpdateProfile = async (profileData: any) => {
    try {
      setIsLoading(true)
      const response = await apiClient.updateProfile(profileData)
      setUser(response.user)
      toast.success("Profile updated successfully")
    } catch (error: any) {
      console.error("Profile update error:", error)
      toast.error(error.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading spinner while checking authentication
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#B41F23]"></div>
      </div>
    )
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <Homepage onNavigate={handleNavigate} />

      case "login":
        return <Login onLogin={handleLogin} onNavigate={handleNavigate} />

      case "signup":
        return <Signup onSignup={handleSignup} onNavigate={handleNavigate} />

      case "emergency":
        return <EmergencyRequest onNavigate={handleNavigate} />

      case "complaint":
        return <ComplaintForm onNavigate={handleNavigate} />

      case "profile":
        return user ? (
          <Profile userData={user} onNavigate={handleNavigate} onUpdateProfile={handleUpdateProfile} />
        ) : (
          <Homepage onNavigate={handleNavigate} />
        )

      case "verification":
        return user ? (
          <VerificationCenter userData={user} onNavigate={handleNavigate} />
        ) : (
          <Homepage onNavigate={handleNavigate} />
        )

      case "admin-dashboard":
        return user?.role === "admin" ? <AdminDashboard user={user} /> : <Homepage onNavigate={handleNavigate} />

      case "student-dashboard":
        return user?.role === "student" ? <StudentDashboard user={user} /> : <Homepage onNavigate={handleNavigate} />

      case "safety-resources":
        return <SafetyResourceHub />

      case "discussion-board":
        return <AnonymousDiscussionBoard />

      case "safety-checkin":
        return <SafetyCheckin />

      case "lost-and-found":
        return <LostAndFound />

      case "bup-info":
        return <BUPInfo onNavigate={handleNavigate} />

      default:
        return <Homepage onNavigate={handleNavigate} />
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar user={user} onNavigate={handleNavigate} onLogout={handleLogout} />
      {renderPage()}
      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
    </div>
  )
}
