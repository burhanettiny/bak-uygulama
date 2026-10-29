import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {TarihSonuc, UrunBilgisi} from '../tipler';
import {urunSesliMetin} from '../ayristirma/urun';
import {tutarSesliMetin} from '../ayristirma/tutar';
import {sesliSoyele} from '../servisler/ses';
import {stil} from '../stil';

interface Props {
  urun: UrunBilgisi | null;
  tutar: string | null;
  banknot: number | null;
  tarihSonuc: TarihSonuc | null;
}

const TARIH_KART_STILI = {
  gecmis: stil.kartGecmis,
  yakin:  stil.kartYakin,
  yok:    stil.kartYok,
  iyi:    stil.kartIyi,
};

const TARIH_YAZI_STILI = {
  gecmis: stil.tarihGecmisYazi,
  yakin:  stil.tarihYakinYazi,
  yok:    stil.tarihYokYazi,
  iyi:    stil.tarihIyiYazi,
};

function TekrarDinle({metin, etiket, yazi = 'Tekrar Dinle', aralikli = false}:
  {metin: string; etiket: string; yazi?: string; aralikli?: boolean}) {
  return (
    <TouchableOpacity style={[stil.tekrarButon, aralikli && stil.tekrarButonAralik]}
      onPress={() => sesliSoyele(metin)}
      accessible={true} accessibilityRole="button"
      accessibilityLabel={etiket}>
      <Text style={stil.tekrarYazi}>{yazi}</Text>
    </TouchableOpacity>
  );
}

export function SonucKartlari({urun, tutar, banknot, tarihSonuc}: Props) {
  return (
    <>
      {urun && (
        <View style={stil.kart} accessible={true}
          accessibilityLabel={urunSesliMetin(urun)}>
          {urun.kaynak && <Text style={stil.kaynakEtiketi}>📦 {urun.kaynak}</Text>}
          <Text style={stil.kartMarka}>{urun.marka}</Text>
          <Text style={stil.kartAd}>{urun.ad}</Text>
          {urun.kategori ? <Text style={stil.kartDetay}>{urun.kategori}</Text> : null}
          {urun.alerjenler?.length ? (
            <View style={stil.alerjenKutu}>
              <Text style={stil.alerjenBaslik}>⚠️ Alerjen İçerir</Text>
              <Text style={stil.alerjenYazi}>{urun.alerjenler.join(', ')}</Text>
            </View>
          ) : null}
          {urun.konum && (
            <View style={stil.konumKutu}>
              <Text style={stil.konumBaslik}>Konum</Text>
              <Text style={stil.konumBolum}>{urun.konum.bolum}</Text>
              {urun.konum.koridor ? (
                <Text style={stil.konumDetay}>
                  Koridor: {urun.konum.koridor}{urun.konum.raf ? `   Raf: ${urun.konum.raf}` : ''}
                </Text>
              ) : null}
              <Text style={stil.konumTarif}>{urun.konum.yonTarifi}</Text>
              <TekrarDinle metin={urun.konum.yonTarifi} etiket="Konumu tekrar dinle" yazi="Konumu Dinle"/>
            </View>
          )}
          <TekrarDinle metin={urunSesliMetin(urun)} etiket="Ürün bilgisini tekrar dinle" aralikli={!!urun.konum}/>
        </View>
      )}

      {tutar && (
        <View style={[stil.kart, stil.kartPos]} accessible={true}
          accessibilityLabel={`Tutar: ${tutarSesliMetin(tutar)}`}>
          <Text style={stil.kartMarka}>POS Tutarı</Text>
          <Text style={stil.kartTutar}>{tutar} TL</Text>
          <TekrarDinle metin={`Tutar ${tutarSesliMetin(tutar)}`} etiket="Tutarı tekrar dinle"/>
        </View>
      )}

      {banknot && (
        <View style={[stil.kart, stil.kartPos]} accessible={true}
          accessibilityLabel={`${banknot} Türk lirası`}>
          <Text style={stil.kartMarka}>Para</Text>
          <Text style={stil.kartTutar}>{banknot} TL</Text>
          <TekrarDinle metin={`${banknot} Türk lirası.`} etiket="Parayı tekrar dinle"/>
        </View>
      )}

      {tarihSonuc && (
        <View style={[stil.kart, TARIH_KART_STILI[tarihSonuc.durum]]}
          accessible={true} accessibilityLabel={tarihSonuc.sesliMesaj}>
          <Text style={stil.kartMarka}>Son Kullanma Tarihi</Text>
          <Text style={[stil.kartTutar, tarihSonuc.durum === 'yok' && stil.kartTutarYok]}>
            {tarihSonuc.tarih}
          </Text>
          <Text style={[stil.tarihDurum, TARIH_YAZI_STILI[tarihSonuc.durum]]}>{tarihSonuc.mesaj}</Text>
          <TekrarDinle metin={tarihSonuc.sesliMesaj} etiket="Tarihi tekrar dinle"/>
        </View>
      )}
    </>
  );
}
