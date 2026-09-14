import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Building2, Wallet, HandCoins, AlertTriangle, MessageCircle, Plus, Trash2, Pencil, Check, LayoutDashboard } from "lucide-react";
import { supabase } from "./supabaseClient";

const COLORS = {
  bg: "#F6F4EF",
  surface: "#FFFFFF",
  border: "#E4E0D6",
  text: "#20261F",
  textMuted: "#6B6A60",
  accent: "#1F5D50",
  accentLight: "#E4EEEA",
  clay: "#A6512C",
  clayLight: "#F3E4DA",
  danger: "#B84B42",
  dangerLight: "#F7E7E5",
  warning: "#C98A1D",
  warningLight: "#FAF0DD",
  success: "#3F7D4E",
  successLight: "#E7F1E8",
};

const FREQUENCIES = ["شهري", "كل 6 أشهر", "سنوي"];
const TX_TYPES = ["إيراد إيجار", "مصروف صيانة", "عائد ادخاري", "سحب", "التزام عائلي"];
const RESPONSIBLES = ["محمد", "حسن"];
const BENEFICIARIES = ["الوالد", "الوالدة", "فاطمة", "معصومة", "زينب", "مريم", "زهراء"];

const fmtSAR = (n) => `${Number(n || 0).toLocaleString("en-US")} ريال`;
const daysBetween = (dateStr) => {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
};

function contractStatus(endDate) {
  const d = daysBetween(endDate);
  if (d === null) return { label: "—", color: COLORS.textMuted, bg: "transparent" };
  if (d < 0) return { label: "منتهي", color: COLORS.danger, bg: COLORS.dangerLight, days: d };
  if (d <= 30) return { label: `قريب من الانتهاء (${d} يوم)`, color: COLORS.warning, bg: COLORS.warningLight, days: d };
  return { label: "ساري", color: COLORS.success, bg: COLORS.successLight, days: d };
}

function cleanPhone(phone) {
  let p = String(phone || "").replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "966" + p.slice(1);
  if (p.length === 9) p = "966" + p;
  return p;
}

