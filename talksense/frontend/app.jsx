// Babel-standalone automatically injects globals from index.html
// useState, useEffect, motion, AnimatePresence are available globally
// A Simple Router since we don't have react-router-dom
function App() {
  console.log("App component initializing...");
  const { 
    LandingPage, LoginPage, RegisterPage, Dashboard, 
    SetupPage, LiveSpeechPage, ReportPage, AICoachPage, VocabPage, Navbar,
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
    console.log("Navigating to:", page, "with data:", data);
    setCurrentPage(page);
    setPageData(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'landing':
        return <LandingPage onNavigate={navigate} />;
      case 'login':
        return <LoginPage onNavigate={navigate} setUser={handleSetUser} />;
      case 'register':
        return <RegisterPage onNavigate={navigate} setUser={handleSetUser} />;
      case 'dashboard':
        return <Dashboard user={user} onNavigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
      case 'setup':
        return <SetupPage onNavigate={navigate} />;
      case 'live':
        return <LiveSpeechPage onNavigate={navigate} config={pageData} />;
      case 'report':
        return <ReportPage onNavigate={navigate} sessionData={pageData} />;
      case 'coach':
        return <AICoachPage user={user} onNavigate={navigate} />;
      case 'vocab':
        return <VocabPage user={user} onNavigate={navigate} />;
      default:
        return <LandingPage onNavigate={navigate} />;
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
