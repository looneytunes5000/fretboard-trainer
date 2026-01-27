import { useState, useEffect } from 'react'
import { Fretboard } from './components/Fretboard'
import { getNoteName, NOTES } from './utils/noteLogic'
import { initAudio, playNote } from './utils/audio'
import { Guitar, Volume2, Trophy, Clock, Zap, Target, Focus } from 'lucide-react'

type GameMode = 'explore' | 'quiz' | 'survival' | 'vertical' | 'beagle'

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

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem(`highscore-${mode}`)
    if (saved) setHighScore(parseInt(saved))
    else setHighScore(0)
  }, [mode])

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem(`highscore-${mode}`, score.toString())
    }
  }, [score, highScore, mode])

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameActive && (mode === 'survival' || mode === 'vertical') && timeLeft > 0) {
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

    if (!gameActive || !targetNote) return

    if (noteName === targetNote) {
      // Logic for Vertical Mode (Find All)
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

      // Logic for Quiz/Survival/Beagle
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
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Guitar className="w-10 h-10 text-emerald-400" />
        <h1 className="text-3xl font-bold text-white">FretMaster</h1>
      </div>

      {/* Controls */}
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
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'vertical' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Target className="w-4 h-4" />
            Vertical
          </button>
          <button
            onClick={startBeagle}
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all whitespace-nowrap ${mode === 'beagle' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Focus className="w-4 h-4" />
            Beagle
          </button>
        </div>
      </div>

      {/* Game Status */}
      <div className="bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-2xl mb-8 text-center border border-slate-700 relative overflow-hidden">
        {(mode === 'survival' || mode === 'vertical') && (
          <div className="absolute top-0 left-0 h-1 bg-red-600 transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%` }} />
        )}
        
        <div className="text-2xl font-bold mb-2 text-indigo-300">
          {message}
        </div>
        
        {mode !== 'explore' && (
          <div className="flex items-center justify-center gap-6 text-slate-400 mt-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Score: {score}</span>
              <span className="text-xs text-slate-600 ml-1">(Best: {highScore})</span>
            </div>
            {(mode === 'survival' || mode === 'vertical') && (
              <div className={`flex items-center gap-2 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : ''}`}>
                <Clock className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The Fretboard */}
      <Fretboard 
        showNotes={mode === 'explore' || lastClicked !== null} 
        foundNotes={foundNotes}
        onFretClick={handleFretClick}
        activeStrings={activeStrings}
        highlightedNote={lastClicked ? {string: lastClicked.s, fret: lastClicked.f} : null}
      />

      <div className="mt-8 text-slate-500 text-sm">
        {mode === 'vertical' ? 'Find ALL instances of the note!' : 
         mode === 'beagle' ? 'Focus only on the highlighted string!' :
         'Tip: Survival mode adds time for correct answers!'}
      </div>
    </div>
  )
}

export default App
