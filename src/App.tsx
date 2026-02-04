import { useState, useEffect } from 'react'
import { Fretboard } from './components/Fretboard'
import { getNoteName, NOTES } from './utils/noteLogic'
import { initAudio, playNote } from './utils/audio'
import { Guitar, Volume2, Trophy, Clock, Zap, Target, Focus, Music, Brain, Lock } from 'lucide-react'

type GameMode = 'explore' | 'survival' | 'vertical' | 'stringMaster' | 'chord' | 'weakNotes'

type FretRange = 'low' | 'mid' | 'high' | 'full'

interface NoteStats {
  correct: number
  wrong: number
}

const FRET_RANGES = {
  low: { min: 0, max: 4, label: 'Frets 0-4' },
  mid: { min: 5, max: 9, label: 'Frets 5-9' },
  high: { min: 10, max: 12, label: 'Frets 10-12' },
  full: { min: 0, max: 12, label: 'All Frets' }
}

const MASTERY_THRESHOLD = 10

// Chord definitions: root note -> chord name -> notes in chord
const CHORDS: Record<string, Record<string, string[]>> = {
  'C': { 'major': ['C', 'E', 'G'], 'minor': ['C', 'D#', 'G'] },
  'D': { 'major': ['D', 'F#', 'A'], 'minor': ['D', 'F', 'A'] },
  'E': { 'major': ['E', 'G#', 'B'], 'minor': ['E', 'G', 'B'] },
  'F': { 'major': ['F', 'A', 'C'], 'minor': ['F', 'G#', 'C'] },
  'G': { 'major': ['G', 'B', 'D'], 'minor': ['G', 'A#', 'D'] },
  'A': { 'major': ['A', 'C#', 'E'], 'minor': ['A', 'C', 'E'] },
  'B': { 'major': ['B', 'D#', 'F#'], 'minor': ['B', 'D', 'F#'] },
}

const CHORD_ROOTS = Object.keys(CHORDS)
const CHORD_TYPES = ['major', 'minor']

