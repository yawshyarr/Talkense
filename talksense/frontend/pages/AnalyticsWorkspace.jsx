console.log("AnalyticsWorkspace.jsx script executing...");

const SCORE_KEYS = ['fluency', 'clarity', 'pace', 'vocabulary', 'confidence'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const averageScore = (scores = {}) => {
  const total = SCORE_KEYS.reduce((sum, key) => sum + (scores[key] || 0), 0);
  return Math.round(total / SCORE_KEYS.length);
};

const formatShortDate = (value) => {
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

const CustomLineChart = ({ data, stroke = '#10b981', height = 220 }) => {
  if (!data.length) return null;
  const width = 100;
  const maxY = Math.max(...data.map(point => point.value), 1);
  const points = data.map((point, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = 90 - ((point.value / maxY) * 70);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <line x1="0" y1="90" x2="100" y2="90" stroke="rgba(148,163,184,0.25)" strokeDasharray="1.5 2" />
        <polyline fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" points={points} />
        <polygon fill="url(#analyticsArea)" points={`0,90 ${points} 100,90`} />
        {data.map((point, index) => {
          const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
          const y = 90 - ((point.value / maxY) * 70);
          return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="1.8" fill={stroke} />;
        })}
      </svg>
      <div className="grid gap-2 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((point, index) => (
          <div key={`${point.label}-${index}`} className="text-center">{point.label}</div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsPage = ({ user, onNavigate, goBack, canGoBack }) => {
  const { motion } = window;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeLevel, setActiveLevel] = useState('All');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const res = await fetch('http://127.0.0.1:8000/api/sessions/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
      const data = await res.json();
      const sorted = (data || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      setSessions(sorted);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Analytics fetch failed", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const handleFocus = () => fetchAnalytics();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filteredSessions = useMemo(() => {
    if (activeLevel === 'All') return sessions;
    return sessions.filter((session) => (session.analysis_data?.metadata?.difficulty || 'Intermediate') === activeLevel);
  }, [sessions, activeLevel]);

  const analytics = useMemo(() => {
    const sessionCount = filteredSessions.length;
    if (!sessionCount) {
      return {
        totals: { sessions: 0, avgScore: 0, avgWpm: 0, totalWords: 0, bestScore: 0, strongestMetric: 'fluency' },
        timeline: [],
        metricAverages: [],
        fillerBreakdown: [],
        levelBreakdown: [],
        insights: [],
        sentenceStats: { avg: 0, max: 0, min: 0 },
        comparisons: { recentAvg: 0, previousAvg: 0, delta: 0, recentCount: 0, previousCount: 0 },
        momentum: { bestRise: null, biggestDrop: null },
      };
    }

    let totalWords = 0;
    let totalWpm = 0;
    let totalScore = 0;
    let bestScore = 0;
    let sentenceLengths = [];
    let fillerMap = {};
    let levelMap = {};
    let metricTotals = { fluency: 0, clarity: 0, pace: 0, vocabulary: 0, confidence: 0 };

    const timeline = filteredSessions.map((session) => {
      const analysis = session.analysis_data || {};
      const scores = analysis.scores || {};
      const avg = averageScore(scores);
      const stats = analysis.stats || {};

      totalWords += stats.words_spoken || 0;
      totalWpm += stats.pace || 0;
      totalScore += avg;
      bestScore = Math.max(bestScore, avg);
      SCORE_KEYS.forEach((key) => {
        metricTotals[key] += scores[key] || 0;
      });

      const transcript = session.raw_transcript || '';
      const fillers = (transcript.match(/\b(um|uh|like|basically|you know|so|actually|literally|right)\b/gi) || []);
      fillers.forEach((item) => {
        const key = item.toLowerCase();
        fillerMap[key] = (fillerMap[key] || 0) + 1;
      });

      const sentences = transcript.split(/[.!?]+/).map(item => item.trim()).filter(Boolean);
      sentences.forEach((sentence) => {
        sentenceLengths.push((sentence.match(/\b[\w']+\b/g) || []).length);
      });

      const difficulty = analysis.metadata?.difficulty || 'Intermediate';
      levelMap[difficulty] = (levelMap[difficulty] || 0) + 1;

      return {
        id: session.id,
        label: formatShortDate(session.date),
        value: avg,
        pace: stats.pace || 0,
        words: stats.words_spoken || 0,
        topic: session.topic,
        difficulty,
        raw: session,
      };
    });

    const metricAverages = SCORE_KEYS.map((key) => ({
      key,
      value: Math.round(metricTotals[key] / sessionCount),
    }));

    const strongestMetric = [...metricAverages].sort((a, b) => b.value - a.value)[0];
    const weakestMetric = [...metricAverages].sort((a, b) => a.value - b.value)[0];
    const fillerBreakdown = Object.entries(fillerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));
    const levelBreakdown = Object.entries(levelMap).map(([label, value]) => ({ label, value }));

    const sentenceStats = {
      avg: sentenceLengths.length ? Math.round(sentenceLengths.reduce((sum, value) => sum + value, 0) / sentenceLengths.length) : 0,
      max: sentenceLengths.length ? Math.max(...sentenceLengths) : 0,
      min: sentenceLengths.length ? Math.min(...sentenceLengths) : 0,
    };

    const recentWindow = timeline.slice(-4);
    const previousWindow = timeline.slice(Math.max(0, timeline.length - 8), Math.max(0, timeline.length - 4));
    const averageWindowScore = (items) => items.length ? Math.round(items.reduce((sum, item) => sum + item.value, 0) / items.length) : 0;
    const recentAvg = averageWindowScore(recentWindow);
    const previousAvg = averageWindowScore(previousWindow);
    const delta = recentAvg - previousAvg;

    let bestRise = null;
    let biggestDrop = null;
    for (let i = 1; i < timeline.length; i++) {
      const change = timeline[i].value - timeline[i - 1].value;
      const pair = { from: timeline[i - 1], to: timeline[i], change };
      if (!bestRise || change > bestRise.change) bestRise = pair;
      if (!biggestDrop || change < biggestDrop.change) biggestDrop = pair;
    }

    const insights = [];
    if (fillerBreakdown[0]) insights.push(`${fillerBreakdown[0].label} is your most frequent filler word, appearing ${fillerBreakdown[0].value} times.`);
    if (weakestMetric) insights.push(`${weakestMetric.key} is your weakest average metric at ${weakestMetric.value}%.`);
    if (sentenceStats.avg > 18) insights.push(`Your average sentence length is ${sentenceStats.avg} words, which may reduce clarity in live speaking.`);
    if (timeline.length > 1) {
      const totalTrend = timeline[timeline.length - 1].value - timeline[0].value;
      insights.push(totalTrend >= 0
        ? `Your score trend has improved by ${totalTrend} points across recorded sessions.`
        : `Your score trend has dropped by ${Math.abs(totalTrend)} points across recorded sessions.`);
    }
    if (previousWindow.length > 0) {
      insights.push(delta >= 0
        ? `Your newest session block is ${delta} points higher than the previous block.`
        : `Your newest session block is ${Math.abs(delta)} points lower than the previous block.`);
    }
    if (!insights.length) insights.push('Complete more sessions to unlock stronger trend analysis and coaching signals.');

    return {
      totals: {
        sessions: sessionCount,
        avgScore: Math.round(totalScore / sessionCount),
        avgWpm: Math.round(totalWpm / sessionCount),
        totalWords,
        bestScore,
        strongestMetric: strongestMetric?.key || 'fluency',
      },
      timeline,
      metricAverages,
      fillerBreakdown,
      levelBreakdown,
      insights,
      sentenceStats,
      comparisons: { recentAvg, previousAvg, delta, recentCount: recentWindow.length, previousCount: previousWindow.length },
      momentum: { bestRise, biggestDrop },
    };
  }, [filteredSessions]);

  const topStats = [
    { label: 'Sessions Logged', value: analytics.totals.sessions, suffix: '', note: 'Based only on saved history' },
    { label: 'Average Score', value: analytics.totals.avgScore, suffix: '%', note: 'Composite result average' },
    { label: 'Average Pace', value: analytics.totals.avgWpm, suffix: 'WPM', note: 'Derived from saved session stats' },
    { label: 'Words Captured', value: analytics.totals.totalWords, suffix: '', note: 'Transcript-backed count' },
  ];

  const recentSessions = analytics.timeline.slice(-6).reverse();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-black">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-primary font-black uppercase tracking-[0.3em] text-xs">Building Analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-8 pt-24 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <div>
            <h1 className="text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Session <span className="text-primary">Analytics</span></h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Every chart here is generated only from saved session results.</p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mt-4">
              {lastUpdated ? `Last Updated ${lastUpdated.toLocaleTimeString()}` : 'No refresh yet'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchAnalytics}
              className="px-5 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all"
            >
              Refresh Analytics
            </button>
            <button
              onClick={() => canGoBack ? goBack() : onNavigate('dashboard')}
              className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
            >
              {canGoBack ? 'Go Back' : 'Exit Analytics'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeLevel === level ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-primary/30 hover:text-primary'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {analytics.totals.sessions === 0 ? (
          <div className="glass-card p-16 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-center rounded-[3rem]">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">No Session Data Yet</h2>
            <p className="text-slate-500 font-bold mt-4">Complete and save at least one {activeLevel !== 'All' ? activeLevel.toLowerCase() : ''} session to unlock detailed analytics.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
              {topStats.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="glass-card p-8 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[2rem]"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{item.label}</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{item.value}</span>
                    {item.suffix && <span className="text-xs font-bold text-slate-400 uppercase mb-1">{item.suffix}</span>}
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 mt-4">{item.note}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-8 mb-12">
              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Score Progression</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Recent session averages over time</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Best Score</p>
                    <p className="text-2xl font-black text-primary">{analytics.totals.bestScore}%</p>
                  </div>
                </div>
                <CustomLineChart data={analytics.timeline.map(point => ({ label: point.label, value: point.value }))} />
              </div>

              <div className="glass-card p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl shadow-primary/10">
                <h3 className="text-2xl font-black">Signal Summary</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 mb-8">Straight from session history</p>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Strongest Metric</p>
                    <p className="text-3xl font-black capitalize">{analytics.totals.strongestMetric}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Average Sentence</p>
                    <p className="text-3xl font-black">{analytics.sentenceStats.avg} <span className="text-sm text-slate-400">words</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Sentence Range</p>
                    <p className="text-xl font-black">{analytics.sentenceStats.min} to {analytics.sentenceStats.max} words</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Recent Block Average</p>
                <p className="text-5xl font-black text-primary">{analytics.comparisons.recentAvg}%</p>
                <p className="text-sm font-bold text-slate-500 mt-3">Based on the latest {analytics.comparisons.recentCount || 0} sessions.</p>
              </div>
              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Previous Block Average</p>
                <p className="text-5xl font-black text-slate-900 dark:text-white">{analytics.comparisons.previousAvg}%</p>
                <p className="text-sm font-bold text-slate-500 mt-3">Compared against the previous {analytics.comparisons.previousCount || 0} sessions.</p>
              </div>
              <div className="glass-card p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl shadow-primary/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Change</p>
                <p className={`text-5xl font-black ${analytics.comparisons.delta >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  {analytics.comparisons.delta >= 0 ? '+' : ''}{analytics.comparisons.delta}
                </p>
                <p className="text-sm font-bold text-slate-400 mt-3">Difference between newest and previous session blocks.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem] xl:col-span-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Metric Breakdown</h3>
                <div className="space-y-6">
                  {analytics.metricAverages.map((metric, index) => (
                    <motion.div
                      key={metric.key}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">{metric.key}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{metric.value}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${metric.value}%` }}></div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Level Usage</h3>
                <div className="space-y-5">
                  {analytics.levelBreakdown.map((level) => {
                    const width = Math.round((level.value / analytics.totals.sessions) * 100);
                    return (
                      <div key={level.label}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">{level.label}</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{level.value}</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-slate-900 dark:bg-white" style={{ width: `${width}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Best Improvement</h3>
                {analytics.momentum.bestRise ? (
                  <div className="space-y-4">
                    <p className="text-5xl font-black text-primary">+{analytics.momentum.bestRise.change}</p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      From {analytics.momentum.bestRise.from.topic} ({analytics.momentum.bestRise.from.value}%) to {analytics.momentum.bestRise.to.topic} ({analytics.momentum.bestRise.to.value}%).
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-500">Not enough sessions to calculate improvements yet.</p>
                )}
              </div>
              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Biggest Drop</h3>
                {analytics.momentum.biggestDrop ? (
                  <div className="space-y-4">
                    <p className={`text-5xl font-black ${analytics.momentum.biggestDrop.change < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                      {analytics.momentum.biggestDrop.change > 0 ? '+' : ''}{analytics.momentum.biggestDrop.change}
                    </p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      From {analytics.momentum.biggestDrop.from.topic} ({analytics.momentum.biggestDrop.from.value}%) to {analytics.momentum.biggestDrop.to.topic} ({analytics.momentum.biggestDrop.to.value}%).
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-500">Not enough sessions to calculate drops yet.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-8">
              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Coaching Signals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.insights.map((insight, index) => (
                    <div key={index} className="p-6 rounded-[2rem] bg-primary/5 border border-primary/15">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Insight {index + 1}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Top Fillers</h3>
                <div className="space-y-4">
                  {analytics.fillerBreakdown.length > 0 ? analytics.fillerBreakdown.map((item, index) => {
                    const maxValue = analytics.fillerBreakdown[0].value || 1;
                    const width = Math.round((item.value / maxValue) * 100);
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">{item.label}</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${index === 0 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${width}%` }}></div>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-sm font-bold text-slate-500">No filler-word data has been captured yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[3rem]">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Recent Session Breakdown</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Every row is pulled directly from saved session analysis</p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/15">
                  Auto-updates after refresh and history changes
                </div>
              </div>

              <div className="space-y-4">
                {recentSessions.map((session, index) => (
                  <motion.div
                    key={`${session.label}-${session.topic}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-[2rem] bg-slate-50 dark:bg-[#111111] border border-slate-100 dark:border-slate-800"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr] gap-4 items-center">
                      <div>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{session.topic}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{session.label}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">{session.difficulty}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Score</p>
                        <p className="text-2xl font-black text-primary">{session.value}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pace</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{session.pace}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">WPM</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Words</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{session.words}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Captured</p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-5">
                      <button
                        onClick={() => onNavigate('report', {
                          transcript: session.raw.raw_transcript,
                          duration_seconds: session.raw.duration_seconds,
                          topic: session.raw.topic,
                          difficulty: session.raw.analysis_data?.metadata?.difficulty || session.difficulty,
                          analysis_data: session.raw.analysis_data
                        })}
                        className="px-4 py-3 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                      >
                        Open Report
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

window.TalkSense.register('AnalyticsPage', AnalyticsPage);
