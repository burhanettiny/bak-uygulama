/* eslint-env jest */
// Native modüllerin test ortamı için sahteleri

jest.mock('react-native-tts', () => ({
  setDefaultLanguage: jest.fn(() => Promise.resolve('success')),
  requestInstallData: jest.fn(() => Promise.resolve('success')),
  setDefaultRate: jest.fn(),
  getInitStatus: jest.fn(() => Promise.resolve(true)),
  requestInstallEngine: jest.fn(),
  engines: jest.fn(() => Promise.resolve([])),
  setDefaultEngine: jest.fn(() => Promise.resolve(true)),
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve(true)),
  // Gerçek kütüphanedeki gibi abonelik döndürür. removeEventListener bilerek yok: gerçekte çağrılınca
  // "undefined is not a function" ile uygulamayı çökertiyor (bkz. src/servisler/ses.ts)
  addEventListener: jest.fn(() => ({remove: jest.fn()})),
}));

jest.mock('react-native-vision-camera', () => {
  const Camera = () => null;
  Camera.requestCameraPermission = jest.fn(() => Promise.resolve('granted'));
  return {
    Camera,
    useCameraDevice: jest.fn(() => undefined),
    useCodeScanner: jest.fn(cfg => cfg),
  };
});

jest.mock('@react-native-ml-kit/text-recognition', () => ({
  recognize: jest.fn(() => Promise.resolve({text: ''})),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  // Eğitim bitmiş sayılır: testler ilk açılış eğitimine takılmasın (eğitim testi bunu siler)
  const depo = new Map([['egitimTamam', 'true']]);
  return {
    getItem: jest.fn(k => Promise.resolve(depo.has(k) ? depo.get(k) : null)),
    setItem: jest.fn((k, v) => { depo.set(k, v); return Promise.resolve(); }),
    removeItem: jest.fn(k => { depo.delete(k); return Promise.resolve(); }),
    clear: jest.fn(() => { depo.clear(); return Promise.resolve(); }),
  };
});

jest.mock('@dr.pogodin/react-native-fs', () => ({
  unlink: jest.fn(() => Promise.resolve()),
}));

// Testler gerçek internete çıkmasın (MEKAN_KAYNAGI tanımlı); ağ isteyen testler kendi sahte fetch'ini kurar
global.fetch = jest.fn(() => Promise.reject(new Error('Testlerde ağ erişimi kapalı')));
