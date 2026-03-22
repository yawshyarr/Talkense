console.log("SetupPage.jsx script executing...");
const { motion, AnimatePresence } = window;

const SetupPage = ({ onNavigate }) => {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [securityOptions, setSecurityOptions] = useState({
    gazeTracking: true,
    tabSwitch: true,
    plagiarism: false,
    noiseCancellation: true
  });

  const toggleSecurity = (key) => {
    setSecurityOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const difficultyLevels = [
    { 
      id: 'Beginner', 
      label: 'Foundational', 
      desc: 'Focus on basic clarity and word flow. AI provides gentle corrections.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    { 
      id: 'Intermediate', 
      label: 'Professional', 
      desc: 'Standard professional testing. Tracks fillers, pace, and facial biometrics.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    { 
      id: 'Advanced', 
      label: 'Executive', 
      desc: 'Harder constraints. Strict gaze tracking and vocabulary richness analysis.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.98 7.98 0 01-2.343 5.657z" />
        </svg>
      )
    }
  ];

  const handleStart = () => {
    if (!topic.trim()) return alert("Please enter a speech topic.");
    onNavigate('live', { 
      topic, 
      duration_seconds: duration, 
      difficulty,
      security: securityOptions 
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-6xl mx-auto px-6 py-20 bg-bgApp transition-colors duration-300 min-h-screen"
    >
      <div className="text-center mb-20">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/20">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-textMain mb-6 tracking-tight">Configure Session</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xl font-medium max-w-2xl mx-auto italic">"Precision in practice leads to excellence in performance."</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left: Configuration Panel */}
        <div className="lg:col-span-7 glass-card p-12 bg-bgApp border border-white/5 shadow-2xl shadow-primary/5 space-y-12 rounded-[3rem]">
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Primary Objective</label>
            <div className="relative group">
              <input 
                type="text" 
                placeholder="e.g. Executive Board Meeting, Keynote Speech..."
                className="w-full bg-slate-50 dark:bg-[#111111] border-2 border-slate-100 dark:border-slate-800 rounded-3xl px-8 py-5 text-textMain font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:border-primary focus:bg-bgApp transition-all text-xl shadow-inner"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white opacity-0 group-focus-within:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Session Intensity Duration</label>
            <div className="grid grid-cols-3 gap-6">
              {[60, 120, 300].map(sec => (
                <button
                  key={sec}
                  onClick={() => setDuration(sec)}
                  className={`relative py-6 rounded-[2rem] font-black text-lg transition-all border-2 overflow-hidden group ${duration === sec ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30' : 'bg-bgApp border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:border-primary/50 hover:bg-primary/5'}`}
                >
                  <span className="relative z-10">{sec/60}m</span>
                  <span className={`text-[10px] block opacity-50 relative z-10 ${duration === sec ? 'text-white/70' : 'text-slate-300 dark:text-slate-700'}`}>Limited</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-10 border-t-2 border-slate-50 dark:border-slate-900">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2 mb-8">Security & Protocol Layer</label>
            <div className="grid grid-cols-2 gap-6">
              {Object.entries({
                gazeTracking: { label: 'AI Gaze Biometrics', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
                tabSwitch: { label: 'System Lockdown', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                plagiarism: { label: 'Linguistic Scan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                noiseCancellation: { label: 'Acoustic Clarity', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' }
              }).map(([key, data]) => (
                <div 
                  key={key}
                  onClick={() => toggleSecurity(key)}
                  className={`p-6 rounded-3xl border-2 cursor-pointer flex items-center justify-between transition-all group ${securityOptions[key] ? 'bg-primary/10 border-primary/30' : 'bg-bgApp border-slate-50 dark:border-slate-900 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${securityOptions[key] ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={data.icon} />
                      </svg>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-tight ${securityOptions[key] ? 'text-primary' : 'text-slate-400 dark:text-slate-600'}`}>{data.label}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-4 transition-all ${securityOptions[key] ? 'bg-primary border-primary/20 scale-110' : 'border-slate-100 dark:border-slate-800'}`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Intensity Selection */}
        <div className="lg:col-span-5 space-y-6">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-4 mb-4">Select Evaluation Tier</label>
          {difficultyLevels.map(level => (
            <motion.div
              key={level.id}
              whileHover={{ x: 10, scale: 1.02 }}
              onClick={() => setDifficulty(level.id)}
              className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all relative overflow-hidden group ${difficulty === level.id ? 'bg-primary border-primary text-white shadow-2xl shadow-primary/30' : 'bg-bgApp border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5'}`}
            >
              {difficulty === level.id && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
              )}
              <div className="flex items-center gap-8 relative z-10">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${difficulty === level.id ? 'bg-white text-primary rotate-12' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 group-hover:rotate-12 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                  {level.icon}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-black text-2xl tracking-tight ${difficulty === level.id ? 'text-white' : 'text-textMain group-hover:text-primary'}`}>{level.label}</h3>
                    {difficulty === level.id && <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-md uppercase tracking-widest">Selected</span>}
                  </div>
                  <p className={`text-sm font-medium leading-relaxed ${difficulty === level.id ? 'text-white/80' : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400'}`}>{level.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Start Button */}
          <div className="pt-10">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              className="w-full py-6 rounded-[2.5rem] bg-primary hover:brightness-110 text-white text-2xl font-black uppercase tracking-tight shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 group"
            >
              Initialize Station
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.button>
            <p className="text-center text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em] mt-6">Secure Biometric Handshake Required</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

window.TalkSense.register('SetupPage', SetupPage);
