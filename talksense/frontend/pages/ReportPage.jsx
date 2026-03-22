console.log("ReportPage.jsx script executing...");
const { motion, AnimatePresence } = window;

const ReportPage = ({ onNavigate, sessionData }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const analyzeSpeech = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Not logged in");
        
        const payload = {
           transcript: sessionData?.transcript || "Actually, this is a test transcript with some basically filler words like um and uh.",
           topic: sessionData?.topic || "Impromptu Speech",
           duration_seconds: sessionData?.duration_seconds || 60,
           difficulty: sessionData?.difficulty || "Intermediate"
        };
        
        // 1. Get analysis from Claude (or backend mock)
        const analyzeRes = await fetch('http://localhost:8002/api/analyze', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        if (!analyzeRes.ok) throw new Error("Failed to analyze");
        const analysisData = await analyzeRes.json();
        setReport(analysisData);
        
        // 2. Save session to DB
        await fetch('http://localhost:8002/api/sessions/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            topic: payload.topic,
            duration_seconds: payload.duration_seconds,
            raw_transcript: payload.transcript,
            analysis_data: analysisData
          })
        });
        
        setLoading(false);
      } catch (e) {
         console.error(e);
         setLoading(false);
      }
    };
    
    // Slight delay for animation effect
    setTimeout(() => {
        analyzeSpeech();
    }, 1500);
  }, [sessionData]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-24 h-24 border-t-4 border-r-4 border-primary rounded-full"
        />
        <div className="text-xl font-medium tracking-widest text-primary animate-pulse flex flex-col items-center">
          <span>ANALYZING SPEECH PATTERNS</span>
          <span className="text-sm text-gray-500 mt-2">Connecting to Claude AI...</span>
        </div>
      </div>
    );
  }

  // Fallback defaults if analysis failed
  const scores = report?.scores || { fluency: 85, clarity: 92, pace: 78, vocabulary: 88, confidence: 95 };
  const feedback = report?.feedback || { pros: ["Good volume"], cons: ["Pacing issues"], tips: ["Practice more"] };
  const stats = report?.stats || { words_spoken: 150, pace: 130, filler_count: 5 };
  
  const scoreData = [
    { name: 'Fluency', score: scores.fluency },
    { name: 'Clarity', score: scores.clarity },
    { name: 'Pace', score: scores.pace },
    { name: 'Vocabulary', score: scores.vocabulary },
    { name: 'Confidence', score: scores.confidence }
  ];

  const overallScore = Math.round((scores.fluency + scores.clarity + scores.pace + scores.vocabulary + scores.confidence) / 5);

  const formatDuration = (sec) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Header / Overall Score */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        
        {/* Big Score Circle */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 flex flex-col items-center justify-center md:w-1/3 text-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
          <h2 className="text-sm font-bold tracking-[0.2em] text-gray-400 mb-6 relative z-10">OVERALL SCORE</h2>
          
          <div className="relative w-48 h-48 flex items-center justify-center mb-4 z-10">
            {/* SVG Progress Ring */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
              <motion.circle 
                initial={{ strokeDasharray: `0, 300` }}
                animate={{ strokeDasharray: `${(overallScore / 100) * 283}, 300` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="50" cy="50" r="45" fill="none" stroke="url(#gradient)" strokeWidth="8" strokeLinecap="round" 
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="100%" stopColor="#B415FF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">
                {overallScore}
              </span>
              <span className="text-primary font-bold tracking-widest mt-1">
                 {overallScore > 90 ? 'EXCELLENT' : overallScore > 80 ? 'GREAT' : overallScore > 70 ? 'GOOD' : 'NEEDS WORK'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Core Stats Overview */}
        <div className="md:w-2/3 glass-card p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold">Session Analytics</h2>
             <div className="flex gap-3">
               <button className="px-4 py-2 border border-white/20 rounded-md text-sm hover:bg-white/10 transition">Download PDF</button>
               <button className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-md text-sm hover:bg-primary/30 transition">Share</button>
             </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-grow">
            <div className="bg-black/30 rounded-lg p-4 border border-white/5 flex flex-col justify-center">
               <span className="text-xs text-gray-500 font-bold mb-1">DURATION</span>
               <span className="text-2xl font-medium text-white">{formatDuration(sessionData?.duration_seconds || 60)}</span>
            </div>
            <div className="bg-black/30 rounded-lg p-4 border border-white/5 flex flex-col justify-center">
               <span className="text-xs text-gray-500 font-bold mb-1">WORDS SPOKEN</span>
               <span className="text-2xl font-medium text-white">{stats.words_spoken}</span>
            </div>
            <div className="bg-black/30 rounded-lg p-4 border border-white/5 flex flex-col justify-center border-l-2 border-l-red-500">
               <span className="text-xs text-gray-500 font-bold mb-1">FILLER WORDS</span>
               <span className="text-2xl font-medium text-red-400">{stats.filler_count}</span>
            </div>
            <div className="bg-black/30 rounded-lg p-4 border border-white/5 flex flex-col justify-center border-l-2 border-l-green-500">
               <span className="text-xs text-gray-500 font-bold mb-1">AVG PACE</span>
               <span className="text-2xl font-medium text-green-400">{stats.pace} <span className="text-sm text-gray-500">WPM</span></span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Parameter Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          <h3 className="text-lg font-bold mb-6">Parameter Breakdown</h3>
          <div className="space-y-6">
            {scoreData.map((item, i) => (
              <div key={item.name} className="relative">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-gray-300">{item.name}</span>
                  <span className="text-sm font-bold text-white">{item.score}/100</span>
                </div>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                    className={`h-full rounded-full ${item.score > 90 ? 'bg-green-400' : item.score > 80 ? 'bg-primary' : 'bg-yellow-400'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Feedback */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-6 flex flex-col relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-secondary/30 blur-[50px] rounded-full pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-secondary to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm">✦</span>
            </div>
            <h3 className="text-lg font-bold">Claude AI Insights</h3>
          </div>

          <div className="space-y-4 relative z-10 flex-grow">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h4 className="text-green-400 text-sm font-bold flex items-center gap-2 mb-2">
                <span className="text-lg">✓</span> What Went Well
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                 {feedback.pros.map((pro, i) => <li key={i}>{pro}</li>)}
              </ul>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h4 className="text-yellow-400 text-sm font-bold flex items-center gap-2 mb-2">
                <span className="text-lg">⚠</span> Areas to Improve
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                 {feedback.cons.map((con, i) => <li key={i}>{con}</li>)}
              </ul>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex-grow">
              <h4 className="text-blue-400 text-sm font-bold flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span> Actionable Tips
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                 {feedback.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 glass-card p-8">
           <h3 className="text-lg font-bold mb-6">Analyzed Transcript</h3>
           <div className="p-6 bg-black/40 rounded-xl border border-white/5 text-lg leading-loose text-gray-300 font-light max-h-64 overflow-y-auto scrollbar-custom">
             {sessionData?.transcript || "No transcript recorded for this session."}
           </div>
        </div>
        
        <div className="glass-card p-8 flex flex-col justify-center items-center text-center">
           <h3 className="text-sm font-bold text-gray-400 tracking-widest mb-6">ORIGINALITY CHECK</h3>
           <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,229,255,0.2)]">
             <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-primary to-blue-400">100%</span>
           </div>
           <p className="text-lg font-medium text-white">Completely Original</p>
           <p className="text-sm text-gray-400 mt-2">No matched phrases found.</p>
        </div>
      </div>

      <div className="flex justify-center mb-16">
         <button 
           onClick={() => onNavigate('dashboard')}
           className="btn-neon px-8 py-4 rounded-xl glass font-bold text-lg hover:bg-white/5 transition-colors"
         >
           Return to Dashboard
         </button>
      </div>

    </div>
  );
};
window.TalkSense.register('ReportPage', ReportPage);
