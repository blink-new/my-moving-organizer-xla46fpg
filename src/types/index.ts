export interface Box {
  id: string
  code: string
  title: string
  room: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface BoxPhoto {
  id: string
  boxId: string
  photoUrl: string
  userId: string
  createdAt: string
}

export const ROOMS = [
  'Living Room',
  'Kitchen',
  'Bedroom',
  'Bathroom',
  'Office',
  'Garage',
  'Basement',
  'Attic',
  'Dining Room',
  'Other'
] as const

export type Room = typeof ROOMS[number]

export const ROOM_COLORS: Record<Room, string> = {
  'Living Room': '#FF6B6B',
  'Kitchen': '#4ECDC4',
  'Bedroom': '#45B7D1',
  'Bathroom': '#96CEB4',
  'Office': '#FFEAA7',
  'Garage': '#DDA0DD',
  'Basement': '#98D8C8',
  'Attic': '#F7DC6F',
  'Dining Room': '#BB8FCE',
  'Other': '#AED6F1'
}