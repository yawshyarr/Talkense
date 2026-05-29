console.log('LiveSpeechPage.jsx: Deepgram Nova-2 Real-Time STT Engine');

const clampValue = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const LIP_LANDMARKS = {
  upperInner: 13,
  lowerInner: 14,
  leftCorner: 78,
  rightCorner: 308,
};

const VoiceVisualizer = ({ isRecording }) => {
  const canvasRef = React.useRef(null);
  const requestRef = React.useRef();
  const audioContextRef = React.useRef();
  const analyserRef = React.useRef();
  const dataArrayRef = React.useRef();

  React.useEffect(() => {
    if (isRecording) {
      const startAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          analyserRef.current.fftSize = 64;
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
          const animate = () => {
            if (!canvasRef.current || !analyserRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            const barWidth = (canvasRef.current.width / dataArrayRef.current.length) * 2;
            let x = 0;
            dataArrayRef.current.forEach(val => {
              const barHeight = (val / 255) * canvasRef.current.height;
              ctx.fillStyle = val > 120 ? '#10b981' : '#064e3b';
              ctx.fillRect(x, canvasRef.current.height - barHeight, barWidth, barHeight);
              x += barWidth + 2;
            });
            requestRef.current = requestAnimationFrame(animate);
          };
          animate();
        } catch (e) { console.error(e); }
      };
      startAudio();
    } else {
      if (audioContextRef.current) audioContextRef.current.close();
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      cancelAnimationFrame(requestRef.current);
    };
  }, [isRecording]);

  return <canvas ref={canvasRef} width='400' height='60' className='w-full h-16 opacity-40 pointer-events-none mb-4' />;
};

