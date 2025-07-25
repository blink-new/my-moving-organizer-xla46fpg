import SwiftUI
import PhotosUI

struct AddBoxView: View {
    @EnvironmentObject var cloudKitManager: CloudKitManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var title = ""
    @State private var selectedRoom: Room = .livingRoom
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var photoImages: [UIImage] = []
    @State private var isLoading = false
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var showingCamera = false
    
    // For editing existing box
    let editingBox: Box?
    
    init(editingBox: Box? = nil) {
        self.editingBox = editingBox
    }
    
    var isEditing: Bool {
        editingBox != nil
    }
    
    var generatedCode: String {
        cloudKitManager.generateNextBoxCode(for: selectedRoom)
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Text(isEditing ? "Edit Box" : "Add New Box")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        if !isEditing {
                            Text("Code: \(generatedCode)")
                                .font(.headline)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                        }
                    }
                    .padding(.top)
                    
                    VStack(spacing: 20) {
                        // Title input
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Box Title")
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            TextField("e.g., Kitchen Utensils", text: $title)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .font(.body)
                        }
                        
                        // Room selection
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Room")
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(Room.allCases) { room in
                                        Button(action: {
                                            selectedRoom = room
                                        }) {
                                            VStack(spacing: 8) {
                                                Text(room.emoji)
                                                    .font(.title2)
                                                
                                                Text(room.rawValue)
                                                    .font(.caption)
                                                    .fontWeight(.medium)
                                                    .multilineTextAlignment(.center)
                                            }
                                            .frame(width: 80, height: 80)
                                            .background(selectedRoom == room ? room.color : Color(.systemGray5))
                                            .foregroundColor(selectedRoom == room ? .white : .primary)
                                            .cornerRadius(12)
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                        
                        // Photos section
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Photos")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                
                                Spacer()
                                
                                Text("\(photoImages.count) selected")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            // Photo grid
                            if !photoImages.isEmpty {
                                LazyVGrid(columns: [
                                    GridItem(.flexible(), spacing: 8),
                                    GridItem(.flexible(), spacing: 8),
                                    GridItem(.flexible(), spacing: 8)
                                ], spacing: 8) {
                                    ForEach(Array(photoImages.enumerated()), id: \.offset) { index, image in
                                        ZStack(alignment: .topTrailing) {
                                            Image(uiImage: image)
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                                .frame(height: 100)
                                                .clipped()
                                                .cornerRadius(8)
                                            
                                            Button(action: {
                                                photoImages.remove(at: index)
                                            }) {
                                                Image(systemName: "xmark.circle.fill")
                                                    .font(.title3)
                                                    .foregroundColor(.white)
                                                    .background(Color.black.opacity(0.6))
                                                    .clipShape(Circle())
                                            }
                                            .padding(4)
                                        }
                                    }
                                }
                            }
                            
                            // Add photo buttons
                            HStack(spacing: 12) {
                                // Photo library picker
                                PhotosPicker(
                                    selection: $selectedPhotos,
                                    maxSelectionCount: 10,
                                    matching: .images
                                ) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "photo.on.rectangle")
                                        Text("Photo Library")
                                            .fontWeight(.medium)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(10)
                                }
                                
                                // Camera button
                                Button(action: {
                                    showingCamera = true
                                }) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "camera")
                                        Text("Camera")
                                            .fontWeight(.medium)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(Color.green)
                                    .foregroundColor(.white)
                                    .cornerRadius(10)
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                    
                    Spacer(minLength: 100)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(isEditing ? "Update" : "Save") {
                        saveBox()
                    }
                    .fontWeight(.semibold)
                    .disabled(title.isEmpty || isLoading)
                }
            }
        }
        .onAppear {
            if let editingBox = editingBox {
                title = editingBox.title
                selectedRoom = editingBox.room
                // Load existing photos
                loadExistingPhotos()
            }
        }
        .onChange(of: selectedPhotos) { newItems in
            loadSelectedPhotos(newItems)
        }
        .sheet(isPresented: $showingCamera) {
            CameraView { image in
                photoImages.append(image)
            }
        }
        .alert("Error", isPresented: $showingAlert) {
            Button("OK") { }
        } message: {
            Text(alertMessage)
        }
        .overlay(
            Group {
                if isLoading {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text(isEditing ? "Updating box..." : "Creating box...")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .padding(24)
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                }
            }
        )
    }
    
    private func loadExistingPhotos() {
        guard let editingBox = editingBox else { return }
        
        // Load images from CloudKit assets
        for photo in editingBox.photos {
            if let asset = photo.imageAsset,
               let data = try? Data(contentsOf: asset.fileURL!),
               let image = UIImage(data: data) {
                photoImages.append(image)
            }
        }
    }
    
    private func loadSelectedPhotos(_ items: [PhotosPickerItem]) {
        Task {
            for item in items {
                if let data = try? await item.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    await MainActor.run {
                        photoImages.append(image)
                    }
                }
            }
            
            await MainActor.run {
                selectedPhotos.removeAll()
            }
        }
    }
    
    private func saveBox() {
        guard !title.isEmpty else {
            alertMessage = "Please enter a box title"
            showingAlert = true
            return
        }
        
        isLoading = true
        
        Task {
            do {
                let box: Box
                if let editingBox = editingBox {
                    // Update existing box
                    box = Box(
                        id: editingBox.id,
                        code: editingBox.code,
                        title: title,
                        room: selectedRoom,
                        photos: editingBox.photos,
                        createdAt: editingBox.createdAt,
                        recordID: editingBox.recordID
                    )
                } else {
                    // Create new box
                    box = Box(
                        code: generatedCode,
                        title: title,
                        room: selectedRoom
                    )
                }
                
                let savedBox = try await cloudKitManager.saveBox(box)
                
                // Save photos
                for image in photoImages {
                    if let imageData = image.jpegData(compressionQuality: 0.8) {
                        try await cloudKitManager.savePhoto(imageData, for: savedBox.id)
                    }
                }
                
                await MainActor.run {
                    isLoading = false
                    dismiss()
                }
                
            } catch {
                await MainActor.run {
                    isLoading = false
                    alertMessage = "Failed to save box: \(error.localizedDescription)"
                    showingAlert = true
                }
            }
        }
    }
}

#Preview {
    AddBoxView()
        .environmentObject(CloudKitManager.shared)
}