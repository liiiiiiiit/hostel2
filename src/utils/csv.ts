/** Quote every cell and prevent user-controlled text becoming a spreadsheet formula. */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  return rows.map(row => row.map(value => {
    let text = String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}
