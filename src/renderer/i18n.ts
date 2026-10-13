/** Source language is English; German is the first translation. */

const de: Record<string, string> = {
  'Switcher address': 'Mischer-Adresse',
  Connect: 'Verbinden',
  Simulator: 'Simulator',
  Disconnect: 'Trennen',
  Connected: 'Verbunden',
  'Connecting…': 'Verbinde …',
  'Not connected': 'Nicht verbunden',
  SuperSource: 'SuperSource',
  'Key DVE': 'Key-DVE',
  Settings: 'Einstellungen',
  Box: 'Box',
  On: 'An',
  Source: 'Quelle',
  Size: 'Größe',
  Crop: 'Beschnitt',
  Top: 'Oben',
  Bottom: 'Unten',
  Left: 'Links',
  Right: 'Rechts',
  Position: 'Position',
  Rotation: 'Drehung',
  Move: 'Bewegung',
  Duration: 'Dauer',
  Curve: 'Kurve',
  Rate: 'Rate',
  'Ease in': 'Ein',
  'Ease out': 'Aus',
  'Ease in-out': 'Ein-aus',
  Layouts: 'Layouts',
  Presets: 'Presets',
  'Save as preset': 'Als Preset speichern',
  Save: 'Speichern',
  Cut: 'Schnitt',
  Delete: 'Löschen',
  'Preset name': 'Preset-Name',
  'No presets yet. Arrange the boxes and save the layout.':
    'Noch keine Presets. Boxen anordnen und das Layout speichern.',
  Quad: 'Vierer',
  'Side by side': 'Nebeneinander',
  'PiP top right': 'Bild im Bild oben rechts',
  'One plus three': 'Eins plus drei',
  'Fly out': 'Hinausfliegen',
  Keyer: 'Keyer',
  'No keyer with DVE on this switcher.': 'Dieser Mischer hat keinen Keyer mit DVE.',
  'No SuperSource on this switcher.': 'Dieser Mischer hat keine SuperSource.',
  'Connect to a switcher or start the simulator.': 'Mit einem Mischer verbinden oder den Simulator starten.',
  'HTTP control': 'HTTP-Steuerung',
  Port: 'Port',
  Off: 'Aus',
  'Snap to grid (hold Alt to move freely)': 'Am Raster einrasten (Alt gedrückt: frei bewegen)',
  Language: 'Sprache',
  'Drag a box to move it, drag its corner to resize.':
    'Box ziehen zum Verschieben, Ecke ziehen zum Skalieren.',
  'Recall moves the boxes with the curve below. Shift-click cuts.':
    'Abruf bewegt die Boxen mit der Kurve unten. Shift-Klick schneidet hart.',
}

let lang: 'en' | 'de' = navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
try {
  const saved = localStorage.getItem('lang')
  if (saved === 'en' || saved === 'de') lang = saved
} catch {
  // storage unavailable: stay with the system language
}

export const getLang = () => lang
export function setLang(l: 'en' | 'de') {
  lang = l
  try {
    localStorage.setItem('lang', l)
  } catch {
    // ignore
  }
}

export function t(s: string): string {
  return lang === 'de' ? (de[s] ?? s) : s
}

export const deKeys = Object.keys(de)
