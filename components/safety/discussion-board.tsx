"use client"
import { useState, useEffect } from "react"
import { MessageSquare, ThumbsUp, ThumbsDown, Flag, Plus, Filter, Clock, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface DiscussionCategory {
  id: number
  name: string
  description: string
  color: string
  isActive: boolean
  requiresModeration: boolean
  createdAt: string
}

interface DiscussionPost {
  id: number
  categoryId: number
  title: string
  content: string
  authorId: number | null
  isAnonymous: boolean
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  upvotes: number
  downvotes: number
  reportCount: number
  createdAt: string
  updatedAt: string
  categoryName?: string
  authorName?: string
  commentsCount?: number
}

interface NewPostData {
  title: string
  content: string
  categoryId: string
  isAnonymous: boolean
}

interface DiscussionBoardProps {
  user?: any
}

type CategoryStyle = {
  dot: string
  badge: string
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  '#10B981': {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  '#3B82F6': {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  '#EF4444': {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border border-red-200',
  },
  '#F59E0B': {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  '#8B5CF6': {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
  '#6B7280': {
    dot: 'bg-gray-500',
    badge: 'bg-gray-50 text-gray-700 border border-gray-200',
  },
}

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  dot: 'bg-slate-500',
  badge: 'bg-slate-50 text-slate-700 border border-slate-200',
}

const getCategoryStyle = (color: string): CategoryStyle => {
  return CATEGORY_STYLES[color] || DEFAULT_CATEGORY_STYLE
}

export default function DiscussionBoard({ user }: DiscussionBoardProps) {
  const [categories, setCategories] = useState<DiscussionCategory[]>([])
  const [posts, setPosts] = useState<DiscussionPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [newPost, setNewPost] = useState<NewPostData>({
    title: "",
    content: "",
    categoryId: "",
    isAnonymous: true
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchPosts()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/discussion/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/discussion/posts')
      if (response.ok) {
        const data = await response.json()
        setPosts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim() || !newPost.categoryId) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!user) {
      toast.error("Please login to create a post")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/discussion/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('safezone-token')}`
        },
        body: JSON.stringify(newPost)
      })

      if (response.ok) {
        toast.success("Post submitted for review")
        setIsCreatePostOpen(false)
        setNewPost({
          title: "",
          content: "",
          categoryId: "",
          isAnonymous: true
        })
        fetchPosts()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to create post")
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error("Failed to create post")
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (postId: number, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast.error("Please login to vote")
      return
    }

    try {
      const response = await fetch('/api/discussion/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('safezone-token')}`
        },
        body: JSON.stringify({
          targetType: 'post',
          targetId: postId,
          voteType
        })
      })

      if (response.ok) {
        fetchPosts() // Refresh to get updated vote counts
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to vote")
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error("Failed to vote")
    }
  }

  const handleReport = async (postId: number, reason: string, description: string) => {
    if (!user) {
      toast.error("Please login to report content")
      return
    }

    try {
      const response = await fetch('/api/discussion/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('safezone-token')}`
        },
        body: JSON.stringify({
          targetType: 'post',
          targetId: postId,
          reason,
          description
        })
      })

      if (response.ok) {
        toast.success("Content reported successfully")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to report content")
      }
    } catch (error) {
      console.error('Error reporting:', error)
      toast.error("Failed to report content")
    }
  }

  const filteredPosts = selectedCategory === "all" 
    ? posts.filter(p => p.status === 'approved')
    : posts.filter(p => p.status === 'approved' && p.categoryId.toString() === selectedCategory)

  const getCategoryById = (id: number) => categories.find(c => c.id === id)

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-[#B41F23] text-white">
              <MessageSquare className="size-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Anonymous Discussion Board</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A safe space for peer support on sensitive topics. All posts are moderated for safety.
          </p>
        </div>

        {/* Guidelines Banner */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Community Guidelines</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Be respectful and supportive to others</li>
              <li>• No harassment, discrimination, or hate speech</li>
              <li>• Keep discussions constructive and helpful</li>
              <li>• All posts are reviewed before appearing publicly</li>
            </ul>
          </CardContent>
        </Card>

        {/* Category Filter and Create Post */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#B41F23] hover:bg-[#B41F23]/90 text-white">
                <Plus className="size-4 mr-2" />
                Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Discussion Post</DialogTitle>
                <DialogDescription>
                  Share your thoughts or ask for support. Your post will be reviewed before being published.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newPost.categoryId} 
                    onValueChange={(value) => setNewPost({...newPost, categoryId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div 
                              className={`size-3 rounded-full ${getCategoryStyle(category.color).dot}`}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter a descriptive title..."
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Share your thoughts, ask for advice, or offer support..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    rows={6}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="anonymous"
                    checked={newPost.isAnonymous}
                    onCheckedChange={(checked) => setNewPost({...newPost, isAnonymous: checked})}
                  />
                  <Label htmlFor="anonymous">Post anonymously</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCreatePost} 
                    disabled={submitting}
                    className="bg-[#B41F23] hover:bg-[#B41F23]/90 text-white"
                  >
                    {submitting ? "Submitting..." : "Submit for Review"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="size-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to start a discussion in this category!</p>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => {
              const category = getCategoryById(post.categoryId)
              const categoryStyle = category ? getCategoryStyle(category.color) : DEFAULT_CATEGORY_STYLE
              return (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {category && (
                            <Badge className={categoryStyle.badge}>
                              {category.name}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="size-3" />
                            {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <CardTitle className="text-lg">{post.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="size-3" />
                          {post.isAnonymous ? "Anonymous" : post.authorName || "Unknown"}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(post.id, 'upvote')}
                          className="flex items-center gap-1"
                        >
                          <ThumbsUp className="size-4" />
                          {post.upvotes}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(post.id, 'downvote')}
                          className="flex items-center gap-1"
                        >
                          <ThumbsDown className="size-4" />
                          {post.downvotes}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <MessageSquare className="size-4" />
                          {post.commentsCount || 0} Comments
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReport(post.id, 'inappropriate', '')}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <Flag className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
