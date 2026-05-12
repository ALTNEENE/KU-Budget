import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LogOut, Plus, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const COLORS = ['#58a6ff', '#2ea043', '#d29922', '#da3633', '#a371f7'];

const Dashboard = ({ setIsAuthenticated }) => {
  const [data, setData] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    balance: 0,
    status: 'Stable',
    expenseCategories: [],
    trends: []
  });
  
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form states
  const [formContent, setFormContent] = useState({ category: '', amount: '', date: new Date().toISOString().split('T')[0] });

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [dashRes, expRes, revRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard`, { headers }),
        axios.get(`${API_URL}/expenses`, { headers }),
        axios.get(`${API_URL}/revenues`, { headers })
      ]);

      setData(dashRes.data);
      setExpenses(expRes.data);
      setRevenues(revRes.data);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  const calculateStatusClass = () => {
    if (data.status === 'Over Budget') return 'status-red';
    if (data.status === 'Under Budget') return 'status-green';
    return 'status-yellow';
  };

  const calculateStatusIcon = () => {
    if (data.status === 'Over Budget') return '↓';
    if (data.status === 'Under Budget') return '↑';
    return '→';
  };
  
  const getTranslatedStatus = () => {
    if (data.status === 'Over Budget') return 'تجاوز الميزانية';
    if (data.status === 'Under Budget') return 'أقل من الميزانية';
    return 'مستقر';
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleAddSubmit = async (type, e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/${type}`, formContent, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast(`تمت إضافة ${type === 'expenses' ? 'المنصرف' : 'الإيراد'} بنجاح!`);
      setShowExpenseModal(false);
      setShowRevenueModal(false);
      setFormContent({ category: '', amount: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
      alert('خطأ في إضافة السجل');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/${editData.type}/${editData.id}`, {
        category: editData.category,
        amount: editData.amount,
        date: editData.date
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('تم تعديل السجل بنجاح!');
      setEditData(null);
    } catch (err) {
      console.error(err);
      alert('خطأ في تعديل السجل');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا السجل؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/${type}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('تم حذف السجل بنجاح!');
    } catch (err) {
      console.error(err);
      alert('خطأ في حذف السجل');
    }
  };

  const generatePDF = async () => {
    try {
      showToast('جاري تحضير التقرير، يرجى الانتظار...');
      const element = document.getElementById('pdf-report-template');
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save("تقرير-ميزانية-جامعة-كرري.pdf");
      showToast('تم تحميل التقرير بنجاح!');
    } catch (err) {
      console.error(err);
      alert('خطأ أثناء تحضير التقرير');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--accent-color)' }}>جاري تحميل لوحة المعلومات...</div>;

  const isDatabaseEmpty = (expenses.length === 0 && revenues.length === 0);

  return (
    <div className="dashboard-page fade-in">
      {/* Hidden Arabic PDF Report Template */}
      <div id="pdf-report-template" style={{ position: 'absolute', top: '-10000px', left: 0, width: '800px', background: 'white', color: 'black', direction: 'rtl', padding: '40px', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #ddd', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', color: '#161b22', marginBottom: '10px' }}>جامعة كرري</h1>
          <h2 style={{ fontSize: '20px', color: '#555' }}>تقرير الميزانية المالي</h2>
          <p style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #eee' }}>
          <div style={{ textAlign: 'center' }}><strong style={{ display: 'block', color: '#555', marginBottom: '5px' }}>الإيرادات</strong> <span style={{color: '#2ea043', fontSize: '18px', fontWeight: 'bold'}}>+{data.totalRevenue.toLocaleString()} ج.س</span></div>
          <div style={{ textAlign: 'center' }}><strong style={{ display: 'block', color: '#555', marginBottom: '5px' }}>المنصرفات</strong> <span style={{color: '#da3633', fontSize: '18px', fontWeight: 'bold'}}>-{data.totalExpense.toLocaleString()} ج.س</span></div>
          <div style={{ textAlign: 'center' }}><strong style={{ display: 'block', color: '#555', marginBottom: '5px' }}>الرصيد</strong> <span style={{color: '#161b22', fontSize: '18px', fontWeight: 'bold'}}>{data.balance.toLocaleString()} ج.س</span></div>
          <div style={{ textAlign: 'center' }}><strong style={{ display: 'block', color: '#555', marginBottom: '5px' }}>الحالة</strong> <span style={{color: data.status === 'Over Budget' ? '#da3633' : '#2ea043', fontSize: '18px', fontWeight: 'bold'}}>{getTranslatedStatus()}</span></div>
        </div>

        <h3 style={{ fontSize: '18px', color: '#161b22', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>تفاصيل الإيرادات</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'right', color: '#555' }}>التاريخ</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'right', color: '#555' }}>الفئة</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left', color: '#555' }}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {revenues.length > 0 ? revenues.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{r.date}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{r.category}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '10px', textAlign: 'left' }}>{r.amount.toLocaleString()}</td>
              </tr>
            )) : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '10px' }}>لا توجد إيرادات</td></tr>}
          </tbody>
        </table>

        <h3 style={{ fontSize: '18px', color: '#161b22', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>تفاصيل المنصرفات</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'right', color: '#555' }}>التاريخ</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'right', color: '#555' }}>الفئة</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left', color: '#555' }}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length > 0 ? expenses.map((e, i) => (
              <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{e.date}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>{e.category}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '10px', textAlign: 'left' }}>{e.amount.toLocaleString()}</td>
              </tr>
            )) : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '10px' }}>لا توجد منصرفات</td></tr>}
          </tbody>
        </table>
      </div>

      <header style={{ borderRadius: '12px', marginBottom: '30px' }}>
        <div className="logo-section">
          <div style={{ padding: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #2ea043, #58a6ff)' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
          </div>
          <h1>نظام تتبع الميزانية جامعة كرري</h1>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          <button onClick={generatePDF} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> تنزيل التقرير
          </button>
          <button onClick={handleLogout} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={16} /> تسجيل الخروج
          </button>
        </div>
      </header>

      {isDatabaseEmpty ? (
        <div className="empty-state fade-in">
          <div style={{ marginBottom: '20px' }}>
            <DollarSign size={64} style={{ color: 'var(--panel-border)' }} />
          </div>
          <h3>لا توجد بيانات متاحة</h3>
          <p>قاعدة البيانات فارغة. للبدء، أضف السجل المالي الأول.</p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
             <button onClick={() => setShowRevenueModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> إضافة أول إيراد
            </button>
            <button onClick={() => setShowExpenseModal(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-red)' }}>
              <Plus size={16} /> إضافة أول منصرف
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-header">
            <h2>نظرة عامة مالية</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowRevenueModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-green)' }}>
                <Plus size={16} /> إضافة إيراد
              </button>
              <button onClick={() => setShowExpenseModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-red)' }}>
                <Plus size={16} /> إضافة منصرف
              </button>
            </div>
          </div>

          <div className="cards-grid">
            <div className="metric-card">
              <div style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--color-green)', background: 'rgba(46,160,67,0.1)', padding: '8px', borderRadius: '50%' }}>
                <TrendingUp size={24} />
              </div>
              <h3>إجمالي الإيرادات</h3>
              <div className="value" style={{ color: 'var(--text-primary)' }}>{data.totalRevenue.toLocaleString()} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>ج.س</span></div>
            </div>
            
            <div className="metric-card">
              <div style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--color-red)', background: 'rgba(218,54,51,0.1)', padding: '8px', borderRadius: '50%' }}>
                <TrendingDown size={24} />
              </div>
              <h3>إجمالي المنصرفات</h3>
              <div className="value" style={{ color: 'var(--text-primary)' }}>{data.totalExpense.toLocaleString()} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>ج.س</span></div>
            </div>

            <div className={`metric-card ${calculateStatusClass()}`}>
               <div style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(240,246,252,0.1)', padding: '8px', borderRadius: '50%' }}>
                <DollarSign size={24} />
              </div>
              <h3>صافي الرصيد</h3>
              <div className="value">{data.balance.toLocaleString()} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>ج.س</span></div>
            </div>

            <div className={`metric-card ${calculateStatusClass()}`}>
              <h3>حالة الميزانية</h3>
              <div className="value" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getTranslatedStatus()} <span>{calculateStatusIcon()}</span>
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>مسار الميزانية</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a303c" vertical={false} />
                    <XAxis dataKey="date" stroke="#848d97" axisLine={false} tickLine={false} />
                    <YAxis stroke="#848d97" axisLine={false} tickLine={false} orientation="right" />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#161b22', borderColor: '#21262d', borderRadius: '8px', color: '#e6edf3', textAlign: 'left' }}
                      itemStyle={{ color: '#e6edf3' }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-green)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="الإيرادات" />
                    <Line type="monotone" dataKey="expense" stroke="var(--color-red)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="المنصرفات" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <h3>توزيع المنصرفات</h3>
              <div style={{ width: '100%', height: 300 }}>
                {data.expenseCategories.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={data.expenseCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.expenseCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#21262d', borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    لا توجد بيانات للمنصرفات
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="tables-grid">
            <div className="table-card">
              <div className="table-header-flex">
                <h3>أحدث الإيرادات</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الفئة</th>
                    <th className="text-right">المبلغ</th>
                    <th className="text-right">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {revenues.slice(0, 5).map(rev => (
                    <tr key={rev.id}>
                      <td>{rev.date}</td>
                      <td>{rev.category}</td>
                      <td className="text-right" style={{ color: 'var(--color-green)', fontWeight: 500 }}>+{rev.amount.toLocaleString()}</td>
                      <td className="text-right">
                        <button className="action-btn btn-edit" onClick={() => setEditData({ type: 'revenues', ...rev })} style={{ marginInlineEnd: '10px' }}>تعديل</button>
                        <button className="action-btn btn-delete" onClick={() => handleDelete('revenues', rev.id)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                  {revenues.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>لا توجد إيرادات مسجلة</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-card">
              <div className="table-header-flex">
                <h3>أحدث المنصرفات</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الفئة</th>
                    <th className="text-right">المبلغ</th>
                    <th className="text-right">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 5).map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.date}</td>
                      <td>{exp.category}</td>
                      <td className="text-right" style={{ color: 'var(--color-red)', fontWeight: 500 }}>-{exp.amount.toLocaleString()}</td>
                      <td className="text-right">
                        <button className="action-btn btn-edit" onClick={() => setEditData({ type: 'expenses', ...exp })} style={{ marginInlineEnd: '10px' }}>تعديل</button>
                        <button className="action-btn btn-delete" onClick={() => handleDelete('expenses', exp.id)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>لا توجد منصرفات مسجلة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Revenue Modal */}
      {showRevenueModal && (
        <div className="modal-overlay" onClick={() => setShowRevenueModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>إضافة إيراد</span>
              <button className="modal-close" onClick={() => setShowRevenueModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => handleAddSubmit('revenues', e)}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الفئة / المصدر</label>
              <input type="text" value={formContent.category} onChange={e => setFormContent({...formContent, category: e.target.value})} required placeholder="مثلاً: الرسوم الدراسية" />
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>المبلغ (جنيه سوداني)</label>
              <input type="number" min="0" step="0.01" value={formContent.amount} onChange={e => setFormContent({...formContent, amount: e.target.value})} required placeholder="0.00" />
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>التاريخ</label>
              <input type="date" value={formContent.date} onChange={e => setFormContent({...formContent, date: e.target.value})} required />
              
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowRevenueModal(false)}>إلغاء</button>
                <button type="submit" style={{ backgroundColor: 'var(--color-green)' }}>إضافة إيراد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>إضافة منصرف</span>
              <button className="modal-close" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => handleAddSubmit('expenses', e)}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الفئة</label>
              <input type="text" value={formContent.category} onChange={e => setFormContent({...formContent, category: e.target.value})} required placeholder="مثلاً: الصيانة، الكهرباء" />
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>المبلغ (جنيه سوداني)</label>
              <input type="number" min="0" step="0.01" value={formContent.amount} onChange={e => setFormContent({...formContent, amount: e.target.value})} required placeholder="0.00" />
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>التاريخ</label>
              <input type="date" value={formContent.date} onChange={e => setFormContent({...formContent, date: e.target.value})} required />
              
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowExpenseModal(false)}>إلغاء</button>
                <button type="submit" style={{ backgroundColor: 'var(--color-red)' }}>إضافة منصرف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && <div className="toast">{toastMessage}</div>}

      {/* Edit Modal */}
      {editData && (
        <div className="modal-overlay" onClick={() => setEditData(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>تعديل السجل</span>
              <button className="modal-close" onClick={() => setEditData(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الفئة / المصدر</label>
              <input type="text" value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})} required />
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>المبلغ (جنيه سوداني)</label>
              <input type="number" min="0" step="0.01" value={editData.amount} onChange={e => setEditData({...editData, amount: e.target.value})} required />
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>التاريخ</label>
              <input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} required />
              
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditData(null)}>إلغاء</button>
                <button type="submit" style={{ backgroundColor: 'var(--accent-color)' }}>حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
