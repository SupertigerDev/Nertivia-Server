// remove duplicates from string array
export default function removeDuplicatesFromArray(values: string[]): string[] {
  return [...new Set(values)];
}