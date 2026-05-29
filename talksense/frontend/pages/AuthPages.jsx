console.log("AuthPages.jsx script executing...");

const AuthLayout = ({ children, title, subtitle }) => {
  const motion = window.motion || { div: 'div' };
  return (
    <div className="min-h-screen flex items-center justify-center relative px-6 bg-[#f8fafc] dark:bg-black transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-100 dark:bg-blue-900 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 dark:bg-indigo-900 rounded-full blur-[120px]"></div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card w-full max-w-lg p-12 relative z-10 border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0a0a0a] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 rounded-[3rem]"
      >
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-[#064e3b] dark:bg-[#1e40af] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-900/20 dark:shadow-blue-900/30">
            <svg className="w-10 h-10 text-emerald-400 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg uppercase tracking-tight opacity-60 italic">{subtitle}</p>
        </div>
        
        {children}
      </motion.div>
    </div>
  );
};

const LoginPage = ({ onNavigate, setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const tokenRes = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      if (!tokenRes.ok) throw new Error("Invalid email or password");
      const tokenData = await tokenRes.json();
      localStorage.setItem('token', tokenData.access_token);
      
      const meRes = await fetch('http://127.0.0.1:8000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      const userData = await meRes.json();
      
      localStorage.setItem('talksense_auth_context', JSON.stringify({
        type: 'login',
        timestamp: Date.now(),
        userName: userData.name,
      }));
      setUser(userData);
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout title="Access Terminal" subtitle="Secure biometric handshake required">
      <form onSubmit={handleLogin} className="space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900 text-red-500 dark:text-red-400 p-6 rounded-[1.5rem] text-sm font-black text-center uppercase tracking-widest">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Identity Signature</label>
          <input 
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#111111] border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] px-8 py-5 text-slate-900 dark:text-white focus:outline-none focus:border-[#064e3b] dark:focus:border-[#1e40af] focus:bg-white dark:focus:bg-black transition-all font-bold text-lg shadow-inner"
            placeholder="name@domain.com"
          />
        </div>
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Passkey Hash</label>
          <input 
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#111111] border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] px-8 py-5 text-slate-900 dark:text-white focus:outline-none focus:border-[#064e3b] dark:focus:border-[#1e40af] focus:bg-white dark:focus:bg-black transition-all font-bold text-lg shadow-inner"
            placeholder="••••••••"
          />
        </div>
        
        <button type="submit" className="w-full py-6 rounded-[2rem] bg-[#064e3b] dark:bg-[#1e40af] hover:bg-emerald-900 dark:hover:bg-blue-800 text-white text-xl font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/30 dark:shadow-blue-900/40 transition-all transform hover:scale-[1.02]">
          Authenticate
        </button>
      </form>
      <p className="mt-12 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
        New to TalkSense?{' '}
        <span onClick={() => onNavigate('register')} className="text-emerald-600 dark:text-blue-400 hover:text-emerald-500 dark:hover:text-blue-300 cursor-pointer transition-colors border-b-2 border-emerald-100 dark:border-blue-900 ml-2">Initialize Profile</span>
      </p>
    </AuthLayout>
  );
};

const RegisterPage = ({ onNavigate, setUser }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Registration failed");
      }
      
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const tokenRes = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      const tokenData = await tokenRes.json();
      localStorage.setItem('token', tokenData.access_token);
      
      const meRes = await fetch('http://127.0.0.1:8000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      const userData = await meRes.json();
      
      localStorage.setItem('talksense_auth_context', JSON.stringify({
        type: 'register',
        timestamp: Date.now(),
        userName: userData.name,
      }));
      setUser(userData);
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout title="New Enrollment" subtitle="Establish your communication profile">
      <form onSubmit={handleRegister} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900 text-red-500 dark:text-red-400 p-6 rounded-[1.5rem] text-sm font-black text-center uppercase tracking-widest">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Legal Full Name</label>
          <input 
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#111111] border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] px-8 py-5 text-slate-900 dark:text-white focus:outline-none focus:border-[#064e3b] dark:focus:border-[#1e40af] focus:bg-white dark:focus:bg-black transition-all font-bold text-lg shadow-inner"
            placeholder="Alex Johnson"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Identity Signature</label>
          <input 
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#111111] border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] px-8 py-5 text-slate-900 dark:text-white focus:outline-none focus:border-[#064e3b] dark:focus:border-[#1e40af] focus:bg-white dark:focus:bg-black transition-all font-bold text-lg shadow-inner"
            placeholder="name@domain.com"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Passkey Hash</label>
          <input 
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#111111] border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] px-8 py-5 text-slate-900 dark:text-white focus:outline-none focus:border-[#064e3b] dark:focus:border-[#1e40af] focus:bg-white dark:focus:bg-black transition-all font-bold text-lg shadow-inner"
            placeholder="••••••••"
          />
        </div>
        
        <button type="submit" className="w-full py-6 rounded-[2rem] bg-[#064e3b] dark:bg-[#1e40af] hover:bg-emerald-900 dark:hover:bg-blue-800 text-white text-xl font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/30 dark:shadow-blue-900/40 transition-all transform hover:scale-[1.02] mt-6">
          Initialize Profile
        </button>
      </form>
      <p className="mt-12 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
        Already enrolled?{' '}
        <span onClick={() => onNavigate('login')} className="text-emerald-600 dark:text-blue-400 hover:text-emerald-500 dark:hover:text-blue-300 cursor-pointer transition-colors border-b-2 border-emerald-100 dark:border-blue-900 ml-2">Authenticate Here</span>
      </p>
    </AuthLayout>
  );
};

window.TalkSense.register('LoginPage', LoginPage);
window.TalkSense.register('RegisterPage', RegisterPage);