function waLink(apt) {
  if (!apt.phone) return null;
  const phone = cleanPhone(apt.phone);
  const msg = `مرحباً ${apt.tenant_name || ""}، نود تذكيركم بحلول موعد إيجار شقة رقم ${apt.number} بمبلغ ${fmtSAR(apt.rent)}. نرجو التكرم بالسداد في أقرب وقت ممكن، ولكم جزيل الشكر.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function Card({ children, style }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 18px", ...style }}>
      {children}
    </div>
  );
}
function Badge({ label, color, bg }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color, background: bg, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}
function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: COLORS.textMuted, flex: 1, minWidth: 140 }}>
      {label}
      {children}
    </label>
  );
}
const inputStyle = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  fontFamily: "inherit",
  color: COLORS.text,
  background: "#FCFBF9",
  outline: "none",
};
function IconBtn({ onClick, title, children, color }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ border: "none", background: "transparent", cursor: "pointer", color: color || COLORS.textMuted, display: "flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 6 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#00000008")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
function PrimaryBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{ background: COLORS.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, ...style }}>
      {children}
    </button>
  );
}

const emptyApt = { number: "", tenant_name: "", phone: "", rent: "", frequency: FREQUENCIES[0], start_date: "", end_date: "", payment_status: "مستحق", notes: "" };
const emptyTx = { date: "", type: TX_TYPES[0], apartment_id: "", amount: "", bank: "", responsible: RESPONSIBLES[0], notes: "" };
const emptyObl = { beneficiary: BENEFICIARIES[0], year: "", amount_due: "", due_date: "", payment1: "", payment2: "", bank: "" };

export default function App() {
  const [tab, setTab] = useState("overview");
  const [apartments, setApartments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [saveNote, setSaveNote] = useState("");

  const flash = (msg) => {
    setSaveNote(msg);
    setTimeout(() => setSaveNote(""), 1500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    const [aRes, tRes, oRes] = await Promise.all([
      supabase.from("apartments").select("*").order("number"),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("obligations").select("*").order("year"),
    ]);
    if (aRes.error || tRes.error || oRes.error) {
      setErrorMsg("تعذر الاتصال بقاعدة البيانات. تحقق من مفاتيح Supabase وإعداد الجداول.");
    } else {
      setApartments(aRes.data || []);
      setTransactions(tRes.data || []);
      setObligations(oRes.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const kpis = useMemo(() => {
    const totalRentIncome = transactions.filter((t) => t.type === "إيراد إيجار").reduce((s, t) => s + Number(t.amount || 0), 0);
    const expiringSoon = apartments.filter((a) => {
      const d = daysBetween(a.end_date);
      return d !== null && d <= 30;
    }).length;
    const obligationRemaining = obligations.reduce((s, o) => s + (Number(o.amount_due || 0) - Number(o.payment1 || 0) - Number(o.payment2 || 0)), 0);
    return { totalRentIncome, expiringSoon, obligationRemaining, count: apartments.length };
  }, [apartments, transactions, obligations]);

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    { id: "apartments", label: "الشقق والمستأجرين", icon: Building2 },
    { id: "transactions", label: "المعاملات المالية", icon: Wallet },
    { id: "obligations", label: "الالتزامات العائلية", icon: HandCoins },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", background: COLORS.bg, minHeight: "100vh", padding: 20, color: COLORS.text }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>إدارة العمارة السكنية</h1>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "4px 0 0" }}>10 شقق — مشتركة بين الإخوة الأربعة</p>
          </div>
          {saveNote && <span style={{ fontSize: 12, color: COLORS.success }}>{saveNote}</span>}
        </div>

        {errorMsg && (
          <Card style={{ marginBottom: 16, borderColor: COLORS.danger }}>
            <span style={{ color: COLORS.danger, fontSize: 14 }}>{errorMsg}</span>
          </Card>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ border: "none", background: "transparent", padding: "10px 14px", fontSize: 14, fontWeight: active ? 700 : 500, color: active ? COLORS.accent : COLORS.textMuted, borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: -1 }}>
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ color: COLORS.textMuted }}>جارِ التحميل...</p>
        ) : (
          <>
            {tab === "overview" && <Overview kpis={kpis} apartments={apartments} />}
            {tab === "apartments" && <Apartments apartments={apartments} refresh={loadAll} flash={flash} />}
            {tab === "transactions" && <Transactions transactions={transactions} apartments={apartments} refresh={loadAll} flash={flash} />}
            {tab === "obligations" && <Obligations obligations={obligations} refresh={loadAll} flash={flash} />}
          </>
        )}
      </div>
    </div>
  );
}

function Overview({ kpis, apartments }) {
  const items = [
    { label: "عدد الشقق", value: kpis.count, icon: Building2, color: COLORS.accent, bg: COLORS.accentLight },
    { label: "إجمالي إيرادات الإيجار", value: fmtSAR(kpis.totalRentIncome), icon: Wallet, color: COLORS.success, bg: COLORS.successLight },
    { label: "تنبيهات عقود قريبة الانتهاء", value: kpis.expiringSoon, icon: AlertTriangle, color: COLORS.warning, bg: COLORS.warningLight },
    { label: "متبقي من الالتزامات العائلية", value: fmtSAR(kpis.obligationRemaining), icon: HandCoins, color: COLORS.clay, bg: COLORS.clayLight },
  ];
  const alerts = apartments
    .map((a) => ({ a, status: contractStatus(a.end_date) }))
    .filter((x) => x.status.days !== undefined && x.status.days <= 30)
    .sort((x, y) => x.status.days - y.status.days);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <Card key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: it.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color={it.color} />
                </div>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{it.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{it.value}</div>
            </Card>
          );
        })}
      </div>
      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>عقود تحتاج متابعة</h3>
        {alerts.length === 0 && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>لا توجد عقود قريبة من الانتهاء حاليًا.</p>}
        {alerts.map(({ a, status }) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 14 }}>شقة {a.number} — {a.tenant_name || "بدون اسم"}</span>
            <Badge label={status.label} color={status.color} bg={status.bg} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function Apartments({ apartments, refresh, flash }) {
  const [form, setForm] = useState(emptyApt);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = (a) => {
    setForm(a);
    setEditingId(a.id);
    setShowForm(true);
  };
  const resetForm = () => {
    setForm(emptyApt);
    setEditingId(null);
    setShowForm(false);
  };
  const save = async () => {
    if (!form.number || !form.tenant_name) return;
    setSaving(true);
    const payload = { ...form };
    delete payload.id;
    delete payload.created_at;
    let res;
    if (editingId) {
      res = await supabase.from("apartments").update(payload).eq("id", editingId);
    } else {
      res = await supabase.from("apartments").insert(payload);
    }
    setSaving(false);
    if (!res.error) {
      flash(editingId ? "تم تحديث الشقة" : "تمت إضافة الشقة");
      resetForm();
      refresh();
    }
  };
  const remove = async (id) => {
    await supabase.from("apartments").delete().eq("id", id);
    refresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        {!showForm && <PrimaryBtn onClick={() => setShowForm(true)}><Plus size={16} /> إضافة شقة</PrimaryBtn>}
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <Field label="رقم الشقة"><input style={inputStyle} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
            <Field label="اسم المستأجر"><input style={inputStyle} value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} /></Field>
            <Field label="رقم الجوال"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05XXXXXXXX" /></Field>
            <Field label="قيمة الإيجار (ريال)"><input style={inputStyle} type="number" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} /></Field>
            <Field label="دورية الدفع">
              <select style={inputStyle} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="تاريخ بداية العقد"><input style={inputStyle} type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="تاريخ نهاية العقد"><input style={inputStyle} type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
            <Field label="ملاحظات"><input style={inputStyle} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryBtn onClick={save} style={{ opacity: saving ? 0.6 : 1 }}><Check size={16} /> حفظ</PrimaryBtn>
            <button onClick={resetForm} style={{ border: `1px solid ${COLORS.border}`, background: "transparent", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 14 }}>إلغاء</button>
          </div>
        </Card>
      )}

      {apartments.length === 0 && <p style={{ color: COLORS.textMuted, fontSize: 14 }}>لا توجد شقق مضافة بعد.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {apartments.map((a) => {
          const status = contractStatus(a.end_date);
          const link = waLink(a);
          return (
            <Card key={a.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>شقة {a.number}</span>
                    <Badge label={status.label} color={status.color} bg={status.bg} />
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted }}>{a.tenant_name} · {a.phone} · {fmtSAR(a.rent)} / {a.frequency}</div>
                  {a.notes && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{a.notes}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {link && (
                    <a href={link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.successLight, color: COLORS.success, padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                        <MessageCircle size={15} /> إرسال تذكير
                      </span>
                    </a>
                  )}
                  <IconBtn onClick={() => startEdit(a)} title="تعديل"><Pencil size={16} /></IconBtn>
                  <IconBtn onClick={() => remove(a.id)} title="حذف" color={COLORS.danger}><Trash2 size={16} /></IconBtn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Transactions({ transactions, apartments, refresh, flash }) {
  const [form, setForm] = useState(emptyTx);
  const [showForm, setShowForm] = useState(false);

  const save = async () => {
    if (!form.date || !form.amount) return;
    const payload = { ...form };
    if (!payload.apartment_id) payload.apartment_id = null;
    const res = await supabase.from("transactions").insert(payload);
    if (!res.error) {
      flash("تمت إضافة المعاملة");
      setForm(emptyTx);
      setShowForm(false);
      refresh();
    }
  };
  const remove = async (id) => {
    await supabase.from("transactions").delete().eq("id", id);
    refresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        {!showForm && <PrimaryBtn onClick={() => setShowForm(true)}><Plus size={16} /> إضافة معاملة</PrimaryBtn>}
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <Field label="التاريخ"><input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="النوع">
              <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="الشقة المرتبطة (اختياري)">
              <select style={inputStyle} value={form.apartment_id} onChange={(e) => setForm({ ...form, apartment_id: e.target.value })}>
                <option value="">—</option>
                {apartments.map((a) => <option key={a.id} value={a.id}>شقة {a.number}</option>)}
              </select>
            </Field>
            <Field label="المبلغ (ريال)"><input style={inputStyle} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="البنك / طريقة الدفع"><input style={inputStyle} value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></Field>
            <Field label="المسؤول">
              <select style={inputStyle} value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })}>
                {RESPONSIBLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="ملاحظات"><input style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryBtn onClick={save}><Check size={16} /> حفظ</PrimaryBtn>
            <button onClick={() => setShowForm(false)} style={{ border: `1px solid ${COLORS.border}`, background: "transparent", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 14 }}>إلغاء</button>
          </div>
        </Card>
      )}

      {transactions.length === 0 && <p style={{ color: COLORS.textMuted, fontSize: 14 }}>لا توجد معاملات مسجلة بعد.</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}`, textAlign: "right" }}>
              {["التاريخ", "النوع", "الشقة", "المبلغ", "البنك", "المسؤول", ""].map((h) => (
                <th key={h} style={{ padding: "8px 6px", color: COLORS.textMuted, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const apt = apartments.find((a) => a.id === t.apartment_id);
              return (
                <tr key={t.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "8px 6px" }}>{t.date}</td>
                  <td style={{ padding: "8px 6px" }}>{t.type}</td>
                  <td style={{ padding: "8px 6px" }}>{apt ? `شقة ${apt.number}` : "—"}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{fmtSAR(t.amount)}</td>
                  <td style={{ padding: "8px 6px" }}>{t.bank}</td>
                  <td style={{ padding: "8px 6px" }}>{t.responsible}</td>
                  <td style={{ padding: "8px 6px" }}><IconBtn onClick={() => remove(t.id)} title="حذف" color={COLORS.danger}><Trash2 size={15} /></IconBtn></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Obligations({ obligations, refresh, flash }) {
  const [form, setForm] = useState(emptyObl);
  const [showForm, setShowForm] = useState(false);

  const save = async () => {
    if (!form.year || !form.amount_due) return;
    const res = await supabase.from("obligations").insert(form);
    if (!res.error) {
      flash("تمت إضافة الالتزام");
      setForm(emptyObl);
      setShowForm(false);
      refresh();
    }
  };
  const remove = async (id) => {
    await supabase.from("obligations").delete().eq("id", id);
    refresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        {!showForm && <PrimaryBtn onClick={() => setShowForm(true)}><Plus size={16} /> إضافة التزام</PrimaryBtn>}
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <Field label="المستفيد">
              <select style={inputStyle} value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })}>
                {BENEFICIARIES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="السنة الهجرية"><input style={inputStyle} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="1447" /></Field>
            <Field label="المبلغ المستحق سنويًا"><input style={inputStyle} type="number" value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: e.target.value })} /></Field>
            <Field label="تاريخ الاستحقاق"><input style={inputStyle} type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <Field label="دفعة 1"><input style={inputStyle} type="number" value={form.payment1} onChange={(e) => setForm({ ...form, payment1: e.target.value })} /></Field>
            <Field label="دفعة 2"><input style={inputStyle} type="number" value={form.payment2} onChange={(e) => setForm({ ...form, payment2: e.target.value })} /></Field>
            <Field label="البنك"><input style={inputStyle} value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryBtn onClick={save}><Check size={16} /> حفظ</PrimaryBtn>
            <button onClick={() => setShowForm(false)} style={{ border: `1px solid ${COLORS.border}`, background: "transparent", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 14 }}>إلغاء</button>
          </div>
        </Card>
      )}

      {obligations.length === 0 && <p style={{ color: COLORS.textMuted, fontSize: 14 }}>لا توجد التزامات مسجلة بعد.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {obligations.map((o) => {
          const paid = Number(o.payment1 || 0) + Number(o.payment2 || 0);
          const remaining = Number(o.amount_due || 0) - paid;
          const done = remaining <= 0;
          return (
            <Card key={o.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{o.beneficiary} — {o.year}هـ</span>
                    <Badge label={done ? "مكتمل" : `متبقي ${fmtSAR(remaining)}`} color={done ? COLORS.success : COLORS.warning} bg={done ? COLORS.successLight : COLORS.warningLight} />
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted }}>المستحق: {fmtSAR(o.amount_due)} · المدفوع: {fmtSAR(paid)} · البنك: {o.bank || "—"}</div>
                </div>
                <IconBtn onClick={() => remove(o.id)} title="حذف" color={COLORS.danger}><Trash2 size={16} /></IconBtn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
