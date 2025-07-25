import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Image, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import blink, { db } from '../../src/blink/client'
import { Box, BoxPhoto, ROOM_COLORS } from '../../src/types'
import { colors } from '../../src/styles/colors'
import { typography } from '../../src/styles/typography'

export default function BoxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [box, setBox] = useState<Box | null>(null)
  const [photos, setPhotos] = useState<BoxPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCodeRef, setQrCodeRef] = useState<any>(null)

  useEffect(() => {
    loadBoxData()
  }, [id])

  const loadBoxData = async () => {
    try {
      const user = await blink.auth.me()
      
      // Load box details
      const boxResult = await db.boxes.list({
        where: { id: id, userId: user.id }
      })
      
      if (boxResult.length === 0) {
        Alert.alert('Error', 'Box not found')
        router.back()
        return
      }
      
      setBox(boxResult[0] as Box)
      
      // Load photos
      const photosResult = await db.boxPhotos.list({
        where: { boxId: id, userId: user.id },
        orderBy: { createdAt: 'asc' }
      })
      
      setPhotos(photosResult as BoxPhoto[])
    } catch (error) {
      console.error('Error loading box:', error)
      Alert.alert('Error', 'Failed to load box details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Box',
      'Are you sure you want to delete this box? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: deleteBox
        }
      ]
    )
  }

  const deleteBox = async () => {
    try {
      console.log('Starting delete process for box:', id)
      
      // First verify user is authenticated
      let user
      try {
        user = await blink.auth.me()
        console.log('User authenticated:', user.id)
      } catch (authError) {
        console.error('Authentication error during delete:', authError)
        Alert.alert('Authentication Error', 'Please sign in to delete boxes.')
        return
      }
      
      // Delete photos first - get all photos for this box
      console.log('Fetching photos to delete...')
      const photosToDelete = await db.boxPhotos.list({
        where: { boxId: id, userId: user.id }
      })
      console.log('Found photos to delete:', photosToDelete.length)
      
      // Delete each photo record
      for (const photo of photosToDelete) {
        console.log('Deleting photo record:', photo.id)
        try {
          await db.boxPhotos.delete(photo.id)
          console.log('Successfully deleted photo:', photo.id)
        } catch (photoError) {
          console.error('Error deleting photo:', photo.id, photoError)
          // Continue with other photos even if one fails
        }
      }
      
      // Verify the box exists and belongs to the user before deleting
      console.log('Verifying box ownership...')
      const boxToDelete = await db.boxes.list({
        where: { id: id, userId: user.id }
      })
      
      if (boxToDelete.length === 0) {
        console.error('Box not found or not owned by user')
        Alert.alert('Error', 'Box not found or you do not have permission to delete it.')
        return
      }
      
      // Delete the box
      console.log('Deleting box:', id)
      await db.boxes.delete(id)
      console.log('Successfully deleted box:', id)
      
      console.log('Delete process completed successfully')
      Alert.alert('Success', 'Box deleted successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      console.error('Error deleting box:', error)
      Alert.alert('Delete Failed', `Failed to delete box: ${error.message || 'Unknown error occurred'}`)
    }
  }

  const shareQRCode = async () => {
    if (!box) return
    
    try {
      // Generate QR code as base64
      qrCodeRef?.toDataURL((dataURL: string) => {
        Share.share({
          message: `QR Code for Box ${box.code} - ${box.title}`,
          url: `data:image/png;base64,${dataURL}`,
          title: `Box ${box.code} QR Code`
        })
      })
    } catch (error) {
      console.error('Error sharing QR code:', error)
      Alert.alert('Error', 'Failed to share QR code')
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!box) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Box not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const roomColor = ROOM_COLORS[box.room as keyof typeof ROOM_COLORS]
  const qrValue = `https://my-moving-organizer-xla46fpg.sites.blink.new/box/${box.id}`

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.codeContainer}>
              <Text style={styles.code}>{box.code}</Text>
              <View style={[styles.roomDot, { backgroundColor: roomColor }]} />
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => router.push(`/add-box?edit=${id}`)} 
                style={styles.editButton}
              >
                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={20} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.title}>{box.title}</Text>
          <Text style={styles.room}>{box.room}</Text>
        </View>

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
            <ScrollView horizontal style={styles.photoScroll} showsHorizontalScrollIndicator={false}>
              {photos.map((photo, index) => (
                <TouchableOpacity key={photo.id} style={styles.photoContainer}>
                  <Image source={{ uri: photo.photoUrl }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* QR Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QR Code</Text>
          <View style={styles.qrContainer}>
            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={qrValue}
                size={200}
                color={colors.text}
                backgroundColor="white"
                getRef={(ref) => setQrCodeRef(ref)}
              />
            </View>
            <Text style={styles.qrLabel}>Scan to view this box</Text>
            <TouchableOpacity onPress={shareQRCode} style={styles.shareButton}>
              <Ionicons name="share-outline" size={20} color="white" />
              <Text style={styles.shareButtonText}>Share QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Created</Text>
              <Text style={styles.metadataValue}>
                {new Date(box.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Last Updated</Text>
              <Text style={styles.metadataValue}>
                {new Date(box.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  code: {
    ...typography.title1,
    fontWeight: '700',
    color: colors.text,
    marginRight: 12,
  },
  roomDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  title: {
    ...typography.title2,
    color: colors.text,
    marginBottom: 4,
  },
  room: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.headline,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  photoScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  photoContainer: {
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  qrLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shareButtonText: {
    ...typography.callout,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  metadataContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metadataLabel: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  metadataValue: {
    ...typography.callout,
    color: colors.text,
    fontWeight: '500',
  },
})