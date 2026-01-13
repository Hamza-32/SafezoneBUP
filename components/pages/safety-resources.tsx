"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, MapPin, Globe, Clock, Search, Shield, Heart, AlertTriangle, HelpCircle, Building } from "lucide-react"
import { toast } from "sonner"

interface ContactInfo {
  phone?: string
  campusPhone?: string
  email?: string
  website?: string
  online?: string
  location?: string
  hours?: string
}

interface SafetyResource {
  id: number
  title: string
  description: string
  category: string
  content: string
  contactInfo: ContactInfo
  priority: number
  createdAt: string
  updatedAt: string
}

const categoryConfig = {
  emergency: { 
    label: 'Emergency', 
    icon: AlertTriangle, 
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Immediate help and emergency contacts'
  },
  mental_health: { 
    label: 'Mental Health', 
    icon: Heart, 
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Mental health support and counseling'
  },
  safety_tips: { 
    label: 'Safety Tips', 
    icon: Shield, 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Guidelines to stay safe on campus'
  },
  helplines: { 
    label: 'Helplines', 
    icon: Phone, 
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Support hotlines and crisis intervention'
  },
  campus_resources: { 
    label: 'Campus Resources', 
    icon: Building, 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Campus facilities and services'
  }
}

export default function SafetyResourcesHub() {
  const [resources, setResources] = useState<SafetyResource[]>([])
  const [filteredResources, setFilteredResources] = useState<SafetyResource[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchResources()
  }, [])

  useEffect(() => {
    filterResources()
  }, [resources, selectedCategory, searchTerm])

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/safety/resources')
      const data = await response.json()

      if (data.success) {
        setResources(data.data.resources)
      } else {
        toast.error('Failed to load safety resources')
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
      toast.error('Failed to load safety resources')
    } finally {
      setIsLoading(false)
    }
  }

  const filterResources = () => {
    let filtered = resources

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(resource => resource.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredResources(filtered)
  }

  const renderContactInfo = (contactInfo: ContactInfo) => {
    if (!contactInfo || Object.keys(contactInfo).length === 0) return null

    return (
      <div className="mt-4 space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">Contact Information:</h4>
        <div className="space-y-1 text-sm">
          {contactInfo.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>Emergency: {contactInfo.phone}</span>
            </div>
          )}
          {contactInfo.campusPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>Campus: {contactInfo.campusPhone}</span>
            </div>
          )}
          {contactInfo.email && (
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span>{contactInfo.email}</span>
            </div>
          )}
          {(contactInfo.website || contactInfo.online) && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a 
                href={contactInfo.website || contactInfo.online} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Visit Website
              </a>
            </div>
          )}
          {contactInfo.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{contactInfo.location}</span>
            </div>
          )}
          {contactInfo.hours && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{contactInfo.hours}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const getCategoryIcon = (category: string) => {
    const config = categoryConfig[category as keyof typeof categoryConfig]
    if (!config) return Shield
    return config.icon
  }

  const getCategoryColor = (category: string) => {
    const config = categoryConfig[category as keyof typeof categoryConfig]
    if (!config) return 'bg-gray-100 text-gray-800 border-gray-200'
    return config.color
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-lg bg-[#B41F23] text-white">
            <Shield className="size-8" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Safety Resources Hub</h1>
          <p className="text-muted-foreground mt-2">
            Your comprehensive guide to campus safety resources, emergency contacts, and support services
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No resources found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? `No resources match "${searchTerm}"`
                  : 'No resources available in this category'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => {
                const Icon = getCategoryIcon(resource.category)
                return (
                  <Card key={resource.id} className="h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#B41F23]/10">
                            <Icon className="h-5 w-5 text-[#B41F23]" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{resource.title}</CardTitle>
                            {resource.description && (
                              <CardDescription>{resource.description}</CardDescription>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={getCategoryColor(resource.category)}
                        >
                          {categoryConfig[resource.category as keyof typeof categoryConfig]?.label || resource.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-muted-foreground">{resource.content}</p>
                      </div>
                      {renderContactInfo(resource.contactInfo)}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Emergency Notice */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Emergency Situations</h3>
              <p className="text-red-700 text-sm mt-1">
                In case of immediate danger or medical emergency, call 911 first, then notify campus security.
                For mental health crises, contact the crisis hotline or campus counseling services.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
