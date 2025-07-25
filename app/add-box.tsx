import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import blink, { db } from '../src/blink/client'
import { ROOMS, ROOM_COLORS, Room } from '../src/types'
import { colors } from '../src/styles/colors'
import { typography } from '../src/styles/typography'

export default function AddBoxScreen() {
  const [title, setTitle] = useState('')
  const [room, setRoom] = useState<Room>('Living Room')
  const [code, setCode] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

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

  React.useEffect(() => {
    generateBoxCode()
  }, [room])

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to add photo')
    }
  }

  const takePhoto = async () => {
    try {
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
      Alert.alert('Error', 'Failed to take photo')
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const showPhotoOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    )
  }

  const handleSave = async () => {
    if (!title.trim() || !code.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const user = await blink.auth.me()
      const boxId = `box_${Date.now()}`
      
      // Save box
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

      router.back()
    } catch (error) {
      console.error('Error saving box:', error)
      Alert.alert('Error', 'Failed to save box. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
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
            {loading ? 'Saving...' : 'Save Box'}
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