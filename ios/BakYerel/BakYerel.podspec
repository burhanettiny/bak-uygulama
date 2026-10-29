require "json"

# BAK'ın iPhone yerel modülleri (Android'deki android/app/src/main/java/com/alisverisasistani/*.java karşılıkları).
# Xcode projesine elle dosya eklemek yerine yerel bir pod olarak Podfile'dan bağlanır.
Pod::Spec.new do |s|
  s.name         = "BakYerel"
  s.version      = "1.0.0"
  s.summary      = "BAK: sesli komut, adım sayar, yön, konum, kişi seçme ve ses uyarıları (iOS)"
  s.homepage     = "https://burhanettiny.github.io/bak-mekanlar/"
  s.license      = { :type => "Proprietary" }
  s.author       = "Burhanettin Yalçınkaya"
  s.platform     = :ios, "15.5"
  s.source       = { :path => "." }
  s.source_files = "*.{h,m}"
  s.frameworks   = "Speech", "AVFoundation", "AudioToolbox", "CoreMotion", "CoreLocation", "Contacts", "ContactsUI"
  s.dependency "React-Core"
end
