/** Sello octagonal "ALTO EN" / "CONTIENE" del Ministerio de Salud de Chile. `size` en px o cualquier unidad CSS. */
export default function SelloOctogonal({ nombre, size }: { nombre: string; size: number | string }) {
  // Separar prefijo ("ALTO EN", "CONTIENE") de la(s) palabra(s) principal(es)
  const words = nombre.toUpperCase().split(' ');
  let prefijo = '';
  let mainWords: string[] = [];
  if (words[0] === 'ALTO' && words[1] === 'EN') {
    prefijo = 'ALTO EN';
    mainWords = words.slice(2);
  } else if (words[0] === 'CONTIENE') {
    prefijo = 'CONTIENE';
    mainWords = words.slice(1);
  } else {
    mainWords = words;
  }

  // Posición Y del texto principal según si hay prefijo y cuántas líneas
  // Con dos palabras (ej. GRASAS SATURADAS) el bloque sube y se achica para no montarse sobre "Ministerio"
  const mainFontSize = mainWords.length === 1 ? 34 : 24;
  const prefijoY = mainWords.length > 1 ? '30%' : '40%';
  const mainBaseY = prefijo ? (mainWords.length === 1 ? 62 : 49) : (mainWords.length === 1 ? 52 : 42);
  const mainStep = mainWords.length === 1 ? 0 : 18;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Octágono negro exterior (path exacto del estándar) */}
      <path d="M58.5 0H141.5L200 58.5V141.5L141.5 200H58.5L0 141.5V58.5L58.5 0Z" fill="black" />

      {/* Doble borde blanco interior */}
      <path d="M61 5H139L195 61V139L139 195H61L5 139V61L61 5Z" stroke="white" strokeWidth="2" />
      <path d="M63 10H137L190 63V137L137 190H63L10 137V63L63 10Z" stroke="white" strokeWidth="1" />

      {prefijo && (
        <text
          x="50%" y={prefijoY}
          dominantBaseline="middle" textAnchor="middle"
          fill="white"
          style={{ font: 'bold 26px Arial, sans-serif', letterSpacing: '1px' }}
        >
          {prefijo}
        </text>
      )}

      {mainWords.map((word, i) => (
        <text
          key={`${word}-${i}`}
          x="50%" y={`${mainBaseY + i * mainStep}%`}
          dominantBaseline="middle" textAnchor="middle"
          fill="white"
          style={{ font: `bold ${mainFontSize}px Arial, sans-serif` }}
        >
          {word}
        </text>
      ))}

      <text x="50%" y="82%" dominantBaseline="middle" textAnchor="middle" fill="white" style={{ font: '12px Arial, sans-serif' }}>Ministerio</text>
      <text x="50%" y="90%" dominantBaseline="middle" textAnchor="middle" fill="white" style={{ font: '12px Arial, sans-serif' }}>de salud</text>
    </svg>
  );
}
