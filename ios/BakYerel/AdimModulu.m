// BAK adım sayar (iOS): Android'deki AdimModulu.java ile aynı ad ve yöntemler (mevcutMu, baslat, durdur),
// her adımda "onAdim" olayı (adımın zamanı, ms).
//
// iPhone tek tek adım olayı vermez; CMPedometer toplam adım sayısını birkaç saniyede bir bildirir. Aradaki adımlar
// iki bildirim arasına eşit aralıkla yayılarak gönderilir: JS'teki yürüyüş filtresi (src/mekan/yuruyusFiltresi.ts)
// ve rehberin geri sayımı Android'dekiyle aynı çalışır.

#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>
#import <CoreMotion/CoreMotion.h>

@interface AdimModulu : RCTEventEmitter <RCTBridgeModule>
@end

@implementation AdimModulu {
  CMPedometer *_adimSayar;
  NSInteger _sonSayi;
  NSTimeInterval _sonZaman;   // ms
  BOOL _dinleyici;
}

RCT_EXPORT_MODULE(AdimModulu)

+ (BOOL)requiresMainQueueSetup { return NO; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents { return @[@"onAdim"]; }
- (void)startObserving { _dinleyici = YES; }
- (void)stopObserving { _dinleyici = NO; }

RCT_EXPORT_METHOD(mevcutMu:(RCTPromiseResolveBlock)coz reddet:(RCTPromiseRejectBlock)reddet) {
  coz(@([CMPedometer isStepCountingAvailable] &&
        [CMPedometer authorizationStatus] != CMAuthorizationStatusDenied &&
        [CMPedometer authorizationStatus] != CMAuthorizationStatusRestricted));
}

RCT_EXPORT_METHOD(baslat) {
  if (_adimSayar || ![CMPedometer isStepCountingAvailable]) return;
  _adimSayar = [[CMPedometer alloc] init];
  _sonSayi = 0;
  _sonZaman = [[NSDate date] timeIntervalSince1970] * 1000;
  __weak AdimModulu *zayif = self;
  // İlk kullanımda iOS "Hareket ve Fitness" izni sorar (Info.plist: NSMotionUsageDescription)
  [_adimSayar startPedometerUpdatesFromDate:[NSDate date] withHandler:^(CMPedometerData *veri, NSError *hata) {
    if (!veri || hata) return;
    dispatch_async(dispatch_get_main_queue(), ^{
      AdimModulu *guclu = zayif;
      if (!guclu || !guclu->_adimSayar) return;
      NSInteger sayi = veri.numberOfSteps.integerValue;
      NSInteger yeni = sayi - guclu->_sonSayi;
      if (yeni <= 0) return;
      NSTimeInterval simdi = [veri.endDate timeIntervalSince1970] * 1000;
      NSTimeInterval aralik = (simdi - guclu->_sonZaman) / yeni;
      for (NSInteger i = 1; i <= yeni; i++) {
        if (guclu->_dinleyici) [guclu sendEventWithName:@"onAdim" body:@(guclu->_sonZaman + aralik * i)];
      }
      guclu->_sonSayi = sayi;
      guclu->_sonZaman = simdi;
    });
  }];
}

RCT_EXPORT_METHOD(durdur) {
  [_adimSayar stopPedometerUpdates];
  _adimSayar = nil;
}

- (void)invalidate {
  [self durdur];
  [super invalidate];
}

@end
