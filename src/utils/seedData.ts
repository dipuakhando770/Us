import { createCategory, createBenefit } from '../firebase/services';

export async function seedInitialCatalog(): Promise<void> {
  // 1. Default Categories (Unlinked / Generic)
  await createCategory({
    name: 'সফটওয়্যার ও টুলস',
    slug: 'software-tools',
    description: 'জেনুইন সফটওয়্যার ও ডিজিটাল টুলস',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    sortOrder: 1,
    active: true,
    createdAt: Date.now(),
  });

  await createCategory({
    name: 'গ্রাফিক্স ও টেমপ্লেট',
    slug: 'graphics-templates',
    description: 'ডিজাইন টেমপ্লেট ও গ্রাফিক্স অ্যাসেটস',
    imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    sortOrder: 2,
    active: true,
    createdAt: Date.now(),
  });

  // 2. Default Benefits
  await createBenefit({
    icon: 'zap',
    title: 'ইন্সট্যান্ট ডেলিভারি',
    description: 'অর্ডারের সাথে সাথেই আপনার ইমেইল বা হোয়াটসঅ্যাপে অ্যাক্সেস লিংক পৌঁছে যাবে।',
    active: true,
    sortOrder: 1,
  });

  await createBenefit({
    icon: 'shield',
    title: '১০০% জেনুইন ও নিরাপদ',
    description: 'সকল ডিজিটাল পণ্য সম্পূর্ণ ভেরিফাইড এবং বিশ্বস্ত সোর্স থেকে এক্টিভেটেড।',
    active: true,
    sortOrder: 2,
  });

  await createBenefit({
    icon: 'headphones',
    title: '২৪/৭ সরাসরি সহায়তা',
    description: 'যেকোনো কারিগরি সমস্যায় আমাদের টিম সার্বক্ষণিক সহায়তা প্রদান করে।',
    active: true,
    sortOrder: 3,
  });
}
