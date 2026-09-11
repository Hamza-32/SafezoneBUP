'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Phone, Mail, ExternalLink, AlertTriangle, Heart, Shield, HelpCircle, Building } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface SafetyResource {
  id: number;
  title: string;
  description: string;
  category: string;
  content: string;
  contactInfo: {
    phone?: string;
    campusPhone?: string;
    email?: string;
    website?: string;
    location?: string;
    hours?: string;
  };
  priority: number;
}

const categoryIcons = {
  emergency: AlertTriangle,
  mental_health: Heart,
  safety_tips: Shield,
  helplines: HelpCircle,
  campus_resources: Building,
};

const categoryColors = {
  emergency: 'bg-red-100 text-red-800',
  mental_health: 'bg-green-100 text-green-800',
  safety_tips: 'bg-blue-100 text-blue-800',
  helplines: 'bg-purple-100 text-purple-800',
  campus_resources: 'bg-orange-100 text-orange-800',
};

export default function SafetyResourceHub() {
  const [resources, setResources] = useState<SafetyResource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  const filteredResources = useMemo(() => {
    let filtered = resources;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(resource => resource.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [resources, searchTerm, selectedCategory]);

  const fetchResources = async () => {
    try {
      // /api/resources was an unguarded duplicate of this endpoint and has
      // been removed. This one nests the list under data.resources.
      const result = await apiClient.getSafetyResources();
      setResources(result.data?.resources || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'All Resources' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'mental_health', label: 'Mental Health' },
    { value: 'safety_tips', label: 'Safety Tips' },
    { value: 'helplines', label: 'Helplines' },
    { value: 'campus_resources', label: 'Campus Resources' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <TabsTrigger key={category.value} value={category.value} className="text-xs">
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4">
        {filteredResources.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No resources found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredResources.map((resource) => {
            const IconComponent = categoryIcons[resource.category as keyof typeof categoryIcons];
            const categoryColor = categoryColors[resource.category as keyof typeof categoryColors];

            return (
              <Card key={resource.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {IconComponent && <IconComponent className="h-5 w-5 text-gray-600" />}
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                    </div>
                    <Badge className={categoryColor}>
                      {resource.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  {resource.description && (
                    <CardDescription>{resource.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p>{resource.content}</p>
                  </div>

                  {resource.contactInfo && Object.keys(resource.contactInfo).length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Contact Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {resource.contactInfo.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <a href={`tel:${resource.contactInfo.phone}`} className="text-blue-600 hover:underline">
                              {resource.contactInfo.phone}
                            </a>
                          </div>
                        )}
                        {resource.contactInfo.campusPhone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <a href={`tel:${resource.contactInfo.campusPhone}`} className="text-blue-600 hover:underline">
                              {resource.contactInfo.campusPhone} (Campus)
                            </a>
                          </div>
                        )}
                        {resource.contactInfo.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <a href={`mailto:${resource.contactInfo.email}`} className="text-blue-600 hover:underline">
                              {resource.contactInfo.email}
                            </a>
                          </div>
                        )}
                        {resource.contactInfo.website && (
                          <div className="flex items-center space-x-2">
                            <ExternalLink className="h-4 w-4 text-gray-500" />
                            <a href={resource.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Visit Website
                            </a>
                          </div>
                        )}
                        {resource.contactInfo.location && (
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{resource.contactInfo.location}</span>
                          </div>
                        )}
                        {resource.contactInfo.hours && (
                          <div className="col-span-full">
                            <span className="text-gray-700"><strong>Hours:</strong> {resource.contactInfo.hours}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
