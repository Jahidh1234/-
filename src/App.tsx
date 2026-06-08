import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Receipt, 
  TrendingUp, 
  Clock, 
  Phone, 
  AlertTriangle, 
  CheckCircle, 
  Image as ImageIcon,
  Printer, 
  Download, 
  Share2, 
  MessageSquare, 
  Search, 
  Dribbble, 
  DollarSign, 
  Home, 
  Calendar,
  Lock,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { Member, Payment, MONTH_SEQUENCE, MONTH_NAMES_BN } from './types';
import { SAMPLE_MEMBERS, SAMPLE_PAYMENTS } from './sampleData';
import { 
  initAnonymousAuth, 
  setupRtdbSync, 
  pushMembersToRtdb, 
  pushPaymentsToRtdb,
  checkAndInitializeRtdb
} from './firebase';

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'payments' | 'reports' | 'progress'>('dashboard');

  // Real data state
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Dynamic sync statuses
  const [syncing, setSyncing] = useState<boolean>(false);
  const [offline, setOffline] = useState<boolean>(!navigator.onLine);
  const [loadingSync, setLoadingSync] = useState<boolean>(() => {
    // True if there is no cache, so we wait for real-time Firebase sync on first load to prevent flash of sample data
    return !localStorage.getItem('vvs_members');
  });

  // Search and filter inputs
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [paymentSearch, setPaymentSearch] = useState<string>('');
  const [reportMonth, setReportMonth] = useState<string>('All');
  const [reportMemberId, setReportMemberId] = useState<string>('All');

  // Selected object state
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Form states
  const [memberForm, setMemberForm] = useState<{
    id?: number;
    name: string;
    mobile: string;
    joinDate: string;
    shareCount: number;
    photoUrl?: string;
  } | null>(null);

  const [paymentForm, setPaymentForm] = useState<{
    id?: string;
    memberId: number | '';
    amount: number;
    month: string;
    paymentDate: string;
    screenshotUrl?: string;
    note: string;
  } | null>(null);

  // Password confirmation state
  const [pwdModal, setPwdModal] = useState<{
    isOpen: boolean;
    title: string;
    inputValue: string;
    errorMessage: string;
    onSuccess: () => void;
  } | null>(null);

  // Message template sharing state
  const [shareConfig, setShareConfig] = useState<{
    member: Member;
    monthName: string;
    dueAmount: number;
    whatsappUrl: string;
    smsBody: string;
    messengerUrl: string;
  } | null>(null);

  // Photo uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const payScreenshotRef = useRef<HTMLInputElement>(null);

  // Keep track of current system active month index based on real current date (June 2026)
  // Let the user adjust current system active month index for testing dues!
  const [activeMonthLimit, setActiveMonthLimit] = useState<number>(2); // Default Up to July 2026 (Indices: 0=May, 1=June, 2=July)

  // First cycle bootloader
  useEffect(() => {
    // 1. Initial State from Local Storage
    const localM = localStorage.getItem('vvs_members');
    const localP = localStorage.getItem('vvs_payments');
    
    let loadedMembers: Member[] = [];
    let loadedPayments: Payment[] = [];

    if (localM && localP) {
      try {
        loadedMembers = JSON.parse(localM);
        loadedPayments = JSON.parse(localP);
      } catch (e) {
        console.error("Error reading cache", e);
      }
    }

    // Default to samples if no cache found
    if (loadedMembers.length === 0) {
      loadedMembers = SAMPLE_MEMBERS;
      loadedPayments = SAMPLE_PAYMENTS;
      localStorage.setItem('vvs_members', JSON.stringify(SAMPLE_MEMBERS));
      localStorage.setItem('vvs_payments', JSON.stringify(SAMPLE_PAYMENTS));
    }

    setMembers(loadedMembers);
    setPayments(loadedPayments);

    // 2. Initialize Firebase authentication and database listeners
    const initiateFirebase = async () => {
      setSyncing(true);
      const isAuthOK = await initAnonymousAuth();
      if (isAuthOK) {
        // Enforce DB is initialized with sample data on very first usage
        await checkAndInitializeRtdb(SAMPLE_MEMBERS, SAMPLE_PAYMENTS);

        let membersDone = false;
        let paymentsDone = false;
        const markDone = () => {
          if (membersDone && paymentsDone) {
            setLoadingSync(false);
          }
        };

        // Realtime Database listeners take charge
        setupRtdbSync(
          (remoteMembers) => {
            // Note: Keep updating state and localStorage even if remoteMembers is empty!
            // No length check so dynamic deletions are correctly loaded.
            setMembers(remoteMembers);
            localStorage.setItem('vvs_members', JSON.stringify(remoteMembers));
            membersDone = true;
            markDone();
          },
          (remotePayments) => {
            setPayments(remotePayments);
            localStorage.setItem('vvs_payments', JSON.stringify(remotePayments));
            paymentsDone = true;
            markDone();
          }
        );

        // Fallback safety timeout for loading state
        setTimeout(() => {
          setLoadingSync(false);
        }, 3000);

      } else {
        // Offline tracker
        setOffline(true);
        setLoadingSync(false);
      }
      setSyncing(false);
    };

    initiateFirebase();

    // Listeners for network status
    const handleOnline = () => {
      setOffline(false);
      initiateFirebase();
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync state modifications helper
  const saveStateToStorageAndDb = async (updatedMembers: Member[], updatedPayments: Payment[]) => {
    setMembers(updatedMembers);
    setPayments(updatedPayments);
    localStorage.setItem('vvs_members', JSON.stringify(updatedMembers));
    localStorage.setItem('vvs_payments', JSON.stringify(updatedPayments));

    setSyncing(true);
    try {
      await pushMembersToRtdb(updatedMembers);
      await pushPaymentsToRtdb(updatedPayments);
    } catch (e) {
      console.warn("Storage sync offline fallback enabled.");
    } finally {
      setSyncing(false);
    }
  };

  // Safe action check triggers password verification
  const secureAction = (title: string, actionCallback: () => void) => {
    setPwdModal({
      isOpen: true,
      title: title,
      inputValue: '',
      errorMessage: '',
      onSuccess: () => {
        actionCallback();
        setPwdModal(null);
      }
    });
  };

  const handlePasswordSubmit = () => {
    if (!pwdModal) return;
    if (pwdModal.inputValue === '972980') {
      pwdModal.onSuccess();
    } else {
      setPwdModal({
        ...pwdModal,
        errorMessage: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।'
      });
    }
  };

  // DUES & MONETARY CALCULATION FORMULAS
  // Monthly Fee per share = 600 DBT
  // Dues represent = expected amount from May 2026 up to activeMonthLimit - total collected payment
  const getExpectedContribUpToLimit = (member: Member) => {
    // Current number of elapsed months = activeMonthLimit + 1
    const monthsMultiplier = activeMonthLimit + 1;
    return member.shareCount * 600 * monthsMultiplier;
  };

  const getMemberTotalPaid = (memberId: number) => {
    return payments
      .filter(p => p.memberId === memberId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getMemberDue = (member: Member) => {
    const expected = getExpectedContribUpToLimit(member);
    const paid = getMemberTotalPaid(member.id);
    const due = expected - paid;
    return due > 0 ? due : 0;
  };

  // Month-by-month detailed due calculation
  const getMemberDetailedDues = (member: Member) => {
    const detailedList: Array<{ month: string; expected: number; paid: number; due: number }> = [];
    // Only check up to the active month index limit
    for (let i = 0; i <= activeMonthLimit; i++) {
      const month = MONTH_SEQUENCE[i];
      const expectedOfThisMonth = member.shareCount * 600;
      const paidOfThisMonth = payments
        .filter(p => p.memberId === member.id && p.month === month)
        .reduce((sum, p) => sum + p.amount, 0);
      
      detailedList.push({
        month,
        expected: expectedOfThisMonth,
        paid: paidOfThisMonth,
        due: expectedOfThisMonth - paidOfThisMonth > 0 ? expectedOfThisMonth - paidOfThisMonth : 0
      });
    }
    return detailedList;
  };

  // Dashboard Aggregated totals
  const totalShares = members.reduce((sum, m) => sum + m.shareCount, 0);
  const totalActiveMembers = members.length;
  const totalMonthlyExpectedCollection = totalShares * 600;
  const totalCollectionSum = payments.reduce((sum, p) => sum + p.amount, 0);

  // Overall due is the sum of dues of all active members
  const totalDueSum = members.reduce((sum, m) => sum + getMemberDue(m), 0);

  // Cow fund target configuration: Target Amount = Total Shares * 600 * 10 Months (As per requested target rule)
  const cowFundTarget = totalShares * 600 * 10;
  const cowFundProgressPercent = cowFundTarget > 0 ? Math.min(100, Math.round((totalCollectionSum / cowFundTarget) * 100)) : 0;

  // Recent 5 payments
  const recentPayments = [...payments]
    .sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  // First 5 members
  const first5Members = [...members]
    .sort((a,b) => a.id - b.id)
    .slice(0, 5);

  // List of overdue members (due sum > 0) sorted descending
  const overdueMembers = members
    .map(m => ({ member: m, due: getMemberDue(m) }))
    .filter(item => item.due > 0)
    .sort((a,b) => b.due - a.due);

  // Handle member operations
  const triggerAddMember = () => {
    const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 101;
    setMemberForm({
      name: '',
      mobile: '',
      joinDate: new Date().toISOString().split('T')[0],
      shareCount: 1,
      id: newId
    });
  };

  const handleMemberFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm) return;

    if (!memberForm.name.trim() || !memberForm.mobile.trim()) {
      alert("সদস্যের নাম ও মোবাইল নম্বর দেওয়া আবশ্যক!");
      return;
    }

    secureAction("নতুন সদস্য যোগ/পরিবর্তন পাসওয়ার্ড অনুমোদন", () => {
      const existingIndex = members.findIndex(m => m.id === memberForm.id);
      let updatedMembers = [...members];
      
      const newMember: Member = {
        id: memberForm.id || 101,
        name: memberForm.name,
        mobile: memberForm.mobile,
        joinDate: memberForm.joinDate,
        shareCount: Number(memberForm.shareCount),
        photoUrl: memberForm.photoUrl
      };

      if (existingIndex > -1) {
        updatedMembers[existingIndex] = newMember;
      } else {
        updatedMembers.push(newMember);
      }

      saveStateToStorageAndDb(updatedMembers, payments);
      setMemberForm(null);
    });
  };

  const handleDeleteMember = (id: number) => {
    secureAction("সদস্য ডিলিট পাসওয়ার্ড অনুমোদন", () => {
      const updatedMembers = members.filter(m => m.id !== id);
      // Also filter payments of that member
      const updatedPayments = payments.filter(p => p.memberId !== id);
      saveStateToStorageAndDb(updatedMembers, updatedPayments);
    });
  };

  // Convert upload member profile photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && memberForm) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMemberForm({
          ...memberForm,
          photoUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle payment operations
  const triggerAddPayment = () => {
    setPaymentForm({
      memberId: '',
      amount: 600,
      month: MONTH_SEQUENCE[Math.min(activeMonthLimit, MONTH_SEQUENCE.length - 1)],
      paymentDate: new Date().toISOString().split('T')[0],
      screenshotUrl: '',
      note: 'বিকাশ পেমেন্ট'
    });
  };

  const handlePaymentMemberChange = (mId: number) => {
    const selectedMem = members.find(m => m.id === mId);
    if (selectedMem && paymentForm) {
      setPaymentForm({
        ...paymentForm,
        memberId: mId,
        amount: selectedMem.shareCount * 600
      });
    }
  };

  const handlePaymentFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm || paymentForm.memberId === '') return;

    secureAction("নতুন কিস্তি জমা পাসওয়ার্ড অনুমোদন", () => {
      const genReceiptNum = `R-${1000 + payments.length + 1}`;
      const newPayment: Payment = {
        id: paymentForm.id || `pay_${Date.now()}`,
        receiptNumber: genReceiptNum,
        memberId: Number(paymentForm.memberId),
        amount: Number(paymentForm.amount),
        month: paymentForm.month,
        paymentDate: paymentForm.paymentDate,
        screenshotUrl: paymentForm.screenshotUrl,
        note: paymentForm.note
      };

      let updatedPayments = [...payments];
      if (paymentForm.id) {
        const idx = payments.findIndex(p => p.id === paymentForm.id);
        if (idx > -1) updatedPayments[idx] = newPayment;
      } else {
        updatedPayments.push(newPayment);
      }

      saveStateToStorageAndDb(members, updatedPayments);
      setPaymentForm(null);
      setSelectedReceipt(newPayment); // Open beautiful printable invoice automatically
    });
  };

  const handleDeletePayment = (pId: string) => {
    secureAction("কিস্তি ডিলিট পাসওয়ার্ড অনুমোদন", () => {
      const updatedPayments = payments.filter(p => p.id !== pId);
      saveStateToStorageAndDb(members, updatedPayments);
    });
  };

  // Handle screenshot upload base64
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && paymentForm) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentForm({
          ...paymentForm,
          screenshotUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate Social Template Messages
  const handleGenerateShare = (member: Member) => {
    const memberDue = getMemberDue(member);
    const monthNameBn = MONTH_NAMES_BN[MONTH_SEQUENCE[activeMonthLimit]] || MONTH_SEQUENCE[activeMonthLimit];
    if (memberDue === 0) {
      alert(`${member.name} এর কোনো বকেয়া নেই!`);
      return;
    }

    const shareFee = member.shareCount * 600;

    const rawSms = `প্রিয় সদস্য ${member.name},
আপনার ভাই ভাই সমিতি হিসাব নং-ভভ-${member.id} এর সম্মানিত (${member.shareCount}) শেয়ারের অনুকূলে '${monthNameBn}' মাসের কিস্তি ${shareFee} টাকা এবং মোট বকেয়া ${memberDue} টাকা এখনও বাকি রয়েছে। অনুগ্রহ করে বিকাশ নম্বর 01976972980 এ দ্রুত পরিশোধপূর্বক স্ক্রিনশট পোর্টালে জমা দিন। ধন্যবাদ।`;

    const smsBody = encodeURIComponent(rawSms);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${member.mobile.startsWith('0') ? '88' + member.mobile : member.mobile}&text=${smsBody}`;
    const messengerUrl = `https://m.me/`; // General redirect link

    setShareConfig({
      member,
      monthName: monthNameBn,
      dueAmount: memberDue,
      whatsappUrl,
      smsBody: rawSms,
      messengerUrl
    });
  };

  // Filter lists for dashboard search
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
    m.id.toString().includes(memberSearch) ||
    m.mobile.includes(memberSearch)
  );

  const filteredPayments = payments.filter(p => {
    const mem = members.find(m => m.id === p.memberId);
    const searchMatch = (mem?.name || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        p.receiptNumber.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        p.month.toLowerCase().includes(paymentSearch.toLowerCase());
    return searchMatch;
  });

  // Export to simple HTML Table / CSV file
  const exportMembersReportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Member ID,Name,Mobile,Join Date,Shares,Total Paid (BDT),Dues (BDT)\r\n";
    members.forEach(m => {
      csvContent += `${m.id},"${m.name}",${m.mobile},${m.joinDate},${m.shareCount},${getMemberTotalPaid(m.id)},${getMemberDue(m)}\r\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bhai-bhai-somiti-members-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingSync && !offline) {
    return (
      <div className="min-h-screen bg-[#f0f9f4] flex flex-col items-center justify-center p-6 font-sans">
        <div className="text-center space-y-4 max-w-sm animate-zoom-in">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px] mx-auto animate-bounce shadow-md">
            ভাই ভাই<br/>সমিতি
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-black text-emerald-950">তথ্য সিঙ্ক হচ্ছে...</h2>
            <p className="text-xs text-slate-500 font-medium">ক্লাউড ডাটাবেজ থেকে সমিতির সর্বশেষ হিসাব সংগ্রহ করা হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।</p>
          </div>
          <div className="flex justify-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="app_root" className="min-h-screen bg-[#f0f9f4] text-slate-800 flex flex-col md:flex-row font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* ⚠️ SYSTEM ONLINE / OFFLINE BACKGROUND SYNC BANNER - Pure non-intrusive background logic */}
      {syncing && (
        <div className="fixed top-2 right-2 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-50 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
          <span>সার্ভার সিঙ্ক হচ্ছে...</span>
        </div>
      )}

      {/* DESKTOP SIDEBAR NAVIGATION (High Density Mint-White Theme) */}
      <aside className="hidden md:flex flex-col w-64 bg-white text-slate-800 shrink-0 border-r border-emerald-100 shadow-inner relative">
        {/* TOP HEADER Permanent Logo container */}
        <div className="p-5 border-b border-emerald-150 bg-emerald-50/50 flex items-center gap-3">
          {/* Logo vector icon */}
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 border-2 border-emerald-500 shadow-sm">
            <div className="text-emerald-800 font-extrabold text-[10px] text-center leading-tight">
              ভাই ভাই<br/>সমিতি
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-emerald-900 leading-tight">ভাই ভাই সমিতি</h1>
            <p className="text-[10px] text-emerald-600 font-bold tracking-wider">দ্রুত কিস্তি পোর্টাল</p>
          </div>
        </div>

        {/* President Details */}
        <div className="p-3 mx-3 my-2 bg-emerald-50 text-slate-700 rounded-xl border border-emerald-100 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              স
            </div>
            <div>
              <p className="font-extrabold text-slate-900">সভাপতিঃ জায়দুল হাসান</p>
              <p className="text-emerald-700 font-bold font-mono text-[10px]">01626972980</p>
            </div>
          </div>
        </div>

        {/* Tab Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <button 
            id="tab_dash_desktop"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 hover:bg-emerald-50'}`}
          >
            <Home className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-emerald-600'}`} />
            <span>🏠 ড্যাশবোর্ড</span>
          </button>

          <button 
            id="tab_mem_desktop"
            onClick={() => setActiveTab('members')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === 'members' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 hover:bg-emerald-50'}`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'members' ? 'text-white' : 'text-emerald-600'}`} />
            <span>👥 সদস্য ব্যবস্থাপনা</span>
          </button>

          <button 
            id="tab_pay_desktop"
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === 'payments' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 hover:bg-emerald-50'}`}
          >
            <Clock className={`w-4 h-4 ${activeTab === 'payments' ? 'text-white' : 'text-emerald-600'}`} />
            <span>💰 কিস্তি পেমেন্টসমূহ</span>
          </button>

          <button 
            id="tab_rep_desktop"
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === 'reports' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 hover:bg-emerald-50'}`}
          >
            <Receipt className={`w-4 h-4 ${activeTab === 'reports' ? 'text-white' : 'text-emerald-600'}`} />
            <span>📋 বকেয়া ও রিপোর্ট</span>
          </button>

          <button 
            id="tab_prog_desktop"
            onClick={() => setActiveTab('progress')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === 'progress' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 hover:bg-emerald-50'}`}
          >
            <TrendingUp className={`w-4 h-4 ${activeTab === 'progress' ? 'text-white' : 'text-emerald-600'}`} />
            <span>📈 লক্ষ্য ও অগ্রগতি (গরু ফান্ড)</span>
          </button>
        </nav>

        {/* Footer info in Sidebar */}
        <div className="m-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center text-[10px] text-slate-600 shrink-0">
          <p className="font-bold text-emerald-800">বিকাশ নম্বর (Personal)</p>
          <p className="text-sm font-black font-mono text-emerald-700 my-0.5">01976972980</p>
          <p className="text-[9px] text-slate-400 mt-1">© ২০২৬ ভাই ভাই সমিতি</p>
        </div>
      </aside>

      {/* MOBILE HEADER BANNER (High Density design) */}
      <header className="md:hidden bg-emerald-800 text-white p-4 sticky top-0 z-40 shadow-lg border-b-4 border-emerald-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Permanent top-left logo in mobile banner too */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-emerald-400/20 shadow-sm">
            <span className="text-[8px] text-emerald-800 font-black leading-none">ভাই ভাই</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight">ভাই ভাই সমিতি</h1>
            <p className="text-[9px] text-emerald-100 opacity-90">দ্রুত কিস্তি গ্রহণের পোর্টাল</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white font-bold">সভাপতিঃ জায়দুল হাসান</p>
          <a href="tel:01626972980" className="text-[9px] font-mono text-emerald-100 bg-emerald-900/50 px-1.5 py-0.5 rounded inline-block">
            ০১৬২৬৯৭২৯৮০
          </a>
        </div>
      </header>

      {/* MAIN BODY AREA & CONTAINER */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
        
        {/* MISSION AND BULLETINS SECTION (High Density Core Bulletin Banner) */}
        <section id="mission_bulletin_banner" className="mb-5 bg-emerald-900 text-white p-4.5 rounded-2xl shadow-md border-l-8 border-yellow-400 flex flex-col lg:flex-row gap-4 justify-between items-center shrink-0">
          <div className="flex-1">
            <p className="text-[14px] md:text-md lg:text-lg leading-relaxed font-semibold">
              আমাদের মূল লক্ষ্য <span className="font-extrabold text-yellow-400 text-xl lg:text-2xl mx-1">{totalActiveMembers}</span> জন সদস্য ও শুভানুধ্যায়ীদের যৌথ সঞ্চয় <span className="font-extrabold text-yellow-400 text-xl lg:text-2xl mx-1">{totalCollectionSum.toLocaleString()}৳</span> টাকা সংগ্রহ করে একটি পুষ্টিকর গরু ক্রয় করা।
            </p>
          </div>
          
          <div className="w-full lg:w-72 shrink-0 bg-emerald-950/65 p-3 rounded-xl border border-emerald-800/80 text-xs">
            <h3 className="text-[10px] font-bold text-yellow-400 uppercase tracking-wide mb-1 leading-none">সমিতি গাইডলাইন ও বিকাশ</h3>
            <div className="space-y-1 text-[11px] leading-tight">
              <p className="flex justify-between items-center"><span className="text-emerald-200">মাসিক কিস্তিঃ</span> <span className="font-bold text-white">৬০০ টাকা / শেয়ার</span></p>
              <p className="flex justify-between items-center"><span className="text-emerald-200">বিকাশ নম্বরঃ</span> <span className="font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-sm">01976972980 (Personal)</span></p>
              <div className="text-[10px] text-emerald-300 leading-normal border-t border-emerald-800/30 pt-1 mt-1">
                📌 টাকা পাঠিয়ে অনুগ্রহ করে স্ক্রিনশট পোর্টালে জমা দিন।
              </div>
            </div>
          </div>
        </section>

        {/* DYNAMIC TAB CONTROLLERS & ROUTERS */}
        {activeTab === 'dashboard' && (
          <div id="tab_dashboard_content" className="space-y-6">
            
            {/* 1. STATE COUNTER CARDS - GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Total Active Members */}
              <div id="stat_members" className="bg-white p-4.5 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-50/30 flex flex-col justify-between hover:border-emerald-350 hover:shadow-md transition duration-150 group animate-zoom-in">
                <div className="flex justify-between items-start mb-2">
                  <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition duration-150">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono">ACTIVE</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">মোট সক্রিয় সদস্য</p>
                  <p className="text-xl md:text-2xl font-black font-mono text-emerald-950">{totalActiveMembers} জন</p>
                </div>
              </div>

              {/* Total Shares */}
              <div id="stat_shares" className="bg-white p-4.5 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-50/20 flex flex-col justify-between hover:border-emerald-355 hover:border-emerald-300 hover:shadow-md transition duration-150 group animate-zoom-in">
                <div className="flex justify-between items-start mb-2">
                  <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition duration-150">
                    <Dribbble className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono">SHARES</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">মোট নথিভুক্ত শেয়ার</p>
                  <p className="text-xl md:text-2xl font-black font-mono text-emerald-950">{totalShares} টি</p>
                </div>
              </div>

              {/* Total Monthly Expected Collection */}
              <div id="stat_expected" className="bg-white p-4.5 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-50/20 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition duration-150 group animate-zoom-in">
                <div className="flex justify-between items-start mb-2">
                  <span className="p-2 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100 transition duration-150">
                    <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded font-mono">MONTHLY</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">মাসিক ম্যাপড সম্ভাবনা</p>
                  <p className="text-xl md:text-2xl font-black font-mono text-blue-950">{totalMonthlyExpectedCollection.toLocaleString()} ৳</p>
                </div>
              </div>

              {/* Total Collective Saving */}
              <div id="stat_collection" className="bg-white p-4.5 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-50/20 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition duration-150 group animate-zoom-in">
                <div className="flex justify-between items-start mb-2">
                  <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono">COLLECTED</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">মোট সংগৃহীত সঞ্চয়</p>
                  <p className="text-xl md:text-2xl font-black font-mono text-emerald-850">{totalCollectionSum.toLocaleString()} ৳</p>
                </div>
              </div>

              {/* Total Due Amount */}
              <div id="stat_due" className="col-span-2 lg:col-span-1 bg-white p-4.5 rounded-xl border border-emerald-103 border-emerald-100 shadow-sm shadow-emerald-50/20 flex flex-col justify-between hover:border-red-300 hover:shadow-md transition duration-150 group animate-zoom-in">
                <div className="flex justify-between items-start mb-2">
                  <span className="p-2 rounded-lg bg-red-50 text-red-700 group-hover:bg-red-100 transition duration-150">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-650 text-red-600" />
                  </span>
                  <span className="text-[10px] bg-red-105 bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded font-mono">DUE</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">মোট বকেয়া কিস্তি</p>
                  <p className="text-xl md:text-2xl font-black font-mono text-red-655 text-red-600">{totalDueSum.toLocaleString()} ৳</p>
                </div>
              </div>

            </div>

            {/* TESTING UTILITY: CHOOSE SYSTEM ELAPSED MONTHS FOR DUES SIMULATION */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2.5 rounded-full bg-emerald-700 text-white font-mono text-xs font-bold">টেস্ট কন্ট্রোল</span>
                <p className="text-xs text-emerald-950 font-semibold">হিসাবের সর্বশেষ সক্রিয় মাস নির্ধারণ করুন (বকেয়া গণনার জন্য)</p>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={activeMonthLimit}
                  onChange={(e) => setActiveMonthLimit(Number(e.target.value))}
                  className="bg-white border select-sm border-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                >
                  {MONTH_SEQUENCE.map((m, idx) => (
                    <option key={idx} value={idx}>{MONTH_NAMES_BN[m]} ({m})</option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">পর্যন্ত হিসাব গণনা করা হচ্ছে।</span>
              </div>
            </div>

            {/* 2. CHOSEN MAIN GOAL HIGHLIGHTING (COW FUND ILLUSTRATIVE STATS) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Cow progress representation with interactive SVG and meter */}
              <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">গরু ক্রয়ের লক্ষ্য তহবিল অগ্রগতি</h4>
                      <p className="text-lg font-black text-slate-800">মোট সঞ্চয় লক্ষ্যমাত্রাঃ <span className="text-emerald-700 font-mono">{cowFundTarget.toLocaleString()} ৳</span></p>
                    </div>
                    <span className="text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-bold">মোট শেয়ার ১০ মাসের টার্গেট</span>
                  </div>

                  {/* Aesthetic Cow silhouette vector changing opacity or filling up based on progress */}
                  <div className="bg-emerald-50/50 rounded-xl p-6 mb-4 flex flex-col md:flex-row items-center justify-around gap-4 border border-emerald-100/40">
                    <div className="relative">
                      {/* Responsive cow dynamic SVG progress loader icon with gold bells */}
                      <svg viewBox="0 0 100 100" className="w-24 h-24 text-emerald-800 fill-current">
                        {/* Background cloud bubble */}
                        <circle cx="50" cy="50" r="48" fill="white" className="opacity-95 shadow"/>
                        <circle cx="50" cy="50" r="44" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="3 3" fill="none" />
                        {/* Fill clip path wrapper */}
                        <g>
                          {/* Sizable outline Cow */}
                          <path d="M25,75 C25,50 35,40 50,40 C65,40 75,50 75,75 M40,40 C40,30 35,25 30,25 M60,40 C60,30 65,25 70,25" stroke="#047857" strokeWidth="3" fill="none" className="opacity-40" />
                          {/* Inner filled segment mapped on cowFundProgressPercent */}
                          <rect x="10" y={100 - cowFundProgressPercent} width="80" height="100" fill="#10b981" className="opacity-30" />
                          {/* Finished cow character vector centered */}
                          <path d="M30,55 C30,70 70,70 70,55 C70,45 80,45 70,40 C65,45 35,45 30,40 C20,45 30,45 30,55 Z" stroke="#065f46" strokeWidth="2" fill="currentColor" className="text-emerald-600" />
                        </g>
                      </svg>
                      {/* Achievement Badge */}
                      <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white font-mono text-xs px-2 py-0.5 rounded-full font-bold shadow-md">
                        {cowFundProgressPercent}%
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700 flex-1">
                      <div className="flex justify-between font-semibold"><span>মোট সংগৃহীত সঞ্চয়ঃ</span> <span className="font-mono text-emerald-700">{totalCollectionSum.toLocaleString()} ৳</span></div>
                      <div className="flex justify-between font-semibold"><span>অবশিষ্ট লক্ষ্যমাত্রাঃ</span> <span className="font-mono text-amber-700">{Math.max(0, cowFundTarget - totalCollectionSum).toLocaleString()} ৳</span></div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-emerald-605 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${cowFundProgressPercent}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500">গড় সঞ্চয় প্রতি শেয়ার</p>
                    <p className="font-bold font-mono text-slate-800">{totalShares > 0 ? Math.round(totalCollectionSum / totalShares).toLocaleString() : 0} ৳</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500">মোট সক্রিয় মাস</p>
                    <p className="font-bold text-slate-800">{activeMonthLimit + 1} মাস</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500">বছর শেষের প্রত্যাশা</p>
                    <p className="font-bold font-mono text-slate-800">{(totalShares * 600 * 12).toLocaleString()} ৳</p>
                  </div>
                </div>
              </div>

              {/* QUICK STATS CHANNELS - MINI METRIC VISUAL PIE / COLUMN */}
              <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">কিস্তি আদায় স্ট্যাটিস্টিক্স</h4>
                  
                  {/* Styled Micro Visualizations for Money collection */}
                  <div className="space-y-3.5 text-xs text-slate-600">
                    <div>
                      <div id="metric_collected" className="flex justify-between mb-1.5 font-medium">
                        <span>আদায়কৃত কিস্তি তহবিলঃ</span>
                        <span className="font-bold text-emerald-800">{totalCollectionSum.toLocaleString()} BDT</span>
                      </div>
                      <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden bg-slate-100">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(totalCollectionSum / (totalCollectionSum + totalDueSum || 1)) * 100}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div id="metric_due" className="flex justify-between mb-1.5 font-medium">
                        <span>বকেয়া রয়েছেঃ (elapsed)</span>
                        <span className="font-bold text-red-600">{totalDueSum.toLocaleString()} BDT</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full" style={{ width: `${(totalDueSum / (totalCollectionSum + totalDueSum || 1)) * 100}%` }}></div>
                      </div>
                    </div>

                    {/* Quick calculations note */}
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/40 text-[11px] leading-relaxed text-emerald-950">
                      💡 আদায়ের হার <b>{Math.round((totalCollectionSum / (totalCollectionSum + totalDueSum || 1)) * 100)}%</b>। বকেয়া পরিশোধের জন্য সদস্যদের মোবাইল নম্বরে সরাসরি হোয়াটসঅ্যাপ বা এসএমএস নোটিফিকেশন পাঠাতে <b>রিপোর্ট</b> সেকশন নির্বাচন করুন।
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setActiveTab('payments')}
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-105 rounded-xl text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-150 transition-all font-semibold"
                  >
                    <span>নতুন পেমেন্ট সংগ্রহ পোর্টালে যান</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* 3. HOME PAGE EXTRA THREE SPECIAL POOLS - GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Pool 1: 5 Members list */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-extrabold text-slate-850">প্রথম ৫ জন সদস্য তালিকা</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">CODE ID</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {first5Members.map((m) => (
                      <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-550 bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px]">
                            {m.name.slice(0, 1)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{m.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{m.mobile}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-700 font-bold font-mono">{m.shareCount} শেয়ার</p>
                          <p className="text-[9px] text-slate-400">যোগঃ {m.joinDate}</p>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="text-center py-6 text-slate-400 text-xs text-stone-500">কোনো সদস্য পাওয়া যায়নি।</p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('members')}
                  className="w-full mt-3 py-2 text-center text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded"
                >
                  সকল সদস্য দেখুন
                </button>
              </div>

              {/* Pool 2: Recent 5 payment submitters */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-extrabold text-slate-850">সাম্প্রতিক টাকা প্রদানকারী</h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono">PAYMENTS</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {recentPayments.map((p) => {
                      const m = members.find(mem => mem.id === p.memberId);
                      return (
                        <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                              <Receipt className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{m?.name || 'অজ্ঞাত সদস্য'}</p>
                              <p className="text-[10px] text-slate-400">{MONTH_NAMES_BN[p.month] || p.month}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-700 font-black font-mono">+{p.amount.toLocaleString()} ৳</p>
                            <p className="text-[9px] text-slate-400 font-mono">{p.paymentDate}</p>
                          </div>
                        </div>
                      );
                    })}
                    {payments.length === 0 && (
                      <p className="text-center py-6 text-slate-400 text-xs text-stone-500">কোনো পেমেন্ট তথ্য পাওয়াটি নেই।</p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('payments')}
                  className="w-full mt-3 py-2 text-center text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded"
                >
                  ভ্যালিডেট করুন
                </button>
              </div>

              {/* Pool 3: Due members list highlight */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-extrabold text-red-905 text-red-800">বকেয়া কিস্তির সদস্যদের তালিকা</h4>
                    <span className="text-[9px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded uppercase font-mono">OVERDUE</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {overdueMembers.slice(0, 5).map((item) => (
                      <div key={item.member.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{item.member.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{item.member.mobile}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-red-600 font-extrabold font-mono">{item.due.toLocaleString()} ৳</p>
                          <button 
                            onClick={() => handleGenerateShare(item.member)}
                            className="text-[9px] bg-red-50 hover:bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded mt-0.5 transition duration-100 flex items-center gap-0.5 ml-auto"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>নোটিশে দিন</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {overdueMembers.length === 0 && (
                      <p className="text-center py-6 text-emerald-800 text-xs font-medium">🎉 সকল সদস্যের কিস্তি পরিশোধিত! কোনো বকেয়া নেই।</p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="w-full mt-3 py-2 text-center text-xs font-semibold text-red-800 hover:bg-red-50 rounded"
                >
                  সকল বকেয়া বা নোটিফিকেশন জেনারেট করুন
                </button>
              </div>

            </div>

          </div>
        )}

        {/* MEMBER MANAGEMENT PAGE TAB */}
        {activeTab === 'members' && (
          <div id="tab_members_content" className="space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-emerald-100/60 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700" />
                  <span>সদস্য ব্যবস্থাপনা পোর্টাল</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">সমিতির বর্তমান মোট সদস্যঃ <span className="font-bold text-emerald-800 font-mono">{members.length}</span> জন</p>
              </div>
              
              <button 
                id="btn_add_member"
                onClick={triggerAddMember}
                className="px-4 py-2.5 bg-emerald-750 bg-emerald-750 hover:bg-emerald-800 transition text-white text-xs font-bold rounded-lg shadow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন সদস্য যোগ করুন</span>
              </button>
            </div>

            {/* MEMBER FILTERS & MOBILE CARDS list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="নাম, আইডি বা মোবাইল নাম্বার দিয়ে খুঁজুন..." 
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="bg-transparent border-none text-xs w-full focus:outline-none focus:ring-0 text-slate-700"
                />
              </div>

              {/* Responsive Member Cards display */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((m) => {
                  const mPaid = getMemberTotalPaid(m.id);
                  const mDue = getMemberDue(m);
                  return (
                    <div key={m.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-emerald-200 transition duration-150 flex flex-col justify-between space-y-4">
                      
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-full border-2 border-emerald-500 overflow-hidden shrink-0 bg-emerald-100 flex items-center justify-center">
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-xl font-bold text-emerald-800">{m.name[0]}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-slate-800 text-sm">{m.name}</h4>
                            <span className="text-[9px] bg-emerald-100 text-emerald-805 text-emerald-800 font-mono px-1.5 py-0.5 rounded-full font-bold">ভভ-{m.id}</span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{m.mobile}</span>
                          </p>
                          <p className="text-[10px] text-slate-500">যোগদান তারিখঃ <span className="font-mono">{m.joinDate}</span></p>
                        </div>
                      </div>

                      {/* Share and monetary calculations display */}
                      <div className="bg-white p-3 rounded-lg border border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px] leading-tight">
                        <div>
                          <p className="text-slate-500 mb-1">শেয়ার সংখ্যা</p>
                          <p className="font-bold text-slate-800">{m.shareCount} শেয়ার</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">মোট জমা</p>
                          <p className="font-bold text-emerald-700 font-mono">{mPaid.toLocaleString()} ৳</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">বকেয়া</p>
                          <p className={`font-bold font-mono ${mDue > 0 ? 'text-red-650 text-red-600' : 'text-slate-500'}`}>{mDue.toLocaleString()} ৳</p>
                        </div>
                      </div>

                      {/* Operation action handlers */}
                      <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100/50 text-xs">
                        <button 
                          onClick={() => handleGenerateShare(m)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 text-[10px]"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>নোটিশ</span>
                        </button>

                        <div className="flex items-center gap-1.5 ml-auto">
                          <button 
                            onClick={() => setMemberForm(m)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="সংশোধন করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="ডিলিট করুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs text-stone-500">
                    কোনো তথ্য পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* PAYMENTS OR CONTRIB ACTIONS TAB */}
        {activeTab === 'payments' && (
          <div id="tab_payments_content" className="space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-emerald-100/60 shadow-sm animate-fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-750 text-emerald-700" />
                  <span>কিস্তি পেমেন্ট ও রসিদ ব্যবস্থাপনা</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">সমিতির বর্তমান মোট কিস্তি আদায়ের পরিমাণঃ <span className="font-bold text-emerald-800 font-mono">{totalCollectionSum.toLocaleString()}</span> টাকা</p>
              </div>
              
              <button 
                id="btn_add_payment"
                onClick={triggerAddPayment}
                className="px-4 py-2.5 bg-emerald-750 bg-emerald-750 hover:bg-emerald-850 transition text-white text-xs font-bold rounded-lg shadow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন কিস্তি পেমেন্ট সংগ্রহ করুন</span>
              </button>
            </div>

            {/* PAYMENTS RECORDS LOG */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="মেম্বার নাম, রসিদ নম্বর বা মাস দিয়ে কিস্তি খুঁজুন..." 
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="bg-transparent border-none text-xs w-full focus:outline-none focus:ring-0 text-slate-700"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase font-bold text-[10px] tracking-wide">
                      <th className="p-4">রসিদ নম্বর</th>
                      <th className="p-4">সদস্যের নাম ও আইডি</th>
                      <th className="p-4">টাকার পরিমাণ</th>
                      <th className="p-4">উদ্দিষ্ট মাস</th>
                      <th className="p-4">পেমেন্ট তারিখ</th>
                      <th className="p-4">স্ক্রিনশট / নোট</th>
                      <th className="p-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredPayments.map((p) => {
                      const m = members.find(mem => mem.id === p.memberId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                          <td className="p-4">
                            <div>
                              <p className="font-extrabold text-slate-800">{m?.name || 'অজ্ঞাত সদস্য'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">আইডি নং: ভভ-{p.memberId}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-black font-mono text-emerald-805 text-emerald-800">+{p.amount.toLocaleString()} ৳</span>
                          </td>
                          <td className="p-4 font-medium text-slate-800">{MONTH_NAMES_BN[p.month] || p.month}</td>
                          <td className="p-4 font-mono text-slate-400">{p.paymentDate}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {p.screenshotUrl ? (
                                <button 
                                  onClick={() => setScreenshotPreview(p.screenshotUrl || null)}
                                  className="w-10 h-7 rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 cursor-zoom-in"
                                  title="স্ক্রিনশট দেখুন"
                                >
                                  <img src={p.screenshotUrl} alt="Screenshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </button>
                              ) : (
                                <span className="text-[10px] bg-slate-100 text-slate-405 text-slate-405 text-slate-500 px-1 py-0.5 rounded">নো ইমেজ</span>
                              )}
                              <span className="text-slate-500 truncate max-w-[120px]">{p.note}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right space-x-1">
                            <button 
                              onClick={() => setSelectedReceipt(p)}
                              className="p-1 px-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition"
                              title="মেমো রসিদ প্রিন্ট"
                            >
                              <Receipt className="w-4 h-4 inline" />
                            </button>
                            <button 
                              onClick={() => setPaymentForm({
                                id: p.id,
                                memberId: p.memberId,
                                amount: p.amount,
                                month: p.month,
                                paymentDate: p.paymentDate,
                                screenshotUrl: p.screenshotUrl,
                                note: p.note
                              })}
                              className="p-1 px-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="সংশোধন করুন"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            <button 
                              onClick={() => handleDeletePayment(p.id)}
                              className="p-1 px-1.5 text-red-500 hover:bg-red-50 rounded transition"
                              title="ডিলিট করুন"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-450 text-slate-400">
                          কোনো কিস্তির রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* REPORTS & DUES STATS TAB */}
        {activeTab === 'reports' && (
          <div id="tab_reports_content" className="space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-emerald-100/60 shadow-sm shadow overflow-hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-700" />
                  <span>রিপোর্ট এনালাইসিস ও সদস্য বকেয়া আদায়</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">পিডিএফ অথবা এক্সেল জেনারেট করুন এবং এক ক্লিকে বকেয়া নোটিশ পাঠান।</p>
              </div>

              {/* REPORT EXPORTERS */}
              <div className="flex flex-wrap gap-2.5">
                <button 
                  onClick={exportMembersReportToCSV}
                  className="px-3.5 py-2 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition duration-150"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>এক্সেল (CSV) এক্সপোর্ট</span>
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-emerald-750 bg-emerald-750 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition duration-150"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>রিপোর্ট প্রিন্ট করুন</span>
                </button>
              </div>
            </div>

            {/* DUES SUMMARY SHEET & ACTIONS GRID */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              
              {/* Header Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b border-slate-100 bg-slate-50/50 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">সদস্য ফিল্টার</label>
                  <select 
                    value={reportMemberId} 
                    onChange={(e) => setReportMemberId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="All">সকল সক্রিয় সদস্য তালিকা</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>ভভ-{m.id} - {m.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col justify-end">
                  <p className="text-[11px] text-slate-500 leading-normal text-right">
                    * মে ২০২৬ হতে নির্ধারিত মাস পর্যন্ত সম্মানিত সকল সদস্যের বকেয়ার পরিমাণ এবং আদায়ের পুঞ্জীভূত অনুপাত নিচে প্রদর্শিত হচ্ছে। পেমেন্ট সংগ্রহ প্যানেলে গিয়ে যে কোনো সদস্যের রসিদ সংগ্রহ করুন।
                  </p>
                </div>
              </div>

              {/* DUES TABLE SHEET CONTAINER */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase font-bold text-[10px]">
                      <th className="p-4">মেম্বার কোড ও নাম</th>
                      <th className="p-4">মোবাইল</th>
                      <th className="p-4">শেয়ার সংখ্যা</th>
                      <th className="p-4">পুঞ্জীভূত দাবি</th>
                      <th className="p-4">মোট সংগৃহীত পেইড</th>
                      <th className="p-4">মোট বকেয়া কিস্তি</th>
                      <th className="p-4">স্ট্যাটাস</th>
                      <th className="p-4 text-right">নোটিশ / রিমাইন্ডার</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {members
                      .filter(m => reportMemberId === 'All' || m.id === Number(reportMemberId))
                      .map((m) => {
                        const expected = getExpectedContribUpToLimit(m);
                        const paid = getMemberTotalPaid(m.id);
                        const due = getMemberDue(m);
                        const percentPaid = expected > 0 ? Math.round((paid / expected) * 100) : 100;
                        
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4">
                              <div>
                                <p className="font-extrabold text-slate-800">{m.name}</p>
                                <p className="text-[10px] text-emerald-800 font-mono font-bold">ভভ-{m.id}</p>
                              </div>
                            </td>
                            <td className="p-4 font-mono">{m.mobile}</td>
                            <td className="p-4 font-bold">{m.shareCount} শেয়ার</td>
                            <td className="p-4 font-mono text-slate-500">{expected.toLocaleString()} ৳</td>
                            <td className="p-4 font-mono text-emerald-800 font-bold">{paid.toLocaleString()} ৳</td>
                            <td className="p-4">
                              <span className={`font-mono font-bold ${due > 0 ? 'text-red-650 text-red-600 font-extrabold text-sm' : 'text-slate-550 text-slate-400'}`}>
                                {due > 0 ? `${due.toLocaleString()} ৳` : 'পরিশোধিত'}
                              </span>
                            </td>
                            <td className="p-4">
                              {due === 0 ? (
                                <span className="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  <span>ক্লিয়ার</span>
                                </span>
                              ) : (
                                <span className="bg-red-50 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />
                                  <span>বকেয়া রয়েছে</span>
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleGenerateShare(m)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] transition duration-150 inline-flex items-center gap-1"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>নোটিশ পাঠান</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* GOAL PROGRESS & COW FUND VISUALS TAB */}
        {activeTab === 'progress' && (
          <div id="tab_progress_content" className="space-y-6">
            
            {/* Dynamic Goal target details */}
            <div className="bg-white p-6 rounded-2xl border border-emerald-100/60 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-2">সমিতির বার্ষিক লক্ষ্যমাত্রাঃ গরু ক্রয় ফান্ড</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                ভাই ভাই সমিতির সম্মানিত সদস্যদের মোট শেয়ারের বিপরীতে গরু ক্রয়ের জন্য ১০ মাসের সঞ্চয় সংগ্রহ কার্যক্রম এটি। প্রতিটি শেয়ারের মাসিক কিস্তির পরিমাণ ৬০০ টাকা। ১০ মাসের লক্ষ্যের ওপর ভিত্তি করে নিচের হিসাব সাজানো হয়েছে।
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500">মোট শেয়ার সংখ্যা</p>
                  <p className="text-xl font-mono font-black text-slate-900 mt-1">{totalShares} টি</p>
                </div>
                <div className="p-4.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500">মাসিক কিস্তি লক্ষ্য</p>
                  <p className="text-xl font-mono font-black text-emerald-800 mt-1">{(totalShares * 600).toLocaleString()} ৳</p>
                </div>
                <div className="p-4.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500">১০ মাসের ফান্ড লক্ষ্যমাত্রা</p>
                  <p className="text-xl font-mono font-black text-emerald-900 mt-1">{cowFundTarget.toLocaleString()} ৳</p>
                </div>
                <div className="p-4.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500">মোট পুঞ্জীভূত আদায়</p>
                  <p className="text-xl font-mono font-black text-emerald-950 mt-1">{totalCollectionSum.toLocaleString()} ৳</p>
                </div>
              </div>

              {/* Progress visual chart illustration */}
              <div className="border border-emerald-100 rounded-xl p-6.5 bg-gradient-to-br from-emerald-50/30 to-white">
                <div className="text-center max-w-md mx-auto space-y-4">
                  <p className="text-[11px] uppercase font-bold tracking-widest text-[#d97706]">FUNDING METRIC STATUS</p>
                  <h4 className="text-2xl font-black text-emerald-950">{cowFundProgressPercent}% লক্ষ্য অর্জিত হয়েছে</h4>
                  
                  <div className="relative pt-2">
                    <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-500" style={{ width: `${cowFundProgressPercent}%` }}></div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {totalCollectionSum >= cowFundTarget 
                      ? "🎉 অভিনন্দন! ভাই ভাই সমিতি সফলভাবে গরুর জন্য বরাদ্দকৃত সঞ্চয় লক্ষ্যমাত্রা অতিক্রম করেছে।"
                      : `একটি পুষ্টিকর গরু ক্রয়ের লক্ষ্য পূরণে আরও ${Math.max(0, cowFundTarget - totalCollectionSum).toLocaleString()} টাকা সঞ্চয় সংগ্রহ করা আবশ্যক।`}
                  </p>
                </div>
              </div>
            </div>

            {/* MONTH SEQUENCE CHECKLIST PROGRESS CHART */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4">মাসিক সংগৃহীত আদায়ের চিত্র (মে ২০২৬ - এপ্রিল ২০২৭)</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {MONTH_SEQUENCE.map((m, idx) => {
                  const mPayments = payments.filter(p => p.month === m);
                  const mPaidSum = mPayments.reduce((sum, p) => sum + p.amount, 0);
                  const mExpected = totalShares * 600;
                  const mPercent = mExpected > 0 ? Math.min(100, Math.round((mPaidSum / mExpected) * 100)) : 0;
                  const isCurrent = idx === activeMonthLimit;

                  return (
                    <div 
                      key={m} 
                      className={`p-3.5 rounded-xl border text-center relative overflow-hidden transition duration-150 ${isCurrent ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-100'}`}
                    >
                      {isCurrent && (
                        <span className="absolute top-0 right-0 bg-emerald-600 text-[8px] text-white font-bold px-1 rounded-bl">সক্রিয় মাস</span>
                      )}
                      <p className="text-[11px] font-bold text-slate-700">{MONTH_NAMES_BN[m] || m}</p>
                      <div className="my-2 text-xs font-mono">
                        <span className="font-extrabold text-emerald-850 font-mono text-emerald-800">{mPaidSum.toLocaleString()} ৳</span>
                        <span className="text-[10px] text-slate-400 block font-normal">সম্ভাবনা: {mExpected.toLocaleString()}</span>
                      </div>
                      
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1 mx-auto max-w-[80%]">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${mPercent}%` }}></div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold font-mono block mt-1">{mPercent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FIXED GLASS BOTTOM BAR FOR PORTABLE NAVIGATION (Only shown on mobile interfaces) */}
      <nav id="glass_bottom_navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-emerald-950/95 backdrop-blur-md border-t border-emerald-800/80 p-2.5 flex items-center justify-around z-40 text-emerald-300">
        
        <button 
          id="btn_nav_dash_mobile"
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center gap-0.5 text-[10px] transition-all py-1 px-3.5 rounded-xl ${activeTab === 'dashboard' ? 'text-white bg-emerald-880 bg-emerald-800 font-bold' : 'opacity-80'}`}
        >
          <Home className="w-[18px] h-[18px]" />
          <span>🏠 হোম</span>
        </button>

        <button 
          id="btn_nav_members_mobile"
          onClick={() => setActiveTab('members')} 
          className={`flex flex-col items-center gap-0.5 text-[10px] transition-all py-1 px-2.5 rounded-xl ${activeTab === 'members' ? 'text-white bg-emerald-880 bg-emerald-800 font-bold' : 'opacity-80'}`}
        >
          <Users className="w-[18px] h-[18px]" />
          <span>👥 সদস্য</span>
        </button>

        <button 
          id="btn_nav_payments_mobile"
          onClick={() => setActiveTab('payments')} 
          className={`flex flex-col items-center gap-0.5 text-[10px] transition-all py-1 px-2.5 rounded-xl ${activeTab === 'payments' ? 'text-white bg-emerald-880 bg-emerald-800 font-bold' : 'opacity-80'}`}
        >
          <Clock className="w-[18px] h-[18px]" />
          <span>💰 কিস্তি</span>
        </button>

        <button 
          id="btn_nav_reports_mobile"
          onClick={() => setActiveTab('reports')} 
          className={`flex flex-col items-center gap-0.5 text-[10px] transition-all py-1 px-2.5 rounded-xl ${activeTab === 'reports' ? 'text-white bg-emerald-880 bg-emerald-800 font-bold' : 'opacity-80'}`}
        >
          <Receipt className="w-[18px] h-[18px]" />
          <span>📋 রিপোর্ট</span>
        </button>

        <button 
          id="btn_nav_progress_mobile"
          onClick={() => setActiveTab('progress')} 
          className={`flex flex-col items-center gap-0.5 text-[10px] transition-all py-1 px-2.5 rounded-xl ${activeTab === 'progress' ? 'text-white bg-emerald-880 bg-emerald-800 font-bold' : 'opacity-80'}`}
        >
          <TrendingUp className="w-[18px] h-[18px]" />
          <span>📈 লক্ষ্য</span>
        </button>

      </nav>

      {/* ========================================================= */}
      {/* 🔐 PASSWORD CONFIRMATION DIALOG (Master key modal safeguard) */}
      {pwdModal && (
        <div id="modal_password_check" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-emerald-100 animate-zoom-in">
            <div className="flex items-center gap-3 text-emerald-800 mb-4">
              <span className="p-2.5 bg-emerald-50 rounded-xl">
                <Lock className="w-5 h-5 text-emerald-750" />
              </span>
              <div>
                <h4 className="font-extrabold text-slate-800">ক্যাশিয়ার পাসওয়ার্ড যাচাইকরণ</h4>
                <p className="text-[10px] text-slate-400">এই অ্যাকশনটি সম্পাদন করতে পাসওয়ার্ড দিন</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 bg-emerald-50/50 p-2.5 rounded border border-emerald-100/40 font-medium">
              🔑 {pwdModal.title}
            </p>

            <div className="space-y-3">
              <input 
                type="password" 
                placeholder="মাস্টার পাসওয়ার্ড দিন (যেমন: 972980)" 
                value={pwdModal.inputValue}
                onChange={(e) => setPwdModal({ ...pwdModal, inputValue: e.target.value, errorMessage: '' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePasswordSubmit();
                }}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-center text-sm font-mono tracking-widest focus:border-emerald-500 focus:outline-none"
                autoFocus
              />

              {pwdModal.errorMessage && (
                <p className="text-[11px] text-red-600 font-semibold bg-red-50 p-1.5 rounded text-center animate-shake">
                  ❌ {pwdModal.errorMessage}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <button 
                  onClick={() => setPwdModal(null)}
                  className="py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold"
                >
                  বাতিল করুন
                </button>
                <button 
                  onClick={handlePasswordSubmit}
                  className="py-2 bg-emerald-750 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold"
                >
                  অনুমোদন দিন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 👥 MEMBER FORM DIALOG (Add / Edit member metadata) */}
      {memberForm && (
        <div id="modal_member_form" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 my-8">
            <h4 className="font-extrabold text-slate-850 text-md border-b pb-3 mb-4 text-emerald-850 tracking-tight">
              {members.some(m => m.id === memberForm.id) ? 'সদস্যের তথ্য সংশোধন করুন' : 'নতুন সদস্য নিবন্ধন করুন'}
            </h4>

            <form onSubmit={handleMemberFormSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-bold">Auto মেম্বার আইডি</label>
                  <input 
                    type="number" 
                    value={memberForm.id || ''}
                    disabled
                    className="w-full p-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-bold">শেয়ার সংখ্যা</label>
                  <select 
                    value={memberForm.shareCount}
                    onChange={(e) => setMemberForm({ ...memberForm, shareCount: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold font-mono"
                  >
                    <option value="1">১ শেয়ার (৬০০ ৳/মাস)</option>
                    <option value="2">২ শেয়ার (১২০০ ৳/মাস)</option>
                    <option value="3">৩ শেয়ার (১৮০০ ৳/মাস)</option>
                    <option value="5">৫ শেয়ার (৩০০০ ৳/মাস)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-bold">সদস্যের সম্পূর্ণ নাম</label>
                <input 
                  type="text" 
                  placeholder="যেমন: মো: রহিম হোসেন" 
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-bold">মোবাইল নম্বর</label>
                <input 
                  type="tel" 
                  placeholder="যেমন: 017XXXXXXXX" 
                  value={memberForm.mobile}
                  onChange={(e) => setMemberForm({ ...memberForm, mobile: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-bold">যোগদানের তারিখ</label>
                <input 
                  type="date" 
                  value={memberForm.joinDate}
                  onChange={(e) => setMemberForm({ ...memberForm, joinDate: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-700"
                  required
                />
              </div>

              {/* Base64 member photo upload opt to cache */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-bold">মেম্বার ছবি (ঐচ্ছিক)</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                    {memberForm.photoUrl ? (
                      <img src={memberForm.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    className="py-1.5 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-[10px]"
                  >
                    আপলোড করুন
                  </button>
                  {memberForm.photoUrl && (
                    <button 
                      type="button" 
                      onClick={() => setMemberForm({ ...memberForm, photoUrl: undefined })}
                      className="text-[10px] text-red-600 hover:underline"
                    >
                      রিমুভ
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                <button 
                  type="button"
                  onClick={() => setMemberForm(null)}
                  className="py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="py-2.5 bg-emerald-750 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow"
                >
                  সংরক্ষণ করুন
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 💰 PAYMENT FORM DIALOG (Record payment checkpoint) */}
      {paymentForm && (
        <div id="modal_payment_form" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 my-8">
            <h4 className="font-extrabold text-slate-850 text-md border-b pb-3 mb-4 text-emerald-850 tracking-tight">
              {paymentForm.id ? 'কিস্তির রেকর্ড সংশোধন করুন' : 'নতুন কিস্তি পরিশোধের তথ্য সংগ্রহ'}
            </h4>

            <form onSubmit={handlePaymentFormSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-bold">পরিশোধকারী সদস্যের তালিকা</label>
                <select 
                  value={paymentForm.memberId} 
                  onChange={(e) => handlePaymentMemberChange(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-705 font-bold"
                  required
                >
                  <option value="">সদস্য নির্বাচন করুন...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (শেয়ারঃ {m.shareCount} টি)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-bold">টাকার পরিমাণ (BDT)</label>
                  <input 
                    type="number" 
                    placeholder="600" 
                    value={paymentForm.amount || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold font-mono text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">১ শেয়ার কিস্তি = ৬০০ টাকা</p>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-bold">উদ্দিষ্ট কিস্তির মাস</label>
                  <select 
                    value={paymentForm.month}
                    onChange={(e) => setPaymentForm({ ...paymentForm, month: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold"
                  >
                    {MONTH_SEQUENCE.map(m => (
                      <option key={m} value={m}>{MONTH_NAMES_BN[m] || m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-bold">পরিশোধের তারিখ</label>
                  <input 
                    type="date" 
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-bold">পেমেন্ট মেমো নোট</label>
                  <input 
                    type="text" 
                    placeholder="যেমন: অফলাইনে বা বিকাশ পরিশোধ" 
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-700"
                  />
                </div>
              </div>

              {/* Payment Receipt screenshot base64 option */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-bold">পেমেন্ট স্ক্রিনশট আপলোড (বিকাশ রসিদ)</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-10 rounded border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                    {paymentForm.screenshotUrl ? (
                      <img src={paymentForm.screenshotUrl} alt="Receipt Screenshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={payScreenshotRef}
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (payScreenshotRef.current) payScreenshotRef.current.click();
                    }}
                    className="py-1.5 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-[10px]"
                  >
                    স্ক্রিনশট নির্বাচন করুন
                  </button>
                  {paymentForm.screenshotUrl && (
                    <button 
                      type="button" 
                      onClick={() => setPaymentForm({ ...paymentForm, screenshotUrl: undefined })}
                      className="text-[10px] text-red-650 hover:underline text-red-600"
                    >
                      রিমুভ
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                <button 
                  type="button"
                  onClick={() => setPaymentForm(null)}
                  className="py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold"
                >
                  বাতিল করুন
                </button>
                <button 
                  type="submit"
                  className="py-2.5 bg-emerald-750 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow"
                >
                  কিস্তি রসিদ সহ সংরক্ষণ করুন
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📄 PRINTABLE RECEIPT MEMO SCREEN (SOCIETY FORMAL MEMOURANDUM) */}
      {selectedReceipt && (
        <div id="modal_receipt_memo" className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-emerald-100 my-8">
            
            {/* Action controls headers */}
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">ভাই ভাই সমিতি কিস্তি পেমেন্ট মেমো</span>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => window.print()}
                  className="p-1 px-3 bg-emerald-750 bg-emerald-750 hover:bg-emerald-800 text-white rounded text-[10px] font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট মেমো</span>
                </button>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1 px-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded text-[10px]"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>

            {/* PRINTABLE AREA EMBED (Styled for direct printer compatibility) */}
            <div id="print_area" className="border border-double border-emerald-800/60 p-6 rounded-xl bg-gradient-to-tr from-emerald-50/20 via-white to-white select-text">
              
              {/* Receipt Header Banner logo */}
              <div className="flex justify-between items-start border-b border-emerald-850 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-11 h-11 rounded-full bg-emerald-950 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="w-7 h-7 text-emerald-400 fill-current">
                      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="3" fill="none" />
                      <path d="M35,45 C35,60 65,60 65,45 C65,35 75,35 65,30 C60,35 40,35 35,30 C25,35 35,35 35,45 Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-emerald-950">ভাই ভাই সমিতি</h2>
                    <p className="text-[10px] text-emerald-800 font-semibold uppercase tracking-widest">কিস্তি পরিশোধ রশিদ পত্র</p>
                  </div>
                </div>
                <div className="text-right text-[11px] leading-relaxed text-slate-600">
                  <p className="font-bold text-slate-900">সভাপতিঃ জায়দুল হাসান</p>
                  <p className="font-mono text-[10px]">০১৬২৬৯৭২৯৮০</p>
                </div>
              </div>

              {/* Receipt code block and details */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div>
                  <p className="text-slate-500">রশিদ নং বা ট্রানজেকশন আইডিঃ</p>
                  <p className="font-mono font-bold text-emerald-950 text-sm mt-0.5">{selectedReceipt.receiptNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">পরিশোধের তারিখঃ</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedReceipt.paymentDate}</p>
                </div>
              </div>

              {/* Member particulars table */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs mb-4 text-slate-700 space-y-2.5">
                <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">সদস্যের নামঃ</span> <span className="font-bold text-slate-900">{members.find(m => m.id === selectedReceipt.memberId)?.name || 'অজ্ঞাত'}</span></div>
                <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">স্থায়ী মেম্বার কোডঃ</span> <span className="font-mono font-bold text-slate-900">ভভ-{selectedReceipt.memberId}</span></div>
                <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">শেয়ার সংখ্যাঃ</span> <span className="font-bold text-slate-905 text-slate-900">{members.find(m => m.id === selectedReceipt.memberId)?.shareCount || 1} শেয়ার</span></div>
                <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">উদ্দিষ্ট কিস্তির মাসঃ</span> <span className="font-bold text-emerald-950">{MONTH_NAMES_BN[selectedReceipt.month] || selectedReceipt.month}</span></div>
                <div className="flex justify-between text-slate-800 font-bold bg-slate-200/50 p-2 rounded"><span className="text-slate-600">পরিশোধিত টাকার পরিমাণঃ</span> <span className="text-emerald-900 font-black text-sm font-mono">{selectedReceipt.amount.toLocaleString()} BDT</span></div>
              </div>

              {/* Verified mark details */}
              <div className="flex justify-between items-center text-[10px] mt-6 text-slate-500 pt-3 border-t border-dashed">
                <div>
                  <p>নোট: {selectedReceipt.note || 'সফল কিস্তি জমা।'}</p>
                  <p className="text-[9px] text-slate-400 font-mono">Bhai Bhai Cooperative Society - Auto Ledger Verified</p>
                </div>
                <div className="text-center font-bold">
                  <span className="block border-b border-slate-300 w-24 mx-auto mb-1"></span>
                  <p className="text-[10px] text-slate-800 font-semibold">সভাপতির স্বাক্ষর</p>
                </div>
              </div>

            </div>

            {/* Optional screenshot visual within receipt block */}
            {selectedReceipt.screenshotUrl && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-500 font-bold mb-1.5">সংযুক্ত স্ক্রিনশট রসিদঃ</p>
                <div className="max-h-48 overflow-y-auto rounded shadow-inner border border-slate-200">
                  <img src={selectedReceipt.screenshotUrl} alt="Screenshot attachment" className="w-full object-contain" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🔍 SCREENSHOT ZOOM PREVIEW MODAL */}
      {screenshotPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={() => setScreenshotPreview(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-xl w-full shadow-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setScreenshotPreview(null)}
              className="absolute top-2 right-2 bg-slate-150 bg-slate-100 text-slate-600 p-1.5 rounded-full font-bold hover:bg-slate-200"
            >
              ✕
            </button>
            <h4 className="text-xs text-slate-500 mb-2 font-bold font-mono">কিস্তি পরিশোধ স্ক্রিনশট ভিউ</h4>
            <div className="max-h-[80vh] overflow-y-auto rounded-lg">
              <img src={screenshotPreview} alt="Screenshot enlarged" className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📋 MESSENGER / SMS TEMPLATE SHARE SHEET */}
      {shareConfig && (
        <div id="modal_share_generator" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h4 className="font-extrabold text-slate-800 text-md border-b pb-3 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-700" />
              <span>বকেয়া কিস্তির নোটিশ জেনারেটর</span>
            </h4>

            <div className="space-y-4 text-xs leading-relaxed text-slate-700">
              
              <div className="bg-slate-50 p-3 rounded-lg text-slate-600 space-y-1">
                <p><b>সদস্যের নামঃ</b> {shareConfig.member.name}</p>
                <p><b>আইডি নংঃ</b> ভভ-{shareConfig.member.id}</p>
                <p><b>শেয়ার সংখ্যাঃ</b> {shareConfig.member.shareCount} টি</p>
                <p><b>মোট বকেয়ার পরিমাণঃ</b> <span className="text-red-650 font-bold text-red-600">{shareConfig.dueAmount.toLocaleString()} ৳</span></p>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1.5 font-bold">নোটিশের বিবরণ কপি করুনঃ</label>
                <textarea 
                  className="w-full h-28 p-2 text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={shareConfig.smsBody}
                  readOnly
                  onClick={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    el.select();
                    document.execCommand('copy');
                    alert("নোটিশ কপি করা হয়েছে!");
                  }}
                />
                <p className="text-[10px] text-slate-400 mt-1">টেক্সটবক্সে ক্লিক করলে স্বয়ংক্রিয়ভাবে কপি হয়ে যাবে।</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center font-bold">
                <a 
                  href={shareConfig.whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>হোয়াটসঅ্যাপে পাঠান</span>
                </a>
                <a 
                  href={`sms:${shareConfig.member.mobile}?body=${encodeURIComponent(shareConfig.smsBody)}`}
                  className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>এসএমএস (SMS)</span>
                </a>
              </div>

              <button 
                onClick={() => setShareConfig(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-center font-bold rounded-lg mt-1"
              >
                বন্ধ করুন
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
