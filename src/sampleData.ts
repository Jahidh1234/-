import { Member, Payment } from './types';

export const SAMPLE_MEMBERS: Member[] = [
  {
    id: 101,
    name: "জায়দুল হাসান (সভাপতি)",
    mobile: "01626972980",
    joinDate: "2026-05-01",
    shareCount: 2, // 2 Shares = 1200 BDT/month
  },
  {
    id: 102,
    name: "মো: রহিম আলী",
    mobile: "01712345678",
    joinDate: "2026-05-02",
    shareCount: 1, // 1 Share = 600 BDT/month
  },
  {
    id: 103,
    name: "মো: করিম উদ্দিন",
    mobile: "01812345678",
    joinDate: "2026-05-04",
    shareCount: 3, // 3 Shares = 1800 BDT/month
  },
  {
    id: 104,
    name: "মো: জামাল হোসেন",
    mobile: "01912345678",
    joinDate: "2026-05-05",
    shareCount: 5, // 5 Shares = 3000 BDT/month
  },
  {
    id: 105,
    name: "সোহেল রানা",
    mobile: "01512345678",
    joinDate: "2026-05-10",
    shareCount: 1, // 1 Share = 600 BDT/month
  }
];

export const SAMPLE_PAYMENTS: Payment[] = [
  {
    id: "pay_1",
    receiptNumber: "R-1001",
    memberId: 101,
    amount: 1200,
    month: "May 2026",
    paymentDate: "2026-05-15",
    note: "বিকাশে প্রাপ্ত"
  },
  {
    id: "pay_2",
    receiptNumber: "R-1002",
    memberId: 101,
    amount: 1200,
    month: "June 2026",
    paymentDate: "2026-06-05",
    note: "অফিস কাউন্টার"
  },
  {
    id: "pay_3",
    receiptNumber: "R-1003",
    memberId: 102,
    amount: 600,
    month: "May 2026",
    paymentDate: "2026-05-16",
    note: "বিকাশ পেমেন্ট"
  },
  {
    id: "pay_4",
    receiptNumber: "R-1004",
    memberId: 103,
    amount: 1800,
    month: "May 2026",
    paymentDate: "2026-05-18",
    note: "নগদ পরিশোধ"
  },
  {
    id: "pay_5",
    receiptNumber: "R-1005",
    memberId: 104,
    amount: 3000,
    month: "May 2026",
    paymentDate: "2026-05-20",
    note: "বিকাশে প্রাপ্ত"
  }
];
