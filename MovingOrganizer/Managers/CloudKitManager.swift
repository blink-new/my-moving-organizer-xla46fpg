import Foundation
import CloudKit
import SwiftUI

@MainActor
class CloudKitManager: ObservableObject {
    static let shared = CloudKitManager()
    
    private let container: CKContainer
    private let privateDatabase: CKDatabase
    
    @Published var boxes: [Box] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isCloudKitAvailable = false
    
    private init() {
        container = CKContainer(identifier: "iCloud.com.yourcompany.movingorganizer")
        privateDatabase = container.privateCloudDatabase
    }
    
    func initialize() {
        checkCloudKitAvailability()
        fetchBoxes()
    }
    
    private func checkCloudKitAvailability() {
        container.accountStatus { [weak self] status, error in
            DispatchQueue.main.async {
                switch status {
                case .available:
                    self?.isCloudKitAvailable = true
                    print("✅ CloudKit is available")
                case .noAccount:
                    self?.errorMessage = "Please sign in to iCloud to use this app"
                    print("❌ No iCloud account")
                case .restricted:
                    self?.errorMessage = "iCloud access is restricted"
                    print("❌ iCloud restricted")
                case .couldNotDetermine:
                    self?.errorMessage = "Could not determine iCloud status"
                    print("❌ Could not determine iCloud status")
                case .temporarilyUnavailable:
                    self?.errorMessage = "iCloud is temporarily unavailable"
                    print("❌ iCloud temporarily unavailable")
                @unknown default:
                    self?.errorMessage = "Unknown iCloud status"
                    print("❌ Unknown iCloud status")
                }
            }
        }
    }
    
    // MARK: - Box Operations
    
