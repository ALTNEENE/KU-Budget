import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ setIsAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setIsAuthenticated(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${API_URL}/api/auth/change-password`, {
        email,
        oldPassword: password,
        newPassword
      });

      setSuccessMsg(res.data.message);
      setTimeout(() => {
        setIsChangingPassword(false);
        setPassword('');
        setNewPassword('');
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تغيير كلمة المرور.');
    }
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-card">
        <div style={{ marginBottom: '20px' }}>
            {/* Adding a placeholder KU Logo style or generic icon */}
            <div style={{ display: 'inline-block', padding: '15px', borderRadius: '50%', background: 'linear-gradient(135deg, #2ea043, #58a6ff)', marginBottom: '15px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
            </div>
        </div>
        <h2>جامعة كرري</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>نظام تتبع الميزانية</p>
        
        {error && <div style={{ color: 'var(--color-red)', marginBottom: '15px', background: 'rgba(218,54,51,0.1)', padding: '10px', borderRadius: '6px' }}>{error}</div>}
        {successMsg && <div style={{ color: 'var(--color-green)', marginBottom: '15px', background: 'rgba(46,160,67,0.1)', padding: '10px', borderRadius: '6px' }}>{successMsg}</div>}
        
        {!isChangingPassword ? (
          <form onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="البريد الإلكتروني للمسؤول"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="كلمة المرور"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <button type="submit" style={{ width: '100%', marginTop: '10px', marginBottom: '15px' }}>تسجيل الدخول</button>
            <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              <button type="button" onClick={() => { setIsChangingPassword(true); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0 }}>
                هل ترغب في تغيير كلمة المرور؟
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword}>
            <input 
              type="email" 
              placeholder="البريد الإلكتروني"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="كلمة المرور الحالية"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="كلمة المرور الجديدة"
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
            />
            <button type="submit" style={{ width: '100%', marginTop: '10px', backgroundColor: 'var(--color-yellow)', marginBottom: '15px', color: '#161b22' }}>حفظ وتسجيل الدخول</button>
            <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              <button type="button" onClick={() => { setIsChangingPassword(false); setError(''); setNewPassword(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                العودة للوراء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
