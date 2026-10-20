import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// PayBD / Pipilikhost Payment Gateway Integration Proxy Endpoint
app.post('/api/payment/create', async (req, res) => {
  try {
    const {
      amount,
      customerPhone,
      customerName,
      customerEmail,
      orderId,
      successUrl,
      cancelUrl,
      brandKey,
      secretKey,
      gatewayUrl,
    } = req.body;

    // Active Merchant Brand Key & Device Key
    const finalBrandKey =
      brandKey?.trim() ||
      process.env.PAYBD_BRAND_KEY ||
      '';
    const finalDeviceKey =
      secretKey?.trim() ||
      process.env.PAYBD_SECRET_KEY ||
      process.env.PAYBD_DEVICE_KEY ||
      '';

    if (!finalBrandKey) {
      return res.status(400).json({ success: false, message: 'Payment gateway API Key / Brand Key is not configured. Please add PAYBD_API_KEY / PAYBD_BRAND_KEY in .env or settings.' });
    }

    const targetGatewayUrl =
      gatewayUrl?.trim() ||
      process.env.PAYBD_GATEWAY_URL ||
      'https://app-paybd.pipilikhost.com/api/payment/create';

    const forwardedHost = req.headers['x-forwarded-host'];
    const hostHeader = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers.host;
    const protoHeader = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const defaultOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : 'https://ais-dev-fky3k73nobbkf3pnwtj7za-42550456606.asia-southeast1.run.app';
    const origin = req.headers.origin || defaultOrigin;

    const cleanOrderId = orderId || `ORD-${Date.now()}`;
    const finalSuccessUrl =
      successUrl || `${origin}/?payment=success&order_id=${cleanOrderId}`;
    const finalCancelUrl =
      cancelUrl || `${origin}/?payment=cancel&order_id=${cleanOrderId}`;

    const cleanAmount = Math.max(1, Math.round(Number(amount) || 10));

    const cusName = customerName?.trim() || 'Nasir Customer';
    const cusPhone = customerPhone?.trim() || '01800000000';
    const cusEmail = customerEmail?.trim() || `${cusPhone.replace(/\D/g, '') || 'client'}@gmail.com`;

    const finalWebhookUrl = `${origin}/api/payment/callback?api=${encodeURIComponent(finalBrandKey)}&invoice=${encodeURIComponent(cleanOrderId)}`;

    // Strictly aligned with Paybd.PipilikHost.com documentation & WHMCS specifications
    const requestPayload = {
      cus_name: cusName,
      cus_email: cusEmail,
      amount: String(cleanAmount),
      webhook_url: finalWebhookUrl,
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        phone: cusPhone,
        name: cusName,
        email: cusEmail,
        orderId: cleanOrderId,
      },
      meta_data: {
        phone: cusPhone,
        name: cusName,
        email: cusEmail,
        orderId: cleanOrderId,
      },
    };

    // Pipilikhost authentic headers: Uses Brand Key & Device Key
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'API-KEY': finalBrandKey,
      'BRAND-KEY': finalBrandKey,
      'DEVICE-KEY': finalDeviceKey,
      'SECRET-KEY': finalDeviceKey,
    };

    const response = await fetch(targetGatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
    });

    const responseData: any = await response.json().catch(() => null);

    if (!response.ok || !responseData) {
      const errorMsg =
        (responseData && (responseData.message || responseData.error || responseData.msg)) ||
        `Gateway Server Error (${response.status})`;
      return res.status(response.status || 500).json({
        success: false,
        message: errorMsg,
        raw: responseData,
      });
    }

    if (responseData.status === false || responseData.status === 'error') {
      return res.status(400).json({
        success: false,
        message: responseData.message || 'PayBD গেটওয়ে থেকে এরর পাওয়া গেছে।',
        raw: responseData,
      });
    }

    // Extract payment checkout redirect URL
    const paymentUrl =
      responseData.payment_url ||
      responseData.paymentUrl ||
      responseData.url ||
      responseData.payment_link ||
      responseData.link ||
      (responseData.data &&
        (responseData.data.payment_url ||
          responseData.data.url ||
          responseData.data.payment_link ||
          responseData.data.link));

    if (!paymentUrl) {
      return res.status(400).json({
        success: false,
        message:
          (responseData && responseData.message) ||
          'গেটওয়ে থেকে পেমেন্ট লিংক তৈরি করা যায়নি। বিস্তারিত চেক করুন।',
        raw: responseData,
      });
    }

    return res.json({
      success: true,
      paymentUrl,
      orderId: cleanOrderId,
      raw: responseData,
    });
  } catch (error: any) {
    console.error('Payment gateway create error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'সার্ভার প্রক্রিয়াকরণে সমস্যা হয়েছে।',
    });
  }
});

