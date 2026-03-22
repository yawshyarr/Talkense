// Babel-standalone automatically injects globals from index.html
// useState, useEffect, motion, AnimatePresence are available globally
// A Simple Router since we don't have react-router-dom
function App() {
  console.log("App component initializing...");
  const { 
    LandingPage, LoginPage, RegisterPage, Dashboard, 
    SetupPage, LiveSpeechPage, ReportPage, Navbar,
    motion, AnimatePresence
  } = window;

  if (!Navbar || !LandingPage) {
    return null; // Silent load
  }

  const [currentPage, setCurrentPage] = useState('landing');
  const [pageData, setPageData] = useState(null);
  const [user, setUser] = useState(null);

  const navigate = (page, data = null) => {
    setCurrentPage(page);
    setPageData(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'landing':
        return <LandingPage onNavigate={navigate} />;
      case 'login':
        return <LoginPage onNavigate={navigate} setUser={setUser} />;
      case 'register':
        return <RegisterPage onNavigate={navigate} setUser={setUser} />;
      case 'dashboard':
        return <Dashboard user={user} onNavigate={navigate} />;
      case 'setup':
        return <SetupPage onNavigate={navigate} />;
      case 'live':
        return <LiveSpeechPage onNavigate={navigate} config={pageData} />;
      case 'report':
        return <ReportPage onNavigate={navigate} sessionData={pageData} />;
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  };

  return (
    <div className="font-sans text-gray-100 min-h-screen flex flex-col">
      <Navbar user={user} onNavigate={navigate} onLogout={() => { setUser(null); navigate('landing'); }} />
      
      <main className="flex-grow pt-20 pb-12">
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
