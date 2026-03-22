console.log("LandingPage.jsx script executing...");
const { motion, AnimatePresence } = window;

const LandingPage = ({ onNavigate }) => {
  const features = [
    {
      title: "Real-time AI Analysis",
      description: "Instant feedback on filler words, pace, and clarity using advanced neural networks.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    },
    {
      title: "Security Proctored",
      description: "Multi-layered integrity monitoring with tab-switch locks and gaze tracking biometrics.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: "Executive Reports",
      description: "Generate comprehensive PDF analysis with full transcripts and growth metrics.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-bgApp transition-colors duration-300">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
            
            <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase">
              The Gold Standard of Communication
            </span>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-textMain mb-8 leading-[1.05]">
              Master Your <span className="text-primary">Voice</span> <br/>
              With AI <span className="text-primary/60 font-light italic">Precision</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mb-12">
              TalkSense analyzes every syllable and expression in real-time, providing high-fidelity biometric feedback to elevate your public speaking.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('register')}
                className="px-12 py-5 rounded-[2rem] bg-primary text-white text-lg font-black shadow-2xl shadow-primary/30 hover:brightness-110 transition-all flex items-center gap-3"
              >
                Get Started
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('login')}
                className="px-12 py-5 rounded-[2rem] bg-bgApp text-textMain text-lg font-black border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all"
              >
                Sign In
              </motion.button>
            </div>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-40">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                className="glass-card p-12 text-left group bg-bgApp border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-2xl transition-all duration-500 rounded-[3rem]"
              >
                <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-10 text-slate-400 group-hover:text-white group-hover:bg-primary group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black text-textMain mb-4 tracking-tight group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-semibold">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.TalkSense.register('LandingPage', LandingPage);
