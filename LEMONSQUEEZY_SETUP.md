# LemonSqueezy Entegrasyonu - Kurulum Rehberi

## 1. LemonSqueezy Hesabı Oluşturma

1. **LemonSqueezy'e kaydol**: https://lemonsqueezy.com
2. **Email doğrulama** yap
3. **Store oluştur**: Dashboard → Create Store

## 2. Ürün Oluşturma

1. **Products** → **New Product** tıkla
2. Ürün bilgilerini doldur:
   - **Name**: EmptyDomai Lifetime Access
   - **Description**: One-time payment for unlimited access to EmptyDomai features
   - **Price**: $49 (veya istediğin fiyat)
   - **Payment Type**: Single Payment (one-time)

3. **Variant ID'yi kopyala**: Ürünü kaydettikten sonra variant ID'yi göreceksin (örn: `123456`)

## 3. Webhook Kurulumu (Önemli!)

Webhook'lar ödeme tamamlandığında seni bilgilendirir.

1. **Settings** → **Webhooks** → **Create Webhook**
2. **Endpoint URL**: Kendi backend URL'ini gir (örn: `https://yourbackend.com/api/lemonsqueezy/webhook`)
3. **Events** seç:
   - ✅ `order_created`
   - ✅ `order_refunded`
4. **Signing Secret'i kopyala** - Webhook doğrulama için gerekli

### Backend Webhook Handler Örneği (Node.js/Express):

```javascript
// backend/routes/lemonsqueezy.js
const crypto = require('crypto');

app.post('/api/lemonsqueezy/webhook', async (req, res) => {
  const signature = req.headers['x-signature'];
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  // Verify signature
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== signature) {
    return res.status(401).send('Invalid signature');
  }

  const { meta, data } = req.body;

  if (meta.event_name === 'order_created') {
    const { customer_email, custom_data } = data.attributes;
    const userId = custom_data?.userId;

    // Update user to lifetime plan in your database
    await updateUserPlan(userId || customer_email, 'lifetime');

    console.log(`✅ User ${customer_email} upgraded to lifetime!`);
  }

  res.status(200).send('OK');
});
```

## 4. API Keys (Optional - Backend için)

Backend'den LemonSqueezy API'sine erişmek için:

1. **Settings** → **API** → **Create API Key**
2. Key'i kopyala ve `.env` dosyana ekle:

```env
LEMONSQUEEZY_API_KEY=your_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_VARIANT_ID=your_variant_id
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
```

## 5. Extension Kodunu Güncelleme

`src/services/lemonsqueezy.ts` dosyasını aç ve değerleri güncelle:

```typescript
const LEMONSQUEEZY_CONFIG = {
  storeId: 'YOUR_STORE_ID',        // LemonSqueezy store ID
  variantId: 'YOUR_VARIANT_ID',     // Product variant ID (ürün sayfasından kopyala)
  publicKey: 'YOUR_PUBLIC_KEY',     // Optional
};
```

**Önemli**: Bu değerleri **public** kodda tutma riski düşük çünkü sadece checkout URL'i oluşturmak için kullanılıyor. Gerçek doğrulama backend webhook'ta yapılıyor.

## 6. Test Modunda Deneme

LemonSqueezy otomatik olarak test modunda başlar.

1. **Test mod card bilgileri**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Gelecekteki herhangi bir tarih
   - CVV: Herhangi 3 rakam

2. Extension'da **Upgrade to Lifetime** butonuna tıkla
3. Checkout sayfası açılacak
4. Test card ile ödeme yap
5. Başarılı olursa kullanıcı otomatik `lifetime` planına geçecek

## 7. Production'a Geçiş

1. LemonSqueezy dashboard'da **Activate Live Mode** tıkla
2. Stripe hesabını bağla (ödeme almak için)
3. Tax ayarlarını yap
4. Backend webhook URL'ini production URL ile değiştir

## 8. Güvenlik Notları

### ✅ Yapılması Gerekenler:
- Webhook signature'ı **mutlaka** doğrula
- Kullanıcı planını sadece **backend'den** güncelle
- Local storage'a güvenme - sadece UX için kullan
- Production'da API key'leri gizle

### ❌ Yapılmaması Gerekenler:
- Webhook'sız çalışma (kullanıcı hilelerini engeller)
- Frontend'de plan güncelleme (kullanıcı değiştirebilir)
- API key'leri public kod içinde tutma

## 9. Alternatif: Firebase ile Entegrasyon

Eğer backend'in yoksa Firebase kullanabilirsin:

```javascript
// Firebase Cloud Function
exports.lemonsqueezyWebhook = functions.https.onRequest(async (req, res) => {
  // Webhook doğrulama
  // ...

  // Firestore'da kullanıcıyı güncelle
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .update({ plan: 'lifetime' });

  res.status(200).send('OK');
});
```

## 10. Sorun Giderme

### Checkout açılmıyor:
- Console'da hata var mı kontrol et
- Variant ID'nin doğru olduğundan emin ol
- LemonSqueezy hesabının aktif olduğunu kontrol et

### Ödeme sonrası plan güncellenmiyor:
- Webhook çalışıyor mu test et
- Webhook logs'u LemonSqueezy dashboard'dan kontrol et
- Backend'de webhook handler çalışıyor mu kontrol et

### Test ödemesi yapamıyorum:
- Test modda olduğundan emin ol
- Test kartı kullan: `4242 4242 4242 4242`

## İletişim

Sorun yaşarsan:
- LemonSqueezy docs: https://docs.lemonsqueezy.com
- Discord: https://discord.gg/lemonsqueezy
- Email: support@lemonsqueezy.com