    func fetchBoxes() {
        guard isCloudKitAvailable else { return }
        
        isLoading = true
        errorMessage = nil
        
        let query = CKQuery(recordType: "Box", predicate: NSPredicate(value: true))
        query.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: false)]
        
        privateDatabase.perform(query, inZoneWith: nil) { [weak self] records, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                if let error = error {
                    self?.errorMessage = "Failed to fetch boxes: \(error.localizedDescription)"
                    print("❌ Error fetching boxes: \(error)")
                    return
                }
                
                guard let records = records else {
                    self?.boxes = []
                    return
                }
                
                let fetchedBoxes = records.compactMap { Box(from: $0) }
                self?.boxes = fetchedBoxes
                print("✅ Fetched \(fetchedBoxes.count) boxes")
                
                // Fetch photos for each box
                self?.fetchPhotosForBoxes(fetchedBoxes)
            }
        }
    }
    
    private func fetchPhotosForBoxes(_ boxes: [Box]) {
        for box in boxes {
            fetchPhotos(for: box.id)
        }
    }
    
    func fetchPhotos(for boxID: String) {
        let predicate = NSPredicate(format: "boxID == %@", boxID)
        let query = CKQuery(recordType: "BoxPhoto", predicate: predicate)
        
        privateDatabase.perform(query, inZoneWith: nil) { [weak self] records, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ Error fetching photos for box \(boxID): \(error)")
                    return
                }
                
                guard let records = records else { return }
                
                let photos = records.compactMap { BoxPhoto(from: $0) }
                
                // Update the box with its photos
                if let boxIndex = self?.boxes.firstIndex(where: { $0.id == boxID }) {
                    self?.boxes[boxIndex].photos = photos
                    print("✅ Fetched \(photos.count) photos for box \(boxID)")
                }
            }
        }
    }
    
    func saveBox(_ box: Box) async throws -> Box {
        guard isCloudKitAvailable else {
            throw CloudKitError.notAvailable
        }
        
        let record = box.toCKRecord()
        
        do {
            let savedRecord = try await privateDatabase.save(record)
            let savedBox = Box(from: savedRecord)!
            
            // Update local array
            if let index = boxes.firstIndex(where: { $0.id == box.id }) {
                boxes[index] = savedBox
            } else {
                boxes.insert(savedBox, at: 0)
            }
            
            print("✅ Saved box: \(savedBox.code)")
            return savedBox
        } catch {
            print("❌ Error saving box: \(error)")
            throw error
        }
    }
    
    func deleteBox(_ box: Box) async throws {
        guard isCloudKitAvailable else {
            throw CloudKitError.notAvailable
        }
        
        guard let recordID = box.recordID else {
            throw CloudKitError.invalidRecord
        }
        
        do {
            // First delete all photos for this box
            for photo in box.photos {
                if let photoRecordID = photo.recordID {
                    try await privateDatabase.deleteRecord(withID: photoRecordID)
                }
            }
            
            // Then delete the box
            try await privateDatabase.deleteRecord(withID: recordID)
            
            // Update local array
            boxes.removeAll { $0.id == box.id }
            
            print("✅ Deleted box: \(box.code)")
        } catch {
            print("❌ Error deleting box: \(error)")
            throw error
        }
    }
    
    // MARK: - Photo Operations
    
    func savePhoto(_ imageData: Data, for boxID: String) async throws -> BoxPhoto {
        guard isCloudKitAvailable else {
            throw CloudKitError.notAvailable
        }
        
        // Create temporary file for the image
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("jpg")
        
        try imageData.write(to: tempURL)
        
        let asset = CKAsset(fileURL: tempURL)
        let photo = BoxPhoto(boxID: boxID, imageAsset: asset)
        let record = photo.toCKRecord()
        
        do {
            let savedRecord = try await privateDatabase.save(record)
            let savedPhoto = BoxPhoto(from: savedRecord)!
            
            // Update local box with new photo
            if let boxIndex = boxes.firstIndex(where: { $0.id == boxID }) {
                boxes[boxIndex].photos.append(savedPhoto)
            }
            
            // Clean up temporary file
            try? FileManager.default.removeItem(at: tempURL)
            
            print("✅ Saved photo for box: \(boxID)")
            return savedPhoto
        } catch {
            // Clean up temporary file on error
            try? FileManager.default.removeItem(at: tempURL)
            print("❌ Error saving photo: \(error)")
            throw error
        }
    }
    
    func deletePhoto(_ photo: BoxPhoto) async throws {
        guard isCloudKitAvailable else {
            throw CloudKitError.notAvailable
        }
        
        guard let recordID = photo.recordID else {
            throw CloudKitError.invalidRecord
        }
        
        do {
            try await privateDatabase.deleteRecord(withID: recordID)
            
            // Update local box by removing the photo
            if let boxIndex = boxes.firstIndex(where: { $0.id == photo.boxID }) {
                boxes[boxIndex].photos.removeAll { $0.id == photo.id }
            }
            
            print("✅ Deleted photo: \(photo.id)")
        } catch {
            print("❌ Error deleting photo: \(error)")
            throw error
        }
    }
    
    // MARK: - Utility Methods
    
    func findBox(by code: String) -> Box? {
        return boxes.first { $0.code.lowercased() == code.lowercased() }
    }
    
    func generateNextBoxCode(for room: Room) -> String {
        let roomPrefix = String(room.rawValue.prefix(2)).uppercased()
        let existingCodes = boxes
            .filter { $0.room == room }
            .compactMap { box -> Int? in
                let code = box.code
                if code.hasPrefix(roomPrefix),
                   let numberString = code.dropFirst(2).first(where: { $0.isNumber }).map(String.init),
                   let number = Int(numberString) {
                    return number
                }
                return nil
            }
        
        let nextNumber = (existingCodes.max() ?? 0) + 1
        return "\(roomPrefix)\(String(format: "%02d", nextNumber))"
    }
}

enum CloudKitError: LocalizedError {
    case notAvailable
    case invalidRecord
    
    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "CloudKit is not available. Please check your iCloud settings."
        case .invalidRecord:
            return "Invalid CloudKit record."
        }
    }
}