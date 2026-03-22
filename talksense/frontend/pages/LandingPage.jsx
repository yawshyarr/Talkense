console.log("LandingPage.jsx script executing...");
const { motion, AnimatePresence } = window;

const LandingPage = ({ onNavigate }) => {
  console.log("Rendering LandingPage component...");
  return (
    <div className="min-h-screen pt-10 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 z-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-primary rounded-full blur-[2px]"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.1,
              opacity: Math.random() * 0.5 + 0.1
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ width: `${Math.random() * 8 + 4}px`, height: `${Math.random() * 8 + 4}px` }}
          />
        ))}
      </div>

      <div className="z-10 text-center px-4 max-w-4xl mx-auto space-y-8 mt-16">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Master the Art of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-secondary neon-text-primary">Speaking</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed max-w-2xl mx-auto mb-10">
            A precise, AI-driven platform that analyzes your speech in real-time. Uncover your potential, reduce filler words, and speak with profound clarity.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('register')}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-lg font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_30px_rgba(0,229,255,0.6)] transition-all"
            >
              Start Analyzing Now
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('login')}
              className="px-8 py-4 rounded-full glass text-white text-lg font-semibold hover:bg-white/10 transition-colors border border-primary/30"
            >
              Returning User? Log In
            </motion.button>
          </div>
        </motion.div>

        {/* Feature Cards Grid (Glassmorphic) */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left"
        >
          <div className="glass-card p-8 group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Live Transcript</h3>
            <p className="text-gray-400">See your words exactly as you speak them, with instant highlights for filler words and pauses.</p>
          </div>

          <div className="glass-card p-8 group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Emotion Intel</h3>
            <p className="text-gray-400">Advanced sentiment analysis tracks your confidence, stress, and overall tone dynamically.</p>
          </div>

          <div className="glass-card p-8 group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Deep Analytics</h3>
            <p className="text-gray-400">Get granular reports post-speech on pacing, fluency, vocabulary richness, and actionable feedback.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
window.TalkSense.register('LandingPage', LandingPage);
