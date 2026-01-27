import { useState, useEffect } from 'react'
import { Fretboard } from './components/Fretboard'
import { getNoteName, NOTES } from './utils/noteLogic'
import { initAudio, playNote } from './utils/audio'
import { Guitar, Volume2, Trophy, Clock, Zap, Target, Focus, Music } from 'lucide-react'

type GameMode = 'explore' | 'quiz' | 'survival' | 'vertical' | 'beagle' | 'chord'

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
  
  // Chord mode state
  const [currentChord, setCurrentChord] = useState<{ root: string; type: string; notes: string[] } | null>(null)
  const [foundChordNotes, setFoundChordNotes] = useState<Set<string>>(new Set()) // which note names found (e.g., "C", "E", "G")

  useEffect(() => {
    const saved = localStorage.getItem(`highscore-${mode}`)
    if (saved) setHighScore(parseInt(saved))
    else setHighScore(0)
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

  const startQuiz = () => {
    setMode('quiz')
    setActiveStrings(undefined)
    setScore(0)
    setGameActive(true)
    pickNewTarget()
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

  const startBeagle = () => {
    setMode('beagle')
    const randomString = Math.floor(Math.random() * 6)
    setActiveStrings(new Set([randomString]))
    setScore(0)
    setGameActive(true)
    pickNewTarget()
    setMessage(`Focus! Find notes ONLY on String ${randomString + 1}`)
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

  const pickNewTarget = () => {
    const randomNote = NOTES[Math.floor(Math.random() * NOTES.length)]
    setTargetNote(randomNote)
    if (mode === 'vertical') {
      setMessage(`Find ALL "${randomNote}" notes! (0 found)`)
      setFoundNotes(new Set())
    } else {
      setMessage(`Find: ${randomNote}`)
    }
    setLastClicked(null)
  }

  const handleFretClick = (stringIndex: number, fret: number) => {
    playNote(stringIndex, fret)
    setLastClicked({s: stringIndex, f: fret})
    const noteName = getNoteName(stringIndex, fret)
    
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
            setTimeLeft(t => Math.min(t + 5, 120)) // Bonus time for completing chord
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
        setTimeLeft(t => Math.max(t - 2, 0)) // Penalty for wrong note
      }
      return
    }

    // Other modes
    if (!targetNote) return
    
    if (noteName === targetNote) {
      if (mode === 'vertical') {
        const noteId = `${stringIndex}-${fret}`
        if (!foundNotes.has(noteId)) {
          const newFound = new Set(foundNotes).add(noteId)
          setFoundNotes(newFound)
          setScore(s => s + 1)
          setMessage(`Correct! Found ${newFound.size} "${targetNote}"s`)
          if (newFound.size >= 2) {
            setMessage(`Great job! Found multiple ${targetNote}s! Next note...`)
            setTimeout(pickNewTarget, 1000)
          }
        } else {
          setMessage(`You already found that one! Find other "${targetNote}"s`)
        }
        return
      }
      setMessage(`Correct! It was ${noteName}`)
      setScore(s => s + 1)
      if (mode === 'survival') {
        setTimeLeft(t => Math.min(t + 2, 60))
      }
      setTimeout(pickNewTarget, 500)
    } else {
      setMessage(`Wrong! That was ${noteName}. Find ${targetNote}`)
      if (mode === 'survival') {
        setTimeLeft(t => Math.max(t - 3, 0))
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center">
      <div className="flex items-center gap-4 mb-8">
        <Guitar className="w-10 h-10 text-emerald-400" />
        <h1 className="text-3xl font-bold text-white">FretMaster</h1>
      </div>

      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        {!audioReady && (
          <button
            onClick={handleStartAudio}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-bold shadow-lg transition-all"
          >
            <Volume2 className="w-5 h-5" />
            Enable Audio
          </button>
        )}

        <div className="flex bg-slate-800 rounded-full p-1 border border-slate-700 overflow-x-auto max-w-[90vw]">
          <button
            onClick={() => { setMode('explore'); setGameActive(false); setMessage('Explore Mode'); setActiveStrings(undefined); }}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'explore' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Explore
          </button>
          <button
            onClick={startQuiz}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'quiz' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Quiz
          </button>
          <button
            onClick={startSurvival}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'survival' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Zap className="w-4 h-4" />
            Survival
          </button>
          <button
            onClick={startVertical}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'vertical' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Target className="w-4 h-4" />
            Vertical
          </button>
          <button
            onClick={startBeagle}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'beagle' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Focus className="w-4 h-4" />
            Beagle
          </button>
          <button
            onClick={startChord}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'chord' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Music className="w-4 h-4" />
            Chord
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-slate-800 rounded-2xl p-6 mb-6 shadow-xl border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-xl font-bold text-white">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Score: {score}
            <span className="text-sm text-slate-400 ml-2">(Best: {highScore})</span>
          </div>
          {(mode === 'survival' || mode === 'vertical' || mode === 'chord') && gameActive && (
            <div className="flex items-center gap-2 text-xl font-bold text-white">
              <Clock className="w-6 h-6 text-red-400" />
              {timeLeft}s
            </div>
          )}
        </div>

        <div className={`text-center py-4 px-6 rounded-xl mb-4 text-lg font-semibold ${
          message.includes('Correct') || message.includes('Found') || message.includes('Excellent') ? 'bg-emerald-900/50 text-emerald-300' :
          message.includes('Wrong') || message.includes('not in') ? 'bg-red-900/50 text-red-300' :
          'bg-slate-700 text-white'
        }`}>
          {message}
        </div>

        <Fretboard
          onFretClick={handleFretClick}
          highlightedNote={lastClicked ? { string: lastClicked.s, fret: lastClicked.f } : null}
          foundNotes={(mode === 'vertical' || mode === 'chord') ? foundNotes : undefined}
          activeStrings={activeStrings}
        />
      </div>

      <div className="text-slate-500 text-sm mt-4">
        FretMaster v1.3 - Practice your fretboard daily!
      </div>
    </div>
  )
}

export default App
