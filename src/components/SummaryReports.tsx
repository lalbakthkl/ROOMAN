import React, { useState } from 'react';
import { 
  TrendingUp, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  FileText, 
  DollarSign, 
  CheckCircle2,
  Utensils,
  Home,
  Users,
  Archive,
  History,
  Eye,
  X,
  Printer,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  Expense, 
  Member, 
  RoomSettings, 
  MonthlySnapshot, 
  RoomData,
  ExpenseCategory
} from '../types';
import { 
  calculateMonthlySnapshot 
} from '../lib/storage';
import { 
  generateRoomexPdfReport, 
  downloadPdfFile, 
  sharePdfFile 
} from '../lib/pdfGenerator';

interface SummaryReportsProps {
  roomData: RoomData;
  activeMember: Member;
  onSaveMonthlyArchive: (snapshot: MonthlySnapshot) => void;
}

export const SummaryReports: React.FC<SummaryReportsProps> = ({
  roomData,
  activeMember,
  onSaveMonthlyArchive,
}) => {
  const { expenses, members, settings, monthlyArchives } = roomData;
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [viewArchiveSnapshot, setViewArchiveSnapshot] = useState<MonthlySnapshot | null>(null);

  const memberMap = new Map<string, Member>(members.map(m => [m.id, m]));
  const currentSnapshot = calculateMonthlySnapshot(roomData);

  const totalSpent = currentSnapshot.totalSpend;

  // Category totals
  const categoryTotals: Record<ExpenseCategory, number> = {
    groceries: 0,
    mess_food: 0,
    electricity: 0,
    rent: 0,
    internet: 0,
    gas_cylinder: 0,
    maid_cook: 0,
    water: 0,
    cleaning: 0,
    entertainment: 0,
    other: 0,
  };

  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  // Generate WhatsApp formatted summary
  // Color Rule in Text: Minus/Owes = 🟢 GREEN, Plus/Receives = 🔵 BLUE
  const generateWhatsAppSummary = (snap: MonthlySnapshot = currentSnapshot) => {
    let msg = `🏠 *ROOMEX EXPENSE & MESS SUMMARY*\n`;
    msg += `🏢 Room: *${settings.name}* (Code: *${settings.roomCode}*)\n`;
    msg += `📅 Month: *${snap.monthYear}*\n`;
    msg += `--------------------------------\n`;
    msg += `💰 *Total Room Spend:* ${settings.currencySymbol}${snap.totalSpend.toFixed(2)}\n`;
    msg += `🍲 *Mess Food Pool:* ${settings.currencySymbol}${snap.totalMessExpense.toFixed(2)}\n`;
    msg += `🏷️ *Daily Mess Rate:* ${settings.currencySymbol}${snap.dailyMessRate.toFixed(2)}/day (${snap.daysInMonth} days)\n`;
    msg += `🏠 *Room Rent:* ${settings.currencySymbol}${snap.totalRentExpense.toFixed(2)}\n`;
    msg += `--------------------------------\n`;
    msg += `📊 *ROOMMATE MONTHLY BREAKDOWN:*\n\n`;
    
    snap.memberSummaries.forEach(m => {
      // User Rule: If payment minus (owes) = GREEN, if plus (receives) = BLUE
      const netSymbol = m.netBalance > 0.01 
        ? `🔵 +${settings.currencySymbol}${m.netBalance.toFixed(2)} (GETS BACK)` 
        : m.netBalance < -0.01 
          ? `🟢 -${settings.currencySymbol}${Math.abs(m.netBalance).toFixed(2)} (OWES/TO PAY)` 
          : `⚪ ${settings.currencySymbol}0.00 (SETTLED)`;
      const typeStr = m.membershipType === 'both' ? 'Rent + Mess' : m.membershipType === 'rent_only' ? 'Rent Only' : 'Mess Only';
      
      msg += `👤 *${m.name}* [${typeStr}]:\n`;
      if (m.membershipType !== 'rent_only') {
        msg += `   • Mess Bill: ${settings.currencySymbol}${m.messBill.toFixed(2)} (${m.daysStayed} days)\n`;
      }
      if (m.rentShare > 0) {
        msg += `   • Rent Share: ${settings.currencySymbol}${m.rentShare.toFixed(2)}\n`;
      }
      msg += `   • Total Paid: ${settings.currencySymbol}${m.totalPaid.toFixed(2)}\n`;
      msg += `   👉 *Net Balance:* ${netSymbol}\n\n`;
    });

    if (snap.simplifiedDebts.length > 0) {
      msg += `--------------------------------\n`;
      msg += `⚡ *DIRECT SETTLE-UP TRANSFERS:*\n`;
      snap.simplifiedDebts.forEach(d => {
        const from = memberMap.get(d.fromMemberId)?.name || 'Roommate';
        const to = memberMap.get(d.toMemberId)?.name || 'Roommate';
        msg += `• *${from}* pays *${to}* ➡️ *${settings.currencySymbol}${d.amount.toFixed(2)}*\n`;
      });
    }

    msg += `--------------------------------\n`;
    msg += `✨ *App developed by sakeerputhan*`;
    return msg;
  };

  // 1. Direct PDF Download Handler
  const handleDownloadPDF = async (snap: MonthlySnapshot = currentSnapshot) => {
    setIsGeneratingPdf(true);
    try {
      const { blob, filename } = generateRoomexPdfReport({
        snapshot: snap,
        settings,
        members,
        expenses,
      });

      await downloadPdfFile(blob, filename);
      setDownloadSuccessToast(`Downloaded "${filename}" successfully!`);
      setTimeout(() => setDownloadSuccessToast(null), 3500);
    } catch (err) {
      console.error('Error generating and downloading PDF:', err);
      alert('Could not download PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Direct PDF Share Handler (Sends actual PDF Document to WhatsApp / Telegram / Device apps)
  const handleSharePdfDocument = async (snap: MonthlySnapshot = currentSnapshot) => {
    setIsSharingPdf(true);
    try {
      const { blob, filename } = generateRoomexPdfReport({
        snapshot: snap,
        settings,
        members,
        expenses,
      });

      const summaryText = generateWhatsAppSummary(snap);
      await sharePdfFile({
        blob,
        filename,
        title: `ROOMEX Report - ${snap.monthYear}`,
        text: summaryText,
      });
    } catch (err) {
      console.error('Error sharing PDF document:', err);
      // Fallback to text WhatsApp share
      handleShareWhatsApp(snap);
    } finally {
      setIsSharingPdf(false);
    }
  };

  // 3. WhatsApp Direct Text Share
  const handleShareWhatsApp = (snap: MonthlySnapshot = currentSnapshot) => {
    const txt = generateWhatsAppSummary(snap);
    const url = `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(url, '_blank');
  };

  // 4. Print / PDF Browser View
  const handlePrintPDF = (snap: MonthlySnapshot = currentSnapshot) => {
    try {
      const { blob } = generateRoomexPdfReport({
        snapshot: snap,
        settings,
        members,
        expenses,
      });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Error opening print preview:', err);
    }
  };

  const handleCopySummary = () => {
    const txt = generateWhatsAppSummary(currentSnapshot);
    navigator.clipboard.writeText(txt);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSaveArchive = () => {
    onSaveMonthlyArchive(currentSnapshot);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Action Center */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Monthly Reports & PDF Export
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Active Month: <strong className="text-white">{currentSnapshot.monthYear}</strong> • Room: <span className="text-indigo-400">{settings.name}</span>
            </p>
          </div>

          {/* Export & Save Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveArchive}
              className="px-3.5 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Save current monthly data as persistent table"
            >
              <Archive className="w-4 h-4 text-indigo-400" />
              <span>Save Table Snapshot</span>
            </button>

            {/* Direct Vector PDF Download */}
            <button
              onClick={() => handleDownloadPDF(currentSnapshot)}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Colorful PDF'}</span>
            </button>

            {/* PDF Share File to WhatsApp / Device */}
            <button
              onClick={() => handleSharePdfDocument(currentSnapshot)}
              disabled={isSharingPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Share PDF Document directly via WhatsApp or device apps"
            >
              <Share2 className="w-4 h-4" />
              <span>{isSharingPdf ? 'Sharing...' : 'Share PDF to WhatsApp'}</span>
            </button>

            {/* Browser Print / Preview */}
            <button
              onClick={() => handlePrintPDF(currentSnapshot)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer"
              title="Preview / Print PDF in browser"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {downloadSuccessToast && (
          <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadSuccessToast}</span>
            </div>
            <button
              onClick={() => handlePrintPDF(currentSnapshot)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-1"
            >
              <span>Open PDF</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Monthly Snapshot saved to persistent history table successfully!</span>
          </div>
        )}
      </div>

      {/* 2. Top Metric Glance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Spend */}
        <div className="p-4 sm:p-5 bg-slate-900 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            <span>TOTAL SPEND</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {settings.currencySymbol}{totalSpent.toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
            {expenses.length} room bills
          </div>
        </div>

        {/* Mess Pool */}
        <div className="p-4 sm:p-5 bg-slate-900 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            <span>MESS FOOD POOL</span>
            <Utensils className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {settings.currencySymbol}{currentSnapshot.totalMessExpense.toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-indigo-300 font-mono">
            Rate: {settings.currencySymbol}{currentSnapshot.dailyMessRate.toFixed(2)}/day
          </div>
        </div>

        {/* Flat Rent */}
        <div className="p-4 sm:p-5 bg-slate-900 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            <span>ROOM RENT</span>
            <Home className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {settings.currencySymbol}{currentSnapshot.totalRentExpense.toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
            Equal or custom split
          </div>
        </div>

        {/* My Net Balance */}
        <div className="p-4 sm:p-5 bg-slate-900 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            <span>MY NET BALANCE</span>
            <Users className="w-4 h-4 text-teal-400" />
          </div>
          {(() => {
            const mySummary = currentSnapshot.memberSummaries.find(m => m.memberId === activeMember.id);
            const net = mySummary?.netBalance || 0;
            // Rule: Plus = Blue, Minus = Green
            const isPlus = net > 0.01;
            const isMinus = net < -0.01;
            return (
              <>
                <div className={`text-xl sm:text-2xl font-black font-mono ${
                  isPlus ? 'text-blue-400' : isMinus ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                  {isPlus ? `+${settings.currencySymbol}${net.toFixed(2)}` : isMinus ? `-${settings.currencySymbol}${Math.abs(net).toFixed(2)}` : `${settings.currencySymbol}0.00`}
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono">
                  {isPlus ? (
                    <span className="text-blue-400 font-semibold">🔵 Gets back from flat</span>
                  ) : isMinus ? (
                    <span className="text-emerald-400 font-semibold">🟢 Owes / To Pay</span>
                  ) : (
                    <span className="text-slate-400">⚪ All Settled</span>
                  )}
                </div>
              </>
            );
          })()}
        </div>

      </div>

      {/* 3. Monthly Roommate Breakdown Table */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Roommate Monthly Expense & Settlement Table</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                {currentSnapshot.monthYear}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Color Legend: <strong className="text-emerald-400">Green = Minus / Owes to Pay</strong> • <strong className="text-blue-400">Blue = Plus / Gets Back</strong>
            </p>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px] tracking-wider bg-slate-950/60">
                <th className="py-3 px-3">Roommate</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-center">Days</th>
                <th className="py-3 px-3 text-right">Mess Bill</th>
                <th className="py-3 px-3 text-right">Rent Share</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3 text-right">Net Settlement Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentSnapshot.memberSummaries.map((m) => {
                const isPlus = m.netBalance > 0.01;
                const isMinus = m.netBalance < -0.01;

                return (
                  <tr 
                    key={m.memberId}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      m.memberId === activeMember.id ? 'bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={m.avatar} 
                          alt={m.name} 
                          className="w-7 h-7 rounded-full object-cover border border-white/10" 
                        />
                        <div>
                          <span className="font-bold text-white block truncate">{m.name}</span>
                          {m.memberId === activeMember.id && (
                            <span className="text-[9px] uppercase font-bold text-indigo-400 font-mono">YOU</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        m.membershipType === 'both' 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                          : m.membershipType === 'rent_only'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {m.membershipType === 'both' ? 'Rent + Mess' : m.membershipType === 'rent_only' ? 'Rent Only' : 'Mess Only'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-300">
                      {m.membershipType === 'rent_only' ? '-' : `${m.daysStayed}d`}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-300">
                      {m.membershipType === 'rent_only' ? '$0.00' : `${settings.currencySymbol}${m.messBill.toFixed(2)}`}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {settings.currencySymbol}{m.rentShare.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                      {settings.currencySymbol}{m.totalPaid.toFixed(2)}
                    </td>

                    {/* Net Balance Cell with Enforced Color Rule */}
                    <td className="py-3 px-3 text-right">
                      {isPlus && (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                          + {settings.currencySymbol}{m.netBalance.toFixed(2)} (Gets Back)
                        </span>
                      )}
                      {isMinus && (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          - {settings.currencySymbol}{Math.abs(m.netBalance).toFixed(2)} (To Pay / Owes)
                        </span>
                      )}
                      {!isPlus && !isMinus && (
                        <span className="inline-flex items-center font-mono font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                          Settled ($0.00)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Settle Up Direct Transfers */}
      {currentSnapshot.simplifiedDebts.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Recommended Direct Settlement Transfers
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentSnapshot.simplifiedDebts.map((debt, idx) => {
              const fromM = memberMap.get(debt.fromMemberId);
              const toM = memberMap.get(debt.toMemberId);
              return (
                <div 
                  key={`debt-${idx}-${debt.fromMemberId}-${debt.toMemberId}`}
                  className="p-3 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">{fromM?.name}</span>
                    <span className="text-slate-500">pays</span>
                    <span className="font-bold text-blue-400">{toM?.name}</span>
                  </div>
                  <span className="font-mono font-bold text-white text-sm">
                    {settings.currencySymbol}{debt.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Preserved Saved Monthly Archives Table */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Preserved Monthly Archives & PDF History
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
            {monthlyArchives.length} saved months
          </span>
        </div>

        {monthlyArchives.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Archive className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No past months archived yet. Click "Save Table Snapshot" above to preserve this month's records permanently.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {monthlyArchives.map((archive) => (
              <div key={archive.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{archive.monthYear}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Saved {new Date(archive.archivedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                    <span>Total Spend: <strong className="text-white">{settings.currencySymbol}{archive.totalSpend.toFixed(2)}</strong></span>
                    <span>•</span>
                    <span>Mess: <strong className="text-orange-300">{settings.currencySymbol}{archive.totalMessExpense.toFixed(2)}</strong></span>
                    <span>•</span>
                    <span>Daily Rate: <strong>{settings.currencySymbol}{archive.dailyMessRate.toFixed(2)}/d</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setViewArchiveSnapshot(archive)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Table</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPDF(archive)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => handleSharePdfDocument(archive)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. WhatsApp Text Preview & Quick Copy */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white">WhatsApp Summary Message Preview</h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShareWhatsApp(currentSnapshot)}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send WhatsApp</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied Text' : 'Copy Message'}</span>
            </button>
          </div>
        </div>

        <pre className="bg-slate-950 p-4 rounded-xl border border-white/10 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {generateWhatsAppSummary(currentSnapshot)}
        </pre>
      </div>

      {/* 7. Archived Month Snapshot Modal Viewer */}
      {viewArchiveSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  Archived Snapshot: {viewArchiveSnapshot.monthYear}
                </h3>
              </div>
              <button
                onClick={() => setViewArchiveSnapshot(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-mono">Total Spend</span>
                  <span className="text-base font-bold text-white font-mono">
                    {settings.currencySymbol}{viewArchiveSnapshot.totalSpend.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-mono">Mess Total</span>
                  <span className="text-base font-bold text-orange-400 font-mono">
                    {settings.currencySymbol}{viewArchiveSnapshot.totalMessExpense.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-mono">Daily Rate</span>
                  <span className="text-base font-bold text-indigo-400 font-mono">
                    {settings.currencySymbol}{viewArchiveSnapshot.dailyMessRate.toFixed(2)}/d
                  </span>
                </div>
              </div>

              <div className="divide-y divide-white/5 bg-slate-950 rounded-xl border border-white/5">
                {viewArchiveSnapshot.memberSummaries.map(m => {
                  const isPlus = m.netBalance > 0.01;
                  const isMinus = m.netBalance < -0.01;
                  return (
                    <div key={m.memberId} className="p-3 flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{m.name}</span>
                      <div className="text-right font-mono">
                        {isPlus && <span className="text-blue-400 font-bold">+{settings.currencySymbol}{m.netBalance.toFixed(2)} (Gets Back)</span>}
                        {isMinus && <span className="text-emerald-400 font-bold">-{settings.currencySymbol}{Math.abs(m.netBalance).toFixed(2)} (Owes)</span>}
                        {!isPlus && !isMinus && <span className="text-slate-400">Settled</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-end gap-2">
              <button
                onClick={() => handleDownloadPDF(viewArchiveSnapshot)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={() => handleSharePdfDocument(viewArchiveSnapshot)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
