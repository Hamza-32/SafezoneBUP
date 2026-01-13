"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  MessageSquare, Plus, ThumbsUp, ThumbsDown, Clock, User, 
  Search, Filter, AlertTriangle, Heart, Brain, Shield, Users, HelpCircle 
} from "lucide-react"
import { toast } from "sonner"

interface Category {
  id: number
  name: string
  description: string
  color: string
  requiresModeration: boolean
  postCount: number
}

interface Post {
  id: number
  title: string
  content: string
  isAnonymous: boolean
  status: string
  upvotes: number
  downvotes: number
  createdAt: string
  categoryName: string
  categoryColor: string
  authorName: string
  commentCount: number
}

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase()
  if (name.includes('mental health')) return Heart
  if (name.includes('academic')) return Brain
  if (name.includes('harassment') || name.includes('discrimination')) return AlertTriangle
  if (name.includes('safety')) return Shield
  if (name.includes('relationships') || name.includes('social')) return Users
  return HelpCircle
}

export default function DiscussionBoard({ user }: { user: any }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showNewPostDialog, setShowNewPostDialog] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    categoryId: '',
    isAnonymous: true
  })

  useEffect(() => {
    fetchCategories()
    fetchPosts()
  }, [])

  useEffect(() => {
    if (selectedCategory !== 'all') {
      fetchPosts(selectedCategory)
    } else {
      fetchPosts()
    }
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/discussion/categories')
      const data = await response.json()

      if (data.success) {
        setCategories(data.data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Failed to load categories')
    }
  }

  const fetchPosts = async (categoryId?: string) => {
    try {
      const params = new URLSearchParams()
      if (categoryId) params.append('categoryId', categoryId)
      
      const response = await fetch(`/api/discussion/posts?${params}`)
      const data = await response.json()

      if (data.success) {
        setPosts(data.data.posts)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim() || !newPost.categoryId) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/discussion/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('safezone-token')}`
        },
        body: JSON.stringify(newPost)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setShowNewPostDialog(false)
        setNewPost({ title: '', content: '', categoryId: '', isAnonymous: true })
        fetchPosts(selectedCategory !== 'all' ? selectedCategory : undefined)
      } else {
        toast.error(data.error || 'Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    }
  }

  const handleVote = async (postId: number, action: 'upvote' | 'downvote') => {
    if (!user) {
      toast.error('Please log in to vote')
      return
    }

    try {
      const response = await fetch(`/api/discussion/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('safezone-token')}`
        },
        body: JSON.stringify({ action })
      })

      const data = await response.json()

      if (data.success) {
        // Update post in state
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, upvotes: data.data.upvotes, downvotes: data.data.downvotes }
            : post
        ))
      } else {
        toast.error('Failed to vote')
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to vote')
    }
  }

  const filteredPosts = posts.filter(post =>
    searchTerm === '' || 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
            <MessageSquare className="size-8" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Anonymous Discussion Board</h1>
          <p className="text-muted-foreground mt-2">
            A safe space for peer support and open discussion about sensitive topics
          </p>
        </div>
      </div>

      {/* Guidelines Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Community Guidelines</h3>
              <p className="text-blue-700 text-sm mt-1">
                Be respectful, supportive, and constructive. Posts are moderated to ensure a safe environment. 
                Harassment, spam, or inappropriate content will be removed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {user && (
          <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#B41F23] hover:bg-[#B41F23]/90">
                <Plus className="h-4 w-4 mr-2" />
                New Discussion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Start a New Discussion</DialogTitle>
                <DialogDescription>
                  Share your thoughts or seek support from the community
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newPost.categoryId} onValueChange={(value) => 
                    setNewPost({ ...newPost, categoryId: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => {
                        const Icon = getCategoryIcon(category.name)
                        return (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {category.name}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="What's on your mind?"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Share your thoughts, experiences, or questions..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    rows={6}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="anonymous"
                    checked={newPost.isAnonymous}
                    onCheckedChange={(checked) => setNewPost({ ...newPost, isAnonymous: checked })}
                  />
                  <Label htmlFor="anonymous">Post anonymously</Label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewPostDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost} className="bg-[#B41F23] hover:bg-[#B41F23]/90">
                    Post Discussion
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.slice(0, 6).map((category) => {
            const Icon = getCategoryIcon(category.name)
            return (
              <TabsTrigger key={category.id} value={category.id.toString()}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{category.name.split(' ')[0]}</span>
                </div>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No discussions found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? `No discussions match "${searchTerm}"`
                  : 'Be the first to start a discussion in this category'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const Icon = getCategoryIcon(post.categoryName)
                return (
                  <Card key={post.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge 
                              variant="outline" 
                              style={{ 
                                backgroundColor: `${post.categoryColor}15`,
                                borderColor: post.categoryColor,
                                color: post.categoryColor
                              }}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {post.categoryName}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              {post.authorName}
                              <Clock className="h-3 w-3" />
                              {formatDate(post.createdAt)}
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                          <p className="text-muted-foreground mb-4 line-clamp-3">{post.content}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVote(post.id, 'upvote')}
                                  disabled={!user}
                                >
                                  <ThumbsUp className="h-4 w-4 mr-1" />
                                  {post.upvotes}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVote(post.id, 'downvote')}
                                  disabled={!user}
                                >
                                  <ThumbsDown className="h-4 w-4 mr-1" />
                                  {post.downvotes}
                                </Button>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MessageSquare className="h-4 w-4" />
                                {post.commentCount} replies
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              View Discussion
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
