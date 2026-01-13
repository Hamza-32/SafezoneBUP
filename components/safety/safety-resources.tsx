"use client"
import { useState, useEffect } from "react"
import { Shield, Phone, Heart, BookOpen, Users, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

interface SafetyResource {
  id: number
  title: string
  description: string
  category: 'emergency' | 'mental_health' | 'safety_tips' | 'helplines' | 'campus_resources'
  content: string
  contactInfo: any
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

const categoryIcons = {
  emergency: AlertTriangle,
  mental_health: Heart,
  safety_tips: Shield,
  helplines: Phone,
  campus_resources: BookOpen
}

const categoryColors = {
  emergency: "bg-red-100 text-red-800 border-red-200",
  mental_health: "bg-green-100 text-green-800 border-green-200",
  safety_tips: "bg-blue-100 text-blue-800 border-blue-200",
  helplines: "bg-purple-100 text-purple-800 border-purple-200",
  campus_resources: "bg-orange-100 text-orange-800 border-orange-200"
}

export default function SafetyResources() {
  const [resources, setResources] = useState<SafetyResource[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/safety/resources')
      if (response.ok) {
        const data = await response.json()
        setResources(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = selectedCategory === "all" 
    ? resources 
    : resources.filter(r => r.category === selectedCategory)

  const categories = [
    { id: "all", label: "All Resources", icon: Users },
    { id: "emergency", label: "Emergency", icon: AlertTriangle },
    { id: "mental_health", label: "Mental Health", icon: Heart },
    { id: "safety_tips", label: "Safety Tips", icon: Shield },
    { id: "helplines", label: "Helplines", icon: Phone },
    { id: "campus_resources", label: "Campus Resources", icon: BookOpen }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-[#B41F23] text-white">
              <Shield className="size-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Safety Resources Hub</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your one-stop resource for campus safety information, emergency contacts, mental health support, and helpful safety tips.
          </p>
        </div>

        {/* Emergency Banner */}
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="size-8 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Emergency? Call 911 Immediately</h3>
                <p className="text-red-700">
                  For campus emergencies, also call: <strong>(555) 123-SAFE</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto p-1">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col items-center gap-1 px-3 py-2 text-xs"
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{category.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            {filteredResources.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="size-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">No resources found</h3>
                  <p className="text-muted-foreground">No resources are available for this category yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map((resource) => {
                  const Icon = categoryIcons[resource.category]
                  const contactInfo = typeof resource.contactInfo === 'string' 
                    ? JSON.parse(resource.contactInfo) 
                    : resource.contactInfo

                  return (
                    <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="size-5 text-[#B41F23]" />
                            <Badge 
                              variant="secondary" 
                              className={categoryColors[resource.category]}
                            >
                              {resource.category.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{resource.title}</CardTitle>
                        <CardDescription>{resource.description}</CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <p className="text-sm text-foreground">{resource.content}</p>
                        
                        {contactInfo && Object.keys(contactInfo).length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Contact Information:</h4>
                              {contactInfo.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="size-4" />
                                  <a href={`tel:${contactInfo.phone}`} className="text-[#B41F23] hover:underline">
                                    {contactInfo.phone}
                                  </a>
                                </div>
                              )}
                              {contactInfo.campusPhone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="size-4" />
                                  <span className="text-muted-foreground">Campus: </span>
                                  <a href={`tel:${contactInfo.campusPhone}`} className="text-[#B41F23] hover:underline">
                                    {contactInfo.campusPhone}
                                  </a>
                                </div>
                              )}
                              {contactInfo.email && (
                                <div className="text-sm">
                                  <a href={`mailto:${contactInfo.email}`} className="text-[#B41F23] hover:underline">
                                    {contactInfo.email}
                                  </a>
                                </div>
                              )}
                              {contactInfo.location && (
                                <div className="text-sm text-muted-foreground">
                                  📍 {contactInfo.location}
                                </div>
                              )}
                              {contactInfo.hours && (
                                <div className="text-sm text-muted-foreground">
                                  🕒 {contactInfo.hours}
                                </div>
                              )}
                              {contactInfo.website && (
                                <div className="text-sm">
                                  <a 
                                    href={contactInfo.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[#B41F23] hover:underline"
                                  >
                                    Visit Website →
                                  </a>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
