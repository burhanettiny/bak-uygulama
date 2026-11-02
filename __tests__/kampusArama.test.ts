import {Mekan} from '../src/tipler';
import {hedefBul, yerlesimDogrula} from '../src/mekan/yerlesim';

// QR oluşturucunun "haritadan kur" sonucu (Ardahan şablonu): tam adlar QR'a sığsın diye anahtar yazılmaz;
// kullanıcının söyleyeceği hâller yine bulunmalı
const kampus = require('./veri/ardahan-kampus.json') as Mekan;

test('haritadan kurulan kampüs geçerli ve yerler adlarıyla, kısa adlarıyla, eş anlamlılarıyla bulunur', () => {
  expect(yerlesimDogrula(kampus)).not.toBeNull();
  const bul = (s: string) => {
    const r = hedefBul(kampus, s);
    return !r ? null : r.tur === 'hedef' ? r.hedef.ad : r.adaylar.map(a => a.hedef.ad).join('|');
  };
  expect(bul('mühendislik fakültesi nerede')).toBe('Mühendislik Fakültesi');
  expect(bul('mühendislik')).toBe('Mühendislik Fakültesi');
  expect(bul('iibf')).toBe('İktisadi ve İdari Bilimler Fakültesi');
  expect(bul('iktisadi ve idari bilimler fakültesi')).toBe('İktisadi ve İdari Bilimler Fakültesi');
  expect(bul('kültür merkezi')).toBe('Âşık Şenlik Kültür Merkezi');
  expect(bul('insani bilimler fakültesi')).toBe('İnsani Bilimler Fakültesi');
  expect(bul('cami nerede')).toBe('Hoca Ahmet Yesevi Camii');
  expect(bul('namaz kılacağım')).toBe('Hoca Ahmet Yesevi Camii');
  expect(bul('öğrenci işleri')).toBe('Rektörlük');
  expect(bul('konukevi')).toBe('Konukevi');
});
