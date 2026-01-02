'use client'

import { useEffect } from 'react'

export function ServiceWorkerHandler() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
      return
    }

    // Handle service worker registration and updates
    if ('serviceWorker' in navigator) {
      // Check for stale service worker and clear if needed
      const checkAndCleanup = async () => {
        try {
          // Check if there's an active service worker
          if (navigator.serviceWorker.controller) {
            // Check if the service worker file exists and is current
            try {
              const response = await fetch('/sw.js', { cache: 'no-store' })
              if (!response.ok) {
                // Service worker file doesn't exist or is outdated, clear everything
                console.log('Service worker file not found or outdated, clearing...')
                const registrations = await navigator.serviceWorker.getRegistrations()
                for (const registration of registrations) {
                  await registration.unregister()
                }
                const cacheNames = await caches.keys()
                for (const cacheName of cacheNames) {
                  await caches.delete(cacheName)
                }
              }
            } catch (error) {
              // If we can't fetch the service worker, it might be stale
              console.warn('Could not verify service worker, clearing stale caches...')
              const cacheNames = await caches.keys()
              const workboxCaches = cacheNames.filter((name) =>
                name.startsWith('workbox-precache') || name.startsWith('precache-')
              )
              for (const cacheName of workboxCaches) {
                await caches.delete(cacheName)
              }
            }
          }
        } catch (error) {
          console.warn('Error during cleanup check:', error)
        }
      }

      // Check and cleanup if needed, then register
      checkAndCleanup().then(() => {
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

      // Listen for fetch errors (404s) and handle gracefully
      // Ignore known non-existent files that workbox tries to precache
      const knownNonExistentFiles = [
        '/_next/app-build-manifest.json', // Doesn't exist in Next.js 14 App Router
      ]

      const handleError = (event: ErrorEvent | Event) => {
        const target = event.target as HTMLElement | null
        let errorSource: string | null = null

        if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
          errorSource = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || null
        } else if (event instanceof ErrorEvent) {
          // Check error message for UUID pattern or file paths
          const message = event.message || ''
          const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
          if (uuidMatch) {
            errorSource = uuidMatch[0]
          }
        }

        // Check if it's a known non-existent file (ignore these)
        if (errorSource) {
          try {
            const url = new URL(errorSource, window.location.origin)
            if (knownNonExistentFiles.some(file => url.pathname.includes(file))) {
              // Silently ignore known non-existent files
              console.debug('Ignoring 404 for known non-existent file:', url.pathname)
              return
            }
          } catch {
            // If URL parsing fails, check if errorSource contains the file path
            if (knownNonExistentFiles.some(file => errorSource?.includes(file))) {
              console.debug('Ignoring 404 for known non-existent file')
              return
            }
          }
        }

        // Check if it's a UUID-like resource (workbox precache entry)
        if (errorSource && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(errorSource)) {
          console.warn('Detected 404 for precached resource:', errorSource)
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

      window.addEventListener('error', handleError, true) // Use capture phase to catch errors early
      
      // Also listen for unhandled promise rejections (fetch errors)
      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason?.toString() || ''
        // Check for known non-existent files first
        if (knownNonExistentFiles.some(file => reason.includes(file))) {
          console.debug('Ignoring rejection for known non-existent file')
          event.preventDefault() // Prevent error from being logged
          return
        }
        if (reason.includes('404') && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(reason)) {
          console.warn('Detected 404 rejection for precached resource')
          handleError(event as unknown as ErrorEvent)
        }
      })
    }
  }, [])

  return null
}

