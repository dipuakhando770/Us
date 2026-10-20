import { logActivity } from '../firebase/services';
import { ActivityType } from '../types';

function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const width = window.innerWidth;
  const isMobile = width < 768;
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';

  return `${isMobile ? '📱 Mobile' : '💻 Desktop'} (${browser})`;
}

export const analytics = {
  trackPageView: (path: string, title?: string) => {
    logActivity({
      type: 'page_view',
      title: title || `পেজ ভিজিট: ${path}`,
      path,
      device: getDeviceInfo(),
    });
  },

  trackProductView: (productId: string, productTitle: string) => {
    logActivity({
      type: 'product_view',
      title: `পণ্য দেখা হয়েছে: ${productTitle}`,
      productId,
      productTitle,
      path: `/product/${productId}`,
      device: getDeviceInfo(),
    });
  },

  trackAddToCart: (productTitle: string, productId?: string, price?: number) => {
    logActivity({
      type: 'add_to_cart',
      title: `কার্টে যোগ করা হয়েছে: ${productTitle}`,
      productTitle,
      productId,
      amount: price,
      device: getDeviceInfo(),
    });
  },

  trackRemoveFromCart: (productTitle: string, productId?: string) => {
    logActivity({
      type: 'remove_from_cart',
      title: `কার্ট থেকে রিমুভ: ${productTitle}`,
      productTitle,
      productId,
      device: getDeviceInfo(),
    });
  },

  trackCheckoutStart: (amount: number, itemCount: number) => {
    logActivity({
      type: 'checkout_start',
      title: `চেকআউট শুরু হয়েছে (${itemCount}টি পণ্য)`,
      amount,
      device: getDeviceInfo(),
    });
  },

  trackOrderPlaced: (orderId: string, customerName: string, customerPhone: string, amount: number) => {
    logActivity({
      type: 'order_placed',
      title: `নতুন অর্ডার প্লেস হয়েছে (#${orderId.slice(-6)})`,
      orderId,
      customerName,
      customerPhone,
      amount,
      device: getDeviceInfo(),
    });
  },

  trackOrderCancelled: (orderId: string, customerName?: string) => {
    logActivity({
      type: 'order_cancelled',
      title: `অর্ডার বাতিল করা হয়েছে (#${orderId.slice(-6)})`,
      orderId,
      customerName,
      device: getDeviceInfo(),
    });
  },

  trackWhatsAppClick: (productTitle?: string) => {
    logActivity({
      type: 'whatsapp_click',
      title: productTitle ? `হোয়াটসঅ্যাপে অর্ডার অনুসন্ধান: ${productTitle}` : 'হোয়াটসঅ্যাপে চ্যাট শুরু',
      productTitle,
      device: getDeviceInfo(),
    });
  },

  trackDownload: (productTitle: string, productId?: string) => {
    logActivity({
      type: 'direct_download',
      title: `ফ্রি প্রোডাক্ট ডাউনলোড: ${productTitle}`,
      productTitle,
      productId,
      device: getDeviceInfo(),
    });
  },
};
