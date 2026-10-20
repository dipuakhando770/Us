import { Product, Category } from '../types';

export const defaultCategories: Category[] = [
  {
    id: 'software',
    name: 'সফটওয়্যার ও টুলস',
    slug: 'software-tools',
    description: 'জেনুইন সফটওয়্যার ও ডিজিটাল টুলস',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    sortOrder: 1,
    active: true,
    createdAt: Date.now(),
  },
  {
    id: 'graphics',
    name: 'গ্রাফিক্স ও টেমপ্লেট',
    slug: 'graphics-templates',
    description: 'ডিজাইন টেমপ্লেট ও গ্রাফিক্স অ্যাসেটস',
    imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80',
    sortOrder: 2,
    active: true,
    createdAt: Date.now(),
  },
  {
    id: 'subscriptions',
    name: 'প্রিমিয়াম সাবস্ক্রিপশন',
    slug: 'premium-subscriptions',
    description: 'জনপ্রিয় এআই ও প্রো সাবস্ক্রিপশন',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    sortOrder: 3,
    active: true,
    createdAt: Date.now(),
  },
];

export const defaultProducts: Product[] = [];
