import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart,
  MessageCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  ExternalLink,
  Eye,
  Trash2,
  Copy,
  Check,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  CreditCard,
  User,
  Phone,
  MapPin,
  FileText,
  Sparkles,
  ArrowUpDown,
  Send,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { subscribeToOrders, updateOrderStatus, deleteOrder } from '../firebase/services';
import { formatPrice, formatDate, sanitizeWhatsAppNumber } from '../utils/formatters';
import { useStore } from '../context/StoreContext';

export const OrdersManager: React.FC = () => {
  const { settings, products } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_amount'>('newest');

  // Interactive selection
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToOrders(
      (newOrders) => {
        setOrders(newOrders);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching orders:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
    newPaymentStatus?: Order['paymentStatus']
  ) => {
    setIsUpdatingStatus(orderId);
    try {
      await updateOrderStatus(orderId, newStatus, newPaymentStatus);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                ...(newPaymentStatus ? { paymentStatus: newPaymentStatus } : {}),
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই অর্ডার রেকর্ডটি মুছে ফেলতে চান?')) return;
    setIsDeletingOrder(orderId);
    try {
      await deleteOrder(orderId);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert('অর্ডার ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setIsDeletingOrder(null);
    }
  };

  // Analytics & Summary Metrics calculations
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    let totalRevenue = 0;
    let paidCount = 0;
    let paidRevenue = 0;
    let pendingCount = 0;
    let pendingRevenue = 0;
    let cancelledCount = 0;
    let cancelledRevenue = 0;
    let paybdCount = 0;

    orders.forEach((o) => {
      const amt = Number(o.total) || 0;
      totalRevenue += amt;

      const isPaid =
        o.paymentStatus === 'paid' ||
        o.status === 'completed' ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes('paybd') && o.status !== 'cancelled');

      if (isPaid) {
        paidCount++;
        paidRevenue += amt;
      } else if (o.status === 'cancelled' || o.paymentStatus === 'cancelled' || o.paymentStatus === 'failed') {
        cancelledCount++;
        cancelledRevenue += amt;
      } else {
        pendingCount++;
        pendingRevenue += amt;
      }

      if (o.paymentMethod && o.paymentMethod.toLowerCase().includes('paybd')) {
        paybdCount++;
      }
    });

    const successRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

    return {
      totalCount,
      totalRevenue,
      paidCount,
      paidRevenue,
      pendingCount,
      pendingRevenue,
      cancelledCount,
      cancelledRevenue,
      paybdCount,
      successRate,
    };
  }, [orders]);

  // Filtered and Sorted Orders List
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Status tab filter
        const isPaid =
          order.paymentStatus === 'paid' ||
          order.status === 'completed' ||
          (order.paymentMethod && order.paymentMethod.toLowerCase().includes('paybd') && order.status !== 'cancelled');

        const isCancelled =
          order.status === 'cancelled' ||
          order.paymentStatus === 'cancelled' ||
          order.paymentStatus === 'failed';

        const isPending = !isPaid && !isCancelled;

        if (selectedStatusTab === 'paid' && !isPaid) return false;
        if (selectedStatusTab === 'pending' && !isPending) return false;
        if (selectedStatusTab === 'cancelled' && !isCancelled) return false;

        // Payment method filter
        if (paymentMethodFilter !== 'all') {
          if (paymentMethodFilter === 'paybd' && !order.paymentMethod?.toLowerCase().includes('paybd')) return false;
          if (paymentMethodFilter === 'bkash' && !order.paymentMethod?.toLowerCase().includes('bkash')) return false;
          if (paymentMethodFilter === 'nagad' && !order.paymentMethod?.toLowerCase().includes('nagad')) return false;
          if (paymentMethodFilter === 'rocket' && !order.paymentMethod?.toLowerCase().includes('rocket')) return false;
        }

        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchId = (order.id || '').toLowerCase().includes(q);
          const matchName = (order.customerName || '').toLowerCase().includes(q);
          const matchPhone = (order.customerPhone || '').toLowerCase().includes(q);
          const matchTrx = (order.paymentTrxId || '').toLowerCase().includes(q);
          const matchItems = (order.items || []).some((item) => item.title.toLowerCase().includes(q));
          if (!matchId && !matchName && !matchPhone && !matchTrx && !matchItems) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
        if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
        if (sortBy === 'highest_amount') return (Number(b.total) || 0) - (Number(a.total) || 0);
        return 0;
      });
  }, [orders, selectedStatusTab, paymentMethodFilter, searchTerm, sortBy]);

  // CSV Export
  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      alert('এক্সপোর্ট করার মতো কোনো অর্ডার নেই।');
      return;
    }

    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Address', 'Items', 'Total (BDT)', 'Payment Method', 'Payment Status', 'Order Status', 'Trx ID'];
    const rows = filteredOrders.map((o) => [
      `"${o.id}"`,
      `"${formatDate(o.createdAt)}"`,
      `"${o.customerName || ''}"`,
      `"${o.customerPhone || ''}"`,
      `"${(o.customerAddress || '').replace(/"/g, '""')}"`,
      `"${(o.items || []).map((i) => `${i.title} (x${i.quantity})`).join(', ').replace(/"/g, '""')}"`,
      o.total || 0,
      `"${o.paymentMethod || 'PayBD'}"`,
      `"${o.paymentStatus || 'pending'}"`,
      `"${o.status || 'pending'}"`,
      `"${o.paymentTrxId || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: OrderStatus, paymentStatus?: string) => {
    if (paymentStatus === 'paid' || status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          <span>সফল ও পেইড</span>
        </span>
      );
    }
    if (status === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <Sparkles className="w-3 h-3" />
          <span>কনফার্মড</span>
        </span>
      );
    }
    if (status === 'cancelled' || paymentStatus === 'cancelled' || paymentStatus === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3 h-3" />
          <span>বাতিল / ব্যর্থ</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3 h-3" />
        <span>অপেক্ষমাণ (Pending)</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              অর্ডার ও ট্রানজেকশন হিস্ট্রি কন্ট্রোল
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              লাইভ সিঙ্ক ({orders.length})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            PayBD অনলাইন গেটওয়ে ও ম্যানুয়াল সমস্ত অর্ডারের বিশদ বিবরণ, কনভার্শন রেট ও কাস্টমার ডেলিভারি হিস্ট্রি
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>রিপোর্ট এক্সপোর্ট (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Orders */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">মোট অর্ডার</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white">{metrics.totalCount} টি</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              সর্বমোট মূল্য: <strong className="text-indigo-300 font-bold">{formatPrice(metrics.totalRevenue)}</strong>
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 2: Paid / Successful Orders */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-emerald-500/20 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">সফল ও পেইড</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-emerald-400">{metrics.paidCount} টি</h3>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {metrics.successRate}% কনভার্শন
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              আদায়কৃত মূল্য: <strong className="text-emerald-300 font-bold">{formatPrice(metrics.paidRevenue)}</strong>
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 3: Pending Orders */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-amber-500/20 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">অপেক্ষমাণ (Pending)</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-400">{metrics.pendingCount} টি</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              পেন্ডিং মূল্য: <strong className="text-amber-300 font-bold">{formatPrice(metrics.pendingRevenue)}</strong>
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 4: Cancelled Orders */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-rose-500/20 shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">বাতিল / ফেইল্ড</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-400">{metrics.cancelledCount} টি</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              বাতিলকৃত মূল্য: <strong className="text-rose-300 font-bold">{formatPrice(metrics.cancelledRevenue)}</strong>
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* Filter and Search Bar Suite */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-3.5">
        {/* Status Tab Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setSelectedStatusTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatusTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              সকল অর্ডার ({orders.length})
            </button>
            <button
              onClick={() => setSelectedStatusTab('paid')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatusTab === 'paid'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✅ সফল ও পেইড ({metrics.paidCount})
            </button>
            <button
              onClick={() => setSelectedStatusTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatusTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⏳ অপেক্ষমাণ ({metrics.pendingCount})
            </button>
            <button
              onClick={() => setSelectedStatusTab('cancelled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatusTab === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ❌ বাতিল ({metrics.cancelledCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="all">পেমেন্ট মেথড: সকল</option>
              <option value="paybd">PayBD Online Gateway</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="newest">সর্বশেষ অর্ডার আগে</option>
              <option value="oldest">পুরাতন অর্ডার আগে</option>
              <option value="highest_amount">সর্বোচ্চ টাকার পরিমাণ</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="অর্ডার আইডি (ORD-..), কাস্টমারের নাম, ফোন নম্বর, ট্রানজেকশন ID বা পণ্যের নাম দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ক্লিয়ার
            </button>
          )}
        </div>
      </div>

      {/* Main Order History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-4 px-4">অর্ডার আইডি ও সময়</th>
                <th className="py-4 px-4">কাস্টমার প্রোফাইল</th>
                <th className="py-4 px-4">অর্ডারকৃত পণ্যসমূহ</th>
                <th className="py-4 px-4">মোট বিল ও মাধ্যম</th>
                <th className="py-4 px-4">পেমেন্ট ও অর্ডার স্ট্যাটাস</th>
                <th className="py-4 px-4 text-right">লাইভ অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>অর্ডার ডাটাবেজ সিঙ্ক হচ্ছে...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500 italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-7 h-7 text-slate-600" />
                      <span>কোনো অর্ডার পাওয়া যায়নি। ফিল্টার পরিবর্তন করে দেখতে পারেন।</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPaid =
                    order.paymentStatus === 'paid' ||
                    order.status === 'completed' ||
                    (order.paymentMethod && order.paymentMethod.toLowerCase().includes('paybd') && order.status !== 'cancelled');

                  const phoneClean = (order.customerPhone || '').replace(/[^0-9]/g, '');
                  const customerWhatsAppUrl = `https://wa.me/88${phoneClean}?text=${encodeURIComponent(
                    `👋 আসসালামু আলাইকুম ${order.customerName || ''}! আপনার অর্ডার #${order.id.slice(0, 8)} সংক্রান্ত আপডেট প্রদান করা হচ্ছে।`
                  )}`;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-850/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* Order ID & Time */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                          <span>#{order.id.slice(0, 10)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(order.id, `id_${order.id}`);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="অর্ডার আইডি কপি করুন"
                          >
                            {copiedField === `id_${order.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{order.customerName || 'অনলাইন কাস্টমার'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{order.customerPhone}</span>
                        </div>
                        {order.customerAddress && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[170px] mt-0.5">
                            {order.customerAddress}
                          </div>
                        )}
                      </td>

                      {/* Purchased Products */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 max-w-[220px]">
                          {order.items?.map((item, i) => (
                            <div
                              key={i}
                              className="text-[11px] text-slate-200 truncate flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80"
                            >
                              <span className="font-semibold text-white truncate">• {item.title}</span>
                              <span className="text-indigo-400 font-bold text-[10px] shrink-0">
                                ×{item.quantity} ({formatPrice(item.price)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total Amount & Payment Method */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-black text-sm text-emerald-400">
                          {formatPrice(order.total)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-indigo-400" />
                            <span>{order.paymentMethod || 'PayBD Online'}</span>
                          </span>
                        </div>
                        {order.paymentTrxId && (
                          <div className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-[130px]">
                            Trx: {order.paymentTrxId}
                          </div>
                        )}
                      </td>

                      {/* Payment & Order Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <div>{getStatusBadge(order.status, order.paymentStatus)}</div>

                          <select
                            value={order.status}
                            disabled={isUpdatingStatus === order.id}
                            onChange={(e) => {
                              const val = e.target.value as OrderStatus;
                              handleStatusChange(
                                order.id,
                                val,
                                val === 'completed' ? 'paid' : val === 'cancelled' ? 'cancelled' : 'pending'
                              );
                            }}
                            className="bg-slate-950 border border-slate-800 text-[11px] rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                          >
                            <option value="pending">অপেক্ষমাণ (Pending)</option>
                            <option value="confirmed">কনফার্মড (Confirmed)</option>
                            <option value="completed">সম্পন্ন (Completed)</option>
                            <option value="cancelled">বাতিল (Cancelled)</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="সম্পূর্ণ বিস্তারিত ও ইনভয়েস দেখুন"
                          >
                            <Eye className="w-4 h-4 text-indigo-400" />
                          </button>

                          <a
                            href={customerWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                            title="কাস্টমারকে WhatsApp মেসেজ দিন"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={isDeletingOrder === order.id}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                            title="অর্ডার রেকর্ড মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-10 text-white p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    অর্ডার ইনভয়েস ও ডেলিভারি হিস্ট্রি
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                    #{selectedOrder.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>অর্ডারের সময়: {formatDate(selectedOrder.createdAt)}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Information Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <User className="w-4 h-4" /> কাস্টমার ও ডেলিভারি তথ্য
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">নাম:</span>
                  <p className="font-bold text-white text-sm">{selectedOrder.customerName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">মোবাইল নম্বর:</span>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-white text-sm">{selectedOrder.customerPhone}</p>
                    <button
                      onClick={() => copyToClipboard(selectedOrder.customerPhone, 'phone')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                {selectedOrder.customerAddress && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 text-[11px]">ঠিকানা / ইমেইল:</span>
                    <p className="font-medium text-slate-200">{selectedOrder.customerAddress}</p>
                  </div>
                )}
                {selectedOrder.note && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 text-[11px]">গ্রাহকের নোট:</span>
                    <p className="text-slate-300 italic">{selectedOrder.note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ordered Products & Digital Resources */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> অর্ডারকৃত ডিজিটাল পণ্য ও লিঙ্ক
              </h4>

              <div className="space-y-2.5">
                {selectedOrder.items?.map((item, idx) => {
                  const matchedProd = products.find((p) => p.id === item.productId);
                  const downloadLink = item.downloadUrl || matchedProd?.downloadUrl || '';
                  const livePreview = item.livePreviewUrl || matchedProd?.livePreviewUrl || '';

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" />
                          ) : (
                            <ShoppingCart className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-white">{item.title}</h5>
                          <p className="text-[11px] text-slate-400">
                            পরিমাণ: {item.quantity} | মূল্য: {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {downloadLink ? (
                          <a
                            href={downloadLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>ফাইল ওপেন</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">কোনো লিঙ্ক সেট নেই</span>
                        )}

                        {livePreview && (
                          <a
                            href={livePreview}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>ডেমো</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bill Summary & Payment Details */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>সাবটোটাল:</span>
                <span>{formatPrice(selectedOrder.subtotal || selectedOrder.total)}</span>
              </div>
              {Number(selectedOrder.deliveryCharge) > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>ডেলিভারি চার্জ:</span>
                  <span>{formatPrice(selectedOrder.deliveryCharge)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-slate-800">
                <span>মোট বিল:</span>
                <span className="text-emerald-400">{formatPrice(selectedOrder.total)}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 text-[11px]">
                <span>পেমেন্ট মাধ্যম:</span>
                <span className="font-semibold text-slate-200">{selectedOrder.paymentMethod || 'PayBD Online'}</span>
              </div>
              {selectedOrder.paymentTrxId && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>ট্রানজেকশন ID:</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedOrder.paymentTrxId}</span>
                </div>
              )}
            </div>

            {/* Status Update Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400">স্ট্যাটাস পরিবর্তন:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    const val = e.target.value as OrderStatus;
                    handleStatusChange(
                      selectedOrder.id,
                      val,
                      val === 'completed' ? 'paid' : val === 'cancelled' ? 'cancelled' : 'pending'
                    );
                  }}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="pending">অপেক্ষমাণ (Pending)</option>
                  <option value="confirmed">কনফার্মড (Confirmed)</option>
                  <option value="completed">সম্পন্ন (Completed & Paid)</option>
                  <option value="cancelled">বাতিল (Cancelled)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <a
                  href={`https://wa.me/88${(selectedOrder.customerPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `👋 আসসালামু আলাইকুম ${selectedOrder.customerName || ''}!\n` +
                    `📦 আপনার অর্ডার #${selectedOrder.id.slice(0, 8)} সফলভাবে কনফার্ম করা হয়েছে।\n` +
                    `💰 মোট পরিশোধিত মূল্য: ${formatPrice(selectedOrder.total)}\n` +
                    `নাসির ডিজিটাল হাব এর সাথে থাকার জন্য ধন্যবাদ!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>WhatsApp এ ইনভয়েস পাঠান</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
