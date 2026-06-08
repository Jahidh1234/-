// Bhai Bhai Cooperative Society Standalone vanilla application logic
// Master password safeguard: 972980

const MONTH_SEQUENCE = [
  "May 2026", "June 2026", "July 2026", "August 2026", "September 2026",
  "October 2026", "November 2026", "December 2026", "January 2027",
  "February 2027", "March 2027", "April 2027"
];

const MONTH_NAMES_BN = {
  "May 2026": "মে ২০২৬", "June 2026": "জুন ২০২৬", "July 2026": "জুলাই ২০২৬",
  "August 2026": "আগস্ট ২০২৬", "September 2026": "সেপ্টেম্বর ২০২৬",
  "October 2026": "অক্টোবর ২০২৬", "November 2026": "নভেম্বর ২০২৬",
  "December 2026": "ডিসেম্বর ২০২৬", "January 2027": "জানুয়ারি ২০২৭",
  "February 2027": "ফেব্রুয়ারি ২০২৭", "March 2027": "মার্চ ২০২৭",
  "April 2027": "এপ্রিল ২০২৭"
};

// Initial Sample Datasets
const SAMPLE_MEMBERS = [
  { id: 101, name: "জায়দুল হাসান (সভাপতি)", mobile: "01626972980", joinDate: "2026-05-01", shareCount: 2 },
  { id: 102, name: "মো: রহিম আলী", mobile: "01712345678", joinDate: "2026-05-02", shareCount: 1 },
  { id: 103, name: "মো: করিম উদ্দিন", mobile: "01812345678", joinDate: "2026-05-04", shareCount: 3 },
  { id: 104, name: "মো: জামাল হোসেন", mobile: "01912345678", joinDate: "2026-05-05", shareCount: 5 },
  { id: 105, name: "সোহেল রানা", mobile: "01512345678", joinDate: "2026-05-10", shareCount: 1 }
];

const SAMPLE_PAYMENTS = [
  { id: "pay_1", receiptNumber: "R-1001", memberId: 101, amount: 1200, month: "May 2026", paymentDate: "2026-05-15", note: "বিকাশে প্রাপ্ত" },
  { id: "pay_2", receiptNumber: "R-1002", memberId: 101, amount: 1200, month: "June 2026", paymentDate: "2026-06-05", note: "অফিস কাউন্টার" },
  { id: "pay_3", receiptNumber: "R-1003", memberId: 102, amount: 600, month: "May 2026", paymentDate: "2026-05-16", note: "বিকাশ পেমেন্ট" },
  { id: "pay_4", receiptNumber: "R-1004", memberId: 103, amount: 1800, month: "May 2026", paymentDate: "2026-05-18", note: "নগদ পরিশোধ" },
  { id: "pay_5", receiptNumber: "R-1005", memberId: 104, amount: 3000, month: "May 2026", paymentDate: "2026-05-20", note: "বিকাশে প্রাপ্ত" }
];

// App States
let members = [];
let payments = [];
let activeMonthLimit = 2; // Default up to July 2026 index 2
let pendingSecureAction = null;

// Initialize app data from local state of browser
function initApp() {
  const localM = localStorage.getItem('vvs_members_v');
  const localP = localStorage.getItem('vvs_payments_v');

  if (localM && localP) {
    try {
      members = JSON.parse(localM);
      payments = JSON.parse(localP);
    } catch (e) {
      console.warn("Local storage rebuild.");
    }
  }

  if (members.length === 0) {
    members = [...SAMPLE_MEMBERS];
    payments = [...SAMPLE_PAYMENTS];
    saveState();
  }

  populateActiveMonthDropdown();
  populateFormDropdowns();
  updateCalculations();
  renderAllTabs();
}

function saveState() {
  localStorage.setItem('vvs_members_v', JSON.stringify(members));
  localStorage.setItem('vvs_payments_v', JSON.stringify(payments));
  updateCalculations();
}

// Calculations core formulas
function getMemberTotalPaid(memberId) {
  return payments
    .filter(p => p.memberId === Number(memberId))
    .reduce((sum, p) => sum + p.amount, 0);
}

function getExpectedContribUpToLimit(member) {
  const monthsMultiplier = activeMonthLimit + 1;
  return member.shareCount * 600 * monthsMultiplier;
}

function getMemberDue(member) {
  const expected = getExpectedContribUpToLimit(member);
  const paid = getMemberTotalPaid(member.id);
  const due = expected - paid;
  return due > 0 ? due : 0;
}

// Safe action trigger requiring master key
function requestActionValidation(title, callback) {
  document.getElementById('password-modal-title').textContent = title;
  document.getElementById('password-input').value = '';
  document.getElementById('password-error-msg').classList.add('hidden');
  document.getElementById('passwordModal').classList.remove('hidden');
  document.getElementById('passwordModal').classList.add('flex');
  pendingSecureAction = callback;
}

function closePasswordModal() {
  document.getElementById('passwordModal').classList.remove('flex');
  document.getElementById('passwordModal').classList.add('hidden');
  pendingSecureAction = null;
}

function submitPasswordModal() {
  const val = document.getElementById('password-input').value;
  if (val === '972980') {
    if (pendingSecureAction) {
      pendingSecureAction();
    }
    closePasswordModal();
  } else {
    document.getElementById('password-error-msg').classList.remove('hidden');
  }
}

// Tab Switching Routing Function
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  // Highlights Desktop Tabs
  const allTabs = ['dash', 'members', 'payments', 'reports', 'progress'];
  allTabs.forEach(t => {
    const desktopBtn = document.getElementById(`btn-${t}-desktop`);
    const mobileBtn = document.getElementById(`btn-${t}-mobile`);
    if (desktopBtn) {
      if (t === tabId || (t === 'dash' && tabId === 'dashboard')) {
        desktopBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition bg-emerald-700 text-white shadow-md";
      } else {
        desktopBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition text-emerald-100 hover:bg-emerald-800";
      }
    }
    if (mobileBtn) {
      if (t === tabId || (t === 'dash' && tabId === 'dashboard')) {
        mobileBtn.className = "flex flex-col items-center gap-0.5 text-[10px] transition py-1 px-3.5 rounded-xl text-white bg-emerald-800 font-bold";
      } else {
        mobileBtn.className = "flex flex-col items-center gap-0.5 text-[10px] transition py-1 px-3 rounded-xl opacity-80";
      }
    }
  });
}

function populateActiveMonthDropdown() {
  const container = document.getElementById('config-active-month');
  container.innerHTML = '';
  MONTH_SEQUENCE.forEach((m, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${MONTH_NAMES_BN[m]} (${m})`;
    if (idx === activeMonthLimit) opt.selected = true;
    container.appendChild(opt);
  });

  container.onchange = (e) => {
    activeMonthLimit = Number(e.target.value);
    saveState();
    renderAllTabs();
  };
}

function updateCalculations() {
  const totalShares = members.reduce((sum, m) => sum + m.shareCount, 0);
  const totalActiveMembers = members.length;
  const totalMonthlyExpectedCollection = totalShares * 600;
  const totalCollectionSum = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDueSum = members.reduce((sum, m) => sum + getMemberDue(m), 0);

  // Target Config
  const cowFundTarget = totalShares * 600 * 10;
  const cowFundProgressPercent = cowFundTarget > 0 ? Math.min(100, Math.round((totalCollectionSum / cowFundTarget) * 100)) : 0;

  // Render on Dashboard UI metrics
  document.getElementById('mission-member-count').textContent = totalActiveMembers;
  document.getElementById('mission-total-saving').textContent = totalCollectionSum.toLocaleString();

  document.getElementById('stat-active-members-count').textContent = `${totalActiveMembers} জন`;
  document.getElementById('stat-total-shares-count').textContent = `${totalShares} টি`;
  document.getElementById('stat-monthly-expected').textContent = `${totalMonthlyExpectedCollection.toLocaleString()} ৳`;
  document.getElementById('stat-total-collected').textContent = `${totalCollectionSum.toLocaleString()} ৳`;
  document.getElementById('stat-total-due').textContent = `${totalDueSum.toLocaleString()} ৳`;

  // Cow progress UI updates
  document.getElementById('cow-target-txt').textContent = `${cowFundTarget.toLocaleString()} ৳`;
  document.getElementById('cow-progress-badge').textContent = `${cowFundProgressPercent}%`;
  document.getElementById('cow-progress-bar').style.width = `${cowFundProgressPercent}%`;
  document.getElementById('cow-progress-collected').textContent = `${totalCollectionSum.toLocaleString()} ৳`;
  document.getElementById('cow-progress-remaining').textContent = `${Math.max(0, cowFundTarget - totalCollectionSum).toLocaleString()} ৳`;

  // Micro statistics metrics
  const totalRatioDenominator = totalCollectionSum + totalDueSum || 1;
  const pctColl = Math.round((totalCollectionSum / totalRatioDenominator) * 100);
  const pctDue = Math.round((totalDueSum / totalRatioDenominator) * 100);

  document.getElementById('badge-percent-collected').textContent = `${pctColl}%`;
  document.getElementById('badge-percent-due').textContent = `${pctDue}%`;
  document.getElementById('bar-percent-collected').style.width = `${pctColl}%`;
  document.getElementById('bar-percent-due').style.width = `${pctDue}%`;

  // Timeline target cards UI
  document.getElementById('txt-avg-saving-share').textContent = `${totalShares > 0 ? Math.round(totalCollectionSum / totalShares).toLocaleString() : 0} ৳`;
  document.getElementById('txt-active-months-count').textContent = `${activeMonthLimit + 1} মাস`;
  document.getElementById('txt-annual-estimated').textContent = `${(totalShares * 600 * 12).toLocaleString()} ৳`;

  document.getElementById('prog-total-shares').textContent = `${totalShares} টি`;
  document.getElementById('prog-monthly-collection').textContent = `${totalMonthlyExpectedCollection.toLocaleString()} ৳`;
  document.getElementById('prog-target-cow').textContent = `${cowFundTarget.toLocaleString()} ৳`;
  document.getElementById('prog-collected-cow').textContent = `${totalCollectionSum.toLocaleString()} ৳`;
}

function populateFormDropdowns() {
  // Members select dropdown in payment form
  const memSelect = document.getElementById('form-payment-member');
  memSelect.innerHTML = '<option value="">সদস্য নির্বাচন করুন...</option>';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (শেয়ারঃ ${m.shareCount} টি)`;
    memSelect.appendChild(opt);
  });

  // Month select in payment form
  const monthSelect = document.getElementById('form-payment-month');
  monthSelect.innerHTML = '';
  MONTH_SEQUENCE.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = MONTH_NAMES_BN[m] || m;
    monthSelect.appendChild(opt);
  });
}

// Auto Populate Fee per share
function autoPopulatePaymentAmount() {
  const mId = Number(document.getElementById('form-payment-member').value);
  const m = members.find(mem => mem.id === mId);
  if (m) {
    document.getElementById('form-payment-amount').value = m.shareCount * 600;
  }
}

// MEMBER CRUD OPERATIONS
function openMemberModal(member = null) {
  const isEdit = !!member;
  document.getElementById('member-modal-header').textContent = isEdit ? 'সদস্যের তথ্য সংশোধন করুন' : 'নতুন সদস্য নিবন্ধন করুন';
  
  const idValue = isEdit ? member.id : (members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 101);
  document.getElementById('form-member-id').value = idValue;
  document.getElementById('form-member-id-display').value = idValue;
  document.getElementById('form-member-shares').value = isEdit ? member.shareCount : 1;
  document.getElementById('form-member-name').value = isEdit ? member.name : '';
  document.getElementById('form-member-mobile').value = isEdit ? member.mobile : '';
  document.getElementById('form-member-date').value = isEdit ? member.joinDate : new Date().toISOString().split('T')[0];
  document.getElementById('form-member-photo').value = isEdit ? (member.photoUrl || '') : '';

  document.getElementById('memberModal').classList.remove('hidden');
  document.getElementById('memberModal').classList.add('flex');
}

