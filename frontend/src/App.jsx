import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { LiveAvatar } from './components/LiveAvatar'

// ── Audio wave bars ──────────────────────────────────────────────────────────
function AudioWave({ active, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 3, height: 36, opacity: active ? 1 : 0,
      transition: 'opacity 0.5s ease', pointerEvents: 'none',
    }}>
      {Array.from({ length: 16 }, (_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 3, background: color,
          boxShadow: active ? `0 0 6px ${color}` : 'none',
          animationName: active ? 'wave-bar' : 'none',
          animationDuration: '0.9s', animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite', animationDelay: `${i * 0.06}s`,
          height: 4,
        }} />
      ))}
    </div>
  )
}

const USER_ID = 'user_' + (localStorage.getItem('amelia_uid') || (() => {
  const id = Math.random().toString(36).slice(2, 10)
  localStorage.setItem('amelia_uid', id)
  return id
})())

const STATUS_LABEL = {
  idle:      'Ready',
  listening: 'Listening…',
  thinking:  'Thinking…',
  loading:   'Preparing…',
  speaking:  'Speaking…',
}

const STATUS_COLOR = {
  idle:      '#7070a0',
  listening: '#ef4444',
  thinking:  '#f59e0b',
  loading:   '#a78bfa',
  speaking:  '#4ade80',
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end', gap: 10, marginBottom: 14, padding: '0 4px',
      animation: isUser
        ? 'msg-in-right 0.3s cubic-bezier(.22,.68,0,1.2) both'
        : 'msg-in-left 0.3s cubic-bezier(.22,.68,0,1.2) both',
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#4c1d95,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
        }}>A</div>
      )}
      <div style={{
        maxWidth: '80%',
        background: isUser ? 'linear-gradient(135deg,#5b21b6,#7c3aed)' : 'rgba(255,255,255,0.1)',
        color: '#f0f0f8',
        borderRadius: isUser ? '20px 20px 4px 20px' : '4px 20px 20px 20px',
        padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.12)',
        backdropFilter: isUser ? 'none' : 'blur(8px)',
      }}>
        <ReactMarkdown components={{
          p: ({ children }) => <p style={{ margin: '2px 0' }}>{children}</p>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer"
              style={{ color: '#a78bfa', textDecoration: 'underline' }}>{children}</a>
          ),
        }}>{msg.content}</ReactMarkdown>
      </div>
      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#a0a0c0',
        }}>U</div>
      )}
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Welcome to Kagzso! I'm your AI automation assistant — ask me about KOT & POS, hospital management, AI attendance, school timetables, and more. What would you like to know?" }
  ])
  const [input, setInput]             = useState('')
  const [status, setStatus]           = useState('idle')
  const [mouthOpen, setMouthOpen]     = useState(0)
  const [videoUrl, setVideoUrl]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('/amelia-avatar.jpg')
  const [idleVideoUrl, setIdleVideoUrl]   = useState('')
  const [isOnline, setIsOnline]       = useState(navigator.onLine)
  const [chatOpen, setChatOpen]       = useState(false)
  const [docsOpen, setDocsOpen]       = useState(false)
  const [documents, setDocuments]     = useState([])
  const [uploading, setUploading]     = useState(false)
  const [uploadMsg, setUploadMsg]     = useState('')
  const [dragOver, setDragOver]       = useState(false)
  const [isStreaming, setIsStreaming]  = useState(false)
  const [liveMode, setLiveMode]       = useState(false)
  const [mounted, setMounted]         = useState(false)

  const liveModeRef    = useRef(false)
  const startListenRef = useRef(null)
  const bottomRef      = useRef(null)
  const recognitionRef = useRef(null)
  const audioCtxRef    = useRef(null)
  const animFrameRef   = useRef(null)
  const pollRef        = useRef(null)
  const textareaRef    = useRef(null)
  const fileInputRef   = useRef(null)
  const activeMsgRef   = useRef(0)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])

  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    fetch('/api/avatar').then(r => r.json()).then(d => {
      if (d.presenter_preview) setAvatarPreview(d.presenter_preview)
      else if (d.local_url) setAvatarPreview(d.local_url + '?t=' + Date.now())
      if (d.presenter_idle_video) setIdleVideoUrl(d.presenter_idle_video)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  useEffect(() => {
    return () => {
      clearTimeout(pollRef.current)
      cancelAnimationFrame(animFrameRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/docs')
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch {}
  }, [])

  useEffect(() => { if (docsOpen) fetchDocs() }, [docsOpen, fetchDocs])

  const uploadDoc = useCallback(async (files) => {
    if (!files || !files.length) return
    setUploading(true)
    for (const file of files) {
      setUploadMsg(`Uploading ${file.name}…`)
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/docs/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.ok) {
          setUploadMsg(`Added: ${file.name} (${data.chunks} chunks)`)
          await fetchDocs()
        } else {
          setUploadMsg(`Failed: ${data.detail || 'upload error'}`)
        }
      } catch {
        setUploadMsg(`Failed to upload ${file.name}`)
      }
    }
    setUploading(false)
    setTimeout(() => setUploadMsg(''), 4000)
  }, [fetchDocs])

  const deleteDoc = useCallback(async (docName) => {
    try {
      await fetch(`/api/docs/${encodeURIComponent(docName)}`, { method: 'DELETE' })
      await fetchDocs()
    } catch {}
  }, [fetchDocs])

  const playAudio = useCallback(async (base64Audio) => {
    try {
      audioCtxRef.current?.close()
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const binary = atob(base64Audio)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.start()
      setStatus('speaking')
      source.onended = () => {
        setStatus('idle')
        ctx.close()
        if (liveModeRef.current) setTimeout(() => startListenRef.current?.(), 500)
      }
    } catch (err) {
      console.error('Audio error:', err)
      setStatus('idle')
    }
  }, [])

  const startPollingVideo = useCallback((id) => {
    const poll = async () => {
      try {
        const res  = await fetch(`/api/talk/${id}`)
        const data = await res.json()
        if (data.status === 'done' && data.video_url) {
          setVideoUrl(data.video_url)
        } else if (data.status === 'error') {
          console.warn('D-ID error:', data.error)
        } else {
          pollRef.current = setTimeout(poll, 2000)
        }
      } catch {
        pollRef.current = setTimeout(poll, 3000)
      }
    }
    pollRef.current = setTimeout(poll, 3000)
  }, [])

  const sendMessage = useCallback(async (text) => {
    const msg = text.trim()
    if (!msg || status === 'thinking' || status === 'loading') return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setVideoUrl(null)
    clearTimeout(pollRef.current)
    window.speechSynthesis?.cancel()
    cancelAnimationFrame(animFrameRef.current)
    const myMsgId = ++activeMsgRef.current
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setStatus('thinking')
    setIsStreaming(false)

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, user_id: USER_ID }),
      })
      if (!res.ok) throw new Error('Server error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamedText = ''
      let msgAdded = false
      let audioReceived = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event
          try { event = JSON.parse(line.slice(6)) } catch { continue }

          if (event.token) {
            streamedText += event.token
            if (!msgAdded) {
              setIsStreaming(true)
              setMessages(prev => [...prev, { role: 'assistant', content: streamedText }])
              msgAdded = true
            } else {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: streamedText }
                return updated
              })
            }
          }

          if (event.audio) {
            audioReceived = true
            setIsStreaming(false)
            // ElevenLabs girl's voice only — no browser speech
            await playAudio(event.audio)
          }

          if (event.end) {
            setIsStreaming(false)
            if (event.talk_id) startPollingVideo(event.talk_id)
            if (!audioReceived) {
              // ElevenLabs failed — show text but no voice
              setStatus('idle')
              if (liveModeRef.current) setTimeout(() => startListenRef.current?.(), 500)
            }
          }

          if (event.error) {
            setIsStreaming(false)
            if (!msgAdded) {
              setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
            }
            setStatus('idle')
            if (liveModeRef.current) setTimeout(() => startListenRef.current?.(), 1000)
          }
        }
      }
    } catch {
      setIsStreaming(false)
      setMessages(prev => [...prev, {
        role: 'assistant', content: "I can't reach my backend right now. Check that the server is running."
      }])
      setStatus('idle')
      if (liveModeRef.current) setTimeout(() => startListenRef.current?.(), 1500)
    }
  }, [status, playAudio, startPollingVideo])

  const handleVideoEnd = useCallback(() => {
    setVideoUrl(null)
    setStatus('idle')
    if (liveModeRef.current) setTimeout(() => startListenRef.current?.(), 500)
  }, [])

  useEffect(() => {
    if (videoUrl) {
      window.speechSynthesis?.cancel()
      setStatus('speaking')
    }
  }, [videoUrl])

  const handleEndCall = useCallback(() => {
    if (liveModeRef.current) {
      liveModeRef.current = false
      setLiveMode(false)
      recognitionRef.current?.stop()
    }
    window.speechSynthesis?.cancel()
    cancelAnimationFrame(animFrameRef.current)
    setVideoUrl(null)
    clearTimeout(pollRef.current)
    setMouthOpen(0)
    setStatus('idle')
    setIsStreaming(false)
  }, [])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    let gotResult = false
    rec.onresult = (e) => {
      gotResult = true
      const transcript = e.results[0][0].transcript
      setStatus('idle')
      sendMessage(transcript)
    }
    rec.onend = () => {
      if (gotResult) return
      if (liveModeRef.current) setTimeout(() => startListenRef.current?.(), 300)
      else setStatus('idle')
    }
    rec.onerror = (e) => {
      if (liveModeRef.current && (e.error === 'no-speech' || e.error === 'aborted')) {
        setTimeout(() => startListenRef.current?.(), 300)
      } else if (!liveModeRef.current) {
        setStatus('idle')
      }
    }
    recognitionRef.current = rec
    rec.start()
    setStatus('listening')
  }, [sendMessage])

  startListenRef.current = startListening

  const toggleLiveMode = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice needs Chrome browser.'); return }
    if (liveModeRef.current) {
      liveModeRef.current = false
      setLiveMode(false)
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
      setStatus('idle')
    } else {
      liveModeRef.current = true
      setLiveMode(true)
      startListening()
    }
  }, [startListening])

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const isBusy = status === 'thinking' || status === 'loading'
  const isListening = status === 'listening'
  const sc = STATUS_COLOR[status]

  const hintText =
    status === 'speaking'  ? 'Talk to interrupt'
    : status === 'listening' ? 'Listening…'
    : status === 'thinking'  ? 'Thinking…'
    : 'Talk to Kagzso'

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden',
      opacity: mounted ? 1 : 0,
      transition: 'opacity 0.5s ease',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 4px; }

        @keyframes wave-bar {
          0%,100% { height: 4px; }
          50%      { height: 26px; }
        }
        @keyframes blink-dot {
          0%,100% { opacity:1; } 50% { opacity:0.2; }
        }
        @keyframes msg-in-left {
          from { opacity:0; transform:translateX(-16px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes msg-in-right {
          from { opacity:0; transform:translateX(16px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes mic-ring {
          0%   { transform:scale(1);   opacity:0.55; }
          100% { transform:scale(2.4); opacity:0; }
        }
        @keyframes mic-ring2 {
          0%   { transform:scale(1);   opacity:0.35; }
          100% { transform:scale(1.75); opacity:0; }
        }
        @keyframes bounce {
          0%,80%,100% { transform:translateY(0); opacity:0.4; }
          40%          { transform:translateY(-5px); opacity:1; }
        }
        @keyframes fade-in {
          from { opacity:0; } to { opacity:1; }
        }
        @keyframes overlay-in {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spin-slow {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes speak-pulse {
          from { opacity: 0.4; }
          to   { opacity: 1; }
        }

        button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
        textarea { caret-color: #a78bfa; }
        textarea:focus { outline: none; }
        textarea::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>

      {/* ── VIDEO BACKGROUND ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {idleVideoUrl && !videoUrl && (
          <video src={idleVideoUrl} autoPlay loop muted playsInline
            key="idle"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          />
        )}
        {videoUrl && (
          <video src={videoUrl} autoPlay playsInline onEnded={handleVideoEnd}
            key="talking"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          />
        )}
        {!idleVideoUrl && !videoUrl && (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(180deg,#0c0a1e 0%,#07070e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 240, height: 340, position: 'relative',
              borderRadius: '50% 50% 46% 46% / 42% 42% 58% 58%',
              overflow: 'hidden', border: `1.5px solid ${sc}60`, background: '#08060f',
            }}>
              <LiveAvatar src={avatarPreview} mouthOpen={mouthOpen} status={status} />
            </div>
          </div>
        )}
      </div>

      {/* ── TOP gradient ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 150,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)',
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* ── BOTTOM gradient ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 240,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)',
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* ── TOP BAR ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        {/* Left: name + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: sc,
            boxShadow: `0 0 10px ${sc}`,
            transition: 'background 0.5s, box-shadow 0.5s',
            flexShrink: 0,
          }} />
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>Kagzso</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{STATUS_LABEL[status]}</span>
        </div>

        {/* Right: icon buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Chat */}
          <button
            onClick={() => { setChatOpen(o => !o); setDocsOpen(false) }}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: chatOpen ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              border: chatOpen ? '1px solid rgba(167,139,250,0.55)' : '1px solid rgba(255,255,255,0.2)',
              color: chatOpen ? '#c4b5fd' : 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6V10h12v2zm0-3H6V7h12v2z"/>
            </svg>
          </button>
          {/* Docs */}
          <button
            onClick={() => { setDocsOpen(o => !o); setChatOpen(false) }}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: docsOpen ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              border: docsOpen ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(255,255,255,0.2)',
              color: docsOpen ? '#6ee7b7' : 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </button>
        </div>
      </div>


      {/* ── OFFLINE badge ── */}
      {!isOnline && (
        <div style={{
          position: 'absolute', top: 70, right: 16, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 20, padding: '5px 12px', backdropFilter: 'blur(12px)',
          fontSize: 11, color: '#f59e0b',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          Offline
        </div>
      )}

      {/* ── AUDIO WAVE ── */}
      <div style={{
        position: 'absolute', bottom: 168, left: 0, right: 0, zIndex: 5,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <AudioWave active={status === 'speaking' || status === 'listening'} color={sc} />
      </div>

      {/* ── BOTTOM CONTROLS ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: '0 32px 44px',
      }}>
        {/* Hint text */}
        <div style={{
          textAlign: 'center', color: 'rgba(255,255,255,0.5)',
          fontSize: 13, fontWeight: 400, letterSpacing: 0.2, marginBottom: 22,
          transition: 'opacity 0.3s',
        }}>
          {hintText}
        </div>

        {/* Control row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          maxWidth: 300, margin: '0 auto',
        }}>

          {/* Left: open text chat */}
          <button
            onClick={() => { setChatOpen(o => !o); setDocsOpen(false) }}
            style={{
              width: 54, height: 54, borderRadius: '50%',
              background: chatOpen ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.13)',
              backdropFilter: 'blur(16px)',
              border: chatOpen ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.22)',
              color: chatOpen ? '#c4b5fd' : 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>

          {/* Center: mic (large) */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(liveMode || isListening) && <>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid rgba(239,68,68,0.5)',
                animation: 'mic-ring 1.4s ease-out infinite', pointerEvents: 'none',
              }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid rgba(239,68,68,0.3)',
                animation: 'mic-ring2 1.4s ease-out infinite 0.5s', pointerEvents: 'none',
              }} />
            </>}
            <button
              onClick={toggleLiveMode}
              disabled={isBusy}
              style={{
                width: 76, height: 76, borderRadius: '50%', border: 'none',
                background: (liveMode || isListening) ? '#ef4444' : 'rgba(255,255,255,0.95)',
                color: (liveMode || isListening) ? '#fff' : '#111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                boxShadow: (liveMode || isListening)
                  ? '0 0 0 3px rgba(239,68,68,0.3), 0 8px 32px rgba(239,68,68,0.55)'
                  : '0 4px 28px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.2)',
                opacity: isBusy && !liveMode ? 0.45 : 1,
                transition: 'all 0.22s cubic-bezier(.34,1.56,.64,1)',
              }}
            >
              {(liveMode || isListening)
                ? <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zm-1 17.93V22h2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/></svg>
              }
            </button>
          </div>

          {/* Right: end call */}
          <button
            onClick={handleEndCall}
            style={{
              width: 54, height: 54, borderRadius: '50%', border: 'none',
              background: 'rgba(239,68,68,0.88)',
              backdropFilter: 'blur(16px)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(239,68,68,0.45)',
              transition: 'all 0.2s',
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.57 21 3 13.43 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.23 1.01L6.6 10.8z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── CHAT OVERLAY ── */}
      {chatOpen && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(4,4,12,0.94)',
          backdropFilter: 'blur(28px)',
          animation: 'overlay-in 0.25s cubic-bezier(.22,.68,0,1.2) both',
        }}
          onClick={e => { if (e.target === e.currentTarget) setChatOpen(false) }}
        >
          {/* Header */}
          <div style={{
            padding: '52px 20px 14px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg,#4c1d95,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
                boxShadow: '0 2px 10px rgba(124,58,237,0.4)',
              }}>K</div>
              <div>
                <div style={{ color: '#f0f0f8', fontSize: 15, fontWeight: 600, lineHeight: 1 }}>Kagzso</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: isOnline ? '#4ade80' : '#f59e0b', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: isOnline ? '#4ade80' : '#f59e0b' }}>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="13" height="13">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ animation: 'fade-in 0.2s ease' }}>
                <Message msg={msg} />
              </div>
            ))}
            {isBusy && !isStreaming && (
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 10,
                marginBottom: 14, animation: 'fade-in 0.2s ease',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#4c1d95,#7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                }}>A</div>
                <div style={{
                  display: 'flex', gap: 5, padding: '10px 14px',
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: '4px 18px 18px 18px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#7c3aed',
                      animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.18}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            flexShrink: 0, padding: '12px 16px 28px',
            background: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              background: 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${input.trim() ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 24, padding: '10px 10px 10px 18px',
              transition: 'border-color 0.2s',
              boxShadow: input.trim() && !isBusy ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
            }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(e) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                placeholder={isBusy ? 'Kagzso is thinking…' : 'Message Kagzso…'}
                disabled={isBusy}
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', resize: 'none',
                  color: '#f0f0f8', fontSize: 14, lineHeight: 1.55,
                  minHeight: 22, maxHeight: 120, padding: 0,
                  opacity: isBusy ? 0.5 : 1, fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {/* Voice toggle */}
                <button
                  onClick={toggleLiveMode}
                  disabled={isBusy}
                  style={{
                    width: 36, height: 36, borderRadius: 12, border: 'none',
                    background: liveMode ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                    color: liveMode ? '#ef4444' : '#5050a0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: isBusy ? 0.35 : 1, transition: 'all 0.2s',
                  }}
                >
                  {liveMode
                    ? <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
                    : <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zm-1 17.93V22h2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/></svg>
                  }
                </button>
                {/* Send */}
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isBusy}
                  style={{
                    width: 36, height: 36, borderRadius: 12, border: 'none',
                    background: input.trim() && !isBusy
                      ? 'linear-gradient(135deg,#5b21b6,#7c3aed)'
                      : 'rgba(255,255,255,0.06)',
                    color: input.trim() && !isBusy ? '#fff' : '#222244',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: input.trim() && !isBusy ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#1e1e32', marginTop: 7 }}>
              {liveMode ? 'Live mode active — speak naturally' : 'Enter to send · Shift+Enter for newline'}
            </div>
          </div>
        </div>
      )}

      {/* ── DOCS OVERLAY ── */}
      {docsOpen && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(4,4,12,0.94)',
          backdropFilter: 'blur(28px)',
          animation: 'overlay-in 0.25s cubic-bezier(.22,.68,0,1.2) both',
        }}>
          {/* Header */}
          <div style={{
            padding: '52px 20px 14px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg,#065f46,#059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(5,150,105,0.4)',
              }}>
                <svg viewBox="0 0 24 24" fill="#fff" width="16" height="16">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <div>
                <div style={{ color: '#f0f0f8', fontSize: 15, fontWeight: 600, lineHeight: 1 }}>Knowledge Base</div>
                <div style={{ color: '#059669', fontSize: 11, marginTop: 3 }}>
                  {documents.length === 0 ? 'No documents' : `${documents.length} document${documents.length > 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setDocsOpen(false)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="13" height="13">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); uploadDoc([...e.dataTransfer.files]) }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#059669' : 'rgba(5,150,105,0.3)'}`,
                borderRadius: 16, padding: '28px 20px', textAlign: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                background: dragOver ? 'rgba(5,150,105,0.08)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s', marginBottom: 16,
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                {uploading
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="28" height="28" style={{ animation: 'spin-slow 1s linear infinite' }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="rgba(5,150,105,0.7)" strokeWidth="1.5" width="32" height="32"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                }
              </div>
              <div style={{ color: '#6ee7b7', fontSize: 13, fontWeight: 600 }}>
                {uploading ? 'Uploading…' : 'Drop files or tap to upload'}
              </div>
              <div style={{ color: '#374151', fontSize: 11, marginTop: 4 }}>PDF · DOCX · TXT · CSV · MD</div>
            </div>
            <input
              ref={fileInputRef} type="file"
              accept=".pdf,.docx,.doc,.txt,.csv,.md" multiple style={{ display: 'none' }}
              onChange={e => { uploadDoc([...e.target.files]); e.target.value = '' }}
            />

            {uploadMsg && (
              <div style={{
                marginBottom: 12, padding: '10px 14px', borderRadius: 10,
                background: uploadMsg.startsWith('Added') ? 'rgba(5,150,105,0.12)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${uploadMsg.startsWith('Added') ? 'rgba(5,150,105,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: uploadMsg.startsWith('Added') ? '#6ee7b7' : '#f87171', fontSize: 12,
              }}>{uploadMsg}</div>
            )}

            {documents.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: '#3a3a5a', fontWeight: 700, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>
                  Uploaded
                </div>
                {documents.map(doc => (
                  <div key={doc.name} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, marginBottom: 8,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(5,150,105,0.6)" strokeWidth="1.5" width="16" height="16" style={{ flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#e0e0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div style={{ fontSize: 11, color: '#3a3a5a', marginTop: 2 }}>{doc.chunks} chunks indexed</div>
                    </div>
                    <button
                      onClick={() => deleteDoc(doc.name)}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, color: '#f87171', padding: '4px 10px', fontSize: 11, flexShrink: 0,
                      }}
                    >Remove</button>
                  </div>
                ))}
              </div>
            )}

            {documents.length === 0 && !uploading && (
              <div style={{ textAlign: 'center', color: '#2a2a4a', fontSize: 13, marginTop: 24 }}>
                Upload documents and Kagzso will use them to answer your questions.
              </div>
            )}
          </div>

          <div style={{ padding: '10px 20px 28px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: '#1e1e32', textAlign: 'center' }}>
            Kagzso searches your documents on every message
          </div>
        </div>
      )}
    </div>
  )
}
