console.log("SpeechLabPage.jsx script executing...");

const SpeechLabPage = ({ user, onNavigate }) => {
  console.log("SpeechLabPage rendering with props:", { user, onNavigate });
  const { motion, AnimatePresence } = window;
  const [isPracticing, setIsPracticing] = useState(false);
  const [pitchData, setPitchData] = useState([]);
  const [fillerCount, setFillerCount] = useState(0);
  const [pace, setPace] = useState(0); 
  const [performanceScore, setPerformanceScore] = useState(0);
  const [feedback, setFeedback] = useState("Ready to start your practice session?");
  
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const requestRef = useRef(null);
  const startTime = useRef(null);
  const wordCount = useRef(0);
  const isPracticingRef = useRef(false);

  const stopPractice = () => {
    console.log("Stopping practice...");
    setIsPracticing(false);
    isPracticingRef.current = false;
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }
    if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  useEffect(() => {
    console.log("SpeechLabPage mounted - Optimizing Recognition");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Set explicit language
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPart = event.results[i][0].transcript.toLowerCase();
          if (event.results[i].isFinal) {
            const fillers = (transcriptPart.match(/\b(um|uh|like|basically|so|actually|literally|honestly|i mean|you know)\b/gi) || []).length;
            setFillerCount(prev => prev + fillers);
            wordCount.current += transcriptPart.split(' ').filter(w => w.trim()).length;
          } else {
            interimTranscript += transcriptPart;
          }
        }
        // Use interim results for feedback responsiveness if needed
        if (interimTranscript.length > 2 && isPracticingRef.current) {
            setFeedback("Voice captured... processing cadence.");
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'network') {
            setFeedback("Network issue detected. Check connection.");
        }
      };
    }
    return () => {
      console.log("SpeechLabPage unmounting");
      stopPractice();
    };
  }, []);

  const startPractice = async () => {
    try {
      console.log("Starting practice...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      setIsPracticing(true);
      isPracticingRef.current = true;
      startTime.current = Date.now();
      wordCount.current = 0;
      setFillerCount(0);
      setPitchData([]);
      setPerformanceScore(0);
      
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch(e) { console.error("Recognition already started"); }
      }
      
      const analyze = () => {
        if (!isPracticingRef.current || !analyserRef.current) return;
        
        const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);
        
        let maxVal = 0;
        let maxIdx = 0;
        for (let i = 0; i < freqData.length; i++) {
          if (freqData[i] > maxVal) {
            maxVal = freqData[i];
            maxIdx = i;
          }
        }
        
        // Update pitch data for visualizer
        setPitchData(prev => {
          const newData = [...prev, maxIdx].slice(-40);
          
          // Calculate Dynamic Performance Index
          const elapsed = (Date.now() - startTime.current) / 1000 / 60;
          if (elapsed > 0.02) { 
            // Only calculate if user has actually spoken to avoid fake results
            if (wordCount.current === 0) {
              setPerformanceScore(0);
              setPace(0);
              setFeedback("Listening for your first words...");
              return newData;
            }

            // 1. Pace Score (Optimal 120-150 WPM)
            const currentPace = Math.round(wordCount.current / elapsed);
            setPace(currentPace);
            
            let paceScore = 100;
            if (currentPace > 160) paceScore = Math.max(0, 100 - (currentPace - 160) * 1.5);
            else if (currentPace < 110 && currentPace > 0) paceScore = Math.max(0, 100 - (110 - currentPace) * 2);
            else if (currentPace === 0) paceScore = 0;

            // 2. Filler Penalty (Normalized by time)
            const fillerPenalty = Math.min(40, (fillerCount / elapsed) * 5);

            // 3. Pitch Variety (Standard Deviation of pitch data)
            const avgPitch = newData.reduce((a, b) => a + b, 0) / newData.length;
            const variance = newData.reduce((a, b) => a + Math.pow(b - avgPitch, 2), 0) / newData.length;
            const varietyReward = Math.min(20, Math.sqrt(variance) * 2);

            const finalScore = Math.round(Math.max(0, Math.min(100, (paceScore * 0.6) + (varietyReward * 2) - fillerPenalty)));
            setPerformanceScore(finalScore);

            // Dynamic Feedback
            if (currentPace > 170) setFeedback("Vocal speed is high. Aim for clarity.");
            else if (currentPace < 90 && currentPace > 0) setFeedback("Energy is low. Try increasing your pace.");
            else if (finalScore > 85) setFeedback("Excellent rhythmic delivery and pitch variance.");
            else if (fillerCount > 5) setFeedback("Focus on reducing filler words like 'um' and 'like'.");
            else setFeedback("Keep going! Focus on a steady pace.");
          }
          return newData;
        });

        requestRef.current = requestAnimationFrame(analyze);
      };
      
      analyze();
    } catch (err) {
      console.error("Lab access failed:", err);
      alert("Microphone access is required for Speech Lab.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-8 pt-24">
      {/* Live Transcription Bar */}
      <AnimatePresence>
        {isPracticing && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-primary/20 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 italic line-clamp-1">
                {feedback === "Listening for your first words..." ? "System ready... awaiting voice." : feedback}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Speech Lab</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Precision vocal training and acoustic analysis</p>
          </div>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Exit Lab
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Lab Terminal */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${isPracticing ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acoustic Status: {isPracticing ? 'Capturing' : 'Standby'}</span>
                </div>
                <button 
                  onClick={isPracticing ? stopPractice : startPractice}
                  className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${isPracticing ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-primary text-white shadow-xl shadow-primary/20'}`}
                >
                  {isPracticing ? 'Terminate Session' : 'Initiate Practice'}
                </button>
              </div>

              {/* Pitch Visualizer */}
              <div className="h-64 bg-slate-50 dark:bg-black rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-end justify-center gap-1 p-8 mb-10 overflow-hidden">
                {pitchData.length > 0 ? pitchData.map((p, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ 
                      height: `${Math.min(100, (p / 80) * 100)}%`,
                      backgroundColor: p > 40 ? 'var(--primary)' : 'rgba(16,185,129,0.3)'
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex-1 rounded-full min-w-[4px]"
                  />
                )) : (
                  <div className="text-slate-300 dark:text-slate-800 font-black uppercase tracking-widest text-xs">Waiting for vocal input...</div>
                )}
              </div>

              <div className="p-8 rounded-[2rem] bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Coaching Feedback</p>
                    <p className="font-bold text-lg">{feedback}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Sidebar */}
          <div className="space-y-8">
            <div className="glass-card p-8 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Performance Metrics</h3>
              <div className="space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Filler Frequency</p>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-200">{fillerCount}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${fillerCount > 5 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {fillerCount > 5 ? 'CRITICAL' : 'STABLE'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Current Pace</p>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-200">{pace} <span className="text-xs font-bold text-slate-400">WPM</span></p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${(pace > 160 || pace < 110) ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {(pace > 160 || pace < 110) ? 'ADJUST' : 'OPTIMAL'}
                  </span>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-end mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Index</p>
                    <p className="text-xl font-black text-primary tracking-tighter">{performanceScore}%</p>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ width: `${performanceScore}%` }}
                      className="h-full bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                  <p className="text-right text-[8px] font-black text-primary mt-2 uppercase tracking-widest">
                    Acoustic Level: {performanceScore > 90 ? 'Master' : performanceScore > 75 ? 'Expert' : performanceScore > 50 ? 'Intermediate' : 'Novice'}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 bg-primary text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <h3 className="text-sm font-black uppercase tracking-tight mb-2">Pro Tip</h3>
              <p className="text-xs font-bold text-emerald-100 leading-relaxed italic opacity-80">
                "Vary your pitch every 10-15 seconds to maintain audience engagement and prevent a monotone delivery."
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

window.TalkSense.register('SpeechLabPage', SpeechLabPage);
