import { fmtDateShort } from './dateUtils';

export function downloadText(filename, contents, mime = 'text/markdown') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

export function exportBoardToMarkdown(board) {
  const lines = [];
  lines.push(`# ${board.name}`);
  lines.push('');
  lines.push(`_${(board.tasks || []).length} tasks · ${(board.tasks || []).filter(t => t.status === 'done').length} done_`);
  lines.push('');

  const sprintMap = Object.fromEntries((board.sprints || []).map(s => [s.id, s]));
  const groups = {};
  (board.tasks || []).forEach(t => {
    const key = t.sprintId ? (sprintMap[t.sprintId]?.name || 'Unknown Sprint') : 'No Sprint';
    (groups[key] ||= []).push(t);
  });

  Object.entries(groups).forEach(([groupName, tasks]) => {
    lines.push(`## ${groupName}`);
    lines.push('');
    ['todo', 'in-progress', 'backlog', 'done'].forEach(status => {
      const inStatus = tasks.filter(t => (t.status || 'todo') === status);
      if (!inStatus.length) return;
      const label = status === 'todo' ? 'To Do' : status === 'in-progress' ? 'In Progress' : status === 'done' ? 'Done' : 'Backlog';
      lines.push(`### ${label}`);
      inStatus.forEach(t => {
        const meta = [];
        if (t.priority) meta.push(`priority: ${t.priority}`);
        if (t.dueDate) meta.push(`due: ${fmtDateShort(t.dueDate)}`);
        if (t.recurring) meta.push(`repeat: ${t.recurring}`);
        if (t.timeEstimate) meta.push(`est: ${t.timeEstimate}m`);
        const tags = (t.tags || []).map(x => `#${x}`).join(' ');
        const checkbox = t.status === 'done' ? 'x' : ' ';
        lines.push(`- [${checkbox}] **${t.title}**${tags ? ' ' + tags : ''}${meta.length ? ` _(${meta.join(' · ')})_` : ''}`);
        if (t.description) lines.push(`  ${t.description.replace(/\n/g, '\n  ')}`);
        (t.subtasks || []).forEach(st => {
          const cb = st.status === 'done' ? 'x' : ' ';
          lines.push(`  - [${cb}] ${st.title}`);
        });
      });
      lines.push('');
    });
  });

  return lines.join('\n');
}

export function exportSubjectToMarkdown(subject) {
  const lines = [];
  lines.push(`# ${subject.icon || '📚'} ${subject.name}`);
  if (subject.description) lines.push(`\n${subject.description}\n`);
  (subject.topics || []).forEach(topic => {
    lines.push(`## ${topic.title}`);
    (topic.contents || []).forEach(c => {
      const cb = c.status === 'done' ? 'x' : c.status === 'learning' ? '~' : ' ';
      const links = [];
      if (c.videoUrl) links.push(`[🎬](${c.videoUrl})`);
      if (c.docUrl) links.push(`[📄](${c.docUrl})`);
      lines.push(`- [${cb}] ${c.title} ${links.join(' ')}`);
      if (c.notes) lines.push(`  ${c.notes.replace(/\n/g, '\n  ')}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}
