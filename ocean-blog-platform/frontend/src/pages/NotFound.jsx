import React from 'react'
import { Link } from 'react-router-dom'
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* 404 Graphic */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-blue-600 opacity-20">404</div>
            <div className="relative -mt-8">
              <svg
                className="mx-auto h-32 w-32 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.95-6.071-2.5m13.142 0A7.962 7.962 0 0112 15c-1.34 0-2.6-.32-3.708-.884M9 17v2.5a3.5 3.5 0 007 0V17m-4-5v5m-2-3h8"
                />
              </svg>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Sorry, we couldn't find the page you're looking for.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <HomeIcon className="w-5 h-5 mr-2" />
              Go Home
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Go Back
            </button>
          </div>

          {/* Search Suggestion */}
          <div className="mt-8 max-w-md mx-auto">
            <p className="text-sm text-gray-500 mb-4">
              Try searching for what you need:
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="Search blog posts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Helpful Links */}
          <div className="mt-8 text-sm text-gray-500">
            <p>You might be interested in:</p>
            <div className="mt-2 space-x-4">
              <Link to="/" className="text-blue-600 hover:text-blue-700">Latest Posts</Link>
              <Link to="/create-post" className="text-blue-600 hover:text-blue-700">Write a Post</Link>
              <Link to="/profile" className="text-blue-600 hover:text-blue-700">Your Profile</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound