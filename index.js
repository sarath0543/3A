const PREFIX = "160924737";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxYexY1zp1rGRpdkjDWjNDHjWmYoe2W07DKOW7_P6K2Nva4j40ltDy8t-dc1Fgo0-W0HQ/exec";

let currentTab = 'paid';
let isLoading = false;
let rawDataset = [];
let activeModalStudent = null;
let isTableOpen = true;

document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  fetchSheetData();
});

function formatShortTimestamp(raw) {
  if (!raw || raw === "-" || raw === "N/A") return "-";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw; 
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');

  return `${month} ${day}-${hours}:${mins}:${secs}`;
}

function getFormattedTimeSuffix() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}-${minutes}`;
}

function toggleMainTable() {
  const container = document.getElementById('tableContainer');
  isTableOpen = !isTableOpen;
  container.classList.toggle('hidden', !isTableOpen);
}

async function fetchSheetData() {
  isLoading = true;
  renderTable();
  try {
    const res = await fetch(SCRIPT_URL);
    const json = await res.json();
    if (json && json.status === "success" && Array.isArray(json.data)) {
      rawDataset = json.data;
    }
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    isLoading = false;
    renderTable();
  }
}

function isStudentDetained(student) {
  const attendance = parseFloat(student.attendance) || 0;
  const statusStr = String(student.status).trim();
  return attendance < 30 || (statusStr === '0' && (parseFloat(student.total) || 0) === 0);
}

function isStudentPaid(student) {
  return String(student.status).toLowerCase().trim() === 'paid';
}

function switchTab(tab) {
  currentTab = tab;
  const paidBtn = document.getElementById('tab-paid');
  const pendingBtn = document.getElementById('tab-pending');

  if (tab === 'paid') {
    paidBtn.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition bg-emerald-600 text-white shadow-sm";
    pendingBtn.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200";
  } else {
    pendingBtn.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition bg-emerald-600 text-white shadow-sm";
    paidBtn.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200";
  }

  isTableOpen = true;
  document.getElementById('tableContainer').classList.remove('hidden');
  renderTable();
}

function getFilteredData() {
  return rawDataset.filter(item => {
    const paid = isStudentPaid(item);
    return currentTab === 'paid' ? paid : !paid;
  });
}

function renderTable() {
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');
  const tfoot = document.getElementById('tableFooter');
  
  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  if (currentTab === 'paid') {
    thead.innerHTML = `
      <tr>
        <th class="py-3 px-3 text-center w-12">S.No</th>
        <th class="py-3 px-3">Hall Ticket No</th>
        <th class="py-3 px-3 text-right">Attendance (%)</th>
        <th class="py-3 px-3 text-right">Condonation Fee (₹)</th>
        <th class="py-3 px-3 text-right">IXY Fee (₹)</th>
        <th class="py-3 px-3 text-right">Internship (₹)</th>
        <th class="py-3 px-3 text-right">Total Fee (₹)</th>
        <th class="py-3 px-3 text-center">Status</th>
        <th class="py-3 px-3 text-center">Mode</th>
        <th class="py-3 px-3">Timestamp</th>
      </tr>
    `;
  } else {
    thead.innerHTML = `
      <tr>
        <th class="py-3 px-3 text-center w-12">S.No</th>
        <th class="py-3 px-3">Hall Ticket No</th>
        <th class="py-3 px-3 text-right">Attendance (%)</th>
        <th class="py-3 px-3 text-right">Condonation Fee (₹)</th>
        <th class="py-3 px-3 text-right">IXY Fee (₹)</th>
        <th class="py-3 px-3 text-right">Internship (₹)</th>
        <th class="py-3 px-3 text-right">Total Fee (₹)</th>
      </tr>
    `;
  }

  const colSpanCount = currentTab === 'paid' ? 10 : 7;

  if (isLoading) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colSpanCount}" class="py-12 text-center text-teal-700 font-medium">
          <div class="flex flex-col items-center gap-2">
            <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-emerald-600"></i>
            <p>Loading real-time records from Google Sheet...</p>
          </div>
        </td>
      </tr>`;
    lucide.createIcons();
    return;
  }

  const filtered = getFilteredData();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colSpanCount}" class="py-10 text-center text-slate-400 font-medium">
          No ${currentTab} records found in Google Sheet.
        </td>
      </tr>`;
    return;
  }

  let grandTotal = 0;
  let onlineTotal = 0;
  let cashTotal = 0;

  filtered.forEach((item, index) => {
    const itemTotal = (item.total || 0);
    grandTotal += itemTotal;

    const modeStr = (item.mode || "").toLowerCase().trim();
    if (modeStr === 'online') {
      onlineTotal += itemTotal;
    } else if (modeStr === 'cash') {
      cashTotal += itemTotal;
    }

    const detained = isStudentDetained(item);
    const compactTime = formatShortTimestamp(item.timeStamp);

    const tr = document.createElement('tr');
    tr.className = "hover:bg-emerald-50/50 transition";

    if (currentTab === 'paid') {
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center font-medium text-slate-500">${index + 1}</td>
        <td class="py-2.5 px-3 font-bold text-slate-800">${item.hallTicketNo}</td>
        <td class="py-2.5 px-3 text-right font-medium ${item.attendance < 30 ? 'text-rose-600 font-bold' : item.attendance < 75 ? 'text-amber-600 font-semibold' : ''}">${item.attendance}%</td>
        <td class="py-2.5 px-3 text-right">₹${item.condonationFee || 0}</td>
        <td class="py-2.5 px-3 text-right">₹${item.ixyFee || 0}</td>
        <td class="py-2.5 px-3 text-right">₹${item.internship || 0}</td>
        <td class="py-2.5 px-3 text-right font-bold text-emerald-800">₹${itemTotal}</td>
        <td class="py-2.5 px-3 text-center">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><i data-lucide="check" class="w-3 h-3"></i> Paid</span>
        </td>
        <td class="py-2.5 px-3 text-center font-bold text-xs capitalize ${modeStr === 'cash' ? 'text-amber-700' : 'text-blue-700'}">${item.mode || '-'}</td>
        <td class="py-2.5 px-3 text-xs text-slate-500 font-mono">${compactTime}</td>
      `;
    } else {
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center font-medium text-slate-500">${index + 1}</td>
        <td class="py-2.5 px-3 font-bold text-slate-800">
          ${item.hallTicketNo}
          ${detained ? '<span class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">Detained</span>' : ''}
        </td>
        <td class="py-2.5 px-3 text-right font-medium ${item.attendance < 30 ? 'text-rose-600 font-bold' : item.attendance < 75 ? 'text-amber-600 font-semibold' : ''}">${item.attendance}%</td>
        <td class="py-2.5 px-3 text-right">₹${item.condonationFee || 0}</td>
        <td class="py-2.5 px-3 text-right">₹${item.ixyFee || 0}</td>
        <td class="py-2.5 px-3 text-right">₹${item.internship || 0}</td>
        <td class="py-2.5 px-3 text-right font-bold ${detained ? 'text-slate-400' : 'text-amber-700 cursor-pointer hover:underline'}" ${!detained ? `onclick="openPaymentModal('${item.hallTicketNo}')"` : ''}>
          ₹${itemTotal} ${!detained ? '<span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded ml-1">Pay</span>' : ''}
        </td>
      `;
    }
    tbody.appendChild(tr);
  });

  if (currentTab === 'paid') {
    tfoot.innerHTML = `
      <tr>
        <td colspan="${colSpanCount}" class="py-3.5 px-3 text-center">
          <div class="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
            <span>ONLINE TOTAL: <strong class="text-blue-300">₹${onlineTotal.toLocaleString('en-IN')}</strong></span>
            <span class="text-emerald-400">|</span>
            <span>CASH TOTAL: <strong class="text-amber-300">₹${cashTotal.toLocaleString('en-IN')}</strong></span>
            <span class="text-emerald-400">|</span>
            <span class="font-bold tracking-wide">GRAND TOTAL: <strong class="text-lg text-emerald-200">₹${grandTotal.toLocaleString('en-IN')}</strong></span>
          </div>
        </td>
      </tr>
    `;
  } else {
    tfoot.innerHTML = `
      <tr>
        <td colspan="${colSpanCount}" class="py-3.5 px-3 text-center">
          <div class="flex items-center justify-center gap-3">
            <span class="font-bold tracking-wide text-sm">TOTAL PENDING AMOUNT:</span>
            <span class="font-black text-lg text-emerald-200">₹${grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </td>
      </tr>
    `;
  }

  lucide.createIcons();
}

function handleSearch(e) {
  e.preventDefault();
  const suffix = document.getElementById('rollSuffixInput').value.trim();
  const container = document.getElementById('searchResultContainer');

  if (!suffix || suffix.length !== 3) {
    alert("Please enter a valid 3-digit roll number (e.g. 007).");
    return;
  }

  const fullHT = PREFIX + suffix;
  const student = rawDataset.find(s => String(s.hallTicketNo).trim() === fullHT);
  container.classList.remove('hidden');

  if (!student) {
    container.innerHTML = `
      <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i data-lucide="alert-circle" class="w-5 h-5 text-amber-600"></i>
          <div>
            <p class="font-bold">Roll Number ${fullHT} Not Found</p>
            <p class="text-xs">Please verify the roll number digits entered.</p>
          </div>
        </div>
        <button onclick="closeSearchCard()" class="text-emerald-600 hover:text-emerald-800 p-1"><i data-lucide="x" class="w-5 h-5 font-bold"></i></button>
      </div>`;
    lucide.createIcons();
    return;
  }

  const detained = isStudentDetained(student);
  const paid = isStudentPaid(student);
  const compactTime = formatShortTimestamp(student.timeStamp);

  if (detained) {
    container.innerHTML = `
      <div class="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2 relative">
        <button onclick="closeSearchCard()" class="absolute top-4 right-4 text-emerald-600 hover:text-emerald-800 p-1"><i data-lucide="x" class="w-5 h-5 font-bold"></i></button>
        <div class="flex items-center gap-2 font-bold text-rose-700">
          <i data-lucide="shield-alert" class="w-5 h-5"></i>
          <span>Student Detained — Not Promoted (${student.hallTicketNo})</span>
        </div>
        <p class="text-xs text-rose-600">Attendance is ${student.attendance}% (Below 30% cutoff threshold). Total Fee: ₹0</p>
      </div>`;
  } else if (paid) {
    container.innerHTML = `
      <div class="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2 relative">
        <button onclick="closeSearchCard()" class="absolute top-4 right-4 text-emerald-600 hover:text-emerald-800 p-1"><i data-lucide="x" class="w-5 h-5 font-bold"></i></button>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 font-bold text-emerald-800 text-base">
            <span>${student.hallTicketNo}</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">Paid</span>
          </div>
        </div>
        <p class="text-xs text-slate-600">Attendance: ${student.attendance}%</p>
        
        <div class="py-2 space-y-1 text-xs border-t border-b border-emerald-200/60 my-2">
          <div class="flex justify-between py-0.5"><span class="text-slate-500">condonation :</span><span class="font-bold">₹${student.condonationFee || 0}</span></div>
          <div class="flex justify-between py-0.5"><span class="text-slate-500">ixy fee :</span><span class="font-bold">₹${student.ixyFee || 0}</span></div>
          <div class="flex justify-between py-0.5"><span class="text-slate-500">internship fee :</span><span class="font-bold">₹${student.internship || 0}</span></div>
          <div class="flex justify-between py-0.5 text-emerald-900 text-sm"><span class="font-bold">total paid :</span><span class="font-black">₹${student.total}</span></div>
          <div class="flex justify-between py-0.5 text-xs text-slate-600"><span class="font-bold">payment mode :</span><span class="font-bold capitalize">${student.mode || '-'}</span></div>
        </div>

        <div class="text-xs text-slate-500">Paid on: ${compactTime}</div>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="p-5 bg-white border border-emerald-200 rounded-xl space-y-4 text-left shadow-sm relative max-w-lg mx-auto">
        <button onclick="closeSearchCard()" class="absolute top-4 right-4 text-emerald-600 hover:text-emerald-800 p-1"><i data-lucide="x" class="w-5 h-5 font-bold"></i></button>
        
        <div class="flex justify-between items-start pr-8">
          <div>
            <h3 class="font-bold text-slate-800 text-base">${student.hallTicketNo}</h3>
            <p class="text-xs text-slate-500">Attendance: ${student.attendance}% ${student.attendance < 75 ? '(Condonation Applied)' : ''}</p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Pending</span>
        </div>

        <div class="py-2 border-t border-b border-slate-100 space-y-2 text-xs">
          <div class="flex justify-between items-center py-1 border-b border-slate-50">
            <span class="text-slate-600 font-medium">condonation :</span>
            <span class="font-bold text-slate-800">₹${student.condonationFee || 0}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-50">
            <span class="text-slate-600 font-medium">ixy fee :</span>
            <span class="font-bold text-slate-800">₹${student.ixyFee || 0}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-50">
            <span class="text-slate-600 font-medium">internship fee :</span>
            <span class="font-bold text-slate-800">₹${student.internship || 0}</span>
          </div>
          <div class="flex justify-between items-center py-1.5 pt-2 text-sm text-emerald-800 font-bold">
            <span>total due :</span>
            <span class="text-base font-black text-emerald-700">₹${student.total}</span>
          </div>
        </div>

        <div class="space-y-3 pt-1">
          <div class="w-full">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Re-type Bill Amount to Confirm (₹):</label>
            <input type="number" id="searchVerifyAmountInput" placeholder="Re-type ${student.total}" 
                   class="w-full px-3.5 py-2.5 border-2 border-emerald-200 focus:border-emerald-600 rounded-xl font-bold text-slate-800 focus:outline-none text-sm">
          </div>

          <div class="w-full">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Select Payment Mode:</label>
            <div class="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-emerald-200">
              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input type="radio" name="searchPaymentMode" value="online" checked class="w-4 h-4 text-emerald-600 focus:ring-emerald-500">
                <span>Online</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input type="radio" name="searchPaymentMode" value="cash" class="w-4 h-4 text-emerald-600 focus:ring-emerald-500">
                <span>Cash</span>
              </label>
            </div>
          </div>

          <button onclick="submitSearchPayment('${student.hallTicketNo}', ${student.total})" 
                  class="w-full px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5">
            <i data-lucide="check" class="w-4 h-4"></i> Submit & Mark Paid
          </button>
        </div>
      </div>`;
  }

  lucide.createIcons();
}

function closeSearchCard() {
  const container = document.getElementById('searchResultContainer');
  container.classList.add('hidden');
  container.innerHTML = '';
  document.getElementById('rollSuffixInput').value = '';
}

function openPaymentModal(hallTicketNo) {
  const student = rawDataset.find(s => String(s.hallTicketNo).trim() === hallTicketNo);
  if (!student) return;

  activeModalStudent = student;
  document.getElementById('modalHallTicketDisplay').innerText = `Roll No: ${student.hallTicketNo}`;
  document.getElementById('modalBillAmountDisplay').innerText = `₹${student.total}`;
  document.getElementById('modalVerifyAmountInput').value = '';
  
  document.getElementById('paymentModal').classList.remove('hidden');
  lucide.createIcons();
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.add('hidden');
  activeModalStudent = null;
}

async function confirmModalPayment() {
  if (!activeModalStudent) return;
  const enteredAmount = parseFloat(document.getElementById('modalVerifyAmountInput').value) || 0;
  if (enteredAmount !== activeModalStudent.total) {
    alert(`Amount mismatch! Please re-type the exact total bill amount (₹${activeModalStudent.total}).`);
    return;
  }
  const selectedMode = document.querySelector('input[name="modalPaymentMode"]:checked')?.value || 'online';
  closePaymentModal();
  await executePayment(activeModalStudent.hallTicketNo, activeModalStudent.total, selectedMode);
}

async function submitSearchPayment(hallTicketNo, expectedTotal) {
  const enteredAmount = parseFloat(document.getElementById('searchVerifyAmountInput').value) || 0;
  if (enteredAmount !== expectedTotal) {
    alert(`Amount mismatch! Please re-type the exact total bill amount (₹${expectedTotal}).`);
    return;
  }
  const selectedMode = document.querySelector('input[name="searchPaymentMode"]:checked')?.value || 'online';
  await executePayment(hallTicketNo, expectedTotal, selectedMode);
}

async function executePayment(hallTicketNo, amount, paymentMode) {
  closeSearchCard();
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        hallTicketNo: hallTicketNo, 
        paidAmount: amount, 
        paymentMode: paymentMode 
      })
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch(e){}

    if (json.status === "success" || res.ok) {
      await fetchSheetData();
    } else {
      alert("Error updating sheet: " + (json.message || "Request failed"));
    }
  } catch (err) {
    await fetchSheetData();
  }
}

// --- Universal APK & Browser Compatible Download/Export Functions ---

function triggerDownload(blob, fileName) {
  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (e) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUri = e.target.result;
      const fallbackLink = document.createElement('a');
      fallbackLink.href = dataUri;
      fallbackLink.download = fileName;
      fallbackLink.target = '_blank';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    };
    reader.readAsDataURL(blob);
  }
}

function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  
  const filtered = getFilteredData();
  let totalSum = 0;
  let onlineSum = 0;
  let cashSum = 0;
  let condonationSum = 0;
  let ixySum = 0;
  let internshipSum = 0;
  
  const isPaidTab = currentTab === 'paid';

  const headers = isPaidTab 
    ? [['S.No', 'Hall Ticket No', 'Attendance', 'Condonation Fee', 'IXY Fee', 'Internship', 'Total Fee', 'Status', 'Mode', 'Timestamp']]
    : [['S.No', 'Hall Ticket No', 'Attendance', 'Condonation Fee', 'IXY Fee', 'Internship', 'Total Fee']];

  const rows = filtered.map((item, idx) => {
    const itemTotal = Number(item.total) || 0;
    const condFee = Number(item.condonationFee) || 0;
    const ixyFee = Number(item.ixyFee) || 0;
    const internFee = Number(item.internship) || 0;

    totalSum += itemTotal;
    condonationSum += condFee;
    ixySum += ixyFee;
    internshipSum += internFee;

    const modeStr = (item.mode || "").toLowerCase().trim();
    if (modeStr === 'online') onlineSum += itemTotal;
    else if (modeStr === 'cash') cashSum += itemTotal;

    const baseRow = [
      String(idx + 1),
      String(item.hallTicketNo),
      String(item.attendance + '%'),
      String(condFee),
      String(ixyFee),
      String(internFee),
      String(itemTotal)
    ];
    if (isPaidTab) {
      baseRow.push(String(item.status));
      baseRow.push(String(item.mode || '-'));
      baseRow.push(formatShortTimestamp(item.timeStamp));
    }
    return baseRow;
  });

  // Append subtotals & grand total rows at the end
  if (isPaidTab) {
    rows.push([
      { content: 'SUBTOTALS', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: String(condonationSum), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(ixySum), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(internshipSum), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(totalSum), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: '', colSpan: 3 }
    ]);
    rows.push([
      { content: `ONLINE: INR ${onlineSum}   |   CASH: INR ${cashSum}   |   GRAND TOTAL: INR ${totalSum}`, colSpan: 10, styles: { halign: 'center', fontStyle: 'bold', fillColor: [209, 250, 229] } }
    ]);
  } else {
    // Pending Report Subtotals & Grand Total Banner
    rows.push([
      { content: 'SUBTOTALS', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: String(condonationSum), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(ixySum), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(internshipSum), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: String(totalSum), styles: { fontStyle: 'bold', halign: 'right' } }
    ]);
    rows.push([
      { content: `TOTAL PENDING GRAND TOTAL: INR ${totalSum}`, colSpan: 7, styles: { halign: 'center', fontStyle: 'bold', fillColor: [209, 250, 229] } }
    ]);
  }

  doc.autoTable({
    startY: 22,
    head: headers,
    body: rows,
    theme: 'grid',
    pageBreak: 'auto',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: { 
      font: 'times', 
      fontSize: 12, 
      cellPadding: 3, 
      fontStyle: 'normal' 
    },
    headStyles: { 
      font: 'times', 
      fontStyle: 'bold', 
      fontSize: 12, 
      fillColor: [5, 150, 105], 
      textColor: 255, 
      halign: 'center' 
    },
    tableWidth: 'auto',
    margin: { left: 10, right: 10 },
    didDrawPage: function (data) {
      // Draw Title strictly on the 1st page only
      if (data.pageNumber === 1) {
        doc.setFont("times", "bold");
        doc.setFontSize(16);
        doc.text(`Student Fee Report - ${currentTab.toUpperCase()}`, doc.internal.pageSize.getWidth() / 2, 14, { align: 'center' });
      }
    }
  });

  const timeSuffix = getFormattedTimeSuffix();
  const fileName = `Fee_Report_${currentTab}_${timeSuffix}.pdf`;
  const pdfBlob = doc.output('blob');
  triggerDownload(pdfBlob, fileName);
}

function exportToExcel() {
  const filtered = getFilteredData();
  const isPaidTab = currentTab === 'paid';

  const sheetData = filtered.map((item, idx) => {
    const rowData = {
      "SNo": idx + 1,
      "HallTicketNo": item.hallTicketNo,
      "Attendance (%)": item.attendance,
      "Condonation Fee": item.condonationFee,
      "IXY Fee": item.ixyFee,
      "Internship": item.internship,
      "Total Fee": item.total
    };
    if (isPaidTab) {
      rowData["Status"] = item.status;
      rowData["Mode"] = item.mode || '-';
      rowData["Time Stamp"] = formatShortTimestamp(item.timeStamp);
    }
    return rowData;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, currentTab.toUpperCase());
  
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const excelBlob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const timeSuffix = getFormattedTimeSuffix();
  const fileName = `Fee_Report_${currentTab}_${timeSuffix}.xlsx`;
  
  triggerDownload(excelBlob, fileName);
}