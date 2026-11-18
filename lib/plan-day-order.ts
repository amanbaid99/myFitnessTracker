/** Display and edit days in the same groups without changing their stored order. */
export function planDayGroups<T extends { sortOrder: number; isOptional?: boolean }>(days: readonly T[]) {
  const sorted = [...days].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    regular: sorted.filter(day => !day.isOptional),
    optional: sorted.filter(day => day.isOptional),
  };
}
