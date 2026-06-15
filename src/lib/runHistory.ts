export type RunHistoryResult = {
  status: string;
  message: string;
};

export function summarizeRun(
  status: string,
  results: RunHistoryResult[],
): string {
  if (status === 'error') {
    const errors = results.filter(result => result.status === 'error');
    if (errors.length > 0) return errors.map(result => result.message).join(' · ');
  }

  const ok = results.filter(result => result.status === 'ok');
  if (ok.length === 0) return results[0]?.message ?? 'No details';
  return ok.map(result => result.message).join(' · ');
}
