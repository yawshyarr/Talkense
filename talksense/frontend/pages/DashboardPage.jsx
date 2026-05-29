console.log("DashboardPage.jsx script executing...");

const Dashboard = ({ user, onNavigate, theme, toggleTheme, currentPage = 'dashboard' }) => {
  const { motion, AnimatePresence } = window;
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({ avgScore: 0, total: 0, words: 0, wpm: 0, scoresHistory: [] });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [welcomeCopy, setWelcomeCopy] = useState({
    title: `Welcome back, ${user?.name || 'Explorer'}`,
    subtitle: 'Ready to refine your voice today?',
  });
  const loadSetting = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };
  
  const [goals, setGoals] = useState([
    { id: 1, title: 'Speaking Time', target: 300, current: 0, unit: 'sec' },
    { id: 2, title: 'Vocabulary Reach', target: 1000, current: 0, unit: 'words' },
    { id: 3, title: 'Sessions Completed', target: 5, current: 0, unit: 'count' }
  ]);
  const sessionReminder = loadSetting('session_reminder', true);
  const labHistory = loadSetting('talksense_speech_lab_history_v2', []);

  const notifications = React.useMemo(() => {
    const items = [];
    const latestSession = recentSessions[0];
    const latestLab = Array.isArray(labHistory) ? labHistory[0] : null;

    if (sessionReminder) {
      items.push({
        id: 'daily-reminder',
        type: 'reminder',
        title: 'Daily practice reminder is active',
        body: stats.total > 0
          ? 'Keep your streak alive by completing a fresh guided session today.'
          : 'Start your first analysis session today to begin building speech history.',
        actionLabel: 'Start Session',
        action: () => onNavigate('setup'),
      });
    }

    if (latestSession) {
      const latestScore = Math.round(
        (
          (latestSession.analysis_data?.scores?.fluency || 0)
          + (latestSession.analysis_data?.scores?.clarity || 0)
          + (latestSession.analysis_data?.scores?.pace || 0)
          + (latestSession.analysis_data?.scores?.vocabulary || 0)
          + (latestSession.analysis_data?.scores?.confidence || 0)
        ) / 5
      );
      if (latestScore < 70) {
        items.push({
          id: `latest-session-${latestSession.id}`,
          type: 'alert',
          title: 'Recent speech session needs work',
          body: `"${latestSession.topic}" scored ${latestScore}%. Review the report and rehearse the weakest areas.`,
          actionLabel: 'Open Report',
          action: () => onNavigate('report', {
            transcript: latestSession.raw_transcript,
            duration_seconds: latestSession.duration_seconds,
            topic: latestSession.topic,
            difficulty: latestSession.analysis_data?.metadata?.difficulty || 'Intermediate',
            analysis_data: latestSession.analysis_data
          }),
        });
      }
    }

    if (stats.total === 0) {
      items.push({
        id: 'empty-history',
        type: 'info',
        title: 'No speech analytics yet',
        body: 'Finish your first guided session to unlock report history and analytics.',
        actionLabel: 'Start Guided Session',
        action: () => onNavigate('setup'),
      });
    } else if (stats.wpm > 0 && (stats.wpm < 105 || stats.wpm > 160)) {
      items.push({
        id: 'pace-follow-up',
        type: 'coach',
        title: 'Your average pace is outside the ideal band',
        body: `Current dashboard average is ${stats.wpm} WPM. Use Speech Lab to rebalance your rhythm.`,
        actionLabel: 'Open Speech Lab',
        action: () => onNavigate('lab'),
      });
    }

    if (latestLab && latestLab.score < 75) {
      items.push({
        id: `lab-${latestLab.id}`,
        type: 'coach',
        title: 'Speech Lab recommends another repetition',
        body: `${latestLab.modeName} scored ${latestLab.score}%. Repeat the drill and focus on ${latestLab.notes?.[0] || 'smoother delivery'}.`,
        actionLabel: 'Repeat Drill',
        action: () => onNavigate('lab'),
      });
    } else if (!latestLab) {
      items.push({
        id: 'lab-empty',
        type: 'info',
        title: 'Speech Lab has no practice history yet',
        body: 'Run one drill to start building practice data alongside your main sessions.',
        actionLabel: 'Open Lab',
        action: () => onNavigate('lab'),
      });
    }

    return items.slice(0, 5);
  }, [labHistory, onNavigate, recentSessions, sessionReminder, stats.total, stats.wpm]);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch('http://127.0.0.1:8000/api/sessions/', {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
         const data = await res.json();
         const sorted = [...data].sort((a,b) => new Date(b.date) - new Date(a.date));
         setRecentSessions(sorted.slice(0, 5));
         
         if (data.length > 0) {
            let totalWords = 0;
            let totalScore = 0;
            let totalPace = 0;
            let totalDuration = 0;
            
            data.forEach(session => {
                const sData = session.analysis_data;
                totalDuration += session.duration_seconds;
                if (sData) {
                    totalWords += sData.stats?.words_spoken || 0;
                    totalPace += sData.stats?.pace || 0;
                    const scores = sData.scores || { fluency: 0, clarity: 0, pace: 0, vocabulary: 0, confidence: 0 };
                    totalScore += Math.round((scores.fluency + scores.clarity + scores.pace + scores.vocabulary + scores.confidence) / 5);
                }
            });
            
            setStats({
                avgScore: Math.round(totalScore / data.length),
                total: data.length,
                words: totalWords,
                wpm: Math.round(totalPace / data.length)
            });

            setGoals(prev => prev.map(g => {
              if (g.id === 1) return { ...g, current: totalDuration };
              if (g.id === 2) return { ...g, current: totalWords };
              if (g.id === 3) return { ...g, current: data.length };
              return g;
            }));
         }
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  useEffect(() => {
    const defaultName = user?.name || 'Explorer';
    let nextCopy = {
      title: `Welcome back, ${defaultName}`,
      subtitle: 'Ready to refine your voice today?',
    };

    try {
      const authContext = JSON.parse(localStorage.getItem('talksense_auth_context') || 'null');
      if (authContext?.type === 'register') {
        nextCopy = {
          title: `Profile created, ${defaultName}`,
          subtitle: 'Your workspace is ready. Start a first guided session to build your speech history.',
        };
      } else if (authContext?.type === 'login') {
        nextCopy = {
          title: `Good to see you again, ${defaultName}`,
          subtitle: stats.total > 0
            ? 'Your previous sessions are loaded. Continue improving from where you left off.'
            : 'You are logged in. Start your first analysis or rehearse in Speech Lab.',
        };
      } else if (stats.total === 0) {
        nextCopy = {
          title: `Welcome, ${defaultName}`,
          subtitle: 'Start with a guided session or a Speech Lab drill to begin your progress journey.',
        };
      } else if (stats.total >= 5) {
        nextCopy = {
          title: `Welcome back, ${defaultName}`,
          subtitle: 'You already have a solid history. Review trends, polish weak spots, and push for a better score.',
        };
      }
    } catch (error) {
      console.warn('Failed to read auth context for dashboard welcome:', error);
    }

    setWelcomeCopy(nextCopy);
  }, [stats.total, user]);

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!confirm("Confirm deletion?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchDashboard();
    } catch (err) { console.error(err); }
  };

  const menuLinks = [
    { name: 'Dashboard', id: 'dashboard', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ), page: 'dashboard' },
    { name: 'Speech Lab', id: 'lab', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ), page: 'lab', count: 3 },
    { name: 'Vocabulary', id: 'vocab', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ), page: 'vocab' },
    { name: 'Analytics', id: 'analytics', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ), page: 'analytics' },
    { name: 'AI Coach', id: 'coach', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ), page: 'coach' },
    { name: 'Settings', id: 'settings', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      </svg>
    ), page: 'settings' }
  ];

  const generalLinks = [
    { name: 'Help', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), action: () => onNavigate('help') },
    { name: 'Logout', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ), action: () => onNavigate('landing') }
  ];

  return (
    <div className="flex min-h-screen bg-bgApp text-textMain font-sans transition-colors duration-300">
      
      {/* Sidebar */}
      <aside className="w-72 bg-bgApp border-r border-slate-200 dark:border-slate-800 p-8 flex flex-col fixed h-full overflow-y-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-textMain tracking-tight">TalkSense</span>
        </div>

        <div className="space-y-10">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Menu</p>
            <nav className="space-y-2">
              {menuLinks.map(link => (
                <button 
                  key={link.id}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(link.page || link.id);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentPage === (link.page || link.id) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                >
                  <div className="flex items-center gap-4">
                    {link.icon}
                    <span className="font-semibold text-sm">{link.name}</span>
                  </div>
                  {link.count && <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{link.count}+</span>}
                </button>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">General</p>
            <nav className="space-y-2">
              {generalLinks.map(link => (
                <button 
                  key={link.name}
                  onClick={() => {
                    if (link.action) link.action();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                >
                  {link.icon}
                  <span className="font-semibold text-sm">{link.name}</span>
                </button>
              ))}
              
              <button 
                onClick={toggleTheme}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
                <span className="font-semibold text-sm">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow ml-72 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-4xl font-black text-textMain tracking-tight mb-2">{welcomeCopy.title}</h1>
            <p className="text-slate-500 dark:text-slate-300 font-medium">{welcomeCopy.subtitle}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setNotificationOpen(prev => !prev)}
                className="w-12 h-12 rounded-2xl bg-bgApp border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer relative"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 border-2 border-bgApp rounded-full text-[10px] font-black text-white flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    className="absolute right-0 top-16 w-[360px] rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl p-5 z-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Notifications</p>
                        <h3 className="text-lg font-black text-textMain mt-1">Action center</h3>
                      </div>
                      <button
                        onClick={() => setNotificationOpen(false)}
                        className="text-slate-400 hover:text-primary transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {notifications.length > 0 ? notifications.map((item) => (
                        <div key={item.id} className="rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-black text-textMain">{item.title}</p>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full ${item.type === 'alert' ? 'bg-red-500/10 text-red-500' : item.type === 'coach' ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                              {item.type}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">{item.body}</p>
                          <button
                            onClick={() => {
                              setNotificationOpen(false);
                              item.action();
                            }}
                            className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline"
                          >
                            {item.actionLabel}
                          </button>
                        </div>
                      )) : (
                        <div className="rounded-[1.5rem] border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No active notifications right now.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={() => onNavigate('setup')}
              className="bg-primary hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all transform hover:scale-[1.02]"
            >
              New Analysis Session
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-8 mb-16">
          <div className="glass-card p-8 bg-bgApp border-white/5 shadow-xl shadow-primary/5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Online Speech Analyzer</p>
            <h2 className="text-2xl font-black text-textMain tracking-tight mb-3">Analyzer controls are ready before you go live.</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-2xl">Tune transcription language, filler-word detection, mic cleanup, pace goals, and live confidence overlays from the new settings workspace.</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('settings')}
                className="px-5 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
              >
                Open Analyzer Settings
              </button>
              <button
                onClick={() => onNavigate('setup')}
                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 hover:border-primary/40 hover:text-primary transition-all"
              >
                Start Guided Session
              </button>
            </div>
          </div>

          <div className="glass-card p-8 bg-slate-900 text-white border border-white/10 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-5">Current Defaults</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Language</span>
                <span className="text-sm font-black">{loadSetting('stt_lang', 'en-US')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Target Pace</span>
                <span className="text-sm font-black">{loadSetting('target_wpm', 140)} WPM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Noise Cleanup</span>
                <span className="text-sm font-black">{loadSetting('noise_suppression', true) ? 'Enabled' : 'Off'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Confidence Overlay</span>
                <span className="text-sm font-black">{loadSetting('show_confidence', true) ? 'Visible' : 'Hidden'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          {[
            { label: 'Composite Score', value: stats.avgScore, unit: '%', trend: '+4.2%', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { label: 'Total Sessions', value: stats.total, unit: '', trend: '+1', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Vocabulary Reach', value: stats.words, unit: 'words', trend: '+124', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { label: 'Average Pace', value: stats.wpm, unit: 'wpm', trend: 'Stable', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 bg-bgApp border-white/5 shadow-xl shadow-primary/5 group hover:border-primary/30 transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-textMain">{stat.value}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">{stat.unit}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Sessions */}
          <div className="lg:col-span-2 glass-card p-10 bg-bgApp border-white/5 shadow-xl shadow-primary/5">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-textMain tracking-tight">Recent Analysis Sessions</h3>
              <button className="text-primary font-black uppercase tracking-widest text-[10px] hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {recentSessions.length > 0 ? recentSessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => onNavigate('report', {
                    transcript: session.raw_transcript,
                    duration_seconds: session.duration_seconds,
                    topic: session.topic,
                    difficulty: session.analysis_data?.metadata?.difficulty || 'Intermediate',
                    analysis_data: session.analysis_data
                  })}
                  className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-primary/20 hover:bg-bgApp transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-black flex items-center justify-center text-primary shadow-sm border dark:border-slate-800 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-black text-textMain group-hover:text-primary transition-colors">{session.topic}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {new Date(session.date).toLocaleDateString()} • {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-lg font-black text-textMain">{Math.round((session.analysis_data?.scores?.fluency + session.analysis_data?.scores?.clarity + session.analysis_data?.scores?.pace + session.analysis_data?.scores?.vocabulary + session.analysis_data?.scores?.confidence) / 5)}%</p>
                      <p className="text-[10px] text-primary font-black uppercase tracking-widest">Score</p>
                    </div>
                    <button 
                      onClick={(e) => deleteSession(e, session.id)}
                      className="p-3 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No analysis history found</p>
                  <button onClick={() => onNavigate('setup')} className="mt-6 text-primary font-black uppercase tracking-widest text-[10px] hover:underline">Start First Session</button>
                </div>
              )}
            </div>
          </div>

          {/* Goals / Activity */}
          <div className="glass-card p-10 bg-bgApp border-white/5 shadow-xl shadow-primary/5 flex flex-col">
            <h3 className="text-xl font-black text-textMain tracking-tight mb-10">Training Goals</h3>
            <div className="space-y-10 flex-grow">
              {goals.map(goal => (
                <div key={goal.id} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{goal.title}</p>
                      <p className="text-lg font-black text-textMain">{goal.current} / {goal.target} <span className="text-[10px] text-slate-500">{goal.unit}</span></p>
                    </div>
                    <span className="text-xs font-black text-primary">{Math.round((goal.current / goal.target) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                      transition={{ duration: 1.5 }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 p-6 rounded-[2rem] bg-primary/10 border border-primary/20">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">AI Coach Insight</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                You're speaking 15% faster than last week. Focus on rhythmic pausing in your next session.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

window.TalkSense.register('Dashboard', Dashboard);
