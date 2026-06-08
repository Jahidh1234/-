export interface Member {
  id: number; // Auto Incremented starting from 101
  name: string;
  mobile: string;
  joinDate: string;
  shareCount: number; // 🏠 Shares count default 1, can be 1, 2, 3, 5 etc.
  photoUrl?: string; // Base64 or local URL representation
}

export interface Payment {
  id: string; // Unique timestamp or push ID
  receiptNumber: string; // Auto Receipt Number like R-1001
  memberId: number; // ID of the member
  amount: number; // default 600 * shareCount
  month: string; // Target month (e.g., 'May 2026', 'June 2026'...)
  paymentDate: string;
  screenshotUrl?: string; // Base64 of payment screenshot
  note: string;
}

export const MONTH_SEQUENCE = [
  "May 2026",
  "June 2026",
  "July 2026",
  "August 2026",
  "September 2026",
  "October 2026",
  "November 2026",
  "December 2026",
  "January 2027",
  "February 2027",
  "March 2027",
  "April 2027"
];

export const MONTH_NAMES_BN: Record<string, string> = {
  "May 2026": "মে ২০২৬",
  "June 2026": "জুন ২০২৬",
  "July 2026": "জুলাই ২০২৬",
  "August 2026": "আগস্ট ২০২৬",
  "September 2026": "সেপ্টেম্বর ২০২৬",
  "October 2026": "অক্টোবর ২০২৬",
  "November 2026": "নভেম্বর ২০২৬",
  "December 2026": "ডিসেম্বর ২০২৬",
  "January 2027": "জানুয়ারি ২০২৭",
  "February 2027": "ফেব্রুয়ারি ২০২৭",
  "March 2027": "মার্চ ২০২৭",
  "April 2027": "এপ্রিল ২০২৭"
};
