export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard tuning: High E (str 1) to Low E (str 6)
// Offsets from C (where C=0). E is 4 semitones from C.
// String 1 (High E): E4
// String 2 (B): B3
// String 3 (G): G3
// String 4 (D): D3
// String 5 (A): A2
// String 6 (Low E): E2

// We define open strings by their note index in the NOTES array relative to C.
// But easier: define them by semitone distance from a base.
// Let's just hardcode the note index for the open string.
// E = 4
// A = 9
// D = 2
// G = 7
// B = 11

export const OPEN_STRING_NOTES = [
  4,  // String 1: E
  11, // String 2: B
  7,  // String 3: G
  2,  // String 4: D
  9,  // String 5: A
  4   // String 6: E
];

export const getNoteName = (stringIndex: number, fret: number) => {
  // stringIndex 0 = High E (String 1)
  // stringIndex 5 = Low E (String 6)
  
  const openNote = OPEN_STRING_NOTES[stringIndex];
  const noteIndex = (openNote + fret) % 12;
  return NOTES[noteIndex];
};

export const isMarkedFret = (fret: number) => {
  return [3, 5, 7, 9, 12, 15, 17, 19, 21, 24].includes(fret);
};
