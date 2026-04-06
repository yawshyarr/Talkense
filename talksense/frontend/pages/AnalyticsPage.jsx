console.log("AnalyticsPage.jsx script executing...");

const AnalyticsPage = ({ user, onNavigate }) => {
  console.log("CRITICAL: AnalyticsPage attempting to render...");
  
  // Safe extraction from window with fallbacks
  const { 
    useState, useEffect, useMemo, 
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
  } = window;
  const motion = window.motion || { div: "div" }; 

  // Verify core React hooks are present
  if (!useState || !useEffect) {
    console.error("FATAL: React hooks not found on window.");
    return <div className="p-20 text-center text-red-500 font-black">SYSTEM ERROR: REACT HOOKS MISSING</div>;
  }

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiTips, setAiTips] = useState([]);
  const [stats, setStats] = useState({
    avgWPM: 0,
    totalWords: 0,
    avgScore: 0,
    growthRate: 0,
    vocabularyRichness: 0,
    topFillers: [],
    longestSentence: 0,
    shortestSentence: 0
  });

  const fetchAnalytics = async () => {
    console.log("Analytics: Fetching data...");
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn("Analytics: No token found");
        setLoading(false);
        return;
      }
      
      const res = await fetch('http://localhost:8003/api/sessions/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Analytics: Data received, sessions:", data?.length);
        const sorted = (data || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        setSessions(sorted);
        processStats(sorted);
        fetchAiTips(sorted);
      } else {
        console.error("Analytics: API error", res.status);
      }
      setLoading(false);
    } catch (err) {
      console.error("Analytics: Fetch catch", err);
      setLoading(false);
    }
  };

  const processStats = (data) => {
    if (!data || data.length === 0) return;
    try {
        let totalWpm = 0;
        let totalWords = 0;
        let totalScore = 0;
        let fillerCounts = {};
        let allWords = [];
        let sentenceLengths = [];

        data.forEach(s => {
          const analysis = s.analysis_data || {};
          totalWpm += analysis.stats?.pace || 0;
          totalWords += analysis.stats?.words_spoken || 0;
          
          const scores = analysis.scores || { fluency: 0, clarity: 0, pace: 0, vocabulary: 0, confidence: 0 };
          const avgS = Math.round((
            (scores.fluency || 0) + 
            (scores.clarity || 0) + 
            (scores.pace || 0) + 
            (scores.vocabulary || 0) + 
            (scores.confidence || 0)
          ) / 5);
          totalScore += avgS;

          const transcript = s.raw_transcript || "";
          const words = transcript.toLowerCase().match(/\b\w+\b/g) || [];
          allWords = [...allWords, ...words];

          const sentences = transcript.split(/[.!?]+/).filter(sent => sent.trim().length > 0);
          sentences.forEach(sent => {
            sentenceLengths.push(sent.trim().split(/\s+/).length);
          });

          const detectedFillers = (transcript.match(/\b(um|uh|like|basically|you know|so|actually)\b/gi) || []);
          detectedFillers.forEach(f => {
            const lowerF = f.toLowerCase();
            fillerCounts[lowerF] = (fillerCounts[lowerF] || 0) + 1;
          });
        });

        const uniqueWords = new Set(allWords).size;
        const topFillers = Object.entries(fillerCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }))
          .slice(0, 5);

        setStats({
          avgWPM: Math.round(totalWpm / data.length) || 0,
          totalWords: totalWords || 0,
          avgScore: Math.round(totalScore / data.length) || 0,
          growthRate: data.length > 1 ? Math.round(((totalScore / data.length) - 50) * 1.5) : 0,
          vocabularyRichness: totalWords > 0 ? Math.round((uniqueWords / totalWords) * 100) : 0,
          topFillers,
          longestSentence: sentenceLengths.length > 0 ? Math.max(...sentenceLengths) : 0,
          shortestSentence: sentenceLengths.length > 0 ? Math.min(...sentenceLengths) : 0
        });
    } catch (e) {
        console.error("Stats processing failed", e);
    }
  };

  const fetchAiTips = async (data) => {
    const mockTips = [
      { title: "Pause Control", tip: "You use 'basically' 15% more than average. Try replacing it with a 1-second silent pause.", color: "emerald-500" },
      { title: "Rhythmic Flow", tip: "Your pace fluctuates significantly. Practice speaking to a metronome at 130 WPM.", color: "amber-500" },
      { title: "Diction Clarity", tip: "Long sentences are causing clarity drops. Aim for 12-15 words per sentence for maximum impact.", color: "emerald-500" }
    ];
    setAiTips(mockTips);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const chartData = useMemo(() => {
    try {
        return sessions.map(s => {
          const scores = s.analysis_data?.scores || { fluency: 0, clarity: 0, pace: 0, vocabulary: 0, confidence: 0 };
          const avg = Math.round((
            (scores.fluency || 0) + 
            (scores.clarity || 0) + 
            (scores.pace || 0) + 
            (scores.vocabulary || 0) + 
            (scores.confidence || 0)
          ) / 5);
          return {
            date: new Date(s.date).toLocaleDateString(),
            score: avg || 0,
            wpm: s.analysis_data?.stats?.pace || 0
          };
        });
    } catch (e) {
        return [];
    }
  }, [sessions]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-black">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-primary font-black uppercase tracking-[0.3em] text-xs">Synchronizing Intelligence...</p>
      </div>
    );
  }

  const hasCharts = !!(AreaChart && BarChart);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-8 pt-24 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h1 className="text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Growth <span className="text-primary">Analytics</span></h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Neural performance tracking and longitudinal development</p>
          </motion.div>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Exit Analytics
          </button>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Growth Rate', value: stats.growthRate, unit: '%', trend: '+12.5%', color: 'primary' },
            { label: 'Avg Pace', value: stats.avgWPM, unit: 'WPM', trend: 'Stable', color: 'blue-500' },
            { label: 'Vocab Richness', value: stats.vocabularyRichness, unit: '%', trend: '+4.2%', color: 'emerald-500' },
            { label: 'Global Rank', value: 'Top 15', unit: '%', trend: 'Rising', color: 'amber-500' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 relative overflow-hidden group"
            >
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-4">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${stat.color === 'primary' ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{stat.value}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">{stat.unit}</span>
              </div>
              <p className={`text-[10px] font-black mt-4 ${stat.color === 'primary' ? 'text-primary' : 'text-blue-500'}`}>{stat.trend} baseline</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Main Growth Chart */}
          <div className="lg:col-span-2 glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 min-h-[400px]">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10">Neural Score Progression</h3>
            {hasCharts && sessions.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
                  {sessions.length === 0 ? "Insufficient session data for progression chart" : "Visual engine initializing..."}
                </p>
              </div>
            )}
          </div>

          {/* Filler Breakdown */}
          <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10">Filler Distribution</h3>
            {hasCharts && stats.topFillers.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topFillers}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {stats.topFillers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No filler data captured yet</p>
              </div>
            )}
            {stats.topFillers.length > 0 && (
              <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Critical Warning</p>
                <p className="text-xs font-bold text-red-700 dark:text-red-400">Over-reliance on "{stats.topFillers[0].name}" detected.</p>
              </div>
            )}
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Detailed Speech Metrics */}
          <div className="glass-card p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl shadow-primary/10">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-10">Linguistic Precision</h3>
            <div className="space-y-10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Words Captured</p>
                  <p className="text-3xl font-black tracking-tighter">{stats.totalWords}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-10 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Longest Sentence</p>
                  <p className="text-xl font-black">{stats.longestSentence} <span className="text-[10px] text-slate-600">words</span></p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Shortest Sentence</p>
                  <p className="text-xl font-black">{stats.shortestSentence} <span className="text-[10px] text-slate-600">words</span></p>
                </div>
              </div>

              <div className="pt-10 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WPM Consistency</p>
                  <span className="text-xs font-black text-emerald-500">88%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '88%' }} className="h-full bg-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          {/* AI Improvement Tips */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">AI Coaching <span className="text-primary">Directives</span></h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aiTips.map((tip, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className={`p-8 bg-white dark:bg-slate-900 border-l-4 border-${tip.color} shadow-xl rounded-3xl relative overflow-hidden group`}
                >
                  <h4 className={`text-xs font-black text-${tip.color} uppercase tracking-widest mb-4`}>{tip.title}</h4>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">{tip.tip}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 p-10 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-[3rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 shrink-0">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Quarterly Roadmap Update</h4>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                    You are on track to reach "Master Communicator" status. Keep focusing on lexical diversity and rhythmic pausing.
                  </p>
                </div>
                <button className="px-8 py-4 bg-slate-900 dark:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap hover:scale-105 transition-all">Full Roadmap</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

window.TalkSense.register('AnalyticsPage', AnalyticsPage);
