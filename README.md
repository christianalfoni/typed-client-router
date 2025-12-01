# typed-client-router

> Does exactly what you expect it to do

## Motivations

I have mostly been working with "editor" types of experiences. Single page applications where you want as much control as possible on the routing experience, but still be able to define routes explicitly and react to when changes occur.

Changes are PATH changes, not query changes. This router does not treat your queries as a reactive state store. They are there to optionally give initial state and you can keep them in sync as your application state changes without worrying about performance issues.

## API

> ⚠️ This router does **NOT** affect your anchor tags. That means you can not expect anchor tags with just an href to automagically work. It can be a good idea to create your own abstraction around these elements, see below

```ts
import { createRouter, TRoutes, TRouter } from 'typed-client-router'

const router = createRouter({
    main: '/',
    items: '/items?page&sort',
    item: '/items/:id',
    creative: '/creative/*something'
}, {
    // Optionally provide a base path
    base: '/some-base'
})

// The current route can be undefined, which means
// it is a NotFound
if (!router.current) {}

// Check which route is active
if (router.current.name === 'main') {}

// Each route is defined in isolation. Nested behaviour is determined by your implementation
if (router.current.name === 'items' || router.current.name === 'item') {}

if (router.current.name === 'item') {
    // Typed params
    router.current.params.id
}

if (router.current.name === 'items') {
    // Typed queries - automatically extracted from route definition
    // Both page and sort are typed as string | undefined
    router.current.queries.page
    router.current.queries.sort
}

if (router.current.name === 'creative') {
    // Splat params holds the rest of the path
    router.current.params.something
}

// Access all queries
router.queries

// Set query
router.setQuery("foo", "bar")

// Unset query
router.setQuery("foo", undefined)

// Listen to changes
const disposer = router.listen((currentRoute) => {

})

// Push new page
router.push('main')
// With typed params and queries combined
router.push('item', { id: '123' })
// With typed queries (page and sort are type-checked for 'items' route)
router.push('items', { page: '1', sort: 'name' })
// With partial queries (each query param is individually optional)
router.push('items', { page: '1' })
// With both params and queries in a single object
router.push('userPosts', { userId: '123', page: '1' })

// Replace page
router.replace('item', { id: '456' })
// Replace with typed queries
router.replace('items', { page: '2', sort: 'date' })

// Create a url string
router.url('item', { id: '456' })
// With both params and queries
router.url('userPosts', { userId: '123', page: '1' })

// To extract the type for your router, define the routes
// as a "const" type
const routes = { main: '/', items: '/items?page&sort' } as const

type MyRoutes = TRoutes<typeof routes>
type MyRouter = TRouter<typeof routes>
```

### Query Parameters

Define query parameters directly in the route path using the `?` syntax:

```ts
const router = createRouter({
    items: '/items?page&sort',
    userPosts: '/users/:userId/posts?page&filter'
} as const)

// Query parameters are automatically typed as optional (string | undefined)
if (router.current?.name === 'items') {
    const page: string | undefined = router.current.queries.page
    const sort: string | undefined = router.current.queries.sort
}

// When pushing, query parameters are type-checked
// Params and queries are combined in a single object
router.push('items', { page: '1', sort: 'asc' })

// Routes without defined queries accept any string queries
router.push('search', { q: 'test', filter: 'latest' })
```

## Anchor tags

To handle anchor tags with href attributes it is adviced to create your own abstraction on top, like many other framework specific routers does. Here is an example with React:

```tsx
import { TRoutes, TRouter, createRouter } from 'typed-client-router'

const routes = {
    main: '/',
    item: '/items/:id'
} as const

type Routes = TRoutes<typeof routes>

type Router = TRouter<typeof routes>

export const router = createRouter(routes)

export function Link({ name, params }: Routes & { children: React.ReactNode }) {
    return (
        <a
            href={router.url(name, params)}
            onClick={(event) => {
                event.preventDefault()
                router.push(name, params)
            }}>
                {children}
        </a>
    )
}
```
