import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import blink, { db } from '../src/blink/client'
import { ROOMS, ROOM_COLORS, Room } from '../src/types'
import { colors } from '../src/styles/colors'
import { typography } from '../src/styles/typography'

export default function AddBoxScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>()
  const isEditing = !!edit
  
  const [title, setTitle] = useState('')
  const [room, setRoom] = useState<Room>('Living Room')
  const [code, setCode] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditing)

  const generateBoxCode = async () => {
    try {
      const user = await blink.auth.me()
      const roomPrefix = room.split(' ').map(word => word[0]).join('').toUpperCase()
      
      // Get existing boxes for this room to auto-increment
      const existingBoxes = await db.boxes.list({
        where: { userId: user.id, room: room }
      })
      
      const nextNumber = existingBoxes.length + 1
      const newCode = `${roomPrefix}${nextNumber.toString().padStart(2, '0')}`
      setCode(newCode)
    } catch (error) {
      console.error('Error generating code:', error)
    }
  }

  useEffect(() => {
    if (isEditing && edit) {
      loadExistingBox()
    } else {
      generateBoxCode()
    }
  }, [room, isEditing, edit])

  const loadExistingBox = async () => {
    try {
      const user = await blink.auth.me()
      
      // Load box details
      const boxResult = await db.boxes.list({
        where: { id: edit, userId: user.id }
      })
      
      if (boxResult.length === 0) {
        Alert.alert('Error', 'Box not found')
        router.back()
        return
      }
      
      const box = boxResult[0]
      setTitle(box.title)
      setRoom(box.room as Room)
      setCode(box.code)
      
      // Load photos
      const photosResult = await db.boxPhotos.list({
        where: { boxId: edit, userId: user.id },
        orderBy: { createdAt: 'asc' }
      })
      
      setPhotos(photosResult.map(p => p.photoUrl))
    } catch (error) {
      console.error('Error loading box:', error)
      Alert.alert('Error', 'Failed to load box details')
    } finally {
      setInitialLoading(false)
    }
  }

  const pickImage = async () => {
    try {
      // Check current permissions
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync()
      
      let finalStatus = currentStatus
      if (currentStatus !== 'granted') {
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        finalStatus = status
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Please allow access to your photo library in Settings to add photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        
        // Convert to blob and upload to storage
        const response = await fetch(imageUri)
        const blob = await response.blob()
        
        const fileName = `box-photos/${Date.now()}.jpg`
        const { publicUrl } = await blink.storage.upload(blob, fileName, { upsert: true })
        
        setPhotos(prev => [...prev, publicUrl])
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to add photo. Please try again.')
    }
  }

  const takePhoto = async () => {
    try {
      // Check current permissions
      const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync()
      
      let finalStatus = currentStatus
      if (currentStatus !== 'granted') {
        // Request permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        finalStatus = status
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Camera Permission Required', 
          'Please allow access to your camera in Settings to take photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestCameraPermissionsAsync() }
          ]
        )
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        
        // Convert to blob and upload to storage
        const response = await fetch(imageUri)
        const blob = await response.blob()
        
        const fileName = `box-photos/${Date.now()}.jpg`
        const { publicUrl } = await blink.storage.upload(blob, fileName, { upsert: true })
        
        setPhotos(prev => [...prev, publicUrl])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const showPhotoOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo. Photos are securely stored and synced across your devices.',
      [
        { 
          text: '📷 Take Photo', 
          onPress: takePhoto 
        },
        { 
          text: '📱 Choose from Library', 
          onPress: pickImage 
        },
        { 
          text: 'Cancel', 
          style: 'cancel' 
        }
      ]
    )
  }

  const handleCancel = () => {
    const hasChanges = title.trim() || photos.length > 0 || (isEditing && code.trim())
    
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      )
    } else {
      router.back()
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !code.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const user = await blink.auth.me()
      
      if (isEditing && edit) {
        // Update existing box
        await db.boxes.update(edit, {
          code: code.trim(),
          title: title.trim(),
          room: room,
          updatedAt: new Date().toISOString()
        })

        // Delete existing photos
        const existingPhotos = await db.boxPhotos.list({
          where: { boxId: edit, userId: user.id }
        })
        for (const photo of existingPhotos) {
          await db.boxPhotos.delete(photo.id)
        }

        // Save new photos
        for (const photoUrl of photos) {
          await db.boxPhotos.create({
            id: `photo_${Date.now()}_${Math.random()}`,
            boxId: edit,
            photoUrl: photoUrl,
            userId: user.id,
            createdAt: new Date().toISOString()
          })
        }
      } else {
        // Create new box
        const boxId = `box_${Date.now()}`
        
        await db.boxes.create({
          id: boxId,
          code: code.trim(),
          title: title.trim(),
          room: room,
          userId: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

        // Save photos
        for (const photoUrl of photos) {
          await db.boxPhotos.create({
            id: `photo_${Date.now()}_${Math.random()}`,
            boxId: boxId,
            photoUrl: photoUrl,
            userId: user.id,
            createdAt: new Date().toISOString()
          })
        }
      }

      router.back()
    } catch (error) {
      console.error('Error saving box:', error)
      Alert.alert('Error', 'Failed to save box. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Box' : 'Add Box'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          {/* Box Code */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Box Code
            </Text>
            <View style={styles.codeRow}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="e.g., LR01"
                style={[styles.input, styles.codeInput]}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                onPress={generateBoxCode}
                style={styles.refreshButton}
              >
                <Ionicons name="refresh" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Kitchen Cookware"
              style={styles.input}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Room Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Room
            </Text>
            <View style={styles.roomGrid}>
              {ROOMS.map((roomOption) => {
                const isSelected = room === roomOption
                const roomColor = ROOM_COLORS[roomOption]
                
                return (
                  <TouchableOpacity
                    key={roomOption}
                    onPress={() => setRoom(roomOption)}
                    style={[
                      styles.roomChip,
                      isSelected && styles.roomChipSelected
                    ]}
                  >
                    <View 
                      style={[styles.roomDot, { backgroundColor: roomColor }]}
                    />
                    <Text style={[
                      styles.roomChipText,
                      isSelected && styles.roomChipTextSelected
                    ]}>
                      {roomOption}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Photos Section */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Photos ({photos.length})
            </Text>
            
            {photos.length > 0 && (
              <ScrollView horizontal style={styles.photoScroll} showsHorizontalScrollIndicator={false}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image source={{ uri: photo }} style={styles.photo} />
                    <TouchableOpacity
                      onPress={() => removePhoto(index)}
                      style={styles.removePhotoButton}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <TouchableOpacity style={styles.addPhotoButton} onPress={showPhotoOptions}>
              <Ionicons name="camera-outline" size={32} color={colors.primary} />
              <Text style={styles.addPhotoText}>
                Add Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={[
            styles.saveButton,
            loading && styles.saveButtonDisabled
          ]}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : isEditing ? 'Update Box' : 'Save Box'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '400',
  },
  headerTitle: {
    ...typography.headline,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  form: {
    paddingVertical: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    ...typography.callout,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
  },
  codeRow: {
    flexDirection: 'row',
  },
  codeInput: {
    flex: 1,
    marginRight: 12,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roomChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roomDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  roomChipText: {
    ...typography.footnote,
    color: colors.text,
  },
  roomChipTextSelected: {
    color: 'white',
  },
  photoScroll: {
    marginBottom: 16,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addPhotoButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    ...typography.footnote,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  saveButtonText: {
    ...typography.callout,
    fontWeight: '600',
    color: 'white',
  },
})