const LiveSpeechPage = ({ onNavigate, config }) => {
  const { motion } = window;
  const loadSetting = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };
  const analyzerSettings = {
    sttLang: config?.analyzerSettings?.sttLang || loadSetting('stt_lang', 'en-US'),
    smartFormat: config?.analyzerSettings?.smartFormat ?? loadSetting('smart_format', true),
    fillerWords: config?.analyzerSettings?.fillerWords || loadSetting('filler_words', ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'right', 'so']),
    targetWpm: config?.analyzerSettings?.targetWpm || loadSetting('target_wpm', 140),
    analysisMode: config?.analyzerSettings?.analysisMode || loadSetting('analysis_mode', 'balanced'),
    noiseSuppression: config?.analyzerSettings?.noiseSuppression ?? loadSetting('noise_suppression', true),
    echoCancellation: config?.analyzerSettings?.echoCancellation ?? loadSetting('echo_cancellation', true),
    showConfidence: config?.analyzerSettings?.showConfidence ?? loadSetting('show_confidence', true),
    autoStartCamera: config?.analyzerSettings?.autoStartCamera ?? loadSetting('auto_start_camera', true),
    showLiveMetrics: config?.analyzerSettings?.showLiveMetrics ?? loadSetting('show_live_metrics', true),
    gazeStrict: config?.analyzerSettings?.gazeStrict ?? loadSetting('gaze_strict', false),
  };
  const fillerPattern = React.useMemo(() => {
    const escaped = analyzerSettings.fillerWords
      .map((word) => word.trim())
      .filter(Boolean)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return escaped.length ? new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi') : null;
  }, [analyzerSettings.fillerWords]);
  const [isRecording, setIsRecording] = React.useState(false);
  const [timer, setTimer] = React.useState(config?.duration_seconds || 60);
  const [faceDetected, setFaceDetected] = React.useState(false);
  const [sttMode, setSttMode] = React.useState('idle'); // idle | deepgram | browser
  const [liveWords, setLiveWords] = React.useState(0);
  const [fillerCount, setFillerCount] = React.useState(0);
  const [liveWpm, setLiveWpm] = React.useState(0);
  const [confidence, setConfidence] = React.useState(0);
  const [audioLevel, setAudioLevel] = React.useState(0);
  const [voiceActive, setVoiceActive] = React.useState(false);
  const [mouthActivity, setMouthActivity] = React.useState(0);
  const [proctorStatus, setProctorStatus] = React.useState('Ready');
  const [proctorEvents, setProctorEvents] = React.useState([]);
  const [proctorSummary, setProctorSummary] = React.useState({
    integrityScore: 100,
    syncRate: 0,
    suspiciousRate: 0,
    voiceWithoutFaceRate: 0,
    speakingFrames: 0,
    suspiciousEvents: [],
    dominantRisk: 'No risk detected yet.',
  });
  const [currentEmotion, setCurrentEmotion] = React.useState('Awaiting voice');
  const [sentimentHistory, setSentimentHistory] = React.useState([]);
  const [emotionInsight, setEmotionInsight] = React.useState('We will infer the speaker tone after enough live speech is captured.');

  // Transcript state — two parts like Google Voice: committed (final) + interim (live)
  const [committed, setCommitted] = React.useState('');
  const [interim, setInterim] = React.useState('');

  const committedRef = React.useRef('');
  const interimRef = React.useRef('');
  const isRecordingRef = React.useRef(false);
  const videoRef = React.useRef(null);
  const faceMeshRef = React.useRef(null);

  // Deepgram refs
  const dgSocketRef = React.useRef(null);
  const mediaRecorderRef = React.useRef(null);
  const audioStreamRef = React.useRef(null);
  const cameraStreamRef = React.useRef(null);
  const monitorStreamRef = React.useRef(null);
  const monitorAudioContextRef = React.useRef(null);
  const monitorAnalyserRef = React.useRef(null);
  const monitorDataArrayRef = React.useRef(null);
  const proctorIntervalRef = React.useRef(null);
  const faceDetectedRef = React.useRef(false);
  const latestVoiceActiveRef = React.useRef(false);
  const mouthRatioRef = React.useRef(0);
  const mouthBaselineRef = React.useRef(0.018);
  const suspiciousStreakRef = React.useRef(0);
  const offscreenVoiceStreakRef = React.useRef(0);
  const totalFramesRef = React.useRef(0);
  const speakingFramesRef = React.useRef(0);
  const syncFramesRef = React.useRef(0);
  const suspiciousFramesRef = React.useRef(0);
  const noFaceVoiceFramesRef = React.useRef(0);
  const silentLipFramesRef = React.useRef(0);
  const proctorEventsRef = React.useRef([]);
  const noiseFloorRef = React.useRef(0.012);
  const sentimentIntervalRef = React.useRef(null);
  const sentimentPitchSamplesRef = React.useRef([]);
  const sentimentVolumeSamplesRef = React.useRef([]);
  const pauseCountRef = React.useRef(0);
  const speechActiveRef = React.useRef(false);
  const silenceStreakRef = React.useRef(0);
  const analyzedTranscriptLengthRef = React.useRef(0);
  const sentimentHistoryRef = React.useRef([]);

  // Browser STT fallback ref
  const recognitionRef = React.useRef(null);
  const recognitionRestartTimeoutRef = React.useRef(null);
  const sessionStartedAtRef = React.useRef(null);
  const seenFinalChunksRef = React.useRef(new Set());
  const supportsBrowserSTT = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const estimatePitch = React.useCallback((samples, sampleRate) => {
    let zeroCrossings = 0;
    for (let i = 1; i < samples.length; i += 1) {
      if ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0)) {
        zeroCrossings += 1;
      }
    }
    const frequency = (zeroCrossings * sampleRate) / (2 * samples.length);
    if (frequency < 75 || frequency > 340) return 0;
    return Math.round(frequency);
  }, []);

  const getDominantEmotion = React.useCallback((history) => {
    if (!history.length) return 'Neutral';
    const counts = history.reduce((acc, item) => {
      acc[item.emotion] = (acc[item.emotion] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';
  }, []);

  const resetSentimentTracking = React.useCallback(() => {
    sentimentPitchSamplesRef.current = [];
    sentimentVolumeSamplesRef.current = [];
    pauseCountRef.current = 0;
    speechActiveRef.current = false;
    silenceStreakRef.current = 0;
    analyzedTranscriptLengthRef.current = 0;
    sentimentHistoryRef.current = [];
    setSentimentHistory([]);
    setCurrentEmotion('Listening...');
    setEmotionInsight('We are listening for speaking pace, vocal steadiness, and hesitation patterns.');
  }, []);

  const stopSentimentTracking = React.useCallback(() => {
    if (sentimentIntervalRef.current) {
      clearInterval(sentimentIntervalRef.current);
      sentimentIntervalRef.current = null;
    }
  }, []);

  const analyzeSentimentSlice = React.useCallback(async (forceFinal = false) => {
    if (!isRecordingRef.current) return;
    const transcriptSnapshot = `${committedRef.current} ${interimRef.current || ''}`.trim();
    const unseenChunk = transcriptSnapshot.slice(analyzedTranscriptLengthRef.current).trim();
    const newChunk = forceFinal && !unseenChunk ? transcriptSnapshot : unseenChunk;
    if (!newChunk) return;
    const chunkWordCount = newChunk.split(/\s+/).filter(Boolean).length;
    if (!forceFinal && chunkWordCount < 6) return;

    analyzedTranscriptLengthRef.current = transcriptSnapshot.length;
    const chunkFillerCount = fillerPattern ? ((newChunk.toLowerCase().match(fillerPattern) || []).length) : 0;

    const avgPitch = sentimentPitchSamplesRef.current.length
      ? Math.round(sentimentPitchSamplesRef.current.reduce((sum, value) => sum + value, 0) / sentimentPitchSamplesRef.current.length)
      : 0;
    const avgVolume = sentimentVolumeSamplesRef.current.length
      ? Math.round(sentimentVolumeSamplesRef.current.reduce((sum, value) => sum + value, 0) / sentimentVolumeSamplesRef.current.length)
      : 0;
    const elapsedMinutes = Math.max((Date.now() - sessionStartedAtRef.current) / 60000, 1 / 60);
    const payload = {
      transcript_chunk: newChunk,
      avg_pitch: avgPitch,
      avg_volume: avgVolume,
      words_per_minute: liveWpm || Math.round(liveWords / elapsedMinutes),
      filler_word_count: chunkFillerCount,
      pause_count: pauseCountRef.current,
    };

    const token = localStorage.getItem('token');
    let result = null;
    if (token) {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/analyze/sentiment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          result = await response.json();
        }
      } catch (error) {
        console.warn('Sentiment API call failed, using client fallback:', error);
      }
    }

    if (!result) {
      const fallbackEmotion = payload.words_per_minute > 170
        ? 'Stressed'
        : payload.filler_word_count > 3 || payload.pause_count > 2
          ? 'Nervous'
          : payload.avg_volume > 40 && payload.avg_pitch > 120
            ? 'Confident'
            : payload.words_per_minute > 115
              ? 'Focused'
              : 'Neutral';
      result = {
        emotion: fallbackEmotion,
        score: fallbackEmotion === 'Confident' ? 82 : fallbackEmotion === 'Focused' ? 76 : fallbackEmotion === 'Neutral' ? 64 : 48,
        explanation: fallbackEmotion === 'Confident'
          ? 'The speaker sounded steady, strong, and in control.'
          : fallbackEmotion === 'Focused'
            ? 'The delivery stayed balanced and task-oriented with few signs of stress.'
            : fallbackEmotion === 'Neutral'
              ? 'The speaking pattern stayed fairly even without strong emotional pressure.'
              : fallbackEmotion === 'Nervous'
                ? 'The speech showed hesitation or tension through fillers, pauses, or softer delivery.'
                : 'The delivery sounded pressured, rushed, or overloaded.',
      };
    }

    const historyEntry = {
      emotion: result.emotion || 'Neutral',
      score: Math.max(0, Math.min(100, Math.round(result.score || 50))),
      explanation: result.explanation || 'The session sentiment engine inferred this emotion from pace, pitch, volume, and hesitation patterns.',
      time: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
      pitch: avgPitch,
      volume: avgVolume,
      pace: payload.words_per_minute,
    };

    sentimentHistoryRef.current = [...sentimentHistoryRef.current, historyEntry].slice(-12);
    setSentimentHistory(sentimentHistoryRef.current);
    setCurrentEmotion(historyEntry.emotion);
    setEmotionInsight(historyEntry.explanation);
    sentimentPitchSamplesRef.current = [];
    sentimentVolumeSamplesRef.current = [];
    pauseCountRef.current = 0;
  }, [fillerPattern, liveWords, liveWpm]);

  const startSentimentTracking = React.useCallback(() => {
    stopSentimentTracking();
    sentimentIntervalRef.current = setInterval(() => {
      analyzeSentimentSlice();
    }, 6000);
  }, [analyzeSentimentSlice, stopSentimentTracking]);

  const pushProctorEvent = React.useCallback((event) => {
    const stampedEvent = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...event,
    };
    proctorEventsRef.current = [stampedEvent, ...proctorEventsRef.current].slice(0, 6);
    setProctorEvents(proctorEventsRef.current);
  }, []);

  const buildProctorSnapshot = React.useCallback(() => {
    const speakingFrames = speakingFramesRef.current;
    const syncRate = speakingFrames > 0 ? Math.round((syncFramesRef.current / speakingFrames) * 100) : 0;
    const suspiciousRate = speakingFrames > 0 ? Math.round((suspiciousFramesRef.current / speakingFrames) * 100) : 0;
    const voiceWithoutFaceRate = speakingFrames > 0 ? Math.round((noFaceVoiceFramesRef.current / speakingFrames) * 100) : 0;
    const silentLipRate = speakingFrames > 0 ? Math.round((silentLipFramesRef.current / speakingFrames) * 100) : 0;
    const integrityScore = Math.round(clampValue(
      100
      - suspiciousRate * 0.7
      - voiceWithoutFaceRate * 1.1
      - silentLipRate * 0.35
      - Math.max(0, proctorEventsRef.current.length - 1) * 4
    ));

    let dominantRisk = 'No risk detected yet.';
    if (voiceWithoutFaceRate >= 25) dominantRisk = 'Strong voice activity was detected while the face was missing.';
    else if (suspiciousRate >= 25) dominantRisk = 'Speech audio often did not align with visible mouth movement.';
    else if (silentLipRate >= 20) dominantRisk = 'Visible lip movement appeared without matching microphone energy for part of the session.';
    else if (syncRate >= 70) dominantRisk = 'Voice and mouth movement stayed aligned for most speaking moments.';

    return {
      integrityScore,
      syncRate,
      suspiciousRate,
      voiceWithoutFaceRate,
      silentLipRate,
      speakingFrames,
      suspiciousEvents: proctorEventsRef.current,
      dominantRisk,
    };
  }, []);

  const recomputeProctorSummary = React.useCallback(() => {
    const snapshot = buildProctorSnapshot();
    setProctorSummary(snapshot);
    if (snapshot.integrityScore >= 85) setProctorStatus('Authentic speaking pattern');
    else if (snapshot.integrityScore >= 65) setProctorStatus('Review recommended');
    else setProctorStatus('High mismatch risk');
    return snapshot;
  }, [buildProctorSnapshot]);

  const stopProctoring = React.useCallback(() => {
    if (proctorIntervalRef.current) {
      clearInterval(proctorIntervalRef.current);
      proctorIntervalRef.current = null;
    }
    if (monitorAudioContextRef.current) {
      try { monitorAudioContextRef.current.close(); } catch (e) {}
      monitorAudioContextRef.current = null;
    }
    if (monitorStreamRef.current) {
      monitorStreamRef.current.getTracks().forEach((track) => track.stop());
      monitorStreamRef.current = null;
    }
    monitorAnalyserRef.current = null;
    monitorDataArrayRef.current = null;
    latestVoiceActiveRef.current = false;
    setVoiceActive(false);
    setAudioLevel(0);
  }, []);

  const startProctoring = React.useCallback(async () => {
    stopProctoring();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: analyzerSettings.noiseSuppression,
          echoCancellation: analyzerSettings.echoCancellation,
        },
      });
      monitorStreamRef.current = stream;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      monitorAudioContextRef.current = audioContext;
      monitorAnalyserRef.current = analyser;
      monitorDataArrayRef.current = new Uint8Array(analyser.fftSize);

      proctorIntervalRef.current = setInterval(() => {
        if (!isRecordingRef.current || !monitorAnalyserRef.current || !monitorDataArrayRef.current) return;

        monitorAnalyserRef.current.getByteTimeDomainData(monitorDataArrayRef.current);
        const normalizedSamples = Array.from(monitorDataArrayRef.current, (value) => (value - 128) / 128);
        const rms = Math.sqrt(normalizedSamples.reduce((sum, sample) => sum + sample * sample, 0) / normalizedSamples.length);
        const pitchEstimate = estimatePitch(normalizedSamples, monitorAudioContextRef.current?.sampleRate || 44100);
        const previousNoiseFloor = noiseFloorRef.current;
        if (rms < previousNoiseFloor * 1.25) {
          noiseFloorRef.current = previousNoiseFloor * 0.92 + rms * 0.08;
        }
        const dynamicThreshold = Math.max(noiseFloorRef.current * 2.4, 0.02);
        const currentVoiceActive = rms > dynamicThreshold;

        latestVoiceActiveRef.current = currentVoiceActive;
        const normalizedLevel = Math.round(clampValue((rms / 0.18) * 100));
        setAudioLevel(normalizedLevel);
        setVoiceActive(currentVoiceActive);

        if (currentVoiceActive) {
          sentimentVolumeSamplesRef.current = [...sentimentVolumeSamplesRef.current, normalizedLevel].slice(-30);
          if (pitchEstimate > 0) {
            sentimentPitchSamplesRef.current = [...sentimentPitchSamplesRef.current, pitchEstimate].slice(-30);
          }
        }

        const mouthRatio = mouthRatioRef.current;
        const mouthThreshold = Math.max(mouthBaselineRef.current * 1.9, mouthBaselineRef.current + 0.015);
        const mouthSpeaking = mouthRatio > mouthThreshold;

        totalFramesRef.current += 1;

        if (currentVoiceActive) {
          if (!speechActiveRef.current) speechActiveRef.current = true;
          silenceStreakRef.current = 0;
          speakingFramesRef.current += 1;
          if (!faceDetectedRef.current) {
            noFaceVoiceFramesRef.current += 1;
            offscreenVoiceStreakRef.current += 1;
            suspiciousStreakRef.current = 0;
          } else if (mouthSpeaking) {
            syncFramesRef.current += 1;
            suspiciousStreakRef.current = 0;
            offscreenVoiceStreakRef.current = 0;
          } else {
            suspiciousFramesRef.current += 1;
            suspiciousStreakRef.current += 1;
            offscreenVoiceStreakRef.current = 0;
          }
        } else if (faceDetectedRef.current && mouthSpeaking) {
          silentLipFramesRef.current += 1;
          suspiciousStreakRef.current = Math.max(0, suspiciousStreakRef.current - 1);
          offscreenVoiceStreakRef.current = 0;
        } else {
          if (speechActiveRef.current) {
            silenceStreakRef.current += 1;
            if (silenceStreakRef.current === 8) {
              pauseCountRef.current += 1;
              speechActiveRef.current = false;
            }
          }
          suspiciousStreakRef.current = Math.max(0, suspiciousStreakRef.current - 1);
          offscreenVoiceStreakRef.current = 0;
        }

        if (suspiciousStreakRef.current === 8) {
          pushProctorEvent({
            title: 'Voice-mouth mismatch',
            detail: 'Audio stayed active for about a second while the visible mouth movement stayed low.',
            severity: 'medium',
            timestamp: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          });
        }

        if (offscreenVoiceStreakRef.current === 6) {
          pushProctorEvent({
            title: 'Voice without visible face',
            detail: 'Strong speech activity was detected while the speaker face was missing from camera view.',
            severity: 'high',
            timestamp: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          });
        }

        recomputeProctorSummary();
      }, 120);
    } catch (error) {
      console.warn('Proctoring audio monitor unavailable:', error);
      pushProctorEvent({
        title: 'Proctoring limited',
        detail: 'Microphone integrity monitoring could not start, so fair-use checks are reduced for this session.',
        severity: 'medium',
        timestamp: 0,
      });
      recomputeProctorSummary();
    }
  }, [analyzerSettings.echoCancellation, analyzerSettings.noiseSuppression, estimatePitch, pushProctorEvent, recomputeProctorSummary, stopProctoring]);

  const updateLiveMetrics = React.useCallback((finalChunk, chunkConfidence) => {
    if (finalChunk) {
      const words = finalChunk.trim().split(/\s+/).filter(Boolean).length;
      const fillers = fillerPattern ? ((finalChunk.match(fillerPattern) || []).length) : 0;
      setLiveWords(prev => prev + words);
      setFillerCount(prev => prev + fillers);
    }
    if (typeof chunkConfidence === 'number' && !Number.isNaN(chunkConfidence)) {
      setConfidence(Math.round(chunkConfidence * 100));
    }
  }, [fillerPattern]);

  React.useEffect(() => {
    if (!isRecording || !sessionStartedAtRef.current) return;
    const interval = setInterval(() => {
      const elapsedMinutes = Math.max((Date.now() - sessionStartedAtRef.current) / 60000, 1 / 60);
      setLiveWpm(Math.round(liveWords / elapsedMinutes));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording, liveWords]);

  // ─── Deepgram WebSocket STT ───────────────────────────────────────────────
  const startDeepgram = async (apiKey) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: analyzerSettings.noiseSuppression,
          echoCancellation: analyzerSettings.echoCancellation,
        }
      });
      audioStreamRef.current = stream;

      // Nova-2 model: best accuracy + lowest latency Deepgram offers
      const url = 'wss://api.deepgram.com/v1/listen?' + new URLSearchParams({
        model: 'nova-2',
        language: analyzerSettings.sttLang,
        encoding: 'webm-opus',
        interim_results: 'true',
        smart_format: analyzerSettings.smartFormat ? 'true' : 'false',
        utterance_end_ms: '1000',   // finalize after 1s silence
        vad_events: 'true',
      });

      const socket = new WebSocket(url, ['token', apiKey]);
      dgSocketRef.current = socket;

      socket.onopen = () => {
        setSttMode('deepgram');
        // Stream mic audio to Deepgram
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(e.data);
          }
        };
        mr.start(100); // send chunks every 100ms for ultra-low latency
      };

      socket.onmessage = (e) => {
        if (!isRecordingRef.current) return;
        const data = JSON.parse(e.data);
        if (data.type !== 'Results') return;

        const transcript = data.channel?.alternatives?.[0]?.transcript || '';
        const isFinal = data.is_final;
        const chunkConfidence = data.channel?.alternatives?.[0]?.confidence;

        if (isFinal && transcript.trim()) {
          const chunkKey = `${data.start || 0}-${data.duration || 0}-${transcript}`;
          if (!seenFinalChunksRef.current.has(chunkKey)) {
            seenFinalChunksRef.current.add(chunkKey);
            committedRef.current = (committedRef.current + ' ' + transcript).trim();
            setCommitted(committedRef.current);
            updateLiveMetrics(transcript, chunkConfidence);
          }
          setInterim('');
          interimRef.current = '';
        } else if (!isFinal && transcript.trim()) {
          setInterim(transcript);
          interimRef.current = transcript;
          if (typeof chunkConfidence === 'number') {
            setConfidence(Math.round(chunkConfidence * 100));
          }
        }
      };

      socket.onerror = (err) => {
        console.warn('Deepgram error, falling back to browser STT', err);
        stopDeepgram();
        startBrowserSTT();
      };

      socket.onclose = () => {
        if (isRecordingRef.current && supportsBrowserSTT) startBrowserSTT();
      };

    } catch (err) {
      console.warn('Deepgram init failed, using browser STT:', err);
      if (supportsBrowserSTT) startBrowserSTT();
    }
  };

  const stopDeepgram = () => {
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch(e) {}
      mediaRecorderRef.current = null;
    }
    if (dgSocketRef.current) {
      try { dgSocketRef.current.close(); } catch(e) {}
      dgSocketRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
  };

  // ─── Browser Web Speech API fallback ─────────────────────────────────────
  const startBrowserSTT = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = analyzerSettings.sttLang;
    recognitionRef.current = recognition;
    setSttMode('browser');

    recognition.onresult = (event) => {
      if (!isRecordingRef.current) return;
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      if (finalText) {
        committedRef.current = (committedRef.current + ' ' + finalText).trim();
        setCommitted(committedRef.current);
        setInterim('');
        interimRef.current = '';
        updateLiveMetrics(finalText, event.results[event.results.length - 1]?.[0]?.confidence);
      } else {
        setInterim(interimText);
        interimRef.current = interimText;
      }
    };

    recognition.onerror = (event) => {
      console.warn('Browser STT error:', event.error);
      if (!isRecordingRef.current) return;

      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }

      if (!supportsBrowserSTT && (config?.deepgramKey || localStorage.getItem('dg_key'))) {
        stopBrowserSTT();
        startDeepgram(config?.deepgramKey || localStorage.getItem('dg_key'));
      }
    };

    recognition.onend = () => {
      if (!isRecordingRef.current) return;
      recognitionRestartTimeoutRef.current = setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Browser STT restart skipped:', e);
        }
      }, 120);
    };

    try {
      recognition.start();
      return true;
    } catch (e) {
      console.warn('Browser STT start failed:', e);
      return false;
    }
  };

  const stopBrowserSTT = () => {
    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
  };

  // ─── Session control ──────────────────────────────────────────────────────
  const handleStart = () => {
    committedRef.current = '';
    seenFinalChunksRef.current = new Set();
    setCommitted('');
    setInterim('');
    setIsRecording(true);
    isRecordingRef.current = true;
    sessionStartedAtRef.current = Date.now();
    setLiveWords(0);
    setFillerCount(0);
    setLiveWpm(0);
    setConfidence(0);
    setAudioLevel(0);
    setVoiceActive(false);
    setMouthActivity(0);
    resetSentimentTracking();
    setProctorStatus('Calibrating');
    proctorEventsRef.current = [];
    setProctorEvents([]);
    suspiciousStreakRef.current = 0;
    offscreenVoiceStreakRef.current = 0;
    totalFramesRef.current = 0;
    speakingFramesRef.current = 0;
    syncFramesRef.current = 0;
    suspiciousFramesRef.current = 0;
    noFaceVoiceFramesRef.current = 0;
    silentLipFramesRef.current = 0;
    mouthBaselineRef.current = 0.018;
    noiseFloorRef.current = 0.012;
    setProctorSummary({
      integrityScore: 100,
      syncRate: 0,
      suspiciousRate: 0,
      voiceWithoutFaceRate: 0,
      silentLipRate: 0,
      speakingFrames: 0,
      suspiciousEvents: [],
      dominantRisk: 'Session calibration in progress.',
    });
    setTimer(config?.duration_seconds || 60);

    const browserStarted = startBrowserSTT();
    if (!browserStarted) {
      const apiKey = config?.deepgramKey || localStorage.getItem('dg_key');
      if (apiKey) {
        startDeepgram(apiKey);
      } else {
        setSttMode('idle');
      }
    }
    startCamera();
    startProctoring();
    startSentimentTracking();
  };

  const handleStop = async () => {
    const finalTranscript = [committedRef.current, interim].filter(Boolean).join(' ').trim();
    const finalProctorSummary = recomputeProctorSummary();
    await analyzeSentimentSlice(true);
    const finalSentimentHistory = sentimentHistoryRef.current;
    const dominantEmotion = getDominantEmotion(finalSentimentHistory);
    setIsRecording(false);
    isRecordingRef.current = false;
    stopDeepgram();
    stopBrowserSTT();
    stopProctoring();
    stopSentimentTracking();
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    interimRef.current = '';
    setFaceDetected(false);
    faceDetectedRef.current = false;
    setSttMode('idle');
    onNavigate('report', {
      transcript: finalTranscript,
      duration_seconds: (config?.duration_seconds || 60) - timer,
      topic: config?.topic,
      difficulty: config?.difficulty || 'Intermediate',
      security: config?.security || {},
      analyzerSettings,
      liveMetrics: {
        words: liveWords,
        fillers: fillerCount,
        pace: liveWpm,
        confidence,
        audio_level: audioLevel,
      },
      proctoring: finalProctorSummary,
      sentiment_history: finalSentimentHistory,
      dominant_emotion: dominantEmotion,
    });
  };

  // ─── Camera / FaceMesh ────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => { if (faceMeshRef.current) await faceMeshRef.current.send({ image: videoRef.current }); },
        width: 480, height: 360
      });
      camera.start();
    } catch (e) {
      pushProctorEvent({
        title: 'Camera unavailable',
        detail: 'The camera could not start, so lip-sync integrity checks will be limited for this session.',
        severity: 'high',
        timestamp: 0,
      });
      recomputeProctorSummary();
    }
  };

  React.useEffect(() => {
    if (!window.FaceMesh) return;
    const fm = new window.FaceMesh({ locateFile: (f) => 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + f });
    fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });
    fm.onResults(res => {
      const landmarks = res.multiFaceLandmarks?.[0];
      const hasFace = !!landmarks;
      faceDetectedRef.current = hasFace;
      setFaceDetected(hasFace);

      if (!landmarks) {
        mouthRatioRef.current = 0;
        setMouthActivity(0);
        return;
      }

      const upper = landmarks[LIP_LANDMARKS.upperInner];
      const lower = landmarks[LIP_LANDMARKS.lowerInner];
      const left = landmarks[LIP_LANDMARKS.leftCorner];
      const right = landmarks[LIP_LANDMARKS.rightCorner];

      if (!upper || !lower || !left || !right) return;

      const mouthHeight = Math.hypot(upper.x - lower.x, upper.y - lower.y, upper.z - lower.z);
      const mouthWidth = Math.max(Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z), 0.001);
      const mouthRatio = mouthHeight / mouthWidth;
      mouthRatioRef.current = mouthRatio;
      setMouthActivity(Math.round(clampValue((mouthRatio / 0.28) * 100)));

      if (!latestVoiceActiveRef.current && mouthRatio < mouthBaselineRef.current * 1.4) {
        mouthBaselineRef.current = mouthBaselineRef.current * 0.88 + mouthRatio * 0.12;
      }
    });
    faceMeshRef.current = fm;
  }, []);

  React.useEffect(() => {
    let inv;
    if (isRecording && timer > 0) inv = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0 && isRecording) handleStop();
    return () => clearInterval(inv);
  }, [isRecording, timer]);

  React.useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      stopDeepgram();
      stopBrowserSTT();
      stopProctoring();
      stopSentimentTracking();
      faceDetectedRef.current = false;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, []);

  // ─── Render transcript: committed (solid) + interim (faded, live) ─────────
  const renderTranscript = () => {
    if (!committed && !interim) {
      return (
        <div className='flex flex-col items-center justify-center h-full opacity-20 text-center'>
          <svg className='w-20 h-20 mb-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' />
          </svg>
          <p className='text-xl uppercase tracking-[0.5em]'>Voice Sync Standby</p>
        </div>
      );
    }

    const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    return (
      <p className='text-textMain leading-[1.6]'>
        <span>{cap(committed)}{committed ? ' ' : ''}</span>
        {interim && (
          <span className='text-primary/50 italic'>{interim}</span>
        )}
        {isRecording && (
          <span className='inline-block w-[3px] h-[1em] bg-primary ml-1 align-middle animate-pulse rounded-sm' />
        )}
      </p>
    );
  };

  const sttBadge = {
    idle: { label: 'STT STANDBY', color: 'bg-slate-600' },
    deepgram: { label: 'DEEPGRAM LIVE', color: 'bg-primary' },
    browser: { label: 'LIVE TRANSCRIPT', color: 'bg-emerald-500' },
  }[sttMode];

  return (
    <div className='max-w-7xl mx-auto px-6 py-10 min-h-screen'>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-10'>
        <div className='lg:col-span-2 space-y-8'>
          <div className='glass-card p-10 min-h-[600px] flex flex-col relative overflow-hidden bg-white/90 dark:bg-black/95 backdrop-blur-3xl border border-white/20 shadow-2xl rounded-[3rem]'>
            {/* Progress bar */}
            <div className='absolute top-0 left-0 w-full h-2 bg-slate-100 dark:bg-slate-900'>
              <motion.div className='h-full bg-primary shadow-[0_0_20px_#10b981]' animate={{ width: (timer / (config?.duration_seconds || 60) * 100) + '%' }} />
            </div>

            <div className='flex justify-between items-center mb-8'>
              <div className='flex items-center gap-3'>
                <div className={'w-4 h-4 rounded-full ' + (isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-400')}></div>
                <span className={'px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest ' + sttBadge.color}>
                  {sttBadge.label}
                </span>
              </div>
              <div className='px-10 py-4 rounded-[1.5rem] bg-primary text-white text-4xl font-black font-mono shadow-2xl shadow-primary/30'>
                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <VoiceVisualizer isRecording={isRecording} />

            {/* Transcript display */}
            <div
              className='flex-grow text-3xl leading-[1.6] font-bold bg-slate-50/50 dark:bg-white/5 p-10 rounded-[2.5rem] border border-white/10 shadow-inner overflow-y-auto mb-8 scroll-smooth'
              style={{ minHeight: '350px' }}
            >
              {renderTranscript()}
            </div>

            <div className='mt-8 flex gap-6'>
              {!isRecording ? (
                <button onClick={handleStart} className='flex-grow py-8 rounded-[2.5rem] bg-primary text-white text-3xl font-black uppercase tracking-widest shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all'>
                  Initiate AI Stream
                </button>
              ) : (
                <button onClick={handleStop} className='flex-grow py-8 rounded-[2.5rem] bg-slate-900 text-white text-2xl font-black uppercase tracking-widest hover:bg-black transition-all border border-white/10'>
                  End Transmission
                </button>
              )}
            </div>
          </div>
        </div>

        <div className='space-y-8'>
          <div className='glass-card overflow-hidden relative aspect-video border-2 border-primary/20 bg-black rounded-[3rem] shadow-2xl'>
            <video ref={videoRef} autoPlay muted playsInline className='w-full h-full object-cover -scale-x-100' />
            <div className='absolute top-6 left-6'>
              <div className={'px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg ' + (faceDetected ? 'bg-primary text-white' : 'bg-red-600 text-white')}>
                {faceDetected ? 'BIO-SYNC LOCKED' : 'SIGNAL INTERRUPTED'}
              </div>
            </div>
          </div>

          <div className='glass-card p-10 bg-slate-900 text-white rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden'>
            <div className='absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl'></div>
            <h3 className='text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8'>Voice Proctoring</h3>
            <div className='space-y-8'>
              <div className='flex justify-between items-end'>
                <div>
                  <p className='text-[10px] font-bold text-primary uppercase mb-1'>Integrity Score</p>
                  <p className='text-5xl font-black tracking-tighter'>{proctorSummary.integrityScore}%</p>
                  <p className='text-[10px] uppercase tracking-[0.25em] text-white/50 mt-2'>{proctorStatus}</p>
                </div>
                <div className={'w-16 h-16 rounded-3xl flex items-center justify-center ' + (proctorSummary.integrityScore >= 85 ? 'bg-primary/20 text-primary' : proctorSummary.integrityScore >= 65 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-500')}>
                  <svg className='w-8 h-8' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='3' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                  </svg>
                </div>
              </div>
              <div className='h-3 w-full bg-white/5 rounded-full overflow-hidden'>
                <motion.div className={`h-full ${proctorSummary.integrityScore >= 85 ? 'bg-primary' : proctorSummary.integrityScore >= 65 ? 'bg-amber-400' : 'bg-red-500'}`} animate={{ width: `${proctorSummary.integrityScore}%` }} />
              </div>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div className='rounded-2xl bg-white/5 p-4'>
                  <p className='text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2'>Voice-Mouth Sync</p>
                  <p className='font-black text-xl'>{proctorSummary.syncRate}%</p>
                </div>
                <div className='rounded-2xl bg-white/5 p-4'>
                  <p className='text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2'>Voice w/o Face</p>
                  <p className='font-black text-xl'>{proctorSummary.voiceWithoutFaceRate}%</p>
                </div>
                <div className='rounded-2xl bg-white/5 p-4'>
                  <p className='text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2'>Mic Energy</p>
                  <p className='font-black text-xl'>{audioLevel}%</p>
                </div>
                <div className='rounded-2xl bg-white/5 p-4'>
                  <p className='text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2'>Mouth Activity</p>
                  <p className='font-black text-xl'>{mouthActivity}%</p>
                </div>
              </div>
              <div className='rounded-[2rem] bg-white/5 p-5 border border-white/10'>
                <p className='text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2'>Current Read</p>
                <p className='text-sm font-bold text-white/85'>{proctorSummary.dominantRisk}</p>
              </div>
              <div className='space-y-3'>
                {proctorEvents.length > 0 ? proctorEvents.map((event) => (
                  <div key={event.id} className={`rounded-2xl border px-4 py-3 ${event.severity === 'high' ? 'bg-red-500/10 border-red-500/25 text-red-100' : 'bg-amber-500/10 border-amber-400/25 text-amber-50'}`}>
                    <div className='flex items-center justify-between gap-3'>
                      <p className='text-[10px] uppercase tracking-[0.25em] font-black'>{event.title}</p>
                      <span className='text-[10px] font-black uppercase'>{event.timestamp}s</span>
                    </div>
                    <p className='text-xs font-semibold mt-2 opacity-90'>{event.detail}</p>
                  </div>
                )) : (
                  <div className='rounded-2xl border border-white/10 bg-white/5 px-4 py-4'>
                    <p className='text-xs font-semibold text-white/70'>No suspicious voice-proctoring events detected yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {analyzerSettings.showLiveMetrics && (
          <div className='glass-card p-8 bg-white/90 dark:bg-black/90 rounded-[3rem] border border-white/10 shadow-2xl'>
              <h3 className='text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6'>Live Analyzer</h3>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs uppercase tracking-[0.2em] text-slate-400'>Target Pace</span>
                  <span className='text-sm font-black text-textMain'>{analyzerSettings.targetWpm} WPM</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs uppercase tracking-[0.2em] text-slate-400'>Current Pace</span>
                  <span className={`text-sm font-black ${liveWpm > analyzerSettings.targetWpm + 20 || liveWpm < analyzerSettings.targetWpm - 20 ? 'text-amber-500' : 'text-primary'}`}>{liveWpm} WPM</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs uppercase tracking-[0.2em] text-slate-400'>Filler Hits</span>
                  <span className='text-sm font-black text-textMain'>{fillerCount}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs uppercase tracking-[0.2em] text-slate-400'>Language</span>
                  <span className='text-sm font-black text-textMain'>{analyzerSettings.sttLang}</span>
                </div>
                {analyzerSettings.showConfidence && (
                  <div className='flex items-center justify-between'>
                    <span className='text-xs uppercase tracking-[0.2em] text-slate-400'>Transcript Confidence</span>
                    <span className='text-sm font-black text-textMain'>{confidence}%</span>
                  </div>
                )}
                <div className='flex items-center justify-between'>
                  <span className='text-xs uppercase tracking-[0.2em] text-slate-400'>Current Emotion</span>
                  <span className='text-sm font-black text-textMain'>{currentEmotion}</span>
                </div>
                <div className='rounded-[1.25rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 px-4 py-3'>
                  <p className='text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2'>Emotion Insight</p>
                  <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-semibold'>{emotionInsight}</p>
                </div>
                {sentimentHistory.length > 0 && (
                  <div className='rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 px-4 py-4'>
                    <p className='text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3'>Emotion Timeline</p>
                    <div className='flex items-end gap-2 h-20'>
                      {sentimentHistory.map((entry, index) => (
                        <div key={`${entry.time}-${index}`} className='flex-1 flex flex-col items-center gap-2'>
                          <div className='w-full bg-primary/20 rounded-t-lg overflow-hidden flex items-end' style={{ height: '52px' }}>
                            <div className='w-full bg-primary rounded-t-lg' style={{ height: `${Math.max(18, entry.score)}%` }} />
                          </div>
                          <span className='text-[9px] font-black uppercase tracking-[0.15em] text-slate-400'>{entry.emotion.slice(0, 4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className='glass-card p-8 bg-slate-900 text-white rounded-[3rem] border border-white/10 shadow-2xl'>
            <h3 className='text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6'>Session Profile</h3>
            <div className='space-y-4 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-slate-400'>Mode</span>
                <span className='font-black capitalize'>{analyzerSettings.analysisMode}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-slate-400'>Noise Suppression</span>
                <span className='font-black'>{analyzerSettings.noiseSuppression ? 'On' : 'Off'}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-slate-400'>Echo Cancellation</span>
                <span className='font-black'>{analyzerSettings.echoCancellation ? 'On' : 'Off'}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-slate-400'>Gaze Policy</span>
                <span className='font-black'>{analyzerSettings.gazeStrict ? 'Strict' : 'Standard'}</span>
              </div>
              <div className='flex items-start justify-between gap-4'>
                <span className='text-slate-400'>Watched fillers</span>
                <span className='font-black text-right text-xs leading-relaxed'>{analyzerSettings.fillerWords.slice(0, 4).join(', ')}{analyzerSettings.fillerWords.length > 4 ? '...' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.TalkSense.register('LiveSpeechPage', LiveSpeechPage);
