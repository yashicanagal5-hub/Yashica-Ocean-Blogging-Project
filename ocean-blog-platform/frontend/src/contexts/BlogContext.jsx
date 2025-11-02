import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const BlogContext = createContext()

export const useBlog = () => {
  const context = useContext(BlogContext)
  if (!context) {
    throw new Error('useBlog must be used within a BlogProvider')
  }
  return context
}

export const BlogProvider = ({ children }) => {
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPost, setCurrentPost] = useState(null)

  // Fetch all posts
  const fetchPosts = async (filters = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)

      const response = await axios.get(`/api/posts?${params}`)
      setPosts(response.data.data)
      return response.data
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Fetch single post
  const fetchPost = async (slug) => {
    try {
      const response = await axios.get(`/api/posts/slug/${slug}`)
      setCurrentPost(response.data.data)
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch post:', error)
      throw error
    }
  }

  // Create new post
  const createPost = async (postData) => {
    try {
      const response = await axios.post('/api/posts', postData)
      setPosts(prev => [response.data.data, ...prev])
      return response.data.data
    } catch (error) {
      console.error('Failed to create post:', error)
      throw error
    }
  }

  // Update post
  const updatePost = async (id, postData) => {
    try {
      const response = await axios.put(`/api/posts/${id}`, postData)
      setPosts(prev => prev.map(post => 
        post._id === id ? response.data.data : post
      ))
      if (currentPost && currentPost._id === id) {
        setCurrentPost(response.data.data)
      }
      return response.data.data
    } catch (error) {
      console.error('Failed to update post:', error)
      throw error
    }
  }

  // Delete post
  const deletePost = async (id) => {
    try {
      await axios.delete(`/api/posts/${id}`)
      setPosts(prev => prev.filter(post => post._id !== id))
      if (currentPost && currentPost._id === id) {
        setCurrentPost(null)
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
      throw error
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories')
      setCategories(response.data.data)
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      throw error
    }
  }

  // Like/Unlike post
  const toggleLike = async (postId) => {
    try {
      const response = await axios.post(`/api/posts/${postId}/like`)
      const updatedPost = response.data.data
      
      setPosts(prev => prev.map(post => 
        post._id === postId ? updatedPost : post
      ))
      
      if (currentPost && currentPost._id === postId) {
        setCurrentPost(updatedPost)
      }
      
      return updatedPost
    } catch (error) {
      console.error('Failed to toggle like:', error)
      throw error
    }
  }

  const value = {
    posts,
    categories,
    currentPost,
    loading,
    fetchPosts,
    fetchPost,
    createPost,
    updatePost,
    deletePost,
    fetchCategories,
    toggleLike,
    setCurrentPost
  }

  return (
    <BlogContext.Provider value={value}>
      {children}
    </BlogContext.Provider>
  )
}