// BAK cihaz işlevleri (iOS): Android'deki CihazModulu.java ile aynı ad, yöntemler ve olaylar.
//  - ekranAcikTut: kamera, yol tarifi ve dinleme sırasında ekran kararıp kilitlenmesin
//  - ara: yardım numarası (iOS aramayı başlatmadan önce kullanıcıya kendisi sorar)
//  - konumAl: "konumumu gönder" için tek seferlik konum
//  - kisiSec: rehberden acil kişi (iOS kişi seçicisi: rehberin tamamını okuma izni gerekmez)
//  - yonVarMi / yonBaslat / yonDurdur: telefonun yönü (derece) "onYon" olayıyla; jiroskop tabanlı, pusula gibi
//    binadaki metalden etkilenmez (Android'deki oyun dönüş vektörü karşılığı)
//  - whatsappAc: sohbet hazır mesajla açılır. iOS başka uygulamaların düğmelerine basmaya izin vermediği için
//    "WhatsApp yardımcısı" yoktur: Gönder'e kullanıcı basar (whatsappYardimcisiAcikMi her zaman hayır)

#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>
#import <CoreLocation/CoreLocation.h>
#import <CoreMotion/CoreMotion.h>
#import <ContactsUI/ContactsUI.h>

@interface CihazModulu : RCTEventEmitter <RCTBridgeModule, CLLocationManagerDelegate, CNContactPickerDelegate>
@end

@implementation CihazModulu {
  BOOL _dinleyici;
  CLLocationManager *_konumYoneticisi;
  RCTPromiseResolveBlock _konumSozu;
  NSTimer *_konumSuresi;
  RCTPromiseResolveBlock _kisiSozu;
  CMMotionManager *_hareket;
  NSTimeInterval _sonYon;
}

RCT_EXPORT_MODULE(CihazModulu)

+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents { return @[@"onYon", @"onWhatsappGorevi"]; }
- (void)startObserving { _dinleyici = YES; }
- (void)stopObserving { _dinleyici = NO; }

RCT_EXPORT_METHOD(ekranAcikTut:(BOOL)acik) {
  [UIApplication sharedApplication].idleTimerDisabled = acik;
}

RCT_EXPORT_METHOD(ara:(NSString *)numara coz:(RCTPromiseResolveBlock)coz reddet:(RCTPromiseRejectBlock)reddet) {
  NSString *temiz = [[numara componentsSeparatedByCharactersInSet:
                      [[NSCharacterSet characterSetWithCharactersInString:@"+0123456789"] invertedSet]]
                     componentsJoinedByString:@""];
  NSURL *adres = [NSURL URLWithString:[@"tel:" stringByAppendingString:temiz]];
  if (!adres || ![[UIApplication sharedApplication] canOpenURL:adres]) {
    reddet(@"arama", @"Bu cihaz arama yapamıyor", nil);
    return;
  }
  [[UIApplication sharedApplication] openURL:adres options:@{} completionHandler:^(BOOL basarili) {
    if (basarili) coz(@YES); else reddet(@"arama", @"Arama başlatılamadı", nil);
  }];
}

// ── Konum: yalnızca kullanıcı "konumumu gönder" dediğinde, tek seferlik ──
RCT_EXPORT_METHOD(konumAl:(RCTPromiseResolveBlock)coz reddet:(RCTPromiseRejectBlock)reddet) {
  if (_konumSozu) {   // önceki istek sürüyor
    coz([NSNull null]);
    return;
  }
  if (!_konumYoneticisi) {
    _konumYoneticisi = [[CLLocationManager alloc] init];
    _konumYoneticisi.delegate = self;
    _konumYoneticisi.desiredAccuracy = kCLLocationAccuracyBest;
  }
  _konumSozu = coz;
  CLAuthorizationStatus durum = _konumYoneticisi.authorizationStatus;
  if (durum == kCLAuthorizationStatusDenied || durum == kCLAuthorizationStatusRestricted) {
    [self konumuBitir:nil];
    return;
  }
  // Taze konum en çok 10 sn beklenir; gelmezse telefonun bildiği son konum
  _konumSuresi = [NSTimer scheduledTimerWithTimeInterval:10 repeats:NO block:^(NSTimer *t) {
    [self konumuBitir:self->_konumYoneticisi.location];
  }];
  if (durum == kCLAuthorizationStatusNotDetermined) [_konumYoneticisi requestWhenInUseAuthorization];
  else [_konumYoneticisi requestLocation];
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)yonetici {
  if (!_konumSozu) return;
  CLAuthorizationStatus durum = yonetici.authorizationStatus;
  if (durum == kCLAuthorizationStatusAuthorizedWhenInUse || durum == kCLAuthorizationStatusAuthorizedAlways) {
    [yonetici requestLocation];
  } else if (durum != kCLAuthorizationStatusNotDetermined) {
    [self konumuBitir:nil];
  }
}

- (void)locationManager:(CLLocationManager *)yonetici didUpdateLocations:(NSArray<CLLocation *> *)konumlar {
  [self konumuBitir:konumlar.lastObject];
}

- (void)locationManager:(CLLocationManager *)yonetici didFailWithError:(NSError *)hata {
  [self konumuBitir:yonetici.location];
}

- (void)konumuBitir:(CLLocation *)konum {
  [_konumSuresi invalidate];
  _konumSuresi = nil;
  RCTPromiseResolveBlock soz = _konumSozu;
  _konumSozu = nil;
  if (!soz) return;
  if (!konum) {
    soz([NSNull null]);
    return;
  }
  soz(@{@"enlem": @(konum.coordinate.latitude), @"boylam": @(konum.coordinate.longitude),
        @"dogruluk": @(konum.horizontalAccuracy), @"zaman": @([konum.timestamp timeIntervalSince1970] * 1000)});
}

// ── Rehberden kişi seçme ──
RCT_EXPORT_METHOD(kisiSec:(RCTPromiseResolveBlock)coz reddet:(RCTPromiseRejectBlock)reddet) {
  UIViewController *ust = RCTPresentedViewController();
  if (!ust || _kisiSozu) {
    coz([NSNull null]);
    return;
  }
  _kisiSozu = coz;
  CNContactPickerViewController *secici = [[CNContactPickerViewController alloc] init];
  secici.delegate = self;
  secici.displayedPropertyKeys = @[CNContactPhoneNumbersKey];
  secici.predicateForEnablingContact = [NSPredicate predicateWithFormat:@"phoneNumbers.@count > 0"];
  [ust presentViewController:secici animated:YES completion:nil];
}

- (void)contactPicker:(CNContactPickerViewController *)secici didSelectContactProperty:(CNContactProperty *)ozellik {
  CNContact *kisi = ozellik.contact;
  NSString *ad = [CNContactFormatter stringFromContact:kisi style:CNContactFormatterStyleFullName] ?: @"";
  NSString *numara = [ozellik.value isKindOfClass:[CNPhoneNumber class]] ? ((CNPhoneNumber *)ozellik.value).stringValue : nil;
  RCTPromiseResolveBlock soz = _kisiSozu;
  _kisiSozu = nil;
  if (soz) soz(numara ? @{@"ad": ad, @"numara": numara} : (id)[NSNull null]);
}

// Tek numaralı kişide iOS numarayı ayrıca sormadan kişiyi döndürür
- (void)contactPicker:(CNContactPickerViewController *)secici didSelectContact:(CNContact *)kisi {
  NSString *ad = [CNContactFormatter stringFromContact:kisi style:CNContactFormatterStyleFullName] ?: @"";
  NSString *numara = kisi.phoneNumbers.firstObject.value.stringValue;
  RCTPromiseResolveBlock soz = _kisiSozu;
  _kisiSozu = nil;
  if (soz) soz(numara ? @{@"ad": ad, @"numara": numara} : (id)[NSNull null]);
}

