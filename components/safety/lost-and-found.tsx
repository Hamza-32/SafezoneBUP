'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, MapPin, Calendar, Phone, Mail, Eye, EyeOff, Package, CheckCircle } from 'lucide-react';

interface LostAndFoundItem {
  id: number;
  userId: number;
  type: 'lost' | 'found';
  title: string;
  description: string;
  category: string;
  location: string;
  dateReported: string;
  dateLostFound?: string;
  imageUrl?: string;
  contactInfo: {
    email?: string;
    phone?: string;
    preferredContact?: string;
  };
  status: 'active' | 'resolved' | 'expired';
  isAnonymous: boolean;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

const categories = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'books', label: 'Books' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'documents', label: 'Documents' },
  { value: 'keys', label: 'Keys' },
  { value: 'other', label: 'Other' },
];

const typeColors = {
  lost: 'bg-red-100 text-red-800',
  found: 'bg-green-100 text-green-800'
};

const statusColors = {
  active: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800'
};

export default function LostAndFound() {
  const [items, setItems] = useState<LostAndFoundItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LostAndFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    type: 'lost' as 'lost' | 'found',
    title: '',
    description: '',
    category: '',
    location: '',
    dateLostFound: '',
    imageUrl: '',
    contactInfo: {
      email: '',
      phone: '',
      preferredContact: 'email'
    },
    isAnonymous: false
  });

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, activeTab, searchTerm, selectedCategory]);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/lost-and-found');
      const result = await response.json();
      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => item.type === activeTab);
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const handleSubmitItem = async () => {
    if (!newItem.title || !newItem.description || !newItem.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const userId = 1; // Placeholder - get from auth context
      const response = await fetch('/api/lost-and-found', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...newItem
        }),
      });

      const result = await response.json();
      if (result.success) {
        setNewItem({
          type: 'lost',
          title: '',
          description: '',
          category: '',
          location: '',
          dateLostFound: '',
          imageUrl: '',
          contactInfo: {
            email: '',
            phone: '',
            preferredContact: 'email'
          },
          isAnonymous: false
        });
        setShowNewItemDialog(false);
        fetchItems();
        alert('Item posted successfully!');
      } else {
        alert('Failed to post item');
      }
    } catch (error) {
      console.error('Error posting item:', error);
      alert('Failed to post item');
    }
  };

  const handleMarkResolved = async (id: number) => {
    if (confirm('Mark this item as resolved?')) {
      try {
        const response = await fetch('/api/lost-and-found', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            id, 
            status: 'resolved',
            resolvedBy: 1 // Placeholder - get from auth context
          }),
        });

        const result = await response.json();
        if (result.success) {
          fetchItems();
        } else {
          alert('Failed to update item');
        }
      } catch (error) {
        console.error('Error updating item:', error);
        alert('Failed to update item');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lost & Found</h2>
          <p className="text-gray-600">Help reunite people with their belongings</p>
        </div>
        
        <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Post Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post Lost or Found Item</DialogTitle>
              <DialogDescription>
                Help others by posting details about lost or found items
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newItem.type} onValueChange={(value: 'lost' | 'found') => setNewItem({...newItem, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lost">Lost Item</SelectItem>
                    <SelectItem value="found">Found Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="Brief description of the item..."
                  value={newItem.title}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Category *</label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  placeholder="Detailed description including color, size, distinguishing features..."
                  rows={4}
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="Where was it lost/found?"
                  value={newItem.location}
                  onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Date {newItem.type === 'lost' ? 'Lost' : 'Found'}</label>
                <Input
                  type="date"
                  value={newItem.dateLostFound}
                  onChange={(e) => setNewItem({...newItem, dateLostFound: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Image URL (Optional)</label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={newItem.imageUrl}
                  onChange={(e) => setNewItem({...newItem, imageUrl: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={newItem.contactInfo.email}
                    onChange={(e) => setNewItem({
                      ...newItem, 
                      contactInfo: {...newItem.contactInfo, email: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    type="tel"
                    placeholder="555-1234"
                    value={newItem.contactInfo.phone}
                    onChange={(e) => setNewItem({
                      ...newItem, 
                      contactInfo: {...newItem.contactInfo, phone: e.target.value}
                    })}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Preferred Contact Method</label>
                <Select 
                  value={newItem.contactInfo.preferredContact} 
                  onValueChange={(value) => setNewItem({
                    ...newItem, 
                    contactInfo: {...newItem.contactInfo, preferredContact: value}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={newItem.isAnonymous}
                  onChange={(e) => setNewItem({...newItem, isAnonymous: e.target.checked})}
                />
                <label htmlFor="anonymous" className="text-sm">
                  Post anonymously
                </label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitItem}>
                  Post Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="lost">Lost Items</TabsTrigger>
            <TabsTrigger value="found">Found Items</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Items List */}
      <div className="grid gap-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No items found matching your criteria.</p>
              <p className="text-sm text-gray-400 mt-2">Be the first to post an item!</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <Badge className={typeColors[item.type]}>
                        {item.type.toUpperCase()}
                      </Badge>
                      <Badge className={statusColors[item.status]}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{item.location || 'Location not specified'}</span>
                      </div>
                      {item.dateLostFound && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{item.type === 'lost' ? 'Lost' : 'Found'}: {formatDate(item.dateLostFound)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {item.imageUrl && (
                    <div className="w-32 h-32">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <p className="text-gray-700">{item.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      {item.isAnonymous ? (
                        <div className="flex items-center space-x-1 text-gray-500">
                          <EyeOff className="h-3 w-3" />
                          <span>Anonymous</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>Posted by {item.firstName} {item.lastName}</span>
                        </div>
                      )}
                      
                      {item.contactInfo.email && (
                        <a 
                          href={`mailto:${item.contactInfo.email}`}
                          className="flex items-center space-x-1 text-blue-600 hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          <span>Email</span>
                        </a>
                      )}
                      
                      {item.contactInfo.phone && (
                        <a 
                          href={`tel:${item.contactInfo.phone}`}
                          className="flex items-center space-x-1 text-blue-600 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        Posted: {formatDate(item.createdAt)}
                      </span>
                      {item.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkResolved(item.id)}
                          className="flex items-center space-x-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>Resolved</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