function App() {
  const [mode, setMode] = useState<GameMode>('explore')
  const [targetNote, setTargetNote] = useState<string | null>(null)
  const [message, setMessage] = useState('Welcome! Tap Start Audio to begin.')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [gameActive, setGameActive] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [lastClicked, setLastClicked] = useState<{s: number, f: number} | null>(null)
  const [foundNotes, setFoundNotes] = useState<Set<string>>(new Set())
  const [activeStrings, setActiveStrings] = useState<Set<number> | undefined>(undefined)
  const [highScore, setHighScore] = useState(0)
  
  // New State
  const [unlockedStrings, setUnlockedStrings] = useState<number>(1)
  const [currentStringScore, setCurrentStringScore] = useState<number>(0)
  const [noteStats, setNoteStats] = useState<Record<string, NoteStats>>({})
  const [fretRange, setFretRange] = useState<FretRange>('full')
  
  // Chord mode state
  const [currentChord, setCurrentChord] = useState<{ root: string; type: string; notes: string[] } | null>(null)
  const [foundChordNotes, setFoundChordNotes] = useState<Set<string>>(new Set())

  useEffect(() => {
    const savedHighScore = localStorage.getItem(`highscore-${mode}`)
    if (savedHighScore) setHighScore(parseInt(savedHighScore))
    else setHighScore(0)

    const savedStats = localStorage.getItem('noteStats')
    if (savedStats) setNoteStats(JSON.parse(savedStats))

    const savedUnlocked = localStorage.getItem('unlockedStrings')
    if (savedUnlocked) setUnlockedStrings(parseInt(savedUnlocked))
  }, [mode])

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem(`highscore-${mode}`, score.toString())
    }
  }, [score, highScore, mode])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (gameActive && (mode === 'survival' || mode === 'vertical' || mode === 'chord') && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameActive(false)
            setMessage(`Time's up! Final Score: ${score}`)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameActive, mode, timeLeft, score])

  const handleStartAudio = async () => {
    await initAudio()
    setAudioReady(true)
    setMessage('Audio enabled. Tap any fret!')
  }

  const startSurvival = () => {
    setMode('survival')
    setActiveStrings(undefined)
    setScore(0)
    setTimeLeft(30)
    setGameActive(true)
    pickNewTarget()
  }

  const startVertical = () => {
    setMode('vertical')
    setActiveStrings(undefined)
    setScore(0)
    setTimeLeft(60)
    setGameActive(true)
    setFoundNotes(new Set())
    pickNewTarget()
  }

  const startStringMaster = () => {
    setMode('stringMaster')
    // Active strings: 0 to unlockedStrings - 1
    const newActive = new Set(Array.from({length: unlockedStrings}, (_, i) => i))
    setActiveStrings(newActive)
    setScore(0)
    setCurrentStringScore(0)
    setGameActive(true)
    pickNewTarget()
    setMessage(`String Master: ${unlockedStrings}/6 unlocked. Get ${MASTERY_THRESHOLD} correct to unlock next!`)
  }

  const startWeakNotes = () => {
    // Calculate weak notes
    const weak = Object.entries(noteStats).filter(([_note, stats]) => {
      const total = stats.correct + stats.wrong
      if (total < 5) return false
      const errorRate = stats.wrong / total
      return errorRate > 0.3
    }).map(([note]) => note)

    if (weak.length === 0) {
      setMessage("Great job! No weak notes detected (need >30% error rate & 5+ attempts). Keep practicing!")
      setMode('explore')
      setGameActive(false)
      return
    }

    setMode('weakNotes')
    setActiveStrings(undefined)
    setScore(0)
    setGameActive(true)
    pickNewTarget(weak)
    setMessage(`Weak Notes Mode: Focusing on ${weak.join(', ')}`)
  }

  const startChord = () => {
    setMode('chord')
    setActiveStrings(undefined)
    setScore(0)
    setTimeLeft(90)
    setGameActive(true)
    setFoundNotes(new Set())
    setFoundChordNotes(new Set())
    pickNewChord()
  }

  const pickNewChord = () => {
    const root = CHORD_ROOTS[Math.floor(Math.random() * CHORD_ROOTS.length)]
    const type = CHORD_TYPES[Math.floor(Math.random() * CHORD_TYPES.length)]
    const notes = CHORDS[root][type]
    setCurrentChord({ root, type, notes })
    setFoundChordNotes(new Set())
    setFoundNotes(new Set())
    setMessage(`Find ${root} ${type}: ${notes.join(', ')} (0/${notes.length})`)
    setLastClicked(null)
  }

  const pickNewTarget = (pool: string[] = NOTES) => {
    const randomNote = pool[Math.floor(Math.random() * pool.length)]
    setTargetNote(randomNote)
    if (mode === 'vertical') {
      setMessage(`Find ALL "${randomNote}" notes! (0 found)`)
      setFoundNotes(new Set())
    } else if (mode !== 'weakNotes' && mode !== 'stringMaster') {
      setMessage(`Find: ${randomNote}`)
    } else if (mode === 'stringMaster') {
       // Keep the progress message if we just started, otherwise show target
       // Actually, better to always show target but maybe include progress in a separate UI element?
       // For now, let's just say "Find X"
       setMessage(`Find: ${randomNote}`)
    } else {
       setMessage(`Find: ${randomNote}`)
    }
    setLastClicked(null)
  }

  const updateNoteStats = (note: string, isCorrect: boolean) => {
    setNoteStats(prev => {
      const current = prev[note] || { correct: 0, wrong: 0 }
      const updated = {
        correct: current.correct + (isCorrect ? 1 : 0),
        wrong: current.wrong + (isCorrect ? 0 : 1)
      }
      const newStats = { ...prev, [note]: updated }
      localStorage.setItem('noteStats', JSON.stringify(newStats))
      return newStats
    })
  }

  const handleFretClick = (stringIndex: number, fret: number) => {
    playNote(stringIndex, fret)
    setLastClicked({s: stringIndex, f: fret})
    const noteName = getNoteName(stringIndex, fret)
    
    // Check range
    const range = FRET_RANGES[fretRange]
    if (fret < range.min || fret > range.max) {
      setMessage(`Stay within frets ${range.min}-${range.max}!`)
      return
    }

    if (mode === 'explore') {
      setMessage(`String ${stringIndex + 1}, Fret ${fret}: ${noteName}`)
      return
    }
    
    if (!gameActive) return

    // Chord mode logic
    if (mode === 'chord' && currentChord) {
      const noteId = `${stringIndex}-${fret}`
      if (currentChord.notes.includes(noteName)) {
        if (!foundChordNotes.has(noteName)) {
          const newFoundNotes = new Set(foundChordNotes).add(noteName)
          setFoundChordNotes(newFoundNotes)
          const newFoundPositions = new Set(foundNotes).add(noteId)
          setFoundNotes(newFoundPositions)
          setScore(s => s + 1)
          
          if (newFoundNotes.size === currentChord.notes.length) {
            setMessage(`Excellent! Completed ${currentChord.root} ${currentChord.type}! Next chord...`)
            setTimeLeft(t => Math.min(t + 5, 120))
            setTimeout(pickNewChord, 1000)
          } else {
            const remaining = currentChord.notes.filter(n => !newFoundNotes.has(n))
            setMessage(`Found ${noteName}! Still need: ${remaining.join(', ')} (${newFoundNotes.size}/${currentChord.notes.length})`)
          }
        } else {
          setMessage(`Already found ${noteName}! Find: ${currentChord.notes.filter(n => !foundChordNotes.has(n)).join(', ')}`)
        }
      } else {
        setMessage(`${noteName} is not in ${currentChord.root} ${currentChord.type}. Find: ${currentChord.notes.filter(n => !foundChordNotes.has(n)).join(', ')}`)
        setTimeLeft(t => Math.max(t - 2, 0))
      }
      return
    }

    // Other modes
    if (!targetNote) return
    
    if (noteName === targetNote) {
      updateNoteStats(targetNote, true)
      
      if (mode === 'vertical') {
        const noteId = `${stringIndex}-${fret}`
        if (!foundNotes.has(noteId)) {
          const newFound = new Set(foundNotes).add(noteId)
          setFoundNotes(newFound)
          setScore(s => s + 1)
          setMessage(`Correct! Found ${newFound.size} "${targetNote}"s`)
          if (newFound.size >= 2) { // Simplified for vertical mode
             // In a real vertical mode we might want to check if ALL are found, but 2 is a good heuristic for now or we need to know how many exist in range
             // Let's keep existing logic: "Found multiple... Next note"
            setMessage(`Great job! Found multiple ${targetNote}s! Next note...`)
            setTimeout(pickNewTarget, 1000)
          }
        } else {
          setMessage(`You already found that one! Find other "${targetNote}"s`)
        }
        return
      }

      // String Master Logic
      if (mode === 'stringMaster') {
        setScore(s => s + 1)
        const newStringScore = currentStringScore + 1
        setCurrentStringScore(newStringScore)
        
        if (newStringScore >= MASTERY_THRESHOLD && unlockedStrings < 6) {
          const newUnlocked = unlockedStrings + 1
          setUnlockedStrings(newUnlocked)
          setCurrentStringScore(0)
          localStorage.setItem('unlockedStrings', newUnlocked.toString())
          
          // Update active strings immediately
          const newActive = new Set(Array.from({length: newUnlocked}, (_, i) => i))
          setActiveStrings(newActive)
          
          setMessage(`🎉 STRING UNLOCKED! You now have ${newUnlocked} strings!`)
          setTimeout(() => pickNewTarget(), 2000)
        } else {
          setMessage(`Correct! ${noteName} found. (${newStringScore}/${MASTERY_THRESHOLD} for next string)`)
          setTimeout(() => pickNewTarget(), 500)
        }
        return
      }

      setMessage(`Correct! It was ${noteName}`)
      setScore(s => s + 1)
      if (mode === 'survival') {
        setTimeLeft(t => Math.min(t + 2, 60))
      }
      
      // Weak Notes: check if we should pick from weak pool again
      if (mode === 'weakNotes') {
         // Recalculate weak notes? No, stick to the session pool? 
         // For simplicity, let's just pick from the same pool we started with?
         // But we didn't save the pool. Let's just pickNewTarget which defaults to all notes if we don't pass a pool.
         // Ah, I need to pass the pool to pickNewTarget.
         // Let's recalculate weak notes on the fly or store the pool.
         // Storing the pool is better. But for now, let's just recalculate.
         const weak = Object.entries(noteStats).filter(([_note, stats]) => {
            const total = stats.correct + stats.wrong
            if (total < 5) return false
            const errorRate = stats.wrong / total
            return errorRate > 0.3
          }).map(([note]) => note)
          
          if (weak.length > 0) {
            setTimeout(() => pickNewTarget(weak), 500)
          } else {
            setMessage("No more weak notes! Switching to random.")
            setTimeout(() => pickNewTarget(NOTES), 500)
          }
      } else {
        setTimeout(pickNewTarget, 500)
      }

    } else {
      updateNoteStats(targetNote, false)
      setMessage(`Wrong! That was ${noteName}. Find ${targetNote}`)
      if (mode === 'survival') {
        setTimeLeft(t => Math.max(t - 3, 0))
      }
      // Reset string master progress on wrong answer? 
      // Requirement says "Get 10 correct on current string set -> unlock next". 
      // Usually "10 correct" means cumulative or streak? "Get 10 correct" implies cumulative in a session or streak.
      // Let's assume cumulative for now to be kind, or maybe reset streak?
      // "Progressive String Unlocking... Get 10 correct... to unlock next"
      // I'll keep it cumulative for now, but maybe reset if they struggle? No, let's just not increment.
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center">
      <div className="flex items-center gap-4 mb-8">
        <Guitar className="w-10 h-10 text-emerald-400" />
        <h1 className="text-3xl font-bold text-white">FretMaster</h1>
      </div>

      <div className="flex flex-col items-center gap-4 mb-8 w-full max-w-4xl">
        {!audioReady && (
          <button
            onClick={handleStartAudio}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-bold shadow-lg transition-all"
          >
            <Volume2 className="w-5 h-5" />
            Enable Audio
          </button>
        )}

        {/* Mode Buttons */}
        <div className="flex flex-wrap justify-center gap-2 bg-slate-800 rounded-2xl p-2 border border-slate-700 w-full">
          <button
            onClick={() => { setMode('explore'); setGameActive(false); setMessage('Explore Mode'); setActiveStrings(undefined); }}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'explore' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Explore
          </button>
          <button
            onClick={startSurvival}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'survival' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Zap className="w-4 h-4" />
            Survival
          </button>
          <button
            onClick={startStringMaster}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'stringMaster' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Focus className="w-4 h-4" />
            String Master
          </button>
          <button
            onClick={startVertical}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'vertical' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Target className="w-4 h-4" />
            Vertical
          </button>
          <button
            onClick={startChord}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'chord' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Music className="w-4 h-4" />
            Chord
          </button>
          <button
            onClick={startWeakNotes}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'weakNotes' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Brain className="w-4 h-4" />
            Weak Notes
          </button>
        </div>

        {/* Fret Range Selector */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-full p-1 border border-slate-700">
          <span className="text-slate-400 text-sm px-3 font-semibold">Range:</span>
          {(Object.keys(FRET_RANGES) as FretRange[]).map((rangeKey) => (
            <button
              key={rangeKey}
              onClick={() => setFretRange(rangeKey)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${fretRange === rangeKey ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {FRET_RANGES[rangeKey].label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl bg-slate-800 rounded-2xl p-6 mb-6 shadow-xl border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-xl font-bold text-white">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Score: {score}
            <span className="text-sm text-slate-400 ml-2">(Best: {highScore})</span>
          </div>
          
          {mode === 'stringMaster' && (
             <div className="flex items-center gap-2 text-white">
               <Lock className="w-4 h-4 text-amber-400" />
               <span className="font-bold text-amber-400">Strings: {unlockedStrings}/6</span>
               <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-amber-500 transition-all duration-500"
                   style={{ width: `${(currentStringScore / MASTERY_THRESHOLD) * 100}%` }}
                 />
               </div>
             </div>
          )}

          {(mode === 'survival' || mode === 'vertical' || mode === 'chord') && gameActive && (
            <div className="flex items-center gap-2 text-xl font-bold text-white">
              <Clock className="w-6 h-6 text-red-400" />
              {timeLeft}s
            </div>
          )}
        </div>

        <div className={`text-center py-4 px-6 rounded-xl mb-4 text-lg font-semibold ${
          message.includes('Correct') || message.includes('Found') || message.includes('Excellent') || message.includes('UNLOCKED') ? 'bg-emerald-900/50 text-emerald-300' :
          message.includes('Wrong') || message.includes('not in') || message.includes('Stay within') ? 'bg-red-900/50 text-red-300' :
          'bg-slate-700 text-white'
        }`}>
          {message}
        </div>

        <Fretboard
          onFretClick={handleFretClick}
          highlightedNote={lastClicked ? { string: lastClicked.s, fret: lastClicked.f } : null}
          foundNotes={(mode === 'vertical' || mode === 'chord') ? foundNotes : undefined}
          activeStrings={activeStrings}
          activeFretRange={FRET_RANGES[fretRange]}
        />
      </div>

      <div className="text-slate-500 text-sm mt-4">
        FretMaster v2.0 - Practice your fretboard daily!
      </div>
    </div>
  )
}

export default App