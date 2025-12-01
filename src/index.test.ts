import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter } from './index'

describe('typed-client-router', () => {
  beforeEach(() => {
    // Reset URL to home for each test
    window.history.pushState({}, '', '/')
  })

  describe('Path Parameters', () => {
    it('should type required params as string', () => {
      const router = createRouter({
        item: '/items/:id',
      } as const)

      // This should compile - id is required
      const route = router.current
      if (route?.name === 'item') {
        const id: string = route.params.id
        expect(typeof id).toBe('string')
      }
    })

    it('should require params when path has them', () => {
      const router = createRouter({
        main: '/',
        items: '/items/:id',
      } as const)

      // Routes without params can be called without params object
      router.push('main')
      expect(router.current?.name).toBe('main')

      // Routes with params must be called with params object
      router.push('items', { id: '123' })
      expect(router.current?.name).toBe('items')
    })
  })

  describe('Typed Query Parameters', () => {
    it('should accept partial typed queries on push', () => {
      const router = createRouter({
        items: '/items?page&sort',
      } as const)

      // Should not throw
      router.push('items', { page: '1' })
      router.push('items', { sort: 'asc' })
      router.push('items', { page: '1', sort: 'asc' })
      router.push('items', {})

      expect(true).toBe(true) // If we got here, types are correct
    })

    it('should type query params as optional when reading from route', () => {
      const router = createRouter({
        items: '/items?page&sort',
      } as const)

      window.history.pushState({}, '', '/items?page=1')

      if (router.current?.name === 'items') {
        const page: string | undefined = router.current.queries.page
        const sort: string | undefined = router.current.queries.sort
        expect(page).toBe('1')
        expect(sort).toBeUndefined()
      }
    })

    it('should allow any queries on untyped string routes', () => {
      const router = createRouter({
        search: '/search',
      } as const)

      // Should not throw - string routes accept any queries
      router.push('search', { q: 'test', custom: 'param' })

      expect(true).toBe(true)
    })
  })

  describe('Router Navigation', () => {
    it('should navigate with push', () => {
      const router = createRouter({
        main: '/',
        items: '/items',
      } as const)

      router.push('items', {})

      // Current route should be items
      expect(router.current?.name).toBe('items')
    })

    it('should navigate with params', () => {
      const router = createRouter({
        item: '/items/:id',
      } as const)

      router.push('item', { id: '123' })

      expect(router.current?.name).toBe('item')
      expect(router.current?.params.id).toBe('123')
    })

    it('should navigate with queries', () => {
      const router = createRouter({
        items: '/items?page&sort',
      } as const)

      router.push('items', { page: '2', sort: 'desc' })

      if (router.current?.name === 'items') {
        expect(router.current.queries.page).toBe('2')
        expect(router.current.queries.sort).toBe('desc')
      }
    })

    it('should replace with replace method', () => {
      const router = createRouter({
        main: '/',
        items: '/items',
      } as const)

      router.push('items', {})
      expect(router.current?.name).toBe('items')

      router.replace('main', {})
      expect(router.current?.name).toBe('main')
    })
  })

  describe('Query String Management', () => {
    it('should parse query strings', () => {
      const router = createRouter({
        items: '/items?page&sort',
      } as const)

      window.history.pushState({}, '', '/items?page=1&sort=asc')

      if (router.current?.name === 'items') {
        expect(router.current.queries.page).toBe('1')
        expect(router.current.queries.sort).toBe('asc')
      }
    })

    it('should set individual query params', () => {
      const router = createRouter({
        main: '/',
      } as const)

      router.setQuery('foo', 'bar')
      expect(router.queries['foo']).toBe('bar')
    })

    it('should unset query params with undefined', () => {
      const router = createRouter({
        main: '/',
      } as const)

      router.setQuery('foo', 'bar')
      expect(router.queries['foo']).toBe('bar')

      router.setQuery('foo', undefined)
      expect(router.queries['foo']).toBeUndefined()
    })
  })

  describe('Listener Pattern', () => {
    it('should notify listeners on route change', () => {
      const router = createRouter({
        main: '/',
        items: '/items',
      } as const)

      const routes: typeof router.current[] = []
      const dispose = router.listen((route) => {
        routes.push(route)
      })

      router.push('items', {})

      expect(routes.length).toBeGreaterThan(0)
      expect(routes[routes.length - 1]?.name).toBe('items')

      dispose()
    })

    it('should dispose listener', () => {
      const router = createRouter({
        main: '/',
        items: '/items',
      } as const)

      let callCount = 0
      const dispose = router.listen(() => {
        callCount++
      })

      router.push('items', {})
      const countAfterFirst = callCount

      dispose()

      router.push('main', {})
      const countAfterDispose = callCount

      expect(countAfterDispose).toBe(countAfterFirst)
    })
  })

  describe('URL Generation', () => {
    it('should generate URL from route name and params', () => {
      const router = createRouter({
        item: '/items/:id',
      } as const)

      const url = router.url('item', { id: '123' })
      expect(url).toBe('/items/123')
    })


    it('should generate URL with base path', () => {
      const router = createRouter(
        {
          items: '/items',
        },
        { base: '/app' }
      )

      const url = router.url('items', {})
      expect(url).toBe('/app/items')
    })

    it('should generate URL with query string', () => {
      const router = createRouter({
        items: '/items?page&sort',
      } as const)

      const url = router.url('items', { page: '1', sort: 'asc' })
      expect(url).toBe('/items?page=1&sort=asc')
    })

    it('should generate URL with partial query string', () => {
      const router = createRouter({
        items: '/items?page&sort',
      } as const)

      const url = router.url('items', { page: '2' })
      expect(url).toBe('/items?page=2')
    })

    it('should generate URL with params and query string', () => {
      const router = createRouter({
        userPosts: '/users/:userId/posts?page&filter',
      } as const)

      const url = router.url('userPosts', { userId: '123', page: '1', filter: 'recent' })
      expect(url).toMatch(/\/users\/123\/posts\?/)
      expect(url).toContain('page=1')
      expect(url).toContain('filter=recent')
    })

    it('should generate URL with params and partial query string', () => {
      const router = createRouter({
        userPosts: '/users/:userId/posts?page&filter',
      } as const)

      const url = router.url('userPosts', { userId: 'abc', page: '5' })
      expect(url).toBe('/users/abc/posts?page=5')
    })
  })

  describe('Current Route', () => {
    it('should return undefined for non-matching routes', () => {
      const router = createRouter({
        items: '/items',
      } as const)

      window.history.pushState({}, '', '/nonexistent')

      expect(router.current).toBeUndefined()
    })

    it('should match correct route', () => {
      const router = createRouter({
        main: '/',
        items: '/items',
      } as const)

      // Use router.push which updates history and triggers listeners
      router.push('items', {})

      expect(router.current?.name).toBe('items')
    })

    it('should extract params from pathname', () => {
      const router = createRouter({
        item: '/items/:id',
      } as const)

      // Use router.push with params which properly updates history
      router.push('item', { id: 'abc123' })

      expect(router.current?.name).toBe('item')
      expect(router.current?.params.id).toBe('abc123')
    })
  })

  describe('Backward Compatibility', () => {
    it('should work with string-only routes (old API)', () => {
      const router = createRouter({
        main: '/',
        items: '/items',
        item: '/items/:id',
      } as const)

      router.push('items', {})
      expect(router.current?.name).toBe('items')

      router.push('item', { id: '789' })
      expect(router.current?.name).toBe('item')
      if (router.current?.name === 'item') {
        expect(router.current?.params.id).toBe('789')
      }
    })

    it('should mix string and config routes', () => {
      const router = createRouter({
        main: '/',
        items: '/items?page&sort',
        item: '/items/:id',
      } as const)

      router.push('items', { page: '1' })
      expect(router.current?.name).toBe('items')
      if (router.current?.name === 'items') {
        expect(router.current.queries.page).toBe('1')
      }

      router.push('item', { id: '456' })
      expect(router.current?.name).toBe('item')
      if (router.current?.name === 'item') {
        expect(router.current?.params.id).toBe('456')
      }
    })
  })

  describe('Splat/Wildcard Parameters', () => {
    it('should type splat params as string', () => {
      const router = createRouter({
        creative: '/creative/*something',
      } as const)

      if (router.current?.name === 'creative') {
        const something: string = router.current.params.something
        expect(typeof something).toBe('string')
      }
    })

    it('should match splat routes', () => {
      const router = createRouter({
        creative: '/creative/*something',
      } as const)

      router.push('creative', { something: 'any/path/here' })

      expect(router.current?.name).toBe('creative')
      expect(router.current?.params.something).toBe('any/path/here')
    })

    it('should handle optional splat params', () => {
      const router = createRouter({
        files: '/files/*path',
      } as const)

      if (router.current?.name === 'files') {
        const path: string | undefined = router.current.params.path
        expect(path === undefined || typeof path === 'string').toBe(true)
      }
    })

    it('should generate URL with splat params', () => {
      const router = createRouter({
        creative: '/creative/*something',
      } as const)

      const url = router.url('creative', { something: 'design/banner' })
      expect(url).toBe('/creative/design/banner')
    })
  })

  describe('Multiple Path Parameters', () => {
    it('should type multiple required params', () => {
      const router = createRouter({
        userPost: '/users/:userId/posts/:postId',
      } as const)

      if (router.current?.name === 'userPost') {
        const userId: string = router.current.params.userId
        const postId: string = router.current.params.postId
        expect(typeof userId).toBe('string')
        expect(typeof postId).toBe('string')
      }
    })

    it('should navigate with multiple params', () => {
      const router = createRouter({
        userPost: '/users/:userId/posts/:postId',
      } as const)

      router.push('userPost', { userId: '123', postId: '456' })

      expect(router.current?.name).toBe('userPost')
      expect(router.current?.params.userId).toBe('123')
      expect(router.current?.params.postId).toBe('456')
    })

    it('should generate URL with multiple params', () => {
      const router = createRouter({
        userPost: '/users/:userId/posts/:postId',
      } as const)

      const url = router.url('userPost', { userId: 'alice', postId: 'hello-world' })
      expect(url).toBe('/users/alice/posts/hello-world')
    })

    it('should handle mixed required and optional params', () => {
      const router = createRouter({
        userPostVersion: '/users/:userId/posts/:postId/v/:version',
      } as const)

      router.push('userPostVersion', { userId: '123', postId: '456', version: '2' })

      expect(router.current?.name).toBe('userPostVersion')
      if (router.current?.name === 'userPostVersion') {
        expect(router.current?.params.userId).toBe('123')
        expect(router.current?.params.postId).toBe('456')
        expect(router.current?.params.version).toBe('2')
      }
    })

    it('should work with multiple params and queries', () => {
      const router = createRouter({
        userPosts: '/users/:userId/posts?page&filter',
      } as const)

      router.push('userPosts', { userId: '123', page: '2', filter: 'recent' })

      expect(router.current?.name).toBe('userPosts')
      expect(router.current?.params.userId).toBe('123')
      expect(router.current?.queries.page).toBe('2')
      expect(router.current?.queries.filter).toBe('recent')
    })
  })

})
