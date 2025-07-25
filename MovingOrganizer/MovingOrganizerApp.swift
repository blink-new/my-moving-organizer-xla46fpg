import SwiftUI
import CloudKit

@main
struct MovingOrganizerApp: App {
    let cloudKitManager = CloudKitManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(cloudKitManager)
                .onAppear {
                    // Initialize CloudKit on app launch
                    cloudKitManager.initialize()
                }
        }
    }
}