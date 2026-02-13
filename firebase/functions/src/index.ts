import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * LemonSqueezy Webhook Handler
 * Triggered when a payment is completed
 */
export const lemonsqueezyWebhook = functions.https.onRequest(async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Get the signature from headers
    const signature = req.headers['x-signature'] as string;

    if (!signature) {
      console.error('No signature provided');
      res.status(401).send('Unauthorized - No signature');
      return;
    }

    // Get webhook secret from environment
    const secret = functions.config().lemonsqueezy?.webhook_secret;

    if (!secret) {
      console.error('Webhook secret not configured');
      res.status(500).send('Server configuration error');
      return;
    }

    // Verify webhook signature using raw body
    const rawBody = (req as any).rawBody;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const digest = hmac.digest('hex');

    if (digest !== signature) {
      console.error('Invalid signature');
      res.status(401).send('Unauthorized - Invalid signature');
      return;
    }

    // Parse webhook data
    const { meta, data } = req.body;

    console.log('Webhook received:', {
      event: meta.event_name,
      orderId: data.id,
    });

    // Handle different event types
    switch (meta.event_name) {
      case 'order_created':
        await handleOrderCreated(data, meta);
        break;

      case 'order_refunded':
        await handleOrderRefunded(data, meta);
        break;

      default:
        console.log('Unhandled event type:', meta.event_name);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Handle successful order/payment
 */
async function handleOrderCreated(data: any, meta: any) {
  const {
    attributes: {
      user_email,
      customer_id,
      order_number,
      total,
      currency,
      status,
      urls,
    },
  } = data;

  // custom_data is in meta, not in data.attributes
  const custom_data = meta?.custom_data;

  // Get Firebase UID from custom data (passed during checkout)
  // Priority: firebaseUid > userId (email) > user_email
  const firebaseUid = custom_data?.firebaseUid;
  const userId = firebaseUid || custom_data?.userId || user_email;

  if (!userId) {
    console.error('No user ID found in order');
    return;
  }

  console.log(`Processing order for user: ${userId} (uid: ${firebaseUid || 'N/A'})`);

  // Update user's plan to lifetime in Firestore
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);

  try {
    // Check if user document exists
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        email: user_email,
        plan: 'lifetime',
        purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
        lemonsqueezy: {
          customerId: customer_id,
          orderNumber: order_number,
          orderId: data.id,
          amount: total,
          currency,
          status,
          receiptUrl: urls?.receipt || null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Created new user ${userId} with lifetime plan`);
    } else {
      // Update existing user
      await userRef.update({
        plan: 'lifetime',
        purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
        'lemonsqueezy.customerId': customer_id,
        'lemonsqueezy.orderNumber': order_number,
        'lemonsqueezy.orderId': data.id,
        'lemonsqueezy.amount': total,
        'lemonsqueezy.currency': currency,
        'lemonsqueezy.status': status,
        'lemonsqueezy.receiptUrl': urls?.receipt || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Updated user ${userId} to lifetime plan`);
    }

    // Store order in separate collection for records
    await db.collection('orders').doc(data.id).set({
      userId,
      email: user_email,
      customerId: customer_id,
      orderNumber: order_number,
      amount: total,
      currency,
      status,
      receiptUrl: urls?.receipt || null,
      customData: custom_data || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`📝 Stored order ${order_number} in database`);

    // Optional: Send confirmation email (if you have email service configured)
    // await sendPurchaseConfirmationEmail(user_email, order_number);

  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Handle refunded order
 */
async function handleOrderRefunded(data: any, meta: any) {
  const {
    attributes: {
      user_email,
    },
  } = data;

  // custom_data is in meta, not in data.attributes
  const custom_data = meta?.custom_data;
  const firebaseUid = custom_data?.firebaseUid;
  const userId = firebaseUid || custom_data?.userId || user_email;

  if (!userId) {
    console.error('No user ID found in refunded order');
    return;
  }

  console.log(`Processing refund for user: ${userId}`);

  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);

  try {
    // Downgrade user to free plan
    await userRef.update({
      plan: 'free',
      refundDate: admin.firestore.FieldValue.serverTimestamp(),
      'lemonsqueezy.status': 'refunded',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`⚠️ User ${userId} downgraded to free (refund)`);

    // Update order status
    await db.collection('orders').doc(data.id).update({
      status: 'refunded',
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error('Error handling refund:', error);
    throw error;
  }
}

/**
 * HTTP endpoint to check user's plan
 * Called by Chrome extension to verify lifetime access
 */
export const checkUserPlan = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const userId = req.query.userId as string || req.body.userId;

  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      res.json({
        exists: false,
        plan: 'free',
        isLifetime: false,
      });
      return;
    }

    const userData = userDoc.data();
    const plan = userData?.plan || 'free';

    res.json({
      exists: true,
      plan,
      isLifetime: plan === 'lifetime',
      purchaseDate: userData?.purchaseDate?.toDate() || null,
    });

  } catch (error) {
    console.error('Error checking user plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
