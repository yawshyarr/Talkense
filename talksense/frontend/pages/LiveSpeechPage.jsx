console.log("LiveSpeechPage.jsx script executing...");
const { motion, AnimatePresence } = window;

const LiveSpeechPage = ({ onNavigate, config }) => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [timer, setTimer] = useState(config?.duration_seconds || 60);
  const [warnings, setWarnings] = useState(0);

  const fillerWords = ['um', 'uh', 'like', 'basically', 'you know', 'so', 'actually', 'right', 'okay'];

  useEffect(() => {
    // Initial Countdown
    if (countdown > 0) {
      const cd = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(cd);
    } else {
      setIsRecording(true);
    }
  }, [countdown]);

  useEffect(() => {
    // Session Timer
    if (isRecording && timer > 0) {
      const tm = setTimeout(() => setTimer(t => t - 1), 1000);
      return () => clearTimeout(tm);
    } else if (timer === 0 && isRecording) {
      handleStop();
    }
  }, [isRecording, timer]);

  useEffect(() => {
    // Anti-Cheat: Visibility Change
    const handleVisibilityChange = () => {
      if (document.hidden && isRecording) {
        setWarnings(w => w + 1);
        alert("Tab switching detected! Stay focused. Remaining warnings: " + (2 - warnings));
        if (warnings >= 2) {
            handleStop();
        }
      }
    };
    
    // Prevent Copy/Paste
    const handleCopy = (e) => e.preventDefault();
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopy);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopy);
    };
  }, [isRecording, warnings]);

  useEffect(() => {
    // Web Speech API Integration Mock (or actual if supported)
    if (!isRecording) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(prev => prev + ' ' + currentTranscript);
      };
      
      recognition.start();
      return () => recognition.stop();
    } else {
      // Fallback Demo text if API not supported locally
      const demoInterval = setInterval(() => {
        setTranscript(prev => prev + " " + "uh actually we are building a cool app");
      }, 5000);
      return () => clearInterval(demoInterval);
    }
  }, [isRecording]);

  const handleStop = () => {
    setIsRecording(false);
    onNavigate('report', { ...config, transcript });
  };

  const highlightFillers = (text) => {
    // Extremely basic highlighting logic for React without innerHTML when possible
    if(!text) return null;
    let words = text.split(' ');
    return words.map((w, i) => {
      const cleanW = w.toLowerCase().replace(/[.,!]/g, '');
      if (fillerWords.includes(cleanW)) {
        return <span key={i} className="bg-red-500/30 text-red-300 rounded px-1 mx-1">{w}</span>;
      }
      return <span key={i} className="mx-[2px]">{w}</span>;
    });
  };

  if (countdown > 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <motion.div 
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          className="text-9xl font-extrabold text-primary drop-shadow-[0_0_50px_rgba(0,229,255,1)]"
        >
          {countdown}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 h-[85vh] flex flex-col user-select-none">
      
      {/* Top Bar with Timer & Stop Warning */}
      <div className="flex justify-between items-center mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-4">
          <motion.div 
            animate={{ opacity: [1, 0.2, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full font-bold border border-red-500/30"
          >
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
            RECORDING
          </motion.div>
          {warnings > 0 && <span className="text-red-400 text-sm">Warning: Tab Switch Detected ({warnings}/3)</span>}
        </div>
        
        <div className="text-3xl font-mono text-white tracking-widest bg-navy px-6 py-2 rounded-lg border border-primary/20 shadow-[inset_0_0_20px_rgba(0,229,255,0.1)]">
          {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
        </div>
        
        <button 
          onClick={handleStop}
          className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-8 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-colors"
        >
          STOP
        </button>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Main Transcript Area */}
        <div className="lg:col-span-3 glass-card p-8 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-400 font-medium tracking-wide">LIVE TRANSCRIPT</h3>
            <div className="flex gap-4 text-sm">
                <span className="text-gray-400">Words: <span className="text-white font-bold">{transcript.split(' ').filter(w=>w).length}</span></span>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto text-2xl leading-relaxed text-gray-200 font-light pr-4 scrollbar-custom">
            {transcript ? highlightFillers(transcript) : (
              <span className="text-gray-600 italic">Listening... Speak clearly into the microphone.</span>
            )}
          </div>
          
          {/* Animated sound wave imitation */}
          <div className="h-16 border-t border-white/5 mt-4 pt-4 flex items-center justify-center gap-1 opacity-50">
             {[...Array(40)].map((_, i) => (
               <motion.div 
                 key={i}
                 animate={{ height: isRecording ? [10, Math.random() * 40 + 10, 10] : 2 }}
                 transition={{ repeat: Infinity, duration: Math.random() * 0.5 + 0.2 }}
                 className="w-1 bg-primary rounded-full"
               />
             ))}
          </div>
        </div>

        {/* Right Sidebar - Analytics & Emotion */}
        <div className="space-y-6 flex flex-col overflow-y-auto pr-2">
          
          {/* Emotion Tracker */}
          <div className="glass-card p-6 border-secondary/30">
            <h3 className="text-xs text-secondary font-bold tracking-widest mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              TONE ANALYSIS
            </h3>
            
            <motion.div 
               animate={{ scale: [1, 1.05, 1] }} 
               transition={{ repeat: Infinity, duration: 4 }}
               className="text-center py-6 bg-secondary/10 rounded-xl border border-secondary/20 mb-4"
            >
              <div className="text-5xl mb-2">😊</div>
              <div className="text-white font-semibold text-lg">Confident</div>
            </motion.div>
            
            <div className="space-y-3 mt-6">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Confidence Meter</span>
                  <span>78%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: '40%' }} animate={{ width: '78%' }} 
                    className="h-full bg-secondary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Alerts */}
          <div className="glass-card p-6 flex-grow">
            <h3 className="text-xs text-yellow-500 font-bold tracking-widest mb-4">LIVE ALERTS</h3>
            <div className="space-y-4">
               {transcript && highlightFillers(transcript).length > 5 && (
                 <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="bg-red-500/10 border-l-4 border-red-500 p-3 rounded-r text-sm text-red-200">
                   Too many filler words detected. Take a breath.
                 </motion.div>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
window.TalkSense.register('LiveSpeechPage', LiveSpeechPage);
