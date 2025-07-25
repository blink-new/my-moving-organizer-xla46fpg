import SwiftUI

struct BoxDetailView: View {
    @EnvironmentObject var cloudKitManager: CloudKitManager
    @Environment(\.dismiss) private var dismiss
    
    let box: Box
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false
    @State private var showingShareSheet = false
    @State private var isDeleting = false
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    // Box code
                    Text(box.code)
                        .font(.system(size: 48, weight: .bold, design: .monospaced))
                        .foregroundColor(.blue)
                    
                    // Title
                    Text(box.title)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .multilineTextAlignment(.center)
                    
                    // Room badge
                    HStack(spacing: 8) {
                        Text(box.room.emoji)
                        Text(box.room.rawValue)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(box.room.color.opacity(0.2))
                    .foregroundColor(box.room.color)
                    .cornerRadius(20)
                    
                    // Created date
                    Text("Created \(box.createdAt, style: .date)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.top)
                
                // QR Code
                VStack(spacing: 16) {
                    Text("QR Code")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    if let qrImage = QRCodeGenerator.generateQRCode(from: "myorganizer://box/\(box.code)") {
                        Image(uiImage: qrImage)
                            .interpolation(.none)
                            .resizable()
                            .frame(width: 200, height: 200)
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                    } else {
                        Rectangle()
                            .fill(Color(.systemGray5))
                            .frame(width: 200, height: 200)
                            .cornerRadius(12)
                            .overlay(
                                Text("QR Code\nUnavailable")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            )
                    }
                    
                    Button(action: {
                        showingShareSheet = true
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "square.and.arrow.up")
                            Text("Share QR Code")
                                .fontWeight(.medium)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                }
                .padding(.horizontal)
                
                // Photos
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Photos")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        Text("\(box.photos.count) photos")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    
                    if box.photos.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "photo")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            
                            Text("No photos yet")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            Text("Edit this box to add photos")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    } else {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(box.photos) { photo in
                                    AsyncImage(url: photo.imageAsset?.fileURL) { image in
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
                                    .frame(width: 150, height: 150)
                                    .clipped()
                                    .cornerRadius(12)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                
                Spacer(minLength: 100)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: {
                    dismiss()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .medium))
                        Text("Back")
                    }
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 16) {
                    // Edit button
                    Button(action: {
                        showingEditSheet = true
                    }) {
                        Image(systemName: "pencil")
                            .font(.system(size: 16, weight: .medium))
                    }
                    
                    // Delete button
                    Button(action: {
                        showingDeleteAlert = true
                    }) {
                        Image(systemName: "trash")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.red)
                    }
                    .disabled(isDeleting)
                }
            }
        }
        .sheet(isPresented: $showingEditSheet) {
            AddBoxView(editingBox: box)
        }
        .sheet(isPresented: $showingShareSheet) {
            if let qrImage = QRCodeGenerator.generateQRCode(from: "myorganizer://box/\(box.code)") {
                ShareSheet(items: [qrImage])
            }
        }
        .alert("Delete Box", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                deleteBox()
            }
        } message: {
            Text("Are you sure you want to delete \"\(box.title)\"? This action cannot be undone.")
        }
        .alert("Error", isPresented: $showingAlert) {
            Button("OK") { }
        } message: {
            Text(alertMessage)
        }
        .overlay(
            Group {
                if isDeleting {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Deleting box...")
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
    
    private func deleteBox() {
        isDeleting = true
        
        Task {
            do {
                try await cloudKitManager.deleteBox(box)
                
                await MainActor.run {
                    isDeleting = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isDeleting = false
                    alertMessage = "Failed to delete box: \(error.localizedDescription)"
                    showingAlert = true
                }
            }
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    NavigationView {
        BoxDetailView(box: Box(
            code: "LR01",
            title: "Living Room Books",
            room: .livingRoom
        ))
    }
    .environmentObject(CloudKitManager.shared)
}