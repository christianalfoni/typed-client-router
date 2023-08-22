# typed-client-router

> Does exactly what you expect it to do

## Motivations

I have mostly been working with "editor" types of experiences. Single page applications where you want as much control as possible on the routing experience, but still be able to define routes explicitly and react to when changes occur.

Changes are PATH changes, not query changes. This router does not treat your queries as a reactive state store. They are there to optionally give initial state and you can keep them in sync as your application state changes without worrying about performance issues.

## API

```ts
import { createRouter } from 'typed-client-router'

const router = createRouter({
    main: '/',
    items: '/items',
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

if (router.current.name === 'creative') {
    // Splat params holds the rest of the path
    router.current.params.something    
}

// Access queries
router.queries

// Set query
router.setQuery("foo", "bar")

// Unset query
router.setQuery("foo", undefined)

// Listen to changes
const disposer = router.listen((currentRoute) => {

})

// Push new page
router.push('main', {})
// With typed params
router.push('item', { id: '123' })

// Replace page
router.replace('item', { id: '456' })

// Create a url string
router.url('item', { id: '456' })
```