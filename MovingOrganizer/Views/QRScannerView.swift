import SwiftUI
import AVFoundation

struct QRScannerView: View {
    @EnvironmentObject var cloudKitManager: CloudKitManager
    @State private var isScanning = false
    @State private var scannedCode: String?
    @State private var showingBoxDetail = false
    @State private var foundBox: Box?
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var hasPermission = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    Text("QR Scanner")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Scan a QR code to find your box")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .background(Color(.systemBackground))
                
                // Scanner view
                if hasPermission {
                    ZStack {
                        QRScannerViewRepresentable(
                            isScanning: $isScanning,
                            scannedCode: $scannedCode
                        )
                        
                        // Overlay with scanning frame
                        VStack {
                            Spacer()
                            
                            // Scanning frame
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.blue, lineWidth: 3)
                                .frame(width: 250, height: 250)
                                .overlay(
                                    VStack {
                                        HStack {
                                            Rectangle()
                                                .fill(Color.blue)
                                                .frame(width: 20, height: 3)
                                            Spacer()
                                            Rectangle()
                                                .fill(Color.blue)
                                                .frame(width: 20, height: 3)
                                        }
                                        Spacer()
                                        HStack {
                                            Rectangle()
                                                .fill(Color.blue)
                                                .frame(width: 20, height: 3)
                                            Spacer()
                                            Rectangle()
                                                .fill(Color.blue)
                                                .frame(width: 20, height: 3)
                                        }
                                    }
                                    .padding(8)
                                )
                            
                            Spacer()
                            
                            // Instructions
                            VStack(spacing: 12) {
                                Text(isScanning ? "Scanning..." : "Position QR code in the frame")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                                
                                if isScanning {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                }
                            }
                            .padding(.vertical, 24)
                            .padding(.horizontal, 32)
                            .background(Color.black.opacity(0.7))
                            .cornerRadius(16)
                            .padding(.bottom, 50)
                        }
                    }
                } else {
                    // Permission request view
                    VStack(spacing: 24) {
                        Spacer()
                        
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 64))
                            .foregroundColor(.secondary)
                        
                        VStack(spacing: 12) {
                            Text("Camera Access Required")
                                .font(.title2)
                                .fontWeight(.semibold)
                            
                            Text("To scan QR codes, this app needs access to your camera. Please grant permission in Settings.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                        
                        Button("Open Settings") {
                            if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(settingsUrl)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        
                        Button("Check Permission") {
                            checkCameraPermission()
                        }
                        .buttonStyle(.bordered)
                        
                        Spacer()
                    }
                    .padding()
                }
            }
            .navigationBarHidden(true)
            .onAppear {
                checkCameraPermission()
            }
            .onChange(of: scannedCode) { newCode in
                if let code = newCode {
                    handleScannedCode(code)
                }
            }
            .sheet(isPresented: $showingBoxDetail) {
                if let foundBox = foundBox {
                    NavigationView {
                        BoxDetailView(box: foundBox)
                    }
                }
            }
            .alert("QR Code Result", isPresented: $showingAlert) {
                Button("OK") {
                    // Reset scanning
                    scannedCode = nil
                    isScanning = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        isScanning = true
                    }
                }
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private func checkCameraPermission() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            hasPermission = true
            isScanning = true
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    hasPermission = granted
                    if granted {
                        isScanning = true
                    }
                }
            }
        case .denied, .restricted:
            hasPermission = false
        @unknown default:
            hasPermission = false
        }
    }
    
    private func handleScannedCode(_ code: String) {
        isScanning = false
        
        // Extract box code from different QR formats
        let boxCode: String
        if code.hasPrefix("myorganizer://box/") {
            boxCode = String(code.dropFirst("myorganizer://box/".count))
        } else if code.contains("/box/") {
            // Handle web URL format
            if let range = code.range(of: "/box/") {
                boxCode = String(code[range.upperBound...])
            } else {
                boxCode = code
            }
        } else {
            boxCode = code
        }
        
        // Find the box
        if let box = cloudKitManager.findBox(by: boxCode) {
            foundBox = box
            showingBoxDetail = true
        } else {
            alertMessage = "Box with code '\(boxCode)' not found. Make sure the QR code is from this app and the box exists in your collection."
            showingAlert = true
        }
    }
}

struct QRScannerViewRepresentable: UIViewControllerRepresentable {
    @Binding var isScanning: Bool
    @Binding var scannedCode: String?
    
    func makeUIViewController(context: Context) -> QRScannerViewController {
        let controller = QRScannerViewController()
        controller.delegate = context.coordinator
        return controller
    }
    
    func updateUIViewController(_ uiViewController: QRScannerViewController, context: Context) {
        if isScanning {
            uiViewController.startScanning()
        } else {
            uiViewController.stopScanning()
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, QRScannerDelegate {
        let parent: QRScannerViewRepresentable
        
        init(_ parent: QRScannerViewRepresentable) {
            self.parent = parent
        }
        
        func didScanCode(_ code: String) {
            parent.scannedCode = code
        }
    }
}

protocol QRScannerDelegate: AnyObject {
    func didScanCode(_ code: String)
}

class QRScannerViewController: UIViewController {
    weak var delegate: QRScannerDelegate?
    
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupCamera()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.layer.bounds
    }
    
    private func setupCamera() {
        captureSession = AVCaptureSession()
        
        guard let videoCaptureDevice = AVCaptureDevice.default(for: .video) else {
            print("Failed to get camera device")
            return
        }
        
        let videoInput: AVCaptureDeviceInput
        
        do {
            videoInput = try AVCaptureDeviceInput(device: videoCaptureDevice)
        } catch {
            print("Failed to create video input: \(error)")
            return
        }
        
        if captureSession?.canAddInput(videoInput) == true {
            captureSession?.addInput(videoInput)
        } else {
            print("Failed to add video input")
            return
        }
        
        let metadataOutput = AVCaptureMetadataOutput()
        
        if captureSession?.canAddOutput(metadataOutput) == true {
            captureSession?.addOutput(metadataOutput)
            
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr]
        } else {
            print("Failed to add metadata output")
            return
        }
        
        previewLayer = AVCaptureVideoPreviewLayer(session: captureSession!)
        previewLayer?.frame = view.layer.bounds
        previewLayer?.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer!)
    }
    
    func startScanning() {
        if captureSession?.isRunning == false {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.captureSession?.startRunning()
            }
        }
    }
    
    func stopScanning() {
        if captureSession?.isRunning == true {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.captureSession?.stopRunning()
            }
        }
    }
}

extension QRScannerViewController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        if let metadataObject = metadataObjects.first {
            guard let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject else { return }
            guard let stringValue = readableObject.stringValue else { return }
            
            // Haptic feedback
            AudioServicesPlaySystemSound(SystemSoundID(kSystemSoundID_Vibrate))
            
            delegate?.didScanCode(stringValue)
        }
    }
}

#Preview {
    QRScannerView()
        .environmentObject(CloudKitManager.shared)
}