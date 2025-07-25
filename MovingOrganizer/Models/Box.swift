import Foundation
import CloudKit
import SwiftUI

struct Box: Identifiable, Hashable {
    let id: String
    var code: String
    var title: String
    var room: Room
    var photos: [BoxPhoto]
    var createdAt: Date
    var recordID: CKRecord.ID?
    
    init(id: String = UUID().uuidString, code: String, title: String, room: Room, photos: [BoxPhoto] = [], createdAt: Date = Date(), recordID: CKRecord.ID? = nil) {
        self.id = id
        self.code = code
        self.title = title
        self.room = room
        self.photos = photos
        self.createdAt = createdAt
        self.recordID = recordID
    }
    
    // Initialize from CloudKit record
    init?(from record: CKRecord) {
        guard let code = record["code"] as? String,
              let title = record["title"] as? String,
              let roomRawValue = record["room"] as? String,
              let room = Room(rawValue: roomRawValue),
              let createdAt = record["createdAt"] as? Date else {
            return nil
        }
        
        self.id = record.recordID.recordName
        self.code = code
        self.title = title
        self.room = room
        self.photos = [] // Photos will be loaded separately
        self.createdAt = createdAt
        self.recordID = record.recordID
    }
    
    // Convert to CloudKit record
    func toCKRecord() -> CKRecord {
        let record: CKRecord
        if let recordID = recordID {
            record = CKRecord(recordType: "Box", recordID: recordID)
        } else {
            record = CKRecord(recordType: "Box")
        }
        
        record["code"] = code
        record["title"] = title
        record["room"] = room.rawValue
        record["createdAt"] = createdAt
        
        return record
    }
}

struct BoxPhoto: Identifiable, Hashable {
    let id: String
    var boxID: String
    var imageAsset: CKAsset?
    var imageData: Data?
    var recordID: CKRecord.ID?
    
    init(id: String = UUID().uuidString, boxID: String, imageAsset: CKAsset? = nil, imageData: Data? = nil, recordID: CKRecord.ID? = nil) {
        self.id = id
        self.boxID = boxID
        self.imageAsset = imageAsset
        self.imageData = imageData
        self.recordID = recordID
    }
    
    // Initialize from CloudKit record
    init?(from record: CKRecord) {
        guard let boxID = record["boxID"] as? String else {
            return nil
        }
        
        self.id = record.recordID.recordName
        self.boxID = boxID
        self.imageAsset = record["image"] as? CKAsset
        self.imageData = nil // Will be loaded when needed
        self.recordID = record.recordID
    }
    
    // Convert to CloudKit record
    func toCKRecord() -> CKRecord {
        let record: CKRecord
        if let recordID = recordID {
            record = CKRecord(recordType: "BoxPhoto", recordID: recordID)
        } else {
            record = CKRecord(recordType: "BoxPhoto")
        }
        
        record["boxID"] = boxID
        if let imageAsset = imageAsset {
            record["image"] = imageAsset
        }
        
        return record
    }
}

enum Room: String, CaseIterable, Identifiable {
    case livingRoom = "Living Room"
    case kitchen = "Kitchen"
    case bedroom = "Bedroom"
    case bathroom = "Bathroom"
    case office = "Office"
    case garage = "Garage"
    case basement = "Basement"
    case attic = "Attic"
    case other = "Other"
    
    var id: String { rawValue }
    
    var color: Color {
        switch self {
        case .livingRoom: return .blue
        case .kitchen: return .green
        case .bedroom: return .purple
        case .bathroom: return .cyan
        case .office: return .orange
        case .garage: return .gray
        case .basement: return .brown
        case .attic: return .yellow
        case .other: return .pink
        }
    }
    
    var emoji: String {
        switch self {
        case .livingRoom: return "🛋️"
        case .kitchen: return "🍳"
        case .bedroom: return "🛏️"
        case .bathroom: return "🚿"
        case .office: return "💼"
        case .garage: return "🚗"
        case .basement: return "🏠"
        case .attic: return "🏠"
        case .other: return "📦"
        }
    }
}