import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingBag,
  Package,
  Calendar,
  Clock,
  ExternalLink,
  Download,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trash2,
  ShieldCheck,
  CreditCard,
  Phone,
  User,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  getUserLocalOrders,
  clearUserLocalOrders,
  LocalUserOrder,
} from '../../utils/userOrderHistory';
import { formatPrice, sanitizeWhatsAppNumber, normalizeImageUrl } from '../../utils/formatters';

interface UserOrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToShop: () => void;
}

export const UserOrderHistoryModal: React.FC<UserOrderHistoryModalProps> = ({
  isOpen,
  onClose,
  onNavigateToShop,
}) => {
  const { settings } = useStore();
  const [orders, setOrders] = useState<LocalUserOrder[]>([]);

  useEffect(() => {
    const loadOrders = () => {
      setOrders(getUserLocalOrders());
    };
    loadOrders();

    window.addEventListener('ndh_user_orders_updated', loadOrders);
    return () => window.removeEventListener('ndh_user_orders_updated', loadOrders);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    if (window.confirm('আপনি কি আপনার সকল লোকাল অর্ডার হিস্ট্রি মুছে ফেলতে চান?')) {
      clearUserLocalOrders();
      setOrders([]);
    }
  };

  const getWhatsAppVerifyUrl = (order: LocalUserOrder) => {
    const merchantPhone = sanitizeWhatsAppNumber(settings.whatsappNumber || '01962780922');
    const itemsText = order.items.map((i) => `• ${i.title} (${i.quantity}x)`).join('\n');
    const text = encodeURIComponent(
      `👋 আসসালামু আলাইকুম! আমি আমার অর্ডারের স্ট্যাটাস যাচাই/কনফার্ম করতে চাই।\n\n` +
      `📦 *অর্ডার আইডি:* ${order.orderId}\n` +
      `👤 *নাম:* ${order.customerName}\n` +
      `📱 *ফোন:* ${order.customerPhone}\n` +
      `💰 *মোট মূল্য:* ${order.total} ৳\n` +
      `💳 *পেমেন্ট মেথড:* ${order.paymentMethod}\n` +
      (order.transactionId ? `🔢 *ট্রানজেকশন ID:* ${order.transactionId}\n` : '') +
      `🛍️ *পণ্যসমূহ:*\n${itemsText}\n\n` +
      `অনুগ্রহ করে আমার অর্ডারটি চেক করে কনফার্ম করবেন। ধন্যবাদ!`
    );
    return `https://wa.me/${merchantPhone}?text=${text}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">আমার অর্ডার হিস্ট্রি</h3>
                <p className="text-xs text-slate-300">
                  আপনার এই ডিভাইসে রাখা সাম্প্রতিক অর্ডারের বিবরণ ও স্ট্যাটাস
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
            {orders.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                  <Package className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 text-base mb-1">
                  এখনো কোনো অর্ডার হিস্ট্রি নেই
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  আপনি যেসকল প্রোডাক্ট অর্ডার করবেন তা স্বয়ংক্রিয়ভাবে আপনার ডিভাইসে সংরক্ষিত থাকবে।
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToShop();
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>পণ্যসমূহ ব্রাউজ করুন</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const isCompleted = order.paymentStatus === 'completed' || order.status === 'completed';
                  const isFailed = order.paymentStatus === 'failed' || order.status === 'cancelled';
                  const isPending = !isCompleted && !isFailed;
                  const orderDate = new Date(order.createdAt).toLocaleDateString('bn-BD', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={order.orderId}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 transition-all hover:border-emerald-300"
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/80 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                            অর্ডার #{order.orderId}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {orderDate}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isCompleted && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            পেমেন্ট সফল
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            পেন্ডিং / যাচাইাধীন
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            বাতিল / অনিষ্পন্ন
                          </span>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="space-y-2.5 mb-3">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/70"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.imageUrl ? (
                                  <img
                                    src={normalizeImageUrl(item.imageUrl)}
                                    alt={item.title}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-900 truncate">
                                  {item.title}
                                </h5>
                                <div className="text-[10px] text-slate-500">
                                  পরিমাণ: {item.quantity} × {formatPrice(item.price)}
                                </div>
                              </div>
                            </div>

                            {/* Download Button if available */}
                            {item.downloadUrl && (
                              <a
                                href={item.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                              >
                                <Download className="w-3 h-3" />
                                <span>ডাউনলোড</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Footer Info & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                        <div className="text-xs text-slate-600">
                          <span className="font-bold text-slate-900">মোট পরিশোধিত: </span>
                          <span className="text-emerald-700 font-extrabold text-sm">
                            {formatPrice(order.total)}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1">
                            ({order.paymentMethod})
                          </span>
                        </div>

                        {/* WhatsApp Verification CTA */}
                        <a
                          href={getWhatsAppVerifyUrl(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>হোয়াটসঅ্যাপে ভেরিফাই করুন</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          {orders.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>হিস্ট্রি মুছে ফেলুন</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
