import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import blink, { db } from '../src/blink/client'
import { Box } from '../src/types'
import { BoxCard } from '../src/components/BoxCard'
import { FloatingActionButton } from '../src/components/FloatingActionButton'
import { colors } from '../src/styles/colors'
import { typography } from '../src/styles/typography'

export default function BoxListScreen() {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    loadBoxes()
  }, [])

  const loadBoxes = async () => {
    try {
      const user = await blink.auth.me()
      const result = await db.boxes.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })
      
      // Load thumbnail for each box
      const boxesWithThumbnails = await Promise.all(
        (result as Box[]).map(async (box) => {
          try {
            const photos = await db.boxPhotos.list({
              where: { boxId: box.id, userId: user.id },
              orderBy: { createdAt: 'asc' },
              limit: 1
            })
            return {
              ...box,
              thumbnail: photos.length > 0 ? photos[0].photoUrl : null
            }
          } catch (error) {
            return { ...box, thumbnail: null }
          }
        })
      )
      
      setBoxes(boxesWithThumbnails)
    } catch (error) {
      console.error('Error loading boxes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBoxes = boxes.filter(box =>
    box.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    box.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    box.room.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>
        No boxes yet
      </Text>
      <Text style={styles.emptySubtitle}>
        Start organizing your move by adding your first box
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/add-box')}
      >
        <Text style={styles.emptyButtonText}>Add First Box</Text>
      </TouchableOpacity>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.body, { color: colors.text }]}>Loading boxes...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with search and controls */}
        <View style={styles.header}>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search boxes..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/scanner')}
            >
              <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              <Ionicons 
                name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>

          {boxes.length > 0 && (
            <Text style={styles.countText}>
              {filteredBoxes.length} of {boxes.length} boxes
            </Text>
          )}
        </View>

        {/* Box list */}
        {filteredBoxes.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredBoxes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <BoxCard box={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <FloatingActionButton />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
  },
  iconButton: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  countText: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    ...typography.callout,
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
})