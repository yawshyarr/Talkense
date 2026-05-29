console.log("SettingsPage.jsx executing...");

const SettingsPage = ({ user, onNavigate, theme, toggleTheme, currentPage = 'settings' }) => {
  const { motion } = window;

  // Load saved settings from localStorage
  const load = (key, def) => { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; } catch { return def; } };
  const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  const [deepgramKey, setDeepgramKey] = React.useState(localStorage.getItem('dg_key') || '');
  const [sttLang, setSttLang] = React.useState(load('stt_lang', 'en-US'));
  const [smartFormat, setSmartFormat] = React.useState(load('smart_format', true));
  const [fillerWords, setFillerWords] = React.useState(load('filler_words', ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'right', 'so']));
  const [newFiller, setNewFiller] = React.useState('');
  const [targetWpm, setTargetWpm] = React.useState(load('target_wpm', 140));
  const [sessionReminder, setSessionReminder] = React.useState(load('session_reminder', true));
  const [autoSave, setAutoSave] = React.useState(load('auto_save', true));
  const [gazeStrict, setGazeStrict] = React.useState(load('gaze_strict', false));
  const [noiseSuppression, setNoiseSuppression] = React.useState(load('noise_suppression', true));
  const [echoCancellation, setEchoCancellation] = React.useState(load('echo_cancellation', true));
  const [showConfidence, setShowConfidence] = React.useState(load('show_confidence', true));
  const [analysisMode, setAnalysisMode] = React.useState(load('analysis_mode', 'balanced'));
  const [autoStartCamera, setAutoStartCamera] = React.useState(load('auto_start_camera', true));
  const [showLiveMetrics, setShowLiveMetrics] = React.useState(load('show_live_metrics', true));
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    if (deepgramKey.trim()) localStorage.setItem('dg_key', deepgramKey.trim());
    save('stt_lang', sttLang);
    save('smart_format', smartFormat);
    save('filler_words', fillerWords);
    save('target_wpm', targetWpm);
    save('session_reminder', sessionReminder);
    save('auto_save', autoSave);
    save('gaze_strict', gazeStrict);
    save('noise_suppression', noiseSuppression);
    save('echo_cancellation', echoCancellation);
    save('show_confidence', showConfidence);
    save('analysis_mode', analysisMode);
    save('auto_start_camera', autoStartCamera);
    save('show_live_metrics', showLiveMetrics);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addFiller = () => {
    const w = newFiller.trim().toLowerCase();
    if (w && !fillerWords.includes(w)) { setFillerWords(prev => [...prev, w]); }
    setNewFiller('');
  };

  const removeFiller = (w) => setFillerWords(prev => prev.filter(f => f !== w));

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${value ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${value ? 'left-7' : 'left-1'}`} />
    </button>
  );

  const Section = ({ title, children }) => (
    <div className="glass-card p-10 bg-bgApp border border-white/5 shadow-xl shadow-primary/5 rounded-[2.5rem] space-y-8">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">{title}</h3>
      {children}
    </div>
  );

  const Row = ({ label, desc, children }) => (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="font-bold text-sm text-textMain">{label}</p>
        {desc && <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-bgApp text-textMain font-sans">
      {/* Sidebar — same as Dashboard */}
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Menu</p>
            <nav className="space-y-2">
              {[
                { name: 'Dashboard', id: 'dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                { name: 'Speech Lab', id: 'lab', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
                { name: 'Vocabulary', id: 'vocab', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                { name: 'Analytics', id: 'analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { name: 'AI Coach', id: 'coach', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { name: 'Settings', id: 'settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
              ].map(link => (
                <button key={link.id} onClick={() => onNavigate(link.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentPage === link.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                  </svg>
                  <span className="font-semibold text-sm">{link.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">General</p>
            <nav className="space-y-2">
              <button onClick={toggleTheme}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={theme === 'light'
                    ? 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
                    : 'M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'} />
                </svg>
                <span className="font-semibold text-sm">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
              </button>
              <button onClick={() => onNavigate('landing')}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-semibold text-sm">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-grow ml-72 p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-textMain tracking-tight mb-2">Settings</h1>
            <p className="text-slate-500 font-medium">Configure your speech analysis experience.</p>
          </div>

          {/* STT / API */}
          <Section title="Speech-to-Text Engine">
            <Row label="Deepgram API Key" desc="Powers real-time Nova-2 transcription. Get a free key at console.deepgram.com">
              <input
                type="password"
                value={deepgramKey}
                onChange={e => setDeepgramKey(e.target.value)}
                placeholder="Paste key here..."
                className="w-64 bg-slate-50 dark:bg-[#111] border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm font-bold text-textMain placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:border-primary transition-all"
              />
            </Row>
            <Row label="Language" desc="Primary language for transcription">
              <select
                value={sttLang}
                onChange={e => setSttLang(e.target.value)}
                className="bg-slate-50 dark:bg-[#111] border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm font-bold text-textMain focus:outline-none focus:border-primary transition-all"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-AU">English (AU)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
              </select>
            </Row>
            <Row label="Smart Formatting" desc="Auto punctuation, capitalization, and number formatting">
              <Toggle value={smartFormat} onChange={setSmartFormat} />
            </Row>
          </Section>

          {/* Audio */}
          <Section title="Audio Processing">
            <Row label="Noise Suppression" desc="Filter background noise during sessions">
              <Toggle value={noiseSuppression} onChange={setNoiseSuppression} />
            </Row>
            <Row label="Echo Cancellation" desc="Remove microphone echo for cleaner transcription">
              <Toggle value={echoCancellation} onChange={setEchoCancellation} />
            </Row>
          </Section>

          {/* Analysis */}
          <Section title="Speech Analysis">
            <Row label="Analysis Mode" desc="Choose how aggressive live scoring should be during online sessions">
              <select
                value={analysisMode}
                onChange={e => setAnalysisMode(e.target.value)}
                className="bg-slate-50 dark:bg-[#111] border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm font-bold text-textMain focus:outline-none focus:border-primary transition-all"
              >
                <option value="balanced">Balanced</option>
                <option value="strict">Strict interview</option>
                <option value="presentation">Presentation coach</option>
              </select>
            </Row>
            <Row label="Target Speaking Pace" desc={`Ideal WPM for your sessions. Currently: ${targetWpm} WPM`}>
              <div className="flex items-center gap-4">
                <input
                  type="range" min="80" max="220" step="10"
                  value={targetWpm}
                  onChange={e => setTargetWpm(parseInt(e.target.value))}
                  className="w-32 accent-primary"
                />
                <span className="text-primary font-black text-sm w-16">{targetWpm} wpm</span>
              </div>
            </Row>
            <Row label="Show Confidence Score" desc="Display word-level confidence during live sessions">
              <Toggle value={showConfidence} onChange={setShowConfidence} />
            </Row>
            <Row label="Strict Gaze Tracking" desc="Flag any gaze deviation as a violation (Advanced mode)">
              <Toggle value={gazeStrict} onChange={setGazeStrict} />
            </Row>
            <Row label="Show Live Metrics Panel" desc="Keep pace, fillers, and confidence visible while speaking">
              <Toggle value={showLiveMetrics} onChange={setShowLiveMetrics} />
            </Row>
          </Section>

          {/* Filler Words */}
          <Section title="Filler Word Detection">
            <p className="text-xs text-slate-400 -mt-2">Words flagged and counted during your sessions.</p>
            <div className="flex flex-wrap gap-3">
              {fillerWords.map(w => (
                <span key={w} className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-black rounded-full">
                  {w}
                  <button onClick={() => removeFiller(w)} className="text-primary/50 hover:text-red-500 transition-colors">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newFiller}
                onChange={e => setNewFiller(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFiller()}
                placeholder="Add a filler word..."
                className="flex-grow bg-slate-50 dark:bg-[#111] border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm font-bold text-textMain placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:border-primary transition-all"
              />
              <button onClick={addFiller} className="px-6 py-3 bg-primary text-white text-xs font-black rounded-2xl hover:brightness-110 transition-all">Add</button>
            </div>
          </Section>

          {/* Session */}
          <Section title="Session Preferences">
            <Row label="Auto-Save Sessions" desc="Automatically save analysis results after each session">
              <Toggle value={autoSave} onChange={setAutoSave} />
            </Row>
            <Row label="Daily Practice Reminder" desc="Get a reminder to complete a session each day">
              <Toggle value={sessionReminder} onChange={setSessionReminder} />
            </Row>
            <Row label="Auto-Start Camera" desc="Open camera tracking as soon as the live analyzer begins">
              <Toggle value={autoStartCamera} onChange={setAutoStartCamera} />
            </Row>
          </Section>

          {/* Save */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className={`w-full py-6 rounded-[2.5rem] text-white text-xl font-black uppercase tracking-widest shadow-2xl transition-all ${saved ? 'bg-green-500 shadow-green-500/20' : 'bg-primary shadow-primary/30 hover:brightness-110'}`}
          >
            {saved ? '✓ Settings Saved' : 'Save Settings'}
          </motion.button>
        </div>
      </main>
    </div>
  );
};

window.TalkSense.register('SettingsPage', SettingsPage);
