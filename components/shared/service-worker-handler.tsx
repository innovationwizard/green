'use client'

import { useEffect } from 'react'

export function ServiceWorkerHandler() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
      return
    }

    // Handle service worker registration and updates
    if ('serviceWorker' in navigator) {
      // First, check for and clear any stale caches that might cause 404 errors
      const clearStaleCaches = async () => {
        try {
          const cacheNames = await caches.keys()
          // Clear workbox precache caches that might be stale
          const workboxCaches = cacheNames.filter((name) =>
            name.startsWith('workbox-precache') || name.startsWith('precache-')
          )
          for (const cacheName of workboxCaches) {
            await caches.delete(cacheName)
            console.log('Cleared stale cache:', cacheName)
          }
        } catch (error) {
          console.warn('Error clearing stale caches:', error)
        }
      }

      // Clear stale caches before registering
      clearStaleCaches().then(() => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration.scope)

            // Check for updates periodically
            setInterval(() => {
              registration.update()
            }, 60 * 60 * 1000) // Check every hour

            // Handle updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available, reload to activate
                    console.log('New service worker available, reloading...')
                    window.location.reload()
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error)
            // If registration fails, try to unregister all and clear caches
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              registrations.forEach((registration) => {
                registration.unregister()
              })
              return caches.keys()
            }).then((cacheNames) => {
              cacheNames.forEach((cacheName) => {
                caches.delete(cacheName)
              })
            })
          })
      })

      // Handle service worker errors
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_ERROR') {
          console.warn('Service Worker cache error:', event.data.error)
          // Optionally unregister and reload if cache is corrupted
          if (event.data.error?.includes('404') || event.data.error?.includes('Failed to fetch')) {
            console.warn('Cache error detected, clearing service worker...')
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              registrations.forEach((registration) => {
                registration.unregister()
              })
              // Clear all caches
              caches.keys().then((cacheNames) => {
                cacheNames.forEach((cacheName) => {
                  caches.delete(cacheName)
                })
                // Reload to get fresh service worker
                window.location.reload()
              })
            })
          }
        }
      })

      // Handle controller change (new service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed, reloading...')
        window.location.reload()
      })

      // Listen for fetch errors (404s) and clear caches if needed
      window.addEventListener('error', (event) => {
        const target = event.target as HTMLElement
        if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
          const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href
          // Check if it's a UUID-like resource (workbox precache entry)
          if (src && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(src)) {
            console.warn('Detected 404 for precached resource:', src)
            // Clear caches and reload
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              registrations.forEach((registration) => {
                registration.unregister()
              })
              return caches.keys()
            }).then((cacheNames) => {
              cacheNames.forEach((cacheName) => {
                caches.delete(cacheName)
              })
              console.log('Cleared caches due to 404 error, reloading...')
              setTimeout(() => window.location.reload(), 1000)
            })
          }
        }
      }, true) // Use capture phase to catch errors early
    }
  }, [])

  return null
}

