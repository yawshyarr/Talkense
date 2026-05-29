console.log("ReportPage.jsx script executing...");

const SCORE_KEYS = ['fluency', 'clarity', 'pace', 'vocabulary', 'confidence'];
const DEFAULT_FILLERS = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'right', 'so'];
const COMMON_SPEECH_PHRASES = [
  'good morning everyone',
  'today i am going to talk about',
  'respected teachers and my dear friends',
  'thank you for giving me this opportunity',
  'in conclusion',
  'as we all know',
  'first of all',
  'on the other hand',
  'last but not the least',
];
const LEVEL_PROFILES = {
  Beginner: {
    label: 'Foundational',
    targetWpm: [95, 140],
    idealSentence: [6, 16],
    maxFillerRate: 0.05,
    vocabularyTarget: 0.45,
    transcriptConfidenceTarget: 70,
    weights: { fluency: 0.24, clarity: 0.24, pace: 0.18, vocabulary: 0.14, confidence: 0.20 },
  },
  Intermediate: {
    label: 'Professional',
    targetWpm: [110, 155],
    idealSentence: [8, 18],
    maxFillerRate: 0.035,
    vocabularyTarget: 0.52,
    transcriptConfidenceTarget: 78,
    weights: { fluency: 0.22, clarity: 0.22, pace: 0.22, vocabulary: 0.16, confidence: 0.18 },
  },
  Advanced: {
    label: 'Executive',
    targetWpm: [120, 165],
    idealSentence: [10, 20],
    maxFillerRate: 0.02,
    vocabularyTarget: 0.6,
    transcriptConfidenceTarget: 84,
    weights: { fluency: 0.2, clarity: 0.2, pace: 0.22, vocabulary: 0.2, confidence: 0.18 },
  }
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const getCompositeScore = (scores = {}) => Math.round(
  ((scores.fluency || 0) + (scores.clarity || 0) + (scores.pace || 0) + (scores.vocabulary || 0) + (scores.confidence || 0)) / 5
);

const buildPlagiarismSignals = (transcript = '') => {
  const cleanedTranscript = transcript.toLowerCase().replace(/\s+/g, ' ').trim();
  const words = cleanedTranscript.match(/\b[\w']+\b/g) || [];

  if (words.length === 0) {
    return {
      originalityScore: 100,
      riskLevel: 'Low',
      repeatedPhraseHits: [],
      templateHits: [],
      repetitivePhraseRate: 0,
      explanation: 'No transcript was captured, so no originality risk was detected.',
    };
  }

  const phraseCounts = {};
  for (let i = 0; i <= words.length - 4; i += 1) {
    const phrase = words.slice(i, i + 4).join(' ');
    phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
  }

  const repeatedPhraseHits = Object.entries(phraseCounts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  const repetitivePhraseRate = words.length > 0
    ? repeatedPhraseHits.reduce((sum, item) => sum + Math.max(0, item.count - 1), 0) / Math.max(1, words.length / 4)
    : 0;

  const templateHits = COMMON_SPEECH_PHRASES
    .filter((phrase) => cleanedTranscript.includes(phrase))
    .map((phrase) => ({ phrase }));

  const longRepeatsPenalty = repeatedPhraseHits.reduce((sum, item) => sum + Math.max(0, item.count - 1) * 7, 0);
  const templatePenalty = templateHits.length * 8;
  const uniquenessPenalty = repetitivePhraseRate * 25;
  const originalityScore = clamp(100 - longRepeatsPenalty - templatePenalty - uniquenessPenalty);

  let riskLevel = 'Low';
  if (originalityScore < 55) riskLevel = 'High';
  else if (originalityScore < 75) riskLevel = 'Moderate';

  let explanation = 'Delivery appears reasonably original based on phrase variation and low template reuse.';
  if (riskLevel === 'Moderate') explanation = 'Some repeated phrasing or stock speech patterns were detected. The speech may be partially over-scripted.';
  if (riskLevel === 'High') explanation = 'The transcript shows strong repeated phrase pressure or common template language, so originality risk is elevated.';

  return {
    originalityScore,
    riskLevel,
    repeatedPhraseHits,
    templateHits,
    repetitivePhraseRate: Number((repetitivePhraseRate * 100).toFixed(1)),
    explanation,
  };
};

const scoreLabel = (value) => {
  if (value >= 85) return 'Strong';
  if (value >= 70) return 'Good';
  if (value >= 55) return 'Developing';
  return 'Needs work';
};

const buildSentimentSummary = (history = [], fallbackDominantEmotion = 'Neutral') => {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      dominantEmotion: fallbackDominantEmotion,
      stabilityScore: 0,
      flowLabel: 'Not enough data',
      explanation: 'The session did not capture enough live sentiment checkpoints to infer how the speaker felt.',
      primaryShift: 'No emotion shift captured.',
    };
  }

  const emotionCounts = history.reduce((acc, item) => {
    const emotion = item?.emotion || 'Neutral';
    acc[emotion] = (acc[emotion] || 0) + 1;
    return acc;
  }, {});
  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || fallbackDominantEmotion;
  const changes = history.reduce((count, item, index) => {
    if (index === 0) return count;
    return count + (history[index - 1]?.emotion !== item?.emotion ? 1 : 0);
  }, 0);
  const averageScore = history.reduce((sum, item) => sum + (item?.score || 0), 0) / history.length;
  const stabilityScore = clamp(100 - (changes / Math.max(1, history.length - 1)) * 55 - Math.max(0, 75 - averageScore) * 0.35);

  let flowLabel = 'Steady';
  if (stabilityScore < 45) flowLabel = 'Highly variable';
  else if (stabilityScore < 68) flowLabel = 'Some shifts';
  else if (averageScore >= 78) flowLabel = 'Composed';

  const explanationMap = {
    Confident: 'The speaker sounded assured, energetic, and in command for most of the session.',
    Focused: 'The delivery felt concentrated and purposeful, with good control over pacing and hesitation.',
    Neutral: 'The speech stayed emotionally even, without strong tension or excitement dominating the delivery.',
    Nervous: 'The session showed signs of hesitation or tension, usually through pauses, fillers, or low vocal steadiness.',
    Stressed: 'The speaking pattern suggested time pressure or overload, often through rushed pace or heightened vocal strain.',
  };

  return {
    dominantEmotion,
    stabilityScore,
    flowLabel,
    explanation: explanationMap[dominantEmotion] || explanationMap.Neutral,
    primaryShift: changes > 0
      ? `${changes} emotion shift${changes === 1 ? '' : 's'} detected across the session timeline.`
      : 'The speaker stayed emotionally consistent throughout the captured timeline.',
  };
};

const buildReportAnalysis = (sessionData = {}) => {
  const transcript = (sessionData.transcript || '').trim();
  const difficulty = LEVEL_PROFILES[sessionData.difficulty] ? sessionData.difficulty : 'Intermediate';
  const profile = LEVEL_PROFILES[difficulty];
  const fillerWords = sessionData?.analyzerSettings?.fillerWords || DEFAULT_FILLERS;
  const escapedFillers = fillerWords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const fillerPattern = escapedFillers.length ? new RegExp(`\\b(${escapedFillers.join('|')})\\b`, 'gi') : null;

  const wordsList = transcript.toLowerCase().match(/\b[\w']+\b/g) || [];
  const words = wordsList.length;
  const duration = Math.max(1, sessionData?.duration_seconds || 1);
  const fallbackWpm = words === 0 ? 0 : Math.round((words / duration) * 60);
  const paceFromLive = sessionData?.liveMetrics?.pace || 0;
  const wpm = paceFromLive > 0 ? paceFromLive : fallbackWpm;
  const fillers = fillerPattern ? ((transcript.toLowerCase().match(fillerPattern) || []).length) : 0;
  const fillerRate = words > 0 ? fillers / words : 0;
  const sentences = transcript.split(/[.!?]+/).map(sentence => sentence.trim()).filter(Boolean);
  const sentenceLengths = sentences.map(sentence => (sentence.match(/\b[\w']+\b/g) || []).length).filter(Boolean);
  const avgSentenceLength = sentenceLengths.length ? sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length : 0;
  const uniqueWords = new Set(wordsList);
  const uniqueRatio = words > 0 ? uniqueWords.size / words : 0;
  const longWords = wordsList.filter(word => word.length >= 6).length;
  const longWordRatio = words > 0 ? longWords / words : 0;
  const transcriptConfidence = sessionData?.liveMetrics?.confidence || 0;
  const proctoring = sessionData?.proctoring || {};
  const sentimentHistory = Array.isArray(sessionData?.sentiment_history) ? sessionData.sentiment_history : [];
  const sentimentSummary = buildSentimentSummary(sentimentHistory, sessionData?.dominant_emotion || 'Neutral');
  const integrityScore = proctoring?.integrityScore ?? 100;
  const voiceSyncRate = proctoring?.syncRate ?? 0;
  const suspiciousRate = proctoring?.suspiciousRate ?? 0;
  const voiceWithoutFaceRate = proctoring?.voiceWithoutFaceRate ?? 0;
  const suspiciousEvents = Array.isArray(proctoring?.suspiciousEvents) ? proctoring.suspiciousEvents : [];
  const plagiarism = buildPlagiarismSignals(transcript);

  const frequencies = {};
  wordsList.forEach(word => {
    if (word.length > 3) frequencies[word] = (frequencies[word] || 0) + 1;
  });
  const repeatedWords = Object.entries(frequencies)
    .filter(([, count]) => count > 2)
    .sort((a, b) => b[1] - a[1]);
  const repeatPenalty = repeatedWords.reduce((sum, [, count]) => sum + (count - 2), 0);

  const paceDeviation = (() => {
    if (!wpm) return 35;
    if (wpm < profile.targetWpm[0]) return profile.targetWpm[0] - wpm;
    if (wpm > profile.targetWpm[1]) return wpm - profile.targetWpm[1];
    return 0;
  })();

  const sentencePenalty = avgSentenceLength === 0
    ? 30
    : avgSentenceLength < profile.idealSentence[0]
      ? (profile.idealSentence[0] - avgSentenceLength) * 2.5
      : avgSentenceLength > profile.idealSentence[1]
        ? (avgSentenceLength - profile.idealSentence[1]) * 2
        : 0;

  const fluency = words === 0
    ? 0
    : clamp(92 - (fillerRate / Math.max(profile.maxFillerRate, 0.01)) * 20 - repeatPenalty * 1.8 - Math.max(0, paceDeviation - 10) * 0.4);
  const clarity = words === 0
    ? 0
    : clamp(90 - sentencePenalty - fillers * 1.3 + (transcriptConfidence ? (transcriptConfidence - profile.transcriptConfidenceTarget) * 0.35 : 0));
  const pace = words === 0
    ? 0
    : clamp(95 - paceDeviation * 1.5);
  const vocabulary = words === 0
    ? 0
    : clamp(40 + uniqueRatio * 55 + longWordRatio * 35 - repeatPenalty * 1.7);
  const confidence = words === 0
    ? 0
    : clamp(
      55
      + (transcriptConfidence ? (transcriptConfidence - 50) * 0.7 : 6)
      - fillerRate * 180
      - Math.max(0, paceDeviation - 5) * 0.45
      - Math.max(0, (100 - integrityScore) * 0.45)
      - voiceWithoutFaceRate * 0.18
      - suspiciousRate * 0.12
      - Math.max(0, (85 - plagiarism.originalityScore) * 0.18)
    );

  const scores = { fluency, clarity, pace, vocabulary, confidence };
  const overallScore = clamp(SCORE_KEYS.reduce((sum, key) => sum + (scores[key] * profile.weights[key]), 0));
  const securityEnabled = Object.entries(sessionData?.security || {}).filter(([, enabled]) => enabled).map(([key]) => key);

  const reasons = {
    fluency: `${fillers} filler${fillers === 1 ? '' : 's'} across ${words} words, with a repetition pressure of ${repeatPenalty}.`,
    clarity: `Average sentence length was ${avgSentenceLength ? avgSentenceLength.toFixed(1) : '0'} words and transcript confidence was ${transcriptConfidence || 0}%.`,
    pace: `${wpm} WPM measured against the ${difficulty} target band of ${profile.targetWpm[0]}-${profile.targetWpm[1]} WPM.`,
    vocabulary: `${uniqueWords.size} unique words out of ${words}, with ${Math.round(longWordRatio * 100)}% higher-complexity words.`,
    confidence: `Confidence blends transcript certainty with delivery authenticity: integrity ${integrityScore}%, sync ${voiceSyncRate}%, voice-without-face ${voiceWithoutFaceRate}%, originality ${plagiarism.originalityScore}%.`
  };

  const coaching = [];
  if (fillers > 0) coaching.push(`Reduce fillers like ${fillerWords.slice(0, 3).join(', ')}. They appeared ${fillers} times.`);
  if (paceDeviation > 0) coaching.push(`Your pace moved outside the target band. Aim closer to ${sessionData?.analyzerSettings?.targetWpm || Math.round((profile.targetWpm[0] + profile.targetWpm[1]) / 2)} WPM.`);
  if (repeatPenalty > 0) coaching.push(`Several words repeated too often. Swap repeated words with synonyms or shorter pauses.`);
  if (avgSentenceLength > profile.idealSentence[1]) coaching.push(`Your sentences ran long. Break ideas into shorter phrases for stronger clarity.`);
  if (avgSentenceLength && avgSentenceLength < profile.idealSentence[0]) coaching.push(`Your phrases were very short. Connect a few ideas together to sound more complete.`);
  if (integrityScore < 85) coaching.push(`Voice proctoring flagged delivery mismatches. Keep your face centered and make sure the visible speaker is the one actually talking.`);
  if (voiceWithoutFaceRate >= 20) coaching.push(`Speech was detected while the face was missing too often. Stay in frame whenever you speak.`);
  if (suspiciousRate >= 20) coaching.push(`The microphone often heard speech without enough visible mouth movement. Avoid background speakers and exaggerated lip-syncing.`);
  if (plagiarism.riskLevel === 'Moderate') coaching.push('Originality risk was moderate. Reduce stock opening lines and vary repeated phrases more naturally.');
  if (plagiarism.riskLevel === 'High') coaching.push('Originality risk was high. Rewrite memorized or repeated template phrases in your own wording before the next attempt.');
  if (coaching.length === 0) coaching.push('Your speech stayed balanced for the chosen level. Keep practicing to make this consistency repeatable.');

  return {
    level: difficulty,
    levelLabel: profile.label,
    overallScore,
    scores,
    reasons,
    coaching,
    stats: {
      words_spoken: words,
      pace: wpm,
      fillers_detected: fillers,
      unique_words: uniqueWords.size,
      unique_ratio: Number(uniqueRatio.toFixed(3)),
      avg_sentence_length: Number(avgSentenceLength.toFixed(1)),
      transcript_confidence: transcriptConfidence || 0,
      repeat_penalty: repeatPenalty,
      integrity_score: integrityScore,
      voice_sync_rate: voiceSyncRate,
      suspicious_sync_rate: suspiciousRate,
      voice_without_face_rate: voiceWithoutFaceRate,
      originality_score: plagiarism.originalityScore,
      originality_risk: plagiarism.riskLevel,
      repetitive_phrase_rate: plagiarism.repetitivePhraseRate,
      dominant_emotion_stability: sentimentSummary.stabilityScore,
    },
    metadata: {
      difficulty,
      target_pace_band: profile.targetWpm,
      ideal_sentence_band: profile.idealSentence,
      enabled_security: securityEnabled,
      proctoring_status: proctoring?.dominantRisk || 'No voice proctoring notes captured.',
      proctoring_alerts: suspiciousEvents,
      plagiarism,
      sentiment_history: sentimentHistory,
      sentiment_summary: sentimentSummary,
    },
  };
};

const ReportPage = ({ onNavigate, sessionData, goBack, canGoBack }) => {
  const { motion, AnimatePresence } = window;
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const sentimentHistory = React.useMemo(
    () => sessionData?.sentiment_history || report?.metadata?.sentiment_history || [],
    [report, sessionData]
  );
  const sentimentSummary = React.useMemo(
    () => report?.metadata?.sentiment_summary || buildSentimentSummary(sentimentHistory, sessionData?.dominant_emotion || 'Neutral'),
    [report, sentimentHistory, sessionData]
  );

  useEffect(() => {
    const analyzeSpeech = async () => {
      try {
        if (sessionData?.analysis_data) {
          setReport(sessionData.analysis_data);
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) throw new Error("Not logged in");
        
        const duration = sessionData?.duration_seconds || 1;
        const analysisData = buildReportAnalysis(sessionData);
        
        setReport(analysisData);
        
        await fetch('http://127.0.0.1:8000/api/sessions/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            topic: sessionData?.topic || "Speech",
            duration_seconds: duration,
            raw_transcript: sessionData?.transcript || "",
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
    const margin = 16;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const scores = report?.scores || { fluency: 0, clarity: 0, pace: 0, vocabulary: 0, confidence: 0 };
    const avg = report?.overallScore || getCompositeScore(scores);
    const plagiarism = report?.metadata?.plagiarism || buildPlagiarismSignals(sessionData?.transcript || '');

    const drawHeader = (title, subtitle) => {
      doc.setFillColor(8, 15, 29);
      doc.rect(0, 0, pageWidth, 34, 'F');
      doc.setTextColor(103, 232, 249);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(title, margin, 18);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(subtitle, margin, 25);
    };

    const drawLabel = (label, value, x, y, w, h, accentColor = [14, 165, 233]) => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, w, h, 5, 5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, w, h, 5, 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), x + 4, y + 7);
      doc.setFontSize(16);
      doc.setTextColor(...accentColor);
      doc.text(String(value), x + 4, y + 18);
    };

    const addWrappedBlock = (title, lines, yStart, options = {}) => {
      let y = yStart;
      const bg = options.bg || [248, 250, 252];
      const titleColor = options.titleColor || [15, 23, 42];
      const textColor = options.textColor || [71, 85, 105];
      const minHeight = options.minHeight || 28;
      const wrappedText = Array.isArray(lines) ? lines.join(' ') : lines;
      const split = doc.splitTextToSize(wrappedText, contentWidth - 12);
      const height = Math.max(minHeight, 14 + split.length * 5);
      doc.setFillColor(...bg);
      doc.roundedRect(margin, y, contentWidth, height, 6, 6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, height, 6, 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...titleColor);
      doc.text(title, margin + 6, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
      doc.text(split, margin + 6, y + 16);
      return y + height + 8;
    };

    drawHeader('TALKSENSE PERFORMANCE DOSSIER', 'Professional speech analysis export');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(15, 23, 42);
    doc.text(sessionData?.topic || 'Speech Session', margin, 52);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Level: ${report?.level || sessionData?.difficulty || 'Intermediate'}`, margin, 60);
    doc.text(`Duration: ${Math.floor(sessionData?.duration_seconds / 60)}m ${sessionData?.duration_seconds % 60}s  |  Words: ${report?.stats?.words_spoken || 0}`, margin, 66);

    drawLabel('Overall Score', `${avg}%`, margin, 78, 40, 24, [6, 95, 70]);
    drawLabel('Integrity', `${report?.stats?.integrity_score || 0}%`, margin + 45, 78, 40, 24, [14, 165, 233]);
    drawLabel('Originality', `${report?.stats?.originality_score || 0}%`, margin + 90, 78, 40, 24, [245, 158, 11]);
    drawLabel('Pace', `${report?.stats?.pace || 0} WPM`, margin + 135, 78, 58, 24, [79, 70, 229]);

    let y = 112;
    y = addWrappedBlock('Executive Summary', [
      `This session was graded at ${avg}% for the ${report?.level || 'Intermediate'} level.`,
      `Confidence reflects transcript certainty, delivery authenticity, and originality screening.`,
      `Originality risk is ${plagiarism.riskLevel.toLowerCase()} with an originality score of ${plagiarism.originalityScore}%.`,
    ], y, { bg: [240, 249, 255] });

    y = addWrappedBlock('Metric Breakdown', Object.entries(scores).map(([key, val]) => `${key}: ${val}%`).join('   |   '), y);
    y = addWrappedBlock('Top Coaching Priorities', (report?.coaching || []).slice(0, 3).map((tip, index) => `${index + 1}. ${tip}`), y, { bg: [236, 253, 245] });
    y = addWrappedBlock('Originality & Plagiarism Audit', [
      plagiarism.explanation,
      `Repeated phrase pressure: ${plagiarism.repetitivePhraseRate}%`,
      plagiarism.templateHits.length ? `Template phrase hits: ${plagiarism.templateHits.map((item) => `"${item.phrase}"`).join(', ')}` : 'No common scripted speech templates were detected.',
    ], y, { bg: [255, 251, 235] });

    doc.addPage();
    drawHeader('ANALYSIS DETAILS', 'Reasoning, audit layers, and recommendations');
    let detailY = 44;
    Object.entries(report?.reasons || {}).forEach(([key, value]) => {
      detailY = addWrappedBlock(`${key.charAt(0).toUpperCase() + key.slice(1)} Score Reason`, value, detailY);
    });
    detailY = addWrappedBlock('Voice Proctoring Summary', report?.metadata?.proctoring_status || 'No voice proctoring notes captured.', detailY, { bg: [239, 246, 255] });
    if ((report?.metadata?.proctoring_alerts || []).length) {
      detailY = addWrappedBlock(
        'Integrity Alerts',
        report.metadata.proctoring_alerts.map((event) => `${event.title} at ${event.timestamp || 0}s: ${event.detail}`),
        detailY,
        { bg: [254, 242, 242] }
      );
    }
    if (wordAnalysis.length > 0) {
      detailY = addWrappedBlock(
        'Vocabulary Optimization',
        wordAnalysis.map((item) => `"${item.word}" used ${item.count}x. Suggestion: ${item.suggestion}`),
        detailY,
        { bg: [245, 243, 255] }
      );
    }

    doc.addPage();
    drawHeader('TRANSCRIPT RECORD', 'Full speech transcript and originality notes');
    let transcriptY = 44;
    transcriptY = addWrappedBlock('Transcript', sessionData?.transcript || 'No transcript recorded.', transcriptY, { minHeight: 120 });
    if (plagiarism.repeatedPhraseHits.length) {
      transcriptY = addWrappedBlock(
        'Repeated Phrase Flags',
        plagiarism.repeatedPhraseHits.map((item) => `"${item.phrase}" appeared ${item.count} times`),
        transcriptY,
        { bg: [255, 247, 237] }
      );
    }
    transcriptY = addWrappedBlock(
      'Session Snapshot',
      [
        `Target pace band: ${(report?.metadata?.target_pace_band || []).join(' - ')} WPM`,
        `Ideal sentence length: ${(report?.metadata?.ideal_sentence_band || []).join(' - ')} words`,
        `Unique words: ${report?.stats?.unique_words || 0}`,
        `Transcript confidence: ${report?.stats?.transcript_confidence || 0}%`,
      ],
      transcriptY
    );

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
  const overallScore = report?.overallScore || Math.round((scores.fluency + scores.clarity + scores.pace + scores.vocabulary + scores.confidence) / 5);

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
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary mt-4">Level: {report?.level || sessionData?.difficulty || 'Intermediate'} {report?.levelLabel ? `• ${report.levelLabel}` : ''}</p>
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
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Integrity Alerts</p>
                <p className="text-xl font-black text-textMain">{report?.metadata?.proctoring_alerts?.length || 0}</p>
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
                    <span className="text-sm font-black text-white">{val}% • {scoreLabel(val)}</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ duration: 1.5, delay: i * 0.1 }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/65">{report?.reasons?.[key]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Insights */}
        <div className="lg:w-2/3 space-y-10">
          <div className="glass-card p-10 bg-bgApp border-white/5 shadow-xl shadow-primary/5 rounded-[3rem]">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-textMain">Why You Got This Score</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest mt-1">Level-aware calculations, not random grading</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Pace Band</p>
                <p className="text-2xl font-black text-textMain">{report?.metadata?.target_pace_band?.join(' - ') || '110 - 155'} WPM</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ideal Sentence Length</p>
                <p className="text-2xl font-black text-textMain">{report?.metadata?.ideal_sentence_band?.join(' - ') || '8 - 18'} words</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unique Words</p>
                <p className="text-2xl font-black text-textMain">{report?.stats?.unique_words || 0}</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transcript Confidence</p>
                <p className="text-2xl font-black text-textMain">{report?.stats?.transcript_confidence || 0}%</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Voice Integrity</p>
                <p className="text-2xl font-black text-textMain">{report?.stats?.integrity_score || 0}%</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Voice-Mouth Sync</p>
                <p className="text-2xl font-black text-textMain">{report?.stats?.voice_sync_rate || 0}%</p>
              </div>
            </div>

            <div className="space-y-4">
              {report?.coaching?.map((tip, index) => (
                <div key={index} className="p-5 rounded-3xl bg-primary/5 border border-primary/15">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Observation {index + 1}</p>
                  <p className="text-sm font-bold text-textMain">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-10 bg-bgApp border-white/5 shadow-xl shadow-primary/5 rounded-[3rem]">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-black flex items-center justify-center text-primary border dark:border-slate-800">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.866-3.582 7-8 7 4.418 0 8 3.134 8 7 0-3.866 3.582-7 8-7-4.418 0-8-3.134-8-7zm0 0V3m0 8c0 3.866 3.582 7 8 7-4.418 0-8 3.134-8 7 0-3.866-3.582-7-8-7 4.418 0 8-3.134 8-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-textMain">Voice Proctoring Audit</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest mt-1">Camera, microphone, and lip-motion cross-check</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Integrity Score</p>
                <p className="text-3xl font-black text-textMain">{report?.stats?.integrity_score || 0}%</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mismatch Rate</p>
                <p className="text-3xl font-black text-textMain">{report?.stats?.suspicious_sync_rate || 0}%</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Voice Without Face</p>
                <p className="text-3xl font-black text-textMain">{report?.stats?.voice_without_face_rate || 0}%</p>
              </div>
            </div>

            <div className="p-6 bg-primary/5 border border-primary/15 rounded-3xl mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Audit Summary</p>
              <p className="text-sm font-bold text-textMain">{report?.metadata?.proctoring_status || 'No voice proctoring notes captured.'}</p>
            </div>

            <div className="space-y-3">
              {report?.metadata?.proctoring_alerts?.length ? report.metadata.proctoring_alerts.map((event) => (
                <div key={event.id || `${event.title}-${event.timestamp}`} className={`rounded-3xl border p-5 ${event.severity === 'high' ? 'bg-red-500/8 border-red-500/20' : 'bg-amber-500/10 border-amber-400/20'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-textMain">{event.title}</p>
                    <span className="text-[10px] font-black uppercase text-slate-500">{event.timestamp ?? 0}s</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2">{event.detail}</p>
                </div>
              )) : (
                <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-[#111111]">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No suspicious voice proctoring events were captured in this session.</p>
                </div>
              )}
            </div>
          </div>
          
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
          {sentimentHistory.length > 0 && (
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
                  <p className="text-2xl font-black text-primary uppercase">{sentimentSummary.dominantEmotion}</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Stability Score</p>
                  <p className="text-2xl font-black text-primary uppercase">{sentimentSummary.stabilityScore}%</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Emotion Flow</p>
                  <p className="text-2xl font-black text-primary uppercase">{sentimentSummary.flowLabel}</p>
                </div>
              </div>

              <div className="mb-8 p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-textMain leading-relaxed">{sentimentSummary.explanation}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 mt-3">{sentimentSummary.primaryShift}</p>
              </div>

              {/* Simple Timeline Visualization */}
              <div className="h-48 flex items-end gap-2 px-4">
                {sentimentHistory.map((h, i) => (
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

          <div className="glass-card p-10 bg-bgApp border-white/5 shadow-xl shadow-primary/5 rounded-[3rem]">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-textMain">Originality Audit</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest mt-1">Improved plagiarism and template-speech detection</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Originality Score</p>
                <p className="text-3xl font-black text-textMain">{report?.stats?.originality_score || 0}%</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Risk Level</p>
                <p className={`text-3xl font-black ${report?.stats?.originality_risk === 'High' ? 'text-red-500' : report?.stats?.originality_risk === 'Moderate' ? 'text-amber-500' : 'text-primary'}`}>
                  {report?.stats?.originality_risk || 'Low'}
                </p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Repeated Phrase Pressure</p>
                <p className="text-3xl font-black text-textMain">{report?.stats?.repetitive_phrase_rate || 0}%</p>
              </div>
            </div>

            <div className="p-6 bg-amber-500/8 border border-amber-500/20 rounded-3xl mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Audit Summary</p>
              <p className="text-sm font-bold text-textMain">{report?.metadata?.plagiarism?.explanation || 'No originality issues were detected.'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Repeated Phrase Flags</p>
                <div className="space-y-3">
                  {report?.metadata?.plagiarism?.repeatedPhraseHits?.length ? report.metadata.plagiarism.repeatedPhraseHits.map((item) => (
                    <div key={item.phrase} className="rounded-2xl bg-white dark:bg-black border border-slate-100 dark:border-slate-800 px-4 py-4">
                      <p className="text-sm font-black text-textMain">"{item.phrase}"</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">{item.count} repeats detected</p>
                    </div>
                  )) : (
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No repeated multi-word phrase patterns were strong enough to flag.</p>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-[#111111] rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Template Phrase Hits</p>
                <div className="space-y-3">
                  {report?.metadata?.plagiarism?.templateHits?.length ? report.metadata.plagiarism.templateHits.map((item) => (
                    <div key={item.phrase} className="rounded-2xl bg-white dark:bg-black border border-slate-100 dark:border-slate-800 px-4 py-4">
                      <p className="text-sm font-black text-textMain">"{item.phrase}"</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Common scripted speech phrase</p>
                    </div>
                  )) : (
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No common stock speech templates were detected in the transcript.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

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
              onClick={() => canGoBack ? goBack() : onNavigate('dashboard')}
              className="px-12 py-5 rounded-[2rem] bg-bgApp border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest hover:text-textMain hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl dark:hover:shadow-black/50 transition-all flex items-center gap-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {canGoBack ? 'Return to Previous Page' : 'Return to Control Center'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

window.TalkSense.register('ReportPage', ReportPage);
