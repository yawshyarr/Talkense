console.log("AuthPages.jsx script executing...");
const { motion, AnimatePresence } = window;

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-[85vh] flex items-center justify-center relative z-10 px-4">
      {/* Background glow for auth forms */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] z-0 pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="glass-card w-full max-w-md p-8 relative z-10 border-t border-l border-white/10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2">{title}</h2>
          <p className="text-gray-400 text-sm">{subtitle}</p>
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
      // 1. Get Token
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const tokenRes = await fetch('http://localhost:8002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      if (!tokenRes.ok) throw new Error("Invalid credentials");
      const tokenData = await tokenRes.json();
      localStorage.setItem('token', tokenData.access_token);
      
      // 2. Get User Profile
      const meRes = await fetch('http://localhost:8002/api/auth/me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      
      if (!meRes.ok) throw new Error("Failed to load user profile");
      const userData = await meRes.json();
      
      setUser({ ...userData, streaks: userData.streak_count });
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Log in to access your speech analytics">
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
          <input 
            type="email" 
            required
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
          <input 
            type="password" 
            required
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <button 
          type="submit"
          className="w-full btn-neon py-3 rounded-lg bg-gradient-to-r from-primary to-blue-600 text-white font-bold shadow-lg shadow-primary/20 mt-4"
        >
          Sign In
        </button>
      </form>
      
      <p className="mt-6 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <span 
          onClick={() => onNavigate('register')}
          className="text-primary hover:text-white cursor-pointer transition-colors"
        >
          Register Here
        </span>
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
      const res = await fetch('http://localhost:8002/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Registration failed");
      }
      
      // Auto-login after register
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const tokenRes = await fetch('http://localhost:8002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      const tokenData = await tokenRes.json();
      localStorage.setItem('token', tokenData.access_token);
      
      const meRes = await fetch('http://localhost:8002/api/auth/me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      const userData = await meRes.json();
      
      setUser({ ...userData, streaks: userData.streak_count });
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Join TalkSense to elevate your speaking skills">
      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
          <input 
            type="text" 
            required
            className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="Alex Johnson"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
          <input 
            type="email" 
            required
            className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
          <input 
            type="password" 
            required
            className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <button 
          type="submit"
          className="w-full btn-neon py-3 rounded-lg bg-gradient-to-r from-secondary to-blue-600 text-white font-bold shadow-lg shadow-secondary/20 mt-6"
        >
          Create Account
        </button>
      </form>
      
      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <span 
          onClick={() => onNavigate('login')}
          className="text-secondary hover:text-white cursor-pointer transition-colors"
        >
          Log In
        </span>
      </p>
    </AuthLayout>
  );
};

window.TalkSense.register('LoginPage', LoginPage);
window.TalkSense.register('RegisterPage', RegisterPage);
