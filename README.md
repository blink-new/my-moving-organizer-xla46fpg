# Moving Organizer - SwiftUI Version

A native iOS app built with SwiftUI and CloudKit to help you organize and catalog your moving boxes. Take photos of box contents, generate QR codes, and sync everything across your Apple devices via iCloud.

## Features

### 📦 **Box Management**
- Create and organize boxes by room (Living Room, Kitchen, Bedroom, etc.)
- Auto-generated box codes (e.g., LR01, KI02, BE01)
- Add titles and descriptions for each box
- Edit and delete boxes with full CloudKit sync

### 📸 **Photo Integration**
- **Native iOS photo picker** - Access all your photo albums
- **Camera integration** - Take photos directly in the app
- **Multiple photo support** - Add up to 10 photos per box
- **CloudKit storage** - Photos sync across all your Apple devices
- **High-quality storage** - Photos stored as CloudKit assets

### 🔍 **QR Code System**
- **Auto-generated QR codes** for each box
- **Native QR scanner** with camera integration
- **Deep linking** - Scan codes to instantly view box details
- **Share QR codes** - Print or share codes to stick on physical boxes
- **Offline scanning** - Works even without internet connection

### ☁️ **iCloud Integration**
- **Private CloudKit database** - All data stays in your personal iCloud
- **Cross-device sync** - Access your boxes on iPhone, iPad, and Mac
- **Offline-first design** - Works without internet, syncs when connected
- **Privacy-focused** - No third-party servers, everything in your iCloud

### 🎨 **iOS-Native Design**
- **SwiftUI interface** with native iOS design patterns
- **SF Pro fonts** and Apple's design language
- **Room color coding** for visual organization
- **Dark mode support** with automatic adaptation
- **Haptic feedback** and smooth animations

## Requirements

- **iOS 16.0+**
- **Xcode 14.0+**
- **iCloud account** signed in on device
- **Camera permissions** for photo capture and QR scanning
- **Photo library permissions** for accessing existing photos

## Setup Instructions

### 1. **Xcode Project Setup**
1. Open `MovingOrganizer.xcodeproj` in Xcode
2. Select your development team in project settings
3. Update the bundle identifier to match your Apple Developer account
4. Enable CloudKit capability in project settings

### 2. **CloudKit Configuration**
1. In Xcode, go to **Signing & Capabilities**
2. Add **CloudKit** capability if not already added
3. Create a new CloudKit container or use existing one
4. Update the container identifier in `MovingOrganizer.entitlements`
5. Update the container identifier in `CloudKitManager.swift`

### 3. **CloudKit Schema Setup**
The app will automatically create the required CloudKit schema on first run:

**Box Record Type:**
- `code` (String) - Box identifier (e.g., "LR01")
- `title` (String) - Box description
- `room` (String) - Room name
- `createdAt` (Date) - Creation timestamp

**BoxPhoto Record Type:**
- `boxID` (String) - Reference to parent box
- `image` (Asset) - Photo file stored in CloudKit

### 4. **Build and Run**
1. Connect your iOS device (CloudKit requires a real device)
2. Build and run the project
3. Grant camera and photo library permissions when prompted
4. Sign in to iCloud if not already signed in

## Usage

### **Adding Boxes**
1. Tap the **+** button on the main screen
2. Enter a **title** for your box (e.g., "Kitchen Utensils")
3. Select the **room** where the box belongs
4. Add **photos** using camera or photo library
5. Tap **Save** - a QR code will be automatically generated

### **Viewing Boxes**
- Browse all boxes in a **grid layout**
- **Search** by title or box code
- **Filter** by room using the room selector
- Tap any box to view **full details and photos**

### **QR Code Scanning**
1. Switch to the **Scanner** tab
2. Point camera at a QR code from the app
3. The app will automatically **find and display** the matching box
4. Works with both app-generated codes and printed codes

### **Editing and Deleting**
- Tap the **pencil icon** in box details to edit
- Tap the **trash icon** to delete (with confirmation)
- All changes sync automatically across devices

## Architecture

### **SwiftUI + CloudKit**
- **SwiftUI** for native iOS interface
- **CloudKit** for data storage and sync
- **Combine** for reactive data binding
- **AVFoundation** for camera and QR scanning
- **Core Image** for QR code generation

### **Key Components**
- `CloudKitManager` - Handles all CloudKit operations
- `BoxListView` - Main interface with search and filtering
- `AddBoxView` - Box creation and editing
- `BoxDetailView` - Full box details with QR sharing
- `QRScannerView` - Camera-based QR code scanning

### **Data Models**
- `Box` - Main box entity with CloudKit integration
- `BoxPhoto` - Photo entity linked to boxes
- `Room` - Enum for room types with colors and emojis

## Privacy & Security

- **iCloud Private Database** - All data stored in user's personal iCloud
- **No third-party servers** - Direct CloudKit integration only
- **Local photo processing** - Photos processed on device before upload
- **Permission-based access** - Camera and photo library access only when needed

## Troubleshooting

### **CloudKit Issues**
- Ensure you're signed in to iCloud on your device
- Check that CloudKit is enabled in iCloud settings
- Verify your Apple Developer account has CloudKit access
- Try logging out and back into iCloud if sync issues occur

### **Camera/Photo Issues**
- Grant camera permissions in iOS Settings > Privacy & Security > Camera
- Grant photo library permissions in iOS Settings > Privacy & Security > Photos
- Restart the app if permissions were recently granted

### **QR Scanning Issues**
- Ensure QR codes are from this app (start with "myorganizer://")
- Check that the box still exists in your collection
- Try scanning in better lighting conditions
- Make sure camera permissions are granted

## Future Enhancements

- **Export functionality** - CSV/JSON export of inventory
- **Backup and restore** - Manual backup options
- **Sharing** - Share boxes with family members
- **Search improvements** - Content-based photo search
- **Apple Watch app** - Quick box lookup on wrist
- **Shortcuts integration** - Siri shortcuts for common actions

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Ensure you have the latest iOS version
3. Try restarting the app and device
4. Check iCloud storage availability

## License

This project is created for personal use. Modify and distribute as needed for your moving organization needs.

---

**Happy Moving! 📦✨**

Your boxes are now organized, searchable, and synced across all your Apple devices. No more wondering what's in that mysterious box in the corner!