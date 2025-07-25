import SwiftUI

struct BoxListView: View {
    @EnvironmentObject var cloudKitManager: CloudKitManager
    @State private var searchText = ""
    @State private var selectedRoom: Room?
    @State private var showingAddBox = false
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var filteredBoxes: [Box] {
        var boxes = cloudKitManager.boxes
        
        // Filter by room if selected
        if let selectedRoom = selectedRoom {
            boxes = boxes.filter { $0.room == selectedRoom }
        }
        
        // Filter by search text
        if !searchText.isEmpty {
            boxes = boxes.filter { box in
                box.title.localizedCaseInsensitiveContains(searchText) ||
                box.code.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return boxes
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Moving Organizer")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            Text("\(cloudKitManager.boxes.count) boxes")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Button(action: {
                            showingAddBox = true
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal)
                    
                    // Search bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        
                        TextField("Search boxes...", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                    .padding(.horizontal)
                    
                    // Room filter
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            // All rooms button
                            Button(action: {
                                selectedRoom = nil
                            }) {
                                HStack(spacing: 6) {
                                    Text("📦")
                                    Text("All")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(selectedRoom == nil ? Color.blue : Color(.systemGray5))
                                .foregroundColor(selectedRoom == nil ? .white : .primary)
                                .cornerRadius(16)
                            }
                            
                            ForEach(Room.allCases) { room in
                                Button(action: {
                                    selectedRoom = selectedRoom == room ? nil : room
                                }) {
                                    HStack(spacing: 6) {
                                        Text(room.emoji)
                                        Text(room.rawValue)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(selectedRoom == room ? room.color : Color(.systemGray5))
                                    .foregroundColor(selectedRoom == room ? .white : .primary)
                                    .cornerRadius(16)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.top)
                .background(Color(.systemBackground))
                
                // Content
                if cloudKitManager.isLoading {
                    Spacer()
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Loading your boxes...")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else if !cloudKitManager.isCloudKitAvailable {
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: "icloud.slash")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        
                        Text("iCloud Not Available")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Text(cloudKitManager.errorMessage ?? "Please sign in to iCloud to use this app")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        
                        Button("Retry") {
                            cloudKitManager.initialize()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    Spacer()
                } else if filteredBoxes.isEmpty {
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: searchText.isEmpty && selectedRoom == nil ? "shippingbox" : "magnifyingglass")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        
                        Text(searchText.isEmpty && selectedRoom == nil ? "No boxes yet" : "No boxes found")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Text(searchText.isEmpty && selectedRoom == nil ? "Tap the + button to add your first box" : "Try adjusting your search or filter")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        if searchText.isEmpty && selectedRoom == nil {
                            Button("Add First Box") {
                                showingAddBox = true
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }
                    Spacer()
                } else {
                    // Box grid
                    ScrollView {
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12)
                        ], spacing: 12) {
                            ForEach(filteredBoxes) { box in
                                NavigationLink(destination: BoxDetailView(box: box)) {
                                    BoxCardView(box: box)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top)
                    }
                }
            }
            .navigationBarHidden(true)
            .refreshable {
                cloudKitManager.fetchBoxes()
            }
        }
        .sheet(isPresented: $showingAddBox) {
            AddBoxView()
        }
        .alert("Error", isPresented: $showingAlert) {
            Button("OK") { }
        } message: {
            Text(alertMessage)
        }
        .onReceive(cloudKitManager.$errorMessage) { errorMessage in
            if let errorMessage = errorMessage {
                alertMessage = errorMessage
                showingAlert = true
            }
        }
    }
}

struct BoxCardView: View {
    let box: Box
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with room indicator
            HStack {
                HStack(spacing: 6) {
                    Text(box.room.emoji)
                        .font(.caption)
                    Text(box.room.rawValue)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(box.room.color.opacity(0.2))
                .foregroundColor(box.room.color)
                .cornerRadius(8)
                
                Spacer()
                
                Text(box.code)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
            }
            
            // Photo preview
            if let firstPhoto = box.photos.first {
                AsyncImage(url: firstPhoto.imageAsset?.fileURL) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color(.systemGray5))
                        .overlay(
                            ProgressView()
                                .scaleEffect(0.8)
                        )
                }
                .frame(height: 100)
                .clipped()
                .cornerRadius(8)
            } else {
                Rectangle()
                    .fill(Color(.systemGray5))
                    .frame(height: 100)
                    .overlay(
                        VStack(spacing: 4) {
                            Image(systemName: "photo")
                                .font(.title2)
                                .foregroundColor(.secondary)
                            Text("No photos")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    )
                    .cornerRadius(8)
            }
            
            // Title and photo count
            VStack(alignment: .leading, spacing: 4) {
                Text(box.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                    .foregroundColor(.primary)
                
                HStack {
                    Image(systemName: "photo")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(box.photos.count) photos")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Text(box.createdAt, style: .date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
}

#Preview {
    BoxListView()
        .environmentObject(CloudKitManager.shared)
}