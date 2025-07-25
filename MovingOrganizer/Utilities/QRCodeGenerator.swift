import UIKit
import CoreImage

struct QRCodeGenerator {
    static func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: String.Encoding.ascii)
        
        if let filter = CIFilter(name: "CIQRCodeGenerator") {
            filter.setValue(data, forKey: "inputMessage")
            let transform = CGAffineTransform(scaleX: 10, y: 10)
            
            if let output = filter.outputImage?.transformed(by: transform) {
                let context = CIContext()
                if let cgImage = context.createCGImage(output, from: output.extent) {
                    return UIImage(cgImage: cgImage)
                }
            }
        }
        
        return nil
    }
    
    static func generateQRCodeWithLogo(from string: String, logo: UIImage? = nil) -> UIImage? {
        guard let qrImage = generateQRCode(from: string) else { return nil }
        
        guard let logo = logo else { return qrImage }
        
        let size = qrImage.size
        UIGraphicsBeginImageContextWithOptions(size, false, 0)
        
        // Draw QR code
        qrImage.draw(in: CGRect(origin: .zero, size: size))
        
        // Draw logo in center
        let logoSize = CGSize(width: size.width * 0.2, height: size.height * 0.2)
        let logoRect = CGRect(
            x: (size.width - logoSize.width) / 2,
            y: (size.height - logoSize.height) / 2,
            width: logoSize.width,
            height: logoSize.height
        )
        
        // Add white background for logo
        UIColor.white.setFill()
        let backgroundRect = logoRect.insetBy(dx: -5, dy: -5)
        UIBezierPath(roundedRect: backgroundRect, cornerRadius: 5).fill()
        
        logo.draw(in: logoRect)
        
        let result = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return result
    }
}