import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { blink } from '../src/blink/client'
import { colors } from '../src/styles/colors'
import { typography } from '../src/styles/typography'

export default function RootLayout() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  // Handle deep linking
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      if (url.startsWith('myorganizer://box/')) {
        const boxCode = url.replace('myorganizer://box/', '')
        // Navigate to scanner which will handle the box lookup
        router.push(`/scanner?code=${boxCode}`)
      }
    }

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url)
      }
    })

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url)
    })

    return () => subscription?.remove()
  }, [])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[typography.body, { color: colors.text }]}>Loading...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <Text style={[typography.title1, { color: colors.text, marginBottom: 16, textAlign: 'center' }]}>
          My Moving Organizer
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: 32 }]}>
          Please sign in to organize your moving boxes
        </Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'My Boxes',
            headerLargeTitle: true
          }} 
        />
        <Stack.Screen 
          name="add-box" 
          options={{ 
            title: 'Add Box',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="box/[id]" 
          options={{ 
            title: 'Box Details'
          }} 
        />
        <Stack.Screen 
          name="scanner" 
          options={{ 
            title: 'Scan QR Code',
            presentation: 'modal'
          }} 
        />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
})