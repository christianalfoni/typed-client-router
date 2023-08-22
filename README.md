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
})

// A map of the active routes
router.activeRoutes

// Check if a route is active
if (router.activeRoutes.items) {
    // Check if nested route is active
    if (router.activeRoutes.item) {
        // Get access to params (They are typed)
        router.activeRoutes.item.params.id
    }
}

if (router.activeRoutes.creative) {
    // Splat holds the rest of the url on params
    router.activeRoutes.creative.params.something
}

// Exhaust all routes to determine "Not Found"

// Access queries
router.queries

// Set query
router.setQuery("foo", "bar")

// Unset query
router.setQuery("foo", undefined)

// Listen to changes
const disposer = router.listen((activeRoutes) => {

})

// Push new page
router.push('main', {})
// With typed params
router.push('item', { id: '123' })

// Replace page
router.replace('item', { id: '456' })
```