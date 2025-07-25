import SwiftUI

struct ContentView: View {
    @EnvironmentObject var cloudKitManager: CloudKitManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            BoxListView()
                .tabItem {
                    Image(systemName: "shippingbox.fill")
                    Text("Boxes")
                }
                .tag(0)
            
            QRScannerView()
                .tabItem {
                    Image(systemName: "qrcode.viewfinder")
                    Text("Scanner")
                }
                .tag(1)
        }
        .accentColor(.blue)
        .onAppear {
            // Customize tab bar appearance
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor.systemBackground
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(CloudKitManager.shared)
}