function closeMemberModal() {
  document.getElementById('memberModal').classList.remove('flex');
  document.getElementById('memberModal').classList.add('hidden');
}

function submitMemberForm(e) {
  e.preventDefault();
  const idStr = document.getElementById('form-member-id').value;
  const nameVal = document.getElementById('form-member-name').value;
  const mobileVal = document.getElementById('form-member-mobile').value;
  const dateVal = document.getElementById('form-member-date').value;
  const shareVal = Number(document.getElementById('form-member-shares').value);
  const photoVal = document.getElementById('form-member-photo').value;

  requestActionValidation("সদস্য তথ্য সংরক্ষণ করতে পাসওয়ার্ড দিন", () => {
    const existingIdx = members.findIndex(m => m.id === Number(idStr));
    const newM = {
      id: Number(idStr),
      name: nameVal,
      mobile: mobileVal,
      joinDate: dateVal,
      shareCount: shareVal,
      photoUrl: photoVal || undefined
    };

    if (existingIdx > -1) {
      members[existingIdx] = newM;
    } else {
      members.push(newM);
    }

    saveState();
    closeMemberModal();
    populateFormDropdowns();
    renderAllTabs();
  });
}

function deleteMember(id) {
  requestActionValidation("সদস্য ডিলিট করতে পাসওয়ার্ড দিন", () => {
    members = members.filter(m => m.id !== Number(id));
    payments = payments.filter(p => p.memberId !== Number(id));
    saveState();
    populateFormDropdowns();
    renderAllTabs();
  });
}

// PAYMENT CRUD OPERATIONS
function openPaymentModal(payment = null) {
  const isEdit = !!payment;
  document.getElementById('payment-modal-header').textContent = isEdit ? 'কিস্তির রেকর্ড সংশোধন' : 'কিস্তি পরিশোধ সংগ্রহ';
  document.getElementById('form-payment-id').value = isEdit ? payment.id : '';
  document.getElementById('form-payment-member').value = isEdit ? payment.memberId : '';
  document.getElementById('form-payment-amount').value = isEdit ? payment.amount : '';
  document.getElementById('form-payment-month').value = isEdit ? payment.month : MONTH_SEQUENCE[Math.min(activeMonthLimit, MONTH_SEQUENCE.length - 1)];
  document.getElementById('form-payment-date').value = isEdit ? payment.paymentDate : new Date().toISOString().split('T')[0];
  document.getElementById('form-payment-note').value = isEdit ? payment.note : 'বিকাশ পেমেন্ট';
  document.getElementById('form-payment-screenshot').value = isEdit ? (payment.screenshotUrl || '') : '';

  document.getElementById('paymentModal').classList.remove('hidden');
  document.getElementById('paymentModal').classList.add('flex');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('flex');
  document.getElementById('paymentModal').classList.add('hidden');
}

