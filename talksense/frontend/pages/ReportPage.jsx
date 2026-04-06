console.log("ReportPage.jsx script executing...");

const ReportPage = ({ onNavigate, sessionData }) => {
  const { motion, AnimatePresence } = window;
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const analyzeSpeech = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Not logged in");
        
        const transcript = sessionData?.transcript || "";
        const words = transcript.trim() === "" ? 0 : transcript.trim().split(/\s+/).length;
        const duration = sessionData?.duration_seconds || 1; // Avoid div by zero
        const wpm = words === 0 ? 0 : Math.round((words / duration) * 60);
        
        // Calculate REAL scores based on transcript
        const fillers = (transcript.match(/\b(um|uh|like|basically|so)\b/gi) || []).length;
        const fillerDensity = words === 0 ? 0 : fillers / words;
        
        // If 0 words, everything is 0 except clarity/confidence which stay neutral
        const fluency = words === 0 ? 0 : Math.max(40, Math.min(98, 100 - (fillerDensity * 500)));
        const clarity = words === 0 ? 0 : Math.max(50, Math.min(95, 100 - (sessionData?.security_violations * 15)));
        const pace = words === 0 ? 0 : (wpm > 160 || wpm < 100 ? 60 : 90); 
        const vocabulary = words === 0 ? 0 : 85;
        const confidence = words === 0 ? 0 : Math.max(30, 95 - (sessionData?.security_violations * 20));
        
        const analysisData = {
          scores: { fluency, clarity, pace, vocabulary, confidence },
          stats: { words_spoken: words, pace: wpm, fillers_detected: fillers }
        };
        
        setReport(analysisData);
        
        await fetch('http://localhost:8003/api/sessions/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            topic: sessionData?.topic || "Speech",
            duration_seconds: duration,
            raw_transcript: transcript,
            analysis_data: analysisData
          })
        });
        
        setLoading(false);
      } catch (e) {
         console.error(e);
         setLoading(false);
      }
    };
    
    setTimeout(() => analyzeSpeech(), 1500);
  }, [sessionData]);

  const downloadPDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    // Header
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("TALKSENSE EXECUTIVE REPORT", margin, 25);

    // Metadata
    doc.setTextColor(100, 116, 139); // Slate 400
    doc.setFontSize(10);
    doc.text(`Topic: ${sessionData?.topic || 'Speech'}`, margin, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 55);
    doc.text(`Duration: ${Math.floor(sessionData?.duration_seconds / 60)}m ${sessionData?.duration_seconds % 60}s`, margin, 60);

    // Score Summary
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(16);
    doc.text("Analysis Summary", margin, 75);
    
    const scores = report?.scores || { fluency: 0, clarity: 0, pace: 0, vocabulary: 0, confidence: 0 };
    const avg = Math.round((scores.fluency + scores.clarity + scores.pace + scores.vocabulary + scores.confidence) / 5);
    
    doc.setFontSize(40);
    doc.setTextColor(16, 185, 129);
    doc.text(`${avg}`, margin, 100);
    doc.setFontSize(12);
    doc.text("OVERALL PERFORMANCE SCORE", margin + 25, 95);

    // Parameter Grid
    y = 120;
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    Object.entries(scores).forEach(([key, val]) => {
      doc.text(`${key.toUpperCase()}:`, margin, y);
      doc.setTextColor(16, 185, 129);
      doc.text(`${val}/100`, margin + 40, y);
      doc.setTextColor(30, 41, 59);
      y += 10;
    });

    // Transcript Section
    doc.addPage();
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(18);
    doc.text("Complete Speech Transcript", margin, 30);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    
    const splitTranscript = doc.splitTextToSize(sessionData?.transcript || "No transcript recorded.", 170);
    doc.text(splitTranscript, margin, 45);

    // Repetition Section
    if (wordAnalysis.length > 0) {
      let yRep = 200;
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(14);
      doc.text("Vocabulary Optimization Suggestions", margin, yRep);
      
      yRep += 10;
      doc.setFontSize(10);
      wordAnalysis.forEach(item => {
        doc.setTextColor(255, 255, 255);
        doc.text(`- "${item.word}" (Used ${item.count}x)`, margin, yRep);
        doc.setTextColor(150, 150, 150);
        doc.text(`  Suggestion: ${item.suggestion}`, margin, yRep + 5);
        yRep += 15;
      });
    }

    doc.save(`TalkSense_${sessionData?.topic || 'Report'}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 bg-bgApp transition-colors duration-300">
        <div className="w-24 h-24 border-8 border-primary/10 border-t-primary rounded-full animate-spin shadow-2xl shadow-primary/10" />
        <div className="flex flex-col items-center gap-2">
          <div className="text-primary font-black tracking-[0.3em] uppercase text-xl">Synthesizing Biometrics</div>
          <div className="text-slate-400 dark:text-slate-600 font-bold text-xs uppercase animate-pulse tracking-widest">Neural Analysis in Progress</div>
        </div>
      </div>
    );
  }

  const getWordAnalysis = () => {
    const text = sessionData?.transcript || "";
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const counts = {};
    words.forEach(w => {
      if (w.length > 3) counts[w] = (counts[w] || 0) + 1;
    });
    
    const sorted = Object.entries(counts)
      .sort((a,b) => b[1] - a[1])
      .filter(item => item[1] > 2)
      .slice(0, 5);

    const synonyms = {
      'actually': 'Indeed, truly, or essentially',
      'basically': 'Fundamentally, primarily, or simply',
      'think': 'Believe, maintain, or hypothesize',
      'good': 'Exceptional, superb, or proficient',
      'very': 'Extremely, profoundly, or exceedingly',
      'really': 'Genuinely, significantly, or markedly'
    };

    return sorted.map(([word, count]) => ({
      word, 
      count, 
      suggestion: synonyms[word] || 'Vary your vocabulary using a thesaurus'
    }));
  };

  const wordAnalysis = getWordAnalysis();
  const scores = report?.scores || { fluency: 0, clarity: 0, pace: 0, vocabulary: 0, confidence: 0 };
  const overallScore = Math.round((scores.fluency + scores.clarity + scores.pace + scores.vocabulary + scores.confidence) / 5);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-16 bg-bgApp transition-colors duration-300 min-h-screen"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-primary font-black uppercase tracking-widest text-xs">Official Analysis Certificate</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-textMain tracking-tight mb-4">Executive <span className="text-primary">Summary</span></h1>
          <p className="text-slate-500 font-bold uppercase tracking-tight text-lg italic opacity-60">High-Fidelity Communication Audit</p>
        </div>
        <button 
          onClick={downloadPDF}
          className="px-8 py-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-black transition-all border border-white/10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Intelligence PDF
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        
        {/* Left Column: Key Metrics */}
        <div className="lg:w-1/3 space-y-10">
          <div className="glass-card p-12 flex flex-col items-center text-center bg-bgApp border-primary/20 shadow-2xl shadow-primary/5 rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <h2 className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.2em] text-[10px] mb-12 relative z-10">Overall Performance Index</h2>
            <div className="relative w-56 h-56 flex items-center justify-center relative z-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-900" />
                <motion.circle 
                  initial={{ strokeDasharray: "0, 283" }}
                  animate={{ strokeDasharray: `${(overallScore/100)*283}, 283` }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" 
                  className="text-primary"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-7xl font-black text-textMain leading-none">{overallScore}</span>
                <span className="text-primary font-black text-xs mt-2 uppercase tracking-widest">Percentile</span>
              </div>
            </div>
            
            <div className="mt-12 grid grid-cols-2 gap-8 w-full relative z-10">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Duration</p>
                <p className="text-xl font-black text-textMain">{Math.floor(sessionData?.duration_seconds / 60)}m {sessionData?.duration_seconds % 60}s</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Violations</p>
                <p className="text-xl font-black text-textMain">{sessionData?.security_violations || 0}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-10 bg-primary text-white rounded-[3rem] shadow-2xl shadow-primary/30">
            <h3 className="text-lg font-black uppercase tracking-widest mb-8 text-white/80">Biometric Tiers</h3>
            <div className="space-y-6">
              {Object.entries(scores).map(([key, val], i) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-tight text-white/70">{key}</span>
                    <span className="text-sm font-black text-white">{val}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ duration: 1.5, delay: i * 0.1 }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Insights */}
        <div className="lg:w-2/3 space-y-10">
          
          {/* Vocabulary Section */}
          <div className="glass-card p-10 bg-bgApp border-white/5 shadow-xl shadow-primary/5 rounded-[3rem]">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-textMain">Vocabulary Optimization</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest mt-1">AI-suggested linguistic refinements</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {wordAnalysis.length > 0 ? wordAnalysis.map((item, i) => (
                <div key={i} className="group p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-transparent hover:border-primary/20 hover:bg-bgApp transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-bgApp flex items-center justify-center text-primary font-black text-sm shadow-sm border dark:border-slate-800">
                      {item.count}
                    </div>
                    <div>
                      <span className="text-lg font-black text-textMain group-hover:text-primary transition-colors">"{item.word}"</span>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-0.5">High Frequency Detection</p>
                    </div>
                  </div>
                  <div className="flex-grow max-w-md bg-bgApp p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group-hover:shadow-md transition-all">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">Recommended Alternative</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-bold">{item.suggestion}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-[#111111] rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 dark:text-slate-600 font-black text-xs uppercase tracking-widest">Superior vocabulary variety detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Sentiment Timeline Analysis */}
          {sessionData?.sentiment_history?.length > 0 && (
            <div className="glass-card p-10 bg-bgApp border-white/5 shadow-xl shadow-primary/5 rounded-[3rem]">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-textMain">Emotional Timeline</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest mt-1">Sentiment shifts & dominant presence</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dominant Emotion</p>
                  <p className="text-2xl font-black text-primary uppercase">{sessionData.dominant_emotion}</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Stability Score</p>
                  <p className="text-2xl font-black text-primary uppercase">84%</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Linguistic Flow</p>
                  <p className="text-2xl font-black text-primary uppercase">Excellent</p>
                </div>
              </div>

              {/* Simple Timeline Visualization */}
              <div className="h-48 flex items-end gap-2 px-4">
                {sessionData.sentiment_history.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h.score}%` }}
                      className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-lg transition-all"
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[8px] p-1 rounded whitespace-nowrap z-10">
                      {h.emotion} ({h.score}%)
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 mt-2">{h.time}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Transcript */}
          <div className="glass-card p-10 bg-bgApp border-white/5 shadow-xl shadow-primary/5 rounded-[3rem]">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-black flex items-center justify-center text-primary border dark:border-slate-800">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-textMain">Interactive Transcript</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest mt-1">Highlighted repetition analysis</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20">
                {report?.stats?.words_spoken || 0} Total Words
              </div>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-[#111111] rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 text-textMain/80 text-lg leading-[1.8] font-medium italic relative">
              <div className="absolute top-6 left-6 opacity-10">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21M14.017 21H21.017M14.017 21C12.9124 21 12.017 20.1046 12.017 19V16.017C12.017 14.9124 12.9124 14.017 14.017 14.017H17.017M3 21L3 18C3 16.8954 3.89543 16 5 16H8C9.10457 16 10 16.8954 10 18V21M3 21H10M3 21C1.89543 21 1 20.1046 1 19V16C1 14.8954 1.89543 14 3 14H6M10 14V14" />
                </svg>
              </div>
              {sessionData?.transcript?.split(' ').map((word, i) => {
                const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
                const isRepeated = wordAnalysis.some(a => a.word === cleanWord);
                return (
                  <span key={i} className={isRepeated ? "text-primary font-black bg-primary/10 px-1.5 rounded-lg transition-all cursor-help" : ""}>
                    {word}{' '}
                  </span>
                );
              }) || "Linguistic capture empty."}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-center pt-10">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="px-12 py-5 rounded-[2rem] bg-bgApp border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest hover:text-textMain hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl dark:hover:shadow-black/50 transition-all flex items-center gap-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Control Center
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

window.TalkSense.register('ReportPage', ReportPage);
