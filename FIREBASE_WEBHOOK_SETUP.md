# Firebase Webhook Kurulum Rehberi

## 1. Firebase Projesi Oluşturma

### Firebase Console'da:
1. **https://console.firebase.google.com** adresine git
2. **"Add project"** (Proje ekle) tıkla
3. Proje adı: `emptydomai` (veya istediğin isim)
4. Google Analytics'i etkinleştir (isteğe bağlı)
5. Projeyi oluştur

### Authentication Kurulumu:
1. Sol menüden **Authentication** → **Get started**
2. **Google** sağlayıcısını etkinleştir
3. Destek email'i gir ve kaydet

### Firestore Database Kurulumu:
1. Sol menüden **Firestore Database** → **Create database**
2. **Production mode** seç
3. Location seç (örn: `europe-west1`)
4. **Enable** tıkla

## 2. Firebase CLI Kurulumu

Terminal'de:

```bash
# Firebase CLI'yi global olarak kur
npm install -g firebase-tools

# Firebase'e giriş yap
firebase login

# Projeyi başlat
firebase init
```

Firebase init sırasında:
- ✅ **Functions** seç (Space ile seç, Enter ile devam)
- ✅ **Firestore** seç
- Mevcut projeyi seç: `emptydomai`
- Language: **TypeScript** seç
- ESLint: **No** (isteğe bağlı)
- Dependencies: **Yes**
- Firestore rules: **firebase/firestore.rules** (varsayılan)
- Firestore indexes: **firebase/firestore.indexes.json**

## 3. Firebase Functions Paketlerini Yükle

```bash
cd firebase/functions
npm install
cd ../..
```

## 4. Webhook Secret'i Yapılandır

LemonSqueezy webhook secret'ini Firebase'e ekle:

```bash
# LemonSqueezy webhook secret'i ayarla
firebase functions:config:set lemonsqueezy.webhook_secret="YOUR_WEBHOOK_SECRET_HERE"
```

**Webhook secret'i nerede bulursun:**
1. LemonSqueezy dashboard → Settings → Webhooks
2. Webhook oluştururken gösterilen "Signing secret" değerini kopyala

## 5. Firebase Functions'ı Deploy Et

```bash
# Functions'ları deploy et
firebase deploy --only functions

# Başarılı olursa şöyle bir URL göreceksin:
# ✔ functions[lemonsqueezyWebhook(us-central1)]: https://us-central1-emptydomai.cloudfunctions.net/lemonsqueezyWebhook
```

Bu URL'i kopyala, LemonSqueezy'de webhook endpoint olarak kullanacaksın.

## 6. LemonSqueezy'de Webhook Kurulumu

1. **LemonSqueezy Dashboard** → **Settings** → **Webhooks**
2. **"+ Webhook"** tıkla
3. **Endpoint URL**: Firebase'den aldığın URL'i yapıştır
   ```
   https://us-central1-emptydomai.cloudfunctions.net/lemonsqueezyWebhook
   ```
4. **Events** seç:
   - ✅ `order_created`
   - ✅ `order_refunded`
5. **Signing Secret**'i kopyala (Firebase config'de kullandın)
6. **Save** tıkla

## 7. Extension Kodunu Güncelle

Extension'da Firebase ile plan doğrulaması ekle:

`src/services/firebase.ts` dosyasını güncelle:

```typescript
// Plan doğrulama için Cloud Function çağrısı
export async function verifyUserPlan(userId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://us-central1-emptydomai.cloudfunctions.net/checkUserPlan?userId=${encodeURIComponent(userId)}`
    );

    const data = await response.json();
    return data.isLifetime || false;
  } catch (error) {
    console.error('Failed to verify plan:', error);
    return false;
  }
}
```

## 8. Test Etme

### Test Ödemesi:
1. Extension'da **Upgrade to Lifetime** tıkla
2. Test kartı ile ödeme yap: `4242 4242 4242 4242`
3. Ödeme tamamlandığında Firebase Console'u kontrol et

### Firebase Console'da Kontrol:
1. **Firestore Database** → **users** collection
2. Kullanıcının email'i ile arama yap
3. `plan: "lifetime"` olmalı

### Logs Kontrol:
```bash
# Cloud Functions loglarını görüntüle
firebase functions:log
```

Başarılı webhook'ta göreceksin:
```
✅ Updated user [email] to lifetime plan
📝 Stored order [order_number] in database
```

## 9. Firestore Güvenlik Kuralları

`firebase/firestore.rules` dosyası zaten hazır:
- Kullanıcılar sadece kendi verilerini okuyabilir
- Sadece Cloud Functions yazabilir (güvenlik)

Deploy:
```bash
firebase deploy --only firestore:rules
```

## 10. Production'a Geçiş

### Environment Değişkenleri:
```bash
# Production webhook secret'i ayarla
firebase functions:config:set lemonsqueezy.webhook_secret="PRODUCTION_SECRET"

# Tekrar deploy et
firebase deploy --only functions
```

### LemonSqueezy Live Mode:
1. LemonSqueezy'yi **Live Mode**'a geç
2. Stripe bağla
3. Webhook URL'i production URL ile değiştir

## 11. Ekstra: Email Bildirimleri (İsteğe Bağlı)

SendGrid veya başka email servisi ekleyebilirsin:

```bash
npm install --save @sendgrid/mail
firebase functions:config:set sendgrid.api_key="YOUR_API_KEY"
```

`index.ts`'e ekle:
```typescript
import sgMail from '@sendgrid/mail';

async function sendPurchaseConfirmationEmail(email: string, orderNumber: string) {
  sgMail.setApiKey(functions.config().sendgrid.api_key);

  await sgMail.send({
    to: email,
    from: 'noreply@emptydomai.com',
    subject: 'EmptyDomai Lifetime Purchase Confirmed!',
    html: `
      <h1>Thank you for your purchase!</h1>
      <p>Your order #${orderNumber} has been confirmed.</p>
      <p>You now have lifetime access to EmptyDomai.</p>
    `,
  });
}
```

## 12. Sorun Giderme

### Webhook çalışmıyor:
```bash
# Logs'u kontrol et
firebase functions:log

# Config'i kontrol et
firebase functions:config:get
```

### CORS hatası:
`checkUserPlan` fonksiyonunda CORS zaten açık, ama sorun varsa:
```typescript
res.set('Access-Control-Allow-Origin', 'chrome-extension://YOUR_EXTENSION_ID');
```

### Signature doğrulama hatası:
- Webhook secret'in doğru olduğundan emin ol
- LemonSqueezy'den gelen request body'nin değişmediğinden emin ol

## 13. Maliyet

Firebase **Spark Plan** (Ücretsiz):
- ✅ 125K function invocations/month
- ✅ 10GB outbound data/month
- ✅ 20K document writes/day

Webhook'lar için bu plan yeterli!

## Özet

1. ✅ Firebase projesi oluştur
2. ✅ Firebase CLI kur ve init yap
3. ✅ Webhook secret'i yapılandır
4. ✅ Functions'ı deploy et
5. ✅ LemonSqueezy'de webhook URL'i ekle
6. ✅ Test et
7. ✅ Production'a geç

**Webhook URL'in:**
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/lemonsqueezyWebhook
```

Başarılar! 🚀