function submitPaymentForm(e) {
  e.preventDefault();
  const idStr = document.getElementById('form-payment-id').value;
  const memberIdVal = Number(document.getElementById('form-payment-member').value);
  const amountVal = Number(document.getElementById('form-payment-amount').value);
  const monthVal = document.getElementById('form-payment-month').value;
  const dateVal = document.getElementById('form-payment-date').value;
  const noteVal = document.getElementById('form-payment-note').value;
  const ssVal = document.getElementById('form-payment-screenshot').value;

  requestActionValidation("কিস্তি পেমেন্ট সংরক্ষণ করতে পাসওয়ার্ড দিন", () => {
    const isEdit = !!idStr;
    const finalId = isEdit ? idStr : `pay_${Date.now()}`;
    const genReceiptNum = isEdit ? payments.find(p => p.id === idStr).receiptNumber : `R-${1000 + payments.length + 1}`;

    const newP = {
      id: finalId,
      receiptNumber: genReceiptNum,
      memberId: memberIdVal,
      amount: amountVal,
      month: monthVal,
      paymentDate: dateVal,
      note: noteVal,
      screenshotUrl: ssVal || undefined
    };

    if (isEdit) {
      const idx = payments.findIndex(p => p.id === idStr);
      if (idx > -1) payments[idx] = newP;
    } else {
      payments.push(newP);
    }

    saveState();
    closePaymentModal();
    renderAllTabs();
    openReceiptModal(newP); // Auto print memo view
  });
}

function deletePayment(id) {
  requestActionValidation("কিস্তির রেকর্ড ডিলিট করতে পাসওয়ার্ড দিন", () => {
    payments = payments.filter(p => p.id !== id);
    saveState();
    renderAllTabs();
  });
}

// RECEIPT SYSTEM POPUP MEMO
function openReceiptModal(p) {
  const m = members.find(mem => mem.id === p.memberId);
  document.getElementById('receipt-id').textContent = p.receiptNumber;
  document.getElementById('receipt-date').textContent = p.paymentDate;
  document.getElementById('receipt-member-name').textContent = m ? m.name : 'অজ্ঞাত';
  document.getElementById('receipt-member-id').textContent = `ভভ-${p.memberId}`;
  document.getElementById('receipt-shares').textContent = m ? `${m.shareCount} শেয়ার` : '-';
  document.getElementById('receipt-month').textContent = MONTH_NAMES_BN[p.month] || p.month;
  document.getElementById('receipt-amount').textContent = `${p.amount.toLocaleString()} BDT`;
  document.getElementById('receipt-note').textContent = `নোটঃ ${p.note || 'সফল কিস্তি জমা।'}`;

  document.getElementById('receiptModal').classList.remove('hidden');
  document.getElementById('receiptModal').classList.add('flex');
}

function closeReceiptModal() {
  document.getElementById('receiptModal').classList.remove('flex');
  document.getElementById('receiptModal').classList.add('hidden');
}

// SOCIAL REMINDER TEXT FORM DOCK
function openNoticeModal(member) {
  const memberDue = getMemberDue(member);
  const monthNameBn = MONTH_NAMES_BN[MONTH_SEQUENCE[activeMonthLimit]] || MONTH_SEQUENCE[activeMonthLimit];
  
  document.getElementById('notice-member-name').textContent = member.name;
  document.getElementById('notice-member-mobile').textContent = member.mobile;
  document.getElementById('notice-member-due').textContent = memberDue.toLocaleString();

  const rawSms = `প্রিয় সদস্য ${member.name},
আপনার ভাই ভাই সমিতি হিসাব নং-ভভ-${member.id} এর সম্মানিত (${member.shareCount}) শেয়ারের অনুকূলে '${monthNameBn}' মাসের কিস্তি ${member.shareCount * 600} টাকা এবং মোট বকেয়া ${memberDue} টাকা এখনও বাকি রয়েছে। অনুগ্রহ করে বিকাশ নম্বর 01976972980 এ দ্রুত পরিশোধপূর্বক স্ক্রিনশট পোর্টালে জমা দিন। ধন্যবাদ।`;

  document.getElementById('notice-text-area').value = rawSms;

  // links mapping
  const smsBody = encodeURIComponent(rawSms);
  document.getElementById('btn-whatsapp-notice').href = `https://api.whatsapp.com/send?phone=${member.mobile.startsWith('0') ? '88' + member.mobile : member.mobile}&text=${smsBody}`;
  document.getElementById('btn-sms-notice').href = `sms:${member.mobile}?body=${smsBody}`;

  document.getElementById('noticeModal').classList.remove('hidden');
  document.getElementById('noticeModal').classList.add('flex');
}

