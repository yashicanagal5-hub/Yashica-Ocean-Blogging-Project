import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBlog } from '../contexts/BlogContext'
import { 
  CalendarIcon, 
  UserIcon, 
  HeartIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'

const Home = () => {
  const { posts = [], categories = [], fetchPosts, fetchCategories, loading, toggleLike } = useBlog()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchPosts({ search: searchTerm, category: selectedCategory })
  }

  const handleLike = async (postId, e) => {
    e.preventDefault()
    try {
      await toggleLike(postId)
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="ocean-gradient text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to Ocean Blog
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Dive into a world of ideas, stories, and insights. Share your thoughts and connect with fellow readers.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 md:py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white text-base min-w-0"
                />
                <MagnifyingGlassIcon className="absolute right-3 top-3 h-5 w-5 md:h-6 md:w-6 text-gray-400" />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 md:py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white min-w-[180px] sm:min-w-[200px] text-base"
              >
                <option value="">All Categories</option>
                {(categories || []).map(category => (
                  <option key={category._id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 sm:px-6 py-3 md:py-4 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors text-base whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Posts</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover the most recent stories and insights from our community of writers.
            </p>
          </div>

          {(posts || []).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-600">Be the first to write a post and share your thoughts!</p>
              <Link
                to="/create-post"
                className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create Your First Post
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(posts || []).map((post) => (
                <article key={post._id} className="card card-hover">
                  <Link to={`/post/${post.slug}`}>
                    {post.featuredImage && (
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {post.category?.name || 'Uncategorized'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            {post.author?.avatar ? (
                              <img
                                src={post.author.avatar}
                                alt={post.author.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <UserIcon className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{post.author?.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <button
                            onClick={(e) => handleLike(post._id, e)}
                            className="flex items-center space-x-1 hover:text-red-500 transition-colors"
                          >
                            <HeartIcon className="w-5 h-5" />
                            <span>{post.likes?.length || 0}</span>
                          </button>
                          <div className="flex items-center space-x-1">
                            <ChatBubbleLeftIcon className="w-5 h-5" />
                            <span>{post.comments?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore Categories</h2>
            <p className="text-gray-600">Find posts that match your interests</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(categories || []).map((category) => (
              <Link
                key={category._id}
                to={`/?category=${category.slug}`}
                className="text-center p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
              >
                <div className="text-2xl mb-2">{category.icon || '📝'}</div>
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home