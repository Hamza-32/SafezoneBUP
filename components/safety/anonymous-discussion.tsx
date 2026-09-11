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
import { MessageSquare, Plus, ThumbsUp, ThumbsDown, Flag, Eye, EyeOff, Clock } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface DiscussionCategory {
  id: number;
  name: string;
  description: string;
  color: string;
}

interface DiscussionPost {
  id: number;
  categoryId: number;
  title: string;
  content: string;
  isAnonymous: boolean;
  status: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  categoryName?: string;
  categoryColor?: string;
}

export default function AnonymousDiscussionBoard() {
  const [categories, setCategories] = useState<DiscussionCategory[]>([]);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    categoryId: '',
    isAnonymous: true
  });

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, []);

  const fetchCategories = async () => {
    try {
      // /api/discussions was an unguarded duplicate of this endpoint and has
      // been removed.
      const result = await apiClient.getDiscussionCategories();
      setCategories(result.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      // In a real implementation, you'd have a posts endpoint
      // For now, we'll simulate some posts
      setPosts([
        {
          id: 1,
          categoryId: 1,
          title: "Struggling with exam anxiety",
          content: "Does anyone have tips for managing severe anxiety during exams? I've been having panic attacks...",
          isAnonymous: true,
          status: 'approved',
          upvotes: 12,
          downvotes: 0,
          createdAt: new Date().toISOString(),
          categoryName: 'Mental Health Support',
          categoryColor: '#10B981'
        },
        {
          id: 2,
          categoryId: 2,
          title: "Study group safety concerns",
          content: "Are there safe spaces on campus for late-night study groups? Some areas feel unsafe after dark.",
          isAnonymous: true,
          status: 'approved',
          upvotes: 8,
          downvotes: 1,
          createdAt: new Date().toISOString(),
          categoryName: 'Campus Safety',
          categoryColor: '#F59E0B'
        }
      ]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async () => {
    if (!newPost.title || !newPost.content || !newPost.categoryId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // In a real implementation, you'd submit to a posts endpoint
      console.log('Submitting post:', newPost);
      
      // Reset form and close dialog
      setNewPost({
        title: '',
        content: '',
        categoryId: '',
        isAnonymous: true
      });
      setShowNewPostDialog(false);
      
      // Show success message
      alert('Your post has been submitted for moderation and will appear once approved.');
    } catch (error) {
      console.error('Error submitting post:', error);
      alert('Failed to submit post. Please try again.');
    }
  };

  const filteredPosts = selectedCategory 
    ? posts.filter(post => post.categoryId === selectedCategory)
    : posts;

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Anonymous Discussion Board</h2>
          <p className="text-gray-600">Share experiences and support each other anonymously</p>
        </div>
        
        <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Discussion Post</DialogTitle>
              <DialogDescription>
                Share your thoughts anonymously. All posts are moderated before being published.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={newPost.categoryId} onValueChange={(value) => setNewPost({...newPost, categoryId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Enter a descriptive title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Share your thoughts, experiences, or questions..."
                  rows={6}
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={newPost.isAnonymous}
                  onChange={(e) => setNewPost({...newPost, isAnonymous: e.target.checked})}
                />
                <label htmlFor="anonymous" className="text-sm">
                  Post anonymously (recommended for sensitive topics)
                </label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewPostDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitPost}>
                  Submit for Review
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            style={{
              backgroundColor: selectedCategory === category.id ? category.color : undefined,
            }}
          >
            {category.name}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No posts found in this category.</p>
              <p className="text-sm text-gray-400 mt-2">Be the first to start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      {post.isAnonymous ? (
                        <div className="flex items-center space-x-1">
                          <EyeOff className="h-3 w-3" />
                          <span>Anonymous</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>Public</span>
                        </div>
                      )}
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {post.categoryName && (
                    <Badge style={{ backgroundColor: post.categoryColor }}>
                      {post.categoryName}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{post.content}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{post.upvotes}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                      <ThumbsDown className="h-4 w-4" />
                      <span>{post.downvotes}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>Reply</span>
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-500">
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
