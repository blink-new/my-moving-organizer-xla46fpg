import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Box, ROOM_COLORS } from '../types'
import { router } from 'expo-router'
import { colors } from '../styles/colors'
import { typography } from '../styles/typography'

interface BoxCardProps {
  box: Box
}

export function BoxCard({ box }: BoxCardProps) {
  const roomColor = ROOM_COLORS[box.room as keyof typeof ROOM_COLORS] || ROOM_COLORS.Other

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/box/${box.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.roomHeader}>
        <View style={[styles.roomDot, { backgroundColor: roomColor }]} />
        <Text style={styles.roomText}>
          {box.room.toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.textContent}>
          <Text style={styles.code}>
            {box.code}
          </Text>
          <Text style={styles.title}>
            {box.title}
          </Text>
          <Text style={styles.date}>
            {new Date(box.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailText}>📦</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  roomText: {
    ...typography.caption1,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
  },
  textContent: {
    flex: 1,
    marginRight: 16,
  },
  code: {
    ...typography.headline,
    color: colors.text,
    marginBottom: 4,
  },
  title: {
    ...typography.body,
    color: colors.text,
    marginBottom: 8,
  },
  date: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailText: {
    fontSize: 24,
  },
})