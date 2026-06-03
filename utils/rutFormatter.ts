// Formatea mientras el usuario escribe: "209065789" → "20.906.578-9"
export function formatRut(rut: string): string {
  if (!rut) return '';

  // If the input already contains dots or dashes, do not apply auto-formatting.
  // Just clean invalid characters (anything not a digit, k, K, dot, or dash) and keep the user's manual format.
  const hasManualSymbols = /[\.-]/.test(rut);

  if (hasManualSymbols) {
    let cleaned = rut.replace(/[^0-9kK\.-]/g, '').toUpperCase();
    return cleaned;
  }

  // Otherwise, if it's a clean numeric string (only digits and optionally k/K), we auto-format it.
  let cleaned = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  if (cleaned.length < 2) {
    return cleaned;
  }
  
  // Limit to maximum Chilean RUT length: 8 digits + 1 DV
  if (cleaned.length > 9) {
    cleaned = cleaned.slice(0, 9);
  }
  
  // Don't format if length is less than 7 characters
  if (cleaned.length < 7) {
    return cleaned;
  }
  
  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);
  
  // Add dots to body
  let formattedBody = '';
  let count = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    formattedBody = body[i] + formattedBody;
    count++;
    if (count % 3 === 0 && i !== 0) {
      formattedBody = '.' + formattedBody;
    }
  }
  
  return `${formattedBody}-${dv}`;
}

// Limpia el formato para guardar en BD: "20.906.578-9" → "20.906.578-9"
// (mantén el formato con puntos y guión en la BD, ya que así están los seeds)
export function cleanRut(rut: string): string {
  const onlyDigits = rut.replace(/[^0-9kK]/g, '');
  return formatRut(onlyDigits);
}
