function App() {
  console.log("App component initializing...");

  if (!window.Navbar || !window.LandingPage) {
    return <div className="p-20 text-center font-black">SYSTEM INITIALIZING...</div>;
  }

  const { motion, AnimatePresence } = window;
  const initialEntry = { page: 'landing', data: null };
  const buildBrowserState = (page, data, historyEntries) => ({
    __talksense: true,
    page,
    data,
    pageHistory: historyEntries,
  });

  const [currentPage, setCurrentPage] = useState('landing');
  const [pageData, setPageData] = useState(null);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [pageHistory, setPageHistory] = useState([initialEntry]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const existingState = window.history.state;
    if (existingState?.__talksense) {
      setCurrentPage(existingState.page || initialEntry.page);
      setPageData(existingState.data ?? initialEntry.data);
      setPageHistory(existingState.pageHistory?.length ? existingState.pageHistory : [initialEntry]);
    } else {
      window.history.replaceState(
        buildBrowserState(initialEntry.page, initialEntry.data, [initialEntry]),
        '',
        window.location.href
      );
    }

    const handlePopState = (event) => {
      const state = event.state;
      if (state?.__talksense) {
        setCurrentPage(state.page || initialEntry.page);
        setPageData(state.data ?? initialEntry.data);
        setPageHistory(state.pageHistory?.length ? state.pageHistory : [initialEntry]);
      } else {
        setCurrentPage(initialEntry.page);
        setPageData(initialEntry.data);
        setPageHistory([initialEntry]);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleSetUser = (u) => setUser(u);

  const navigate = (page, data = null, options = {}) => {
    console.log("NAVIGATE CALLED:", page);

    let nextHistory = pageHistory;
    const last = pageHistory[pageHistory.length - 1];
    const sameAsLast = last?.page === page && JSON.stringify(last?.data ?? null) === JSON.stringify(data ?? null);

    if (!options.skipHistory) {
      nextHistory = sameAsLast ? pageHistory : [...pageHistory, { page, data }];
      setPageHistory(nextHistory);
    }

    setCurrentPage(page);
    setPageData(data);

    const browserState = buildBrowserState(page, data, nextHistory);
    if (options.replaceHistory) {
      window.history.replaceState(browserState, '', window.location.href);
    } else if (!options.skipHistory && !sameAsLast) {
      window.history.pushState(browserState, '', window.location.href);
    } else {
      window.history.replaceState(browserState, '', window.location.href);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canGoBack = pageHistory.length > 1;

  const goBack = () => {
    if (pageHistory.length > 1) {
      window.history.back();
      return;
    }

    navigate(initialEntry.page, initialEntry.data, { skipHistory: true, replaceHistory: true });
  };

  const renderPage = () => {
    const {
      LandingPage, LoginPage, RegisterPage, Dashboard,
      SetupPage, LiveSpeechPage, ReportPage, AICoachPage,
      VocabPage, SpeechLabPage, AnalyticsPage, SettingsPage, HelpPage
    } = window;

    try {
      switch (currentPage) {
        case 'landing':
          return LandingPage ? <LandingPage onNavigate={navigate} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'login':
          return LoginPage ? <LoginPage onNavigate={navigate} setUser={handleSetUser} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'register':
          return RegisterPage ? <RegisterPage onNavigate={navigate} setUser={handleSetUser} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'dashboard':
          return Dashboard ? <Dashboard user={user} onNavigate={navigate} theme={theme} toggleTheme={toggleTheme} currentPage={currentPage} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'setup':
          return SetupPage ? <SetupPage onNavigate={navigate} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'live':
          return LiveSpeechPage ? <LiveSpeechPage onNavigate={navigate} config={pageData} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'report':
          return ReportPage ? <ReportPage onNavigate={navigate} sessionData={pageData} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'coach':
          return AICoachPage ? <AICoachPage user={user} onNavigate={navigate} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'vocab':
          return VocabPage ? <VocabPage user={user} onNavigate={navigate} goBack={goBack} canGoBack={canGoBack} /> : <div>Loading...</div>;
        case 'analytics':
          return AnalyticsPage ? <AnalyticsPage user={user} onNavigate={navigate} goBack={goBack} canGoBack={canGoBack} /> : <div className="p-20 text-center font-black">ANALYTICS ENGINE LOADING...</div>;
        case 'lab':
          return SpeechLabPage
            ? <SpeechLabPage user={user} onNavigate={navigate} goBack={goBack} canGoBack={canGoBack} />
            : (
              <div className="p-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black uppercase tracking-widest text-primary">Initializing Speech Lab...</h2>
              </div>
            );
        case 'settings':
          return SettingsPage
            ? <SettingsPage user={user} onNavigate={navigate} theme={theme} toggleTheme={toggleTheme} currentPage={currentPage} goBack={goBack} canGoBack={canGoBack} />
            : <div className="p-20 text-center font-black">Loading Settings...</div>;
        case 'help':
          return HelpPage
            ? <HelpPage user={user} onNavigate={navigate} goBack={goBack} canGoBack={canGoBack} />
            : <div className="p-20 text-center font-black">Loading Help...</div>;
        default:
          return LandingPage ? <LandingPage onNavigate={navigate} /> : <div>Loading...</div>;
      }
    } catch (e) {
      console.error("CRITICAL RENDER FAILURE:", e);
      return <div className="p-20 text-center text-red-500">A system error occurred. Please refresh.</div>;
    }
  };

  const noSidebar = ['dashboard', 'settings'];
  const Navbar = window.Navbar;

  return (
    <div className="font-sans min-h-screen flex flex-col transition-colors duration-300">
      {!noSidebar.includes(currentPage) && Navbar && (
        <Navbar
          user={user}
          onNavigate={navigate}
          onLogout={() => { handleSetUser(null); navigate('landing'); }}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
      <main className={`flex-grow ${noSidebar.includes(currentPage) ? 'pt-0' : 'pt-24'} pb-12`}>
        {canGoBack && !['landing', 'dashboard'].includes(currentPage) && (
          <div className="fixed top-24 left-6 z-40">
            <button
              onClick={goBack}
              className="px-4 py-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black uppercase tracking-widest text-[10px] shadow-xl hover:border-primary/30 hover:text-primary transition-all"
            >
              Go Back
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </main>
      <footer className="glass py-6 mt-auto bg-black/40 border-t border-primary/20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">© 2026 TalkSense. Elevate your speech with AI.</p>
        </div>
      </footer>
    </div>
  );
}

window.TalkSense.register('App', App);
