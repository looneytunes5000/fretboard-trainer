import * as Tone from 'tone';

let synth: Tone.PolySynth | null = null;

export const initAudio = async () => {
  if (synth) return;
  
  await Tone.start();
  
  // Create a synth that sounds somewhat like a guitar
  // Using a simple AMSynth or FMSynth with short decay
  synth = new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 3,
    detune: 0,
    oscillator: {
      type: "sine"
    },
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.1,
      release: 1.2
    },
    modulation: {
      type: "square"
    },
    modulationEnvelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0,
      release: 0.5
    }
  }).toDestination();
  
  synth.volume.value = -5; // Lower volume a bit
};

export const playNote = (stringIndex: number, fret: number) => {
  if (!synth) initAudio();
  
  // Calculate frequency or note name
  // Open strings (0-5 -> E4, B3, G3, D3, A2, E2)
  // We need to map stringIndex (0=High E, 5=Low E) to scientific pitch notation
  
  const basePitches = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
  const basePitch = basePitches[stringIndex];
  
  // Tone.js can transpose notes
  const note = Tone.Frequency(basePitch).transpose(fret);
  
  synth?.triggerAttackRelease(note.toNote(), "8n");
};
