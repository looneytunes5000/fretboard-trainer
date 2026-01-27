import { useState } from 'react'
import { Fretboard } from './components/Fretboard'
import { getNoteName, NOTES } from './utils/noteLogic'
import { initAudio, playNote } from './utils/audio'
import { Guitar, Volume2, Trophy } from 'lucide-react'

type GameMode = 'explore' | 'quiz'

function App() {
  const [mode, setMode] = useState<GameMode>('explore')
  const [targetNote, setTargetNote] = useState<string | null>(null)
  const [message, setMessage] = useState('Welcome! Tap Start Audio to begin.')
  const [score, setScore] = useState(0)
  const [audioReady, setAudioReady] = useState(false)
  const [lastClicked, setLastClicked] = useState<{s: number, f: number} | null>(null)

  const handleStartAudio = async () => {
    await initAudio()
    setAudioReady(true)
    setMessage('Audio enabled. Tap any fret!')
  }

  const startQuiz = () => {
    setMode('quiz')
    setScore(0)
    pickNewTarget()
  }

  const pickNewTarget = () => {
    const randomNote = NOTES[Math.floor(Math.random() * NOTES.length)]
    setTargetNote(randomNote)
    setMessage(`Find: ${randomNote}`)
    setLastClicked(null)
  }

  const handleFretClick = (stringIndex: number, fret: number) => {
    // Play sound always
    playNote(stringIndex, fret)
    setLastClicked({s: stringIndex, f: fret})

    const noteName = getNoteName(stringIndex, fret)

    if (mode === 'explore') {
      setMessage(`String ${stringIndex + 1}, Fret ${fret}: ${noteName}`)
    } else if (mode === 'quiz' && targetNote) {
      if (noteName === targetNote) {
        setMessage(`Correct! It was ${noteName}`)
        setScore(s => s + 1)
        setTimeout(pickNewTarget, 1000)
      } else {
        setMessage(`Wrong! That was ${noteName}. Find ${targetNote}`)
        // Optional: decrease score?
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

        <div className="flex bg-slate-800 rounded-full p-1 border border-slate-700">
          <button
            onClick={() => setMode('explore')}
            className={`px-6 py-2 rounded-full transition-all ${mode === 'explore' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Explore
          </button>
          <button
            onClick={startQuiz}
            className={`px-6 py-2 rounded-full transition-all ${mode === 'quiz' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Quiz
          </button>
        </div>
      </div>

      {/* Game Status */}
      <div className="bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-2xl mb-8 text-center border border-slate-700">
        <div className="text-2xl font-bold mb-2 text-indigo-300">
          {message}
        </div>
        {mode === 'quiz' && (
          <div className="flex items-center justify-center gap-2 text-slate-400 mt-4">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span>Score: {score}</span>
          </div>
        )}
      </div>

      {/* The Fretboard */}
      <Fretboard 
        showNotes={mode === 'explore' || lastClicked !== null} // Show notes in explore or momentarily after click
        onFretClick={handleFretClick}
        highlightedNote={lastClicked ? {string: lastClicked.s, fret: lastClicked.f} : null}
      />

      <div className="mt-8 text-slate-500 text-sm">
        Tip: Install this app on your phone for the best experience!
      </div>
    </div>
  )
}

export default App
