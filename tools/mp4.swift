// Kodiert eine Folge von JPEGs zu einem H.264-MP4.
//
// Nutzt AVFoundation, das auf jedem Mac vorhanden ist — dadurch braucht
// die Videoerzeugung kein ffmpeg und keine weitere Installation.
//
// Aufruf:  swift tools/mp4.swift <bildordner> <ziel.mp4> <bilder-pro-sekunde> <bitrate>

import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

let argumente = CommandLine.arguments
guard argumente.count >= 4 else {
    print("Aufruf: mp4.swift <bildordner> <ziel.mp4> <fps> [bitrate]")
    exit(1)
}

let ordner = argumente[1]
let zielPfad = argumente[2]
let fps = Int32(argumente[3]) ?? 30
let bitrate = argumente.count > 4 ? (Int(argumente[4]) ?? 16_000_000) : 16_000_000

let dateiVerwaltung = FileManager.default

guard let alle = try? dateiVerwaltung.contentsOfDirectory(atPath: ordner) else {
    print("Ordner nicht lesbar: \(ordner)")
    exit(1)
}
let bilder = alle.filter { $0.hasSuffix(".jpg") }.sorted()
guard !bilder.isEmpty else {
    print("Keine Bilder in \(ordner)")
    exit(1)
}

func ladeBild(_ pfad: String) -> CGImage? {
    guard let daten = NSData(contentsOfFile: pfad),
          let quelle = CGImageSourceCreateWithData(daten, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(quelle, 0, nil)
}

guard let erstes = ladeBild(ordner + "/" + bilder[0]) else {
    print("Erstes Bild nicht lesbar")
    exit(1)
}
// H.264 verlangt gerade Kantenlängen
let breite = erstes.width - (erstes.width % 2)
let hoehe = erstes.height - (erstes.height % 2)

try? dateiVerwaltung.removeItem(atPath: zielPfad)

let schreiber = try! AVAssetWriter(outputURL: URL(fileURLWithPath: zielPfad), fileType: .mp4)

let einstellungen: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: breite,
    AVVideoHeightKey: hoehe,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: fps,
        AVVideoAllowFrameReorderingKey: true
    ]
]

let eingang = AVAssetWriterInput(mediaType: .video, outputSettings: einstellungen)
eingang.expectsMediaDataInRealTime = false

let anpasser = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: eingang,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
        kCVPixelBufferWidthKey as String: breite,
        kCVPixelBufferHeightKey as String: hoehe,
        kCVPixelBufferCGImageCompatibilityKey as String: true
    ])

schreiber.add(eingang)
schreiber.startWriting()
schreiber.startSession(atSourceTime: .zero)

let farbraum = CGColorSpaceCreateDeviceRGB()
var nummer: Int64 = 0

for datei in bilder {
    guard let bild = ladeBild(ordner + "/" + datei) else { continue }

    var puffer: CVPixelBuffer?
    if let vorrat = anpasser.pixelBufferPool {
        CVPixelBufferPoolCreatePixelBuffer(nil, vorrat, &puffer)
    }
    if puffer == nil {
        CVPixelBufferCreate(nil, breite, hoehe, kCVPixelFormatType_32ARGB, nil, &puffer)
    }
    guard let ziel = puffer else { continue }

    CVPixelBufferLockBaseAddress(ziel, [])
    if let basis = CVPixelBufferGetBaseAddress(ziel),
       let kontext = CGContext(data: basis,
                               width: breite, height: hoehe,
                               bitsPerComponent: 8,
                               bytesPerRow: CVPixelBufferGetBytesPerRow(ziel),
                               space: farbraum,
                               bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue) {
        kontext.draw(bild, in: CGRect(x: 0, y: 0, width: breite, height: hoehe))
    }
    CVPixelBufferUnlockBaseAddress(ziel, [])

    while !eingang.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.005)
    }
    anpasser.append(ziel, withPresentationTime: CMTime(value: nummer, timescale: fps))
    nummer += 1
}

eingang.markAsFinished()

let warten = DispatchSemaphore(value: 0)
schreiber.finishWriting { warten.signal() }
warten.wait()

if schreiber.status == .completed {
    let groesse = (try? dateiVerwaltung.attributesOfItem(atPath: zielPfad)[.size] as? Int) ?? 0
    let sekunden = Double(nummer) / Double(fps)
    print(String(format: "%@  —  %d×%d, %.1f s, %d Bilder, %d MB",
                 zielPfad, breite, hoehe, sekunden, nummer, (groesse ?? 0) / 1_048_576))
} else {
    print("Fehlgeschlagen: \(schreiber.error?.localizedDescription ?? "unbekannt")")
    exit(1)
}
