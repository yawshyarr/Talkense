// Babel-standalone automatically injects globals from index.html
// useState, useEffect, motion, AnimatePresence are available globally
// A Simple Router since we don't have react-router-dom
function App() {
  console.log("App component initializing...");
  const { 
    LandingPage, LoginPage, RegisterPage, Dashboard, 
    SetupPage, LiveSpeechPage, ReportPage, AICoachPage, VocabPage, AnalyticsPage, Navbar,
    motion, AnimatePresence
  } = window;

  if (!Navbar || !LandingPage) {
    return null; // Silent load
  }

  const [currentPage, setCurrentPage] = useState('landing');
  const [pageData, setPageData] = useState(null);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    console.log("App re-rendered. Current page:", currentPage, "User:", user, "Theme:", theme);
  }, [currentPage, user, theme]);

  const handleSetUser = (u) => {
    console.log("Setting user state:", u);
    setUser(u);
  };

  const navigate = (page, data = null) => {
    console.log("NAVIGATE CALLED:", page);
    console.log("Current window.AnalyticsPage:", !!window.AnalyticsPage);
    setCurrentPage(page);
    setPageData(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    const { 
      LandingPage, LoginPage, RegisterPage, Dashboard, 
      SetupPage, LiveSpeechPage, ReportPage, AICoachPage, VocabPage, SpeechLabPage, AnalyticsPage 
    } = window;

    try {
      console.log("CRITICAL: App.renderPage called. CurrentPage:", currentPage);
      switch(currentPage) {
        case 'landing':
          return LandingPage ? <LandingPage onNavigate={navigate} /> : <div>Loading...</div>;
        case 'login':
          return LoginPage ? <LoginPage onNavigate={navigate} setUser={handleSetUser} /> : <div>Loading...</div>;
        case 'register':
          return RegisterPage ? <RegisterPage onNavigate={navigate} setUser={handleSetUser} /> : <div>Loading...</div>;
        case 'dashboard':
          return Dashboard ? <Dashboard user={user} onNavigate={navigate} theme={theme} toggleTheme={toggleTheme} /> : <div>Loading...</div>;
        case 'setup':
          return SetupPage ? <SetupPage onNavigate={navigate} /> : <div>Loading...</div>;
        case 'live':
          return LiveSpeechPage ? <LiveSpeechPage onNavigate={navigate} config={pageData} /> : <div>Loading...</div>;
        case 'report':
          return ReportPage ? <ReportPage onNavigate={navigate} sessionData={pageData} /> : <div>Loading...</div>;
        case 'coach':
          return AICoachPage ? <AICoachPage user={user} onNavigate={navigate} /> : <div>Loading...</div>;
        case 'vocab':
          return VocabPage ? <VocabPage user={user} onNavigate={navigate} /> : <div>Loading...</div>;
        case 'analytics':
          if (!AnalyticsPage) {
            console.warn("Analytics component not found on window yet.");
            return <div className="p-20 text-center font-black">ANALYTICS ENGINE LOADING...</div>;
          }
          return <AnalyticsPage user={user} onNavigate={navigate} />;
        case 'lab':
          if (!SpeechLabPage) {
            return (
              <div className="p-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black uppercase tracking-widest text-primary">Initializing Speech Lab...</h2>
                <p className="text-slate-500 font-bold mt-2">Acoustic engine is warming up</p>
              </div>
            );
          }
          return <SpeechLabPage user={user} onNavigate={navigate} />;
        default:
          return LandingPage ? <LandingPage onNavigate={navigate} /> : <div>Loading...</div>;
      }
    } catch (e) {
      console.error("CRITICAL RENDER FAILURE:", e);
      return <div className="p-20 text-center text-red-500">A system error occurred. Please refresh.</div>;
    }
  };

  return (
    <div className="font-sans min-h-screen flex flex-col transition-colors duration-300">
      {currentPage !== 'dashboard' && (
        <Navbar 
          user={user} 
          onNavigate={navigate} 
          onLogout={() => { handleSetUser(null); navigate('landing'); }} 
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
      
      <main className={`flex-grow ${currentPage === 'dashboard' ? 'pt-0' : 'pt-24'} pb-12`}>
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </main>

      {/* Futuristic Footer */}
      <footer className="glass py-6 mt-auto bg-black/40 border-t border-primary/20">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm text-gray-400">© 2026 TalkSense. Elevate your speech with AI.</p>
        </div>
      </footer>
    </div>
  );
}

window.TalkSense.register('App', App);
// Render will be handled by index.html for better timing control