- (void)contactPickerDidCancel:(CNContactPickerViewController *)secici {
  RCTPromiseResolveBlock soz = _kisiSozu;
  _kisiSozu = nil;
  if (soz) soz([NSNull null]);
}

// ── Yön (derece): yalnızca dönüşü ölçmek için, mutlak kuzey değil ──
RCT_EXPORT_METHOD(yonVarMi:(RCTPromiseResolveBlock)coz reddet:(RCTPromiseRejectBlock)reddet) {
  if (!_hareket) _hareket = [[CMMotionManager alloc] init];
  coz(@(_hareket.isDeviceMotionAvailable));
}

RCT_EXPORT_METHOD(yonBaslat) {
  if (!_hareket) _hareket = [[CMMotionManager alloc] init];
  if (!_hareket.isDeviceMotionAvailable || _hareket.isDeviceMotionActive) return;
  _hareket.deviceMotionUpdateInterval = 0.2;   // saniyede 5 ölçüm yeter, pil ve köprü yükü azalır
  __weak CihazModulu *zayif = self;
  [_hareket startDeviceMotionUpdatesUsingReferenceFrame:CMAttitudeReferenceFrameXArbitraryZVertical
                                                toQueue:[NSOperationQueue mainQueue]
                                            withHandler:^(CMDeviceMotion *hareket, NSError *hata) {
    CihazModulu *guclu = zayif;
    if (!guclu || !hareket || !guclu->_dinleyici) return;
    // yaw saat yönünün tersine artar; Android'deki gibi saat yönünde 0–360 derece
    double derece = fmod(360.0 - hareket.attitude.yaw * 180.0 / M_PI, 360.0);
    [guclu sendEventWithName:@"onYon" body:@(derece)];
  }];
}

RCT_EXPORT_METHOD(yonDurdur) {
  [_hareket stopDeviceMotionUpdates];
}

// ── WhatsApp: sohbet hazır mesajla açılır; Gönder'e kullanıcı basar ──
// numara: ülke kodlu, yalnızca rakam. gorev ("yok", "gonder", "canli") iOS'ta yok sayılır.
RCT_EXPORT_METHOD(whatsappAc:(NSString *)numara metin:(NSString *)metin gorev:(NSString *)gorev
                  coz:(RCTPromiseResolveBlock)coz reddet:(RCTPromiseRejectBlock)reddet) {
  NSMutableCharacterSet *izinli = [[NSCharacterSet URLQueryAllowedCharacterSet] mutableCopy];
  [izinli removeCharactersInString:@"&=+?#"];
  NSString *kodlu = [metin stringByAddingPercentEncodingWithAllowedCharacters:izinli] ?: @"";
  NSURL *adres = [NSURL URLWithString:[NSString stringWithFormat:@"whatsapp://send?phone=%@&text=%@", numara, kodlu]];
  // Info.plist: LSApplicationQueriesSchemes içinde "whatsapp" olmalı, yoksa canOpenURL hep hayır der
  if (!adres || ![[UIApplication sharedApplication] canOpenURL:adres]) {
    coz(@"yok");
    return;
  }
  [[UIApplication sharedApplication] openURL:adres options:@{} completionHandler:^(BOOL basarili) {
    coz(basarili ? @"acildi" : @"hata");
  }];
}

RCT_EXPORT_METHOD(whatsappYardimcisiAcikMi:(RCTPromiseResolveBlock)coz reddet:(RCTPromiseRejectBlock)reddet) {
  coz(@NO);
}

RCT_EXPORT_METHOD(erisilebilirlikAyarlariniAc) {
  NSURL *ayarlar = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
  if (ayarlar) [[UIApplication sharedApplication] openURL:ayarlar options:@{} completionHandler:nil];
}

- (void)invalidate {
  [_hareket stopDeviceMotionUpdates];
  [_konumSuresi invalidate];
  [super invalidate];
}

@end
