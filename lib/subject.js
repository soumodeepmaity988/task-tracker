// Topic is "done" if it has contents AND all are done.
// "learning" if any content is started but not all are done.
export function topicStatus(topic) {
  const contents = topic.contents || [];
  if (contents.length === 0) return 'not-started';
  const allDone = contents.every(c => c.status === 'done');
  if (allDone) return 'done';
  const anyStarted = contents.some(c => c.status !== 'not-started');
  return anyStarted ? 'learning' : 'not-started';
}

// Unified progress for a subject.
// Returns { topics: {done, total}, contents: {done, total}, pct } where pct is
// based on contents (more granular than topics).
export function subjectProgress(subject) {
  const topics = subject.topics || [];
  const allContents = topics.flatMap(t => t.contents || []);
  const contentsTotal = allContents.length;
  const contentsDone = allContents.filter(c => c.status === 'done').length;
  const topicsTotal = topics.length;
  const topicsDone = topics.filter(t => topicStatus(t) === 'done').length;
  const pct = contentsTotal ? Math.round((contentsDone / contentsTotal) * 100) : 0;
  return {
    topics: { done: topicsDone, total: topicsTotal },
    contents: { done: contentsDone, total: contentsTotal },
    pct,
  };
}
