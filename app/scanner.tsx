import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, Camera } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import blink, { db } from '../src/blink/client'
import { colors } from '../src/styles/colors'
import { typography } from '../src/styles/typography'

export default function ScannerScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')
    }

    getCameraPermissions()
  }, [])

  // Handle deep link code
  useEffect(() => {
    if (code) {
      handleBarCodeScanned({ data: `myorganizer://box/${code}` } as any)
    }
  }, [code])

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return
    
    setScanned(true)
    
    try {
      console.log('Scanned QR code data:', data)
      
      let boxId = null
      
      // Check if it's our app's web URL format
      if (data.includes('my-moving-organizer-xla46fpg.sites.blink.new/box/')) {
        const urlParts = data.split('/box/')
        if (urlParts.length > 1) {
          boxId = urlParts[1]
          console.log('Extracted box ID from web URL:', boxId)
        }
      }
      // Check if it's the old deep link format
      else if (data.startsWith('myorganizer://box/')) {
        const boxCode = data.replace('myorganizer://box/', '')
        console.log('Extracted box code from deep link:', boxCode)
        
        // Find the box with this code
        const user = await blink.auth.me()
        const boxes = await db.boxes.list({
          where: { 
            code: boxCode,
            userId: user.id 
          }
        })
        
        if (boxes.length > 0) {
          boxId = boxes[0].id
          console.log('Found box ID from code:', boxId)
        }
      }
      
      if (boxId) {
        console.log('Navigating to box:', boxId)
        router.replace(`/box/${boxId}`)
      } else {
        console.log('No valid box found')
        Alert.alert(
          'Box Not Found',
          'Could not find a box matching this QR code',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        )
      }
    } catch (error) {
      console.error('Error processing QR code:', error)
      Alert.alert(
        'Error',
        'Failed to process QR code',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      )
    }
  }

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={[typography.body, { color: colors.text }]}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.permissionTitle}>
            Camera Access Required
          </Text>
          <Text style={styles.permissionSubtitle}>
            Please allow camera access to scan QR codes on your boxes
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => Camera.requestCameraPermissionsAsync()}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan QR Code</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          {/* Scanning overlay */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>
              Point your camera at a QR code
            </Text>
            <Text style={styles.instructionSubtitle}>
              Make sure the QR code is clearly visible and well-lit
            </Text>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    ...typography.title2,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    ...typography.callout,
    fontWeight: '600',
    color: 'white',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 256,
    height: 256,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: 'white',
    borderWidth: 2,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  instructionTitle: {
    ...typography.callout,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionSubtitle: {
    ...typography.footnote,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
})