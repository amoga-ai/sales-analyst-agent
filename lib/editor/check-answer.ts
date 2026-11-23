// Checks that every number in an AI answer also appears in the report data. Returns the numbers that do not.
export function unsupportedNumbers(answer: string, reportData: string): string[] {
  const inData = new Set(reportData.match(/\d+(\.\d+)?/g) ?? []);
  const found = answer.match(/\d+(\.\d+)?/g) ?? [];
  return [...new Set(found.filter((n) => !inData.has(n)))];
}