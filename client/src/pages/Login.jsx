import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Animated background */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />
      <div style={styles.bgOrb3} />

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(1.1); }
          66% { transform: translate(50px, -20px) scale(0.9); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 40px) scale(1.08); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.3); }
          50% { box-shadow: 0 0 40px rgba(0, 212, 255, 0.6); }
        }
        .login-input:focus {
          border-color: #00d4ff !important;
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.15) !important;
          outline: none;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 212, 255, 0.4) !important;
        }
        .quick-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: #00d4ff !important;
        }
      `}</style>

      <form onSubmit={handleSubmit} style={styles.card}>
        {/* Logo / Title */}
        <div style={styles.logoSection}>
          <div style={styles.crossIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="18" y="4" width="12" height="40" rx="3" fill="#00d4ff" />
              <rect x="4" y="18" width="40" height="12" rx="3" fill="#00d4ff" />
            </svg>
          </div>
          <h1 style={styles.title}>Metro County EMS</h1>
          <p style={styles.subtitle}>Dispatch Platform</p>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={{ marginRight: 8 }}>&#9888;</span>
            {error}
          </div>
        )}

        {/* Fields */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Email Address</label>
          <input
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dispatcher@metrocounty.gov"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Password</label>
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={styles.input}
          />
        </div>

        {/* Login button */}
        <button
          className="login-btn"
          type="submit"
          disabled={loading}
          style={styles.loginBtn}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>

        <p style={styles.footer}>
          Authorized personnel only. All access is logged and monitored.
        </p>
      </form>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 40%, #0d1b2a 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  bgOrb1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
    top: '-10%',
    left: '-10%',
    animation: 'float1 12s ease-in-out infinite',
  },
  bgOrb2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,107,107,0.1) 0%, transparent 70%)',
    bottom: '-5%',
    right: '-5%',
    animation: 'float2 15s ease-in-out infinite',
  },
  bgOrb3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(95,39,205,0.1) 0%, transparent 70%)',
    top: '40%',
    right: '20%',
    animation: 'float3 10s ease-in-out infinite',
  },
  card: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 420,
    padding: '48px 40px',
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
    animation: 'pulse 4s ease-in-out infinite',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: 32,
  },
  crossIcon: {
    marginBottom: 12,
    display: 'inline-block',
    filter: 'drop-shadow(0 0 12px rgba(0, 212, 255, 0.5))',
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  errorBox: {
    background: 'rgba(255, 71, 87, 0.15)',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 20,
    color: '#ff6b6b',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#ffffff',
    fontSize: 15,
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  loginBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #00d4ff 0%, #0090ff 100%)',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  quickBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: 12,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 24,
    marginBottom: 0,
    lineHeight: 1.5,
  },
};
