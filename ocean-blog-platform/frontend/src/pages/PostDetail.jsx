import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useBlog } from '../contexts/BlogContext'
import { useAuth } from '../contexts/AuthContext'
import { 
  CalendarIcon, 
  UserIcon, 
  HeartIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'

const PostDetail = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { currentPost, fetchPost, toggleLike, deletePost } = useBlog()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState(false)

  useEffect(() => {
    const loadPost = async () => {
      try {
        await fetchPost(slug)
      } catch (error) {
        console.error('Failed to load post:', error)
        navigate('/404')
      } finally {
        setLoading(false)
      }
    }
    
    loadPost()
  }, [slug, fetchPost, navigate])

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    
    setLiking(true)
    try {
      await toggleLike(currentPost._id)
    } catch (error) {
      console.error('Failed to toggle like:', error)
    } finally {
      setLiking(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(currentPost._id)
        navigate('/')
      } catch (error) {
        console.error('Failed to delete post:', error)
      }
    }
  }

  const isAuthor = user && currentPost && user._id === currentPost.author._id

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!currentPost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            Return to home
          </Link>
        </div>
      </div>
    )
  }

  const likedByUser = user && currentPost.likes?.includes(user._id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link 
              to="/" 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to all posts
            </Link>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {currentPost.category?.name || 'Uncategorized'}
            </span>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {currentPost.title}
          </h1>
          
          <p className="text-xl text-gray-600 mb-6">
            {currentPost.excerpt}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  {currentPost.author?.avatar ? (
                    <img
                      src={currentPost.author.avatar}
                      alt={currentPost.author.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-6 h-6 text-gray-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{currentPost.author?.name}</h3>
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {formatDistanceToNow(new Date(currentPost.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
            
            {isAuthor && (
              <div className="flex items-center space-x-2">
                <Link
                  to={`/edit-post/${currentPost._id}`}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <PencilIcon className="w-5 h-5" />
                </Link>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {currentPost.featuredImage && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <img
            src={currentPost.featuredImage}
            alt={currentPost.title}
            className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
          />
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div 
            className="blog-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: currentPost.content }}
          />
        </div>
        
        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button
                onClick={handleLike}
                disabled={liking}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  likedByUser 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {liking ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : likedByUser ? (
                  <HeartSolidIcon className="w-5 h-5" />
                ) : (
                  <HeartIcon className="w-5 h-5" />
                )}
                <span>{currentPost.likes?.length || 0}</span>
              </button>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span>{currentPost.comments?.length || 0} comments</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Updated</span>
              {currentPost.updatedAt !== currentPost.createdAt && (
                <span>{formatDistanceToNow(new Date(currentPost.updatedAt), { addSuffix: true })}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Author Bio */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              {currentPost.author?.avatar ? (
                <img
                  src={currentPost.author.avatar}
                  alt={currentPost.author.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{currentPost.author?.name}</h3>
              <p className="text-gray-600 mt-1">
                {currentPost.author?.bio || 'Author of this post'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostDetail