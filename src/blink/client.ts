import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'my-moving-organizer-xla46fpg',
  authRequired: true
})

// Type-safe database access helpers
export const db = {
  boxes: (blink.db as any).boxes,
  boxPhotos: (blink.db as any).boxPhotos,
}

export default blink