// Universal Payment Callback & Webhook Handler (supports GET & POST)
const handlePaymentCallback = async (req: express.Request, res: express.Response) => {
  try {
    const params = { ...req.query, ...req.body };
    const invoiceId = params.invoice || params.invoiceId || params.order_id || params.orderId || params.id || '';
    const transactionId = params.transactionId || params.transaction_id || params.trx_id || params.trxId || '';
    const paymentAmount = params.paymentAmount || params.amount || '';
    const paymentFee = params.paymentFee || params.fee || '0';
    const paymentMethod = params.paymentMethod || params.method || 'paybd';
    const status = (params.status || '').toLowerCase();
    const apiKey = params.api || params.apiKey || process.env.PAYBD_BRAND_KEY || 'r5d1y7Ye6bZzblEzvuhjO4OtWjyAjcfcePMKXZiqlK7wU8HrWJ';
    const secretKey = params.secret || params.secretKey || process.env.PAYBD_DEVICE_KEY || 'fVSARTobNKvglddV9QhKlPFTsFcLUD884mmh1wjg';

    const forwardedHost = req.headers['x-forwarded-host'];
    const hostHeader = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers.host;
    const protoHeader = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const defaultOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : 'https://ais-dev-fky3k73nobbkf3pnwtj7za-42550456606.asia-southeast1.run.app';
    const origin = req.headers.origin || defaultOrigin;

    let isVerified = status === 'completed' || status === 'success';

    // Verify directly with PayBD / Jonotapay if transactionId is provided
    if (transactionId) {
      try {
        const verifyRes = await fetch('https://app-paybd.pipilikhost.com/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'API-KEY': apiKey,
            'BRAND-KEY': apiKey,
            'SECRET-KEY': secretKey,
            'DEVICE-KEY': secretKey,
          },
          body: JSON.stringify({ transaction_id: transactionId }),
          signal: AbortSignal.timeout(4000),
        });
        const verifyData: any = await verifyRes.json().catch(() => null);
        if (
          verifyData &&
          (verifyData.status === 'COMPLETED' ||
            verifyData.status === 'completed' ||
            verifyData.status === 1 ||
            verifyData.status === true)
        ) {
          isVerified = true;
        }
      } catch (err) {
        console.warn('Callback verification warning:', err);
      }
    }

    const redirectStatus = isVerified ? 'success' : 'cancel';
    const redirectUrl = `${origin}/?payment=${redirectStatus}&order_id=${encodeURIComponent(
      invoiceId
    )}&transactionId=${encodeURIComponent(transactionId)}&paymentAmount=${encodeURIComponent(
      paymentAmount
    )}&paymentFee=${encodeURIComponent(paymentFee)}&paymentMethod=${encodeURIComponent(
      paymentMethod
    )}&status=${isVerified ? 'COMPLETED' : 'FAILED'}`;

    // If client is browser or HTML accept, redirect to receipt
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    if (req.method === 'GET' || acceptsHtml) {
      return res.redirect(redirectUrl);
    }

    return res.json({
      status: isVerified ? 'COMPLETED' : 'PENDING',
      invoiceId,
      transactionId,
      paymentAmount,
      redirectUrl,
    });
  } catch (error: any) {
    console.error('Payment callback handler error:', error);
    return res.status(500).json({ success: false, message: error?.message });
  }
};

// Mount callback endpoints for PayBD and WHMCS jonotapay plugin
app.all('/api/payment/callback', handlePaymentCallback);
app.all('/api/payment/webhook', handlePaymentCallback);
app.all('/modules/gateways/callback/jonotapay.php', handlePaymentCallback);
app.all('/modules/gateways/callback/paybd.php', handlePaymentCallback);

// Optional Payment Verification Endpoint
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { transactionId, brandKey, apiKey, secretKey } = req.body;
    const finalBrandKey =
      brandKey?.trim() ||
      apiKey?.trim() ||
      process.env.PAYBD_BRAND_KEY ||
      'r5d1y7Ye6bZzblEzvuhjO4OtWjyAjcfcePMKXZiqlK7wU8HrWJ';
    const finalDeviceKey =
      secretKey?.trim() ||
      process.env.PAYBD_DEVICE_KEY ||
      'fVSARTobNKvglddV9QhKlPFTsFcLUD884mmh1wjg';

    const response = await fetch('https://app-paybd.pipilikhost.com/api/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': finalBrandKey,
        'BRAND-KEY': finalBrandKey,
        'SECRET-KEY': finalDeviceKey,
        'DEVICE-KEY': finalDeviceKey,
      },
      body: JSON.stringify({ transaction_id: transactionId }),
    });

    const data = await response.json().catch(() => null);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