function closeNoticeModal() {
  document.getElementById('noticeModal').classList.remove('flex');
  document.getElementById('noticeModal').classList.add('hidden');
}

function copyNoticeText() {
  const el = document.getElementById('notice-text-area');
  el.select();
  document.execCommand('copy');
  alert("নোটিশ কপি করা হয়েছে!");
}

// EXCEL EXPORT SCRIPT
function exportToCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Member ID,Name,Mobile,Join Date,Shares,Total Paid (BDT),Dues (BDT)\r\n";
  members.forEach(m => {
    csvContent += `${m.id},"${m.name}",${m.mobile},${m.joinDate},${m.shareCount},${getMemberTotalPaid(m.id)},${getMemberDue(m)}\r\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `bhai-bhai-somiti-ledger-stand.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// RENDERING SYSTEM HTML INJECTIONS
function renderAllTabs() {
  renderHomePools();
  renderMembersList();
  renderPaymentsTable();
  renderReportsTable();
  renderProgressMonthsTimeline();
}

function renderHomePools() {
  // pool 1 first 5 members
  const first5 = [...members].sort((a,b) => a.id - b.id).slice(0, 5);
  const pool1 = document.getElementById('pool-first5');
  pool1.innerHTML = '';
  first5.forEach(m => {
    const div = document.createElement('div');
    div.className = "py-2 border-b flex justify-between items-center";
    div.innerHTML = `
      <div><p class="font-bold text-slate-800">${m.name}</p><p class="text-[10px] text-slate-400">আইডি: ভভ-${m.id}</p></div>
      <div class="text-right"><p class="text-emerald-700 font-bold">${m.shareCount} শেয়ার</p><p class="text-[9px] text-slate-400">মোবাইল: ${m.mobile}</p></div>
    `;
    pool1.appendChild(div);
  });

  // pool 2 recent 5 transactions
  const recent = [...payments]
    .sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);
  const pool2 = document.getElementById('pool-recent-payments');
  pool2.innerHTML = '';
  recent.forEach(p => {
    const m = members.find(mem => mem.id === p.memberId);
    const div = document.createElement('div');
    div.className = "py-2 border-b flex justify-between items-center";
    div.innerHTML = `
      <div><p class="font-bold text-slate-800">${m ? m.name : 'অজ্ঞাত'}</p><p class="text-[10px] text-slate-400">${MONTH_NAMES_BN[p.month] || p.month}</p></div>
      <div class="text-right"><p class="text-emerald-750 text-emerald-700 font-bold font-mono">+${p.amount} ৳</p><p class="text-[9px] text-slate-400 font-mono">${p.paymentDate}</p></div>
    `;
    pool2.appendChild(div);
  });

  // pool 3 due members
  const overdue = members
    .map(m => ({ member: m, due: getMemberDue(m) }))
    .filter(item => item.due > 0)
    .sort((a,b) => b.due - a.due)
    .slice(0, 5);
  const pool3 = document.getElementById('pool-due-members');
  pool3.innerHTML = '';
  overdue.forEach(item => {
    const div = document.createElement('div');
    div.className = "py-2 border-b flex justify-between items-center";
    div.innerHTML = `
      <div><p class="font-bold text-slate-800">${item.member.name}</p><p class="text-[10px] text-slate-400 font-mono">${item.member.mobile}</p></div>
      <div class="text-right">
        <p class="text-red-600 font-bold font-mono">${item.due} ৳</p>
        <button onclick='openNoticeModal(${JSON.stringify(item.member)})' class="text-[9px] bg-red-50 text-red-700 font-bold px-1 rounded mt-0.5"><i class="fa-solid fa-message"></i> নোটিশ</button>
      </div>
    `;
    pool3.appendChild(div);
  });
  if (overdue.length === 0) {
    pool3.innerHTML = '<p class="text-center py-4 text-emerald-800 font-semibold">🎉 সকল সদস্যের কিস্তি ক্লিয়ার!</p>';
  }
}

function renderMembersList() {
  const query = document.getElementById('member-search').value.toLowerCase();
  const container = document.getElementById('members-cards-container');
  container.innerHTML = '';

  const filtered = members.filter(m => 
    m.name.toLowerCase().includes(query) || 
    m.id.toString().includes(query) || 
    m.mobile.includes(query)
  );

  filtered.forEach(m => {
    const paid = getMemberTotalPaid(m.id);
    const due = getMemberDue(m);
    const card = document.createElement('div');
    card.className = "bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between space-y-3";
    card.innerHTML = `
      <div class="flex items-start gap-2.5">
        <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-800 shrink-0 uppercase text-lg">${m.name[0]}</div>
        <div>
          <h4 class="font-bold text-slate-800 text-sm flex items-center gap-1">${m.name} <span class="bg-emerald-105 bg-emerald-100 text-emerald-900 font-bold font-mono text-[9px] px-1.5 rounded-full">ভভ-${m.id}</span></h4>
          <p class="text-xs text-slate-500 font-mono"><i class="fa-solid fa-phone text-[9px]"></i> ${m.mobile}</p>
          <p class="text-[9px] text-slate-400">যোগঃ ${m.joinDate}</p>
        </div>
      </div>

      <div class="bg-white p-2.5 rounded-lg border grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><p class="text-slate-500 font-siliguri">শেয়ার</p><p class="font-bold text-slate-800">${m.shareCount} শেয়ার</p></div>
        <div><p class="text-slate-500 font-siliguri">মোট জমা</p><p class="font-bold text-emerald-700 font-mono">${paid} ৳</p></div>
        <div><p class="text-slate-500 font-siliguri">বকেয়া</p><p class="font-bold font-mono ${due > 0 ? 'text-red-650 text-red-600 font-extrabold' : 'text-slate-500'}">${due} ৳</p></div>
      </div>

      <div class="flex justify-between items-center pt-2 border-t">
        <button onclick='openNoticeModal(${JSON.stringify(m)})' class="bg-white hover:bg-slate-50 border text-[9px] p-1 px-2 rounded-lg text-slate-600"><i class="fa-solid fa-share text-slate-400"></i> নোটিশ</button>
        <div class="flex gap-1.5">
          <button onclick='openMemberModal(${JSON.stringify(m)})' class="text-blue-600 p-1 hover:bg-blue-50 rounded"><i class="fa-solid fa-edit"></i></button>
          <button onclick="deleteMember(${m.id})" class="text-red-600 p-1 hover:bg-red-50 rounded"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderPaymentsTable() {
  const query = document.getElementById('payment-search').value.toLowerCase();
  const tbody = document.getElementById('payments-tbody');
  tbody.innerHTML = '';

  const filtered = payments.filter(p => {
    const m = members.find(mem => mem.id === p.memberId);
    return (m?.name || '').toLowerCase().includes(query) || p.receiptNumber.includes(query) || p.month.toLowerCase().includes(query);
  });

  filtered.forEach(p => {
    const m = members.find(mem => mem.id === p.memberId);
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50";
    tr.innerHTML = `
      <td class="p-4 font-mono font-bold text-emerald-950">${p.receiptNumber}</td>
      <td class="p-4"><b>${m ? m.name : 'অজ্ঞাত'}</b><span class="text-[9px] text-slate-400 font-mono block">আইডি: ভভ-${p.memberId}</span></td>
      <td class="p-4 font-bold font-mono text-emerald-700">+${p.amount} ৳</td>
      <td class="p-4">${MONTH_NAMES_BN[p.month] || p.month}</td>
      <td class="p-4 font-mono text-slate-400">${p.paymentDate}</td>
      <td class="p-4 text-slate-500">${p.note}</td>
      <td class="p-4 text-right">
        <button onclick='openReceiptModal(${JSON.stringify(p)})' class="text-emerald-700 p-1 hover:bg-emerald-50 rounded"><i class="fa-solid fa-file-invoice text-xs"></i></button>
        <button onclick='openPaymentModal(${JSON.stringify(p)})' class="text-blue-600 p-1 hover:bg-blue-50 rounded"><i class="fa-solid fa-edit text-xs"></i></button>
        <button onclick="deletePayment('${p.id}')" class="text-red-600 p-1 hover:bg-red-50 rounded"><i class="fa-solid fa-trash text-xs"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReportsTable() {
  const tbody = document.getElementById('reports-tbody');
  tbody.innerHTML = '';

  members.forEach(m => {
    const expected = getExpectedContribUpToLimit(m);
    const paid = getMemberTotalPaid(m.id);
    const due = getMemberDue(m);

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50";
    tr.innerHTML = `
      <td class="p-4"><b>${m.name}</b><span class="text-[9px] text-emerald-805 text-emerald-800 font-bold block">ভভ-${m.id}</span></td>
      <td class="p-4 font-mono">${m.mobile}</td>
      <td class="p-4 font-semibold">${m.shareCount} শেয়ার</td>
      <td class="p-4 font-mono text-slate-500">${expected} ৳</td>
      <td class="p-4 font-mono text-emerald-800 font-bold">${paid} ৳</td>
      <td class="p-4 font-mono font-bold ${due > 0 ? 'text-red-600 text-sm' : 'text-slate-405 text-slate-400'}">${due > 0 ? due + ' ৳' : 'পরিশোধিত'}</td>
      <td class="p-4">
        <span class="${due === 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit">
          <i class="fa-solid ${due === 0 ? 'fa-check' : 'fa-exclamation-triangle'}"></i>
          <span>${due === 0 ? 'ক্লিয়ার' : 'বকেয়া'}</span>
        </span>
      </td>
      <td class="p-4 text-right">
        <button onclick='openNoticeModal(${JSON.stringify(m)})' class="bg-emerald-50 text-emerald-800 font-bold text-[9px] p-1 px-2.5 rounded transition"><i class="fa-solid fa-paper-plane"></i> নোটিশ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProgressMonthsTimeline() {
  const container = document.getElementById('progress-months-grid');
  container.innerHTML = '';

  const totalShares = members.reduce((sum, m) => sum + m.shareCount, 0);

  MONTH_SEQUENCE.forEach((m, idx) => {
    const mPayments = payments.filter(p => p.month === m);
    const mPaidSum = mPayments.reduce((sum, p) => sum + p.amount, 0);
    const mExpected = totalShares * 600;
    const mPercent = mExpected > 0 ? Math.min(100, Math.round((mPaidSum / mExpected) * 105)) : 100;
    const isCurrent = idx === activeMonthLimit;

    const div = document.createElement('div');
    div.className = `p-3 rounded-xl border text-center relative overflow-hidden ${isCurrent ? 'bg-emerald-50 border-emerald-305 bg-emerald-100/30' : 'bg-slate-50 border-slate-100'}`;
    div.innerHTML = `
      ${isCurrent ? '<span class="absolute top-0 right-0 bg-emerald-700 text-[8px] text-white px-1 py-0.5 font-bold">সক্রিয়</span>' : ''}
      <p class="text-[10px] font-bold text-slate-700">${MONTH_NAMES_BN[m] || m}</p>
      <div class="my-1.5">
        <span class="font-extrabold text-emerald-805 text-emerald-700 font-mono text-xs">${mPaidSum} ৳</span>
        <span class="text-[9px] text-slate-400 block">সম্ভাব্য: ${mExpected}</span>
      </div>
      <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1 mx-auto max-w-[80%]">
        <div class="bg-emerald-500 h-full rounded-full" style="width: ${mPercent}%"></div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Global initialization trigger
window.onload = initApp;
