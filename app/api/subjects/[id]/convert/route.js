import { readSubjects, readBoards, writeBoards } from '@/lib/fileStore';

export async function POST(request, { params }) {
  const { id } = await params;
  const subjects = readSubjects();
  const subject = subjects.find(s => s.id === id);

  if (!subject) {
    return Response.json({ error: 'Subject not found' }, { status: 404 });
  }

  const boards = readBoards();
  const boardId = `board-${Date.now()}`;

  // Convert topics → tasks, contents → subtasks
  const tasks = (subject.topics || []).map((topic, ti) => ({
    id: `t-${Date.now()}-${ti}`,
    title: topic.title,
    description: '',
    priority: 'medium',
    tags: [subject.name],
    status: 'todo',
    createdAt: Date.now(),
    sourceRef: {
      subjectId: subject.id,
      topicId: topic.id,
    },
    subtasks: (topic.contents || []).map((content, ci) => ({
      id: `st-${Date.now()}-${ti}-${ci}`,
      title: content.title,
      notes: content.notes || '',
      videoUrl: content.videoUrl || '',
      docUrl: content.docUrl || '',
      priority: content.priority || 'medium',
      status: content.status || 'not-started',
      sourceContentId: content.id,
    })),
  }));

  const newBoard = {
    id: boardId,
    name: `${subject.icon} ${subject.name}`,
    createdAt: Date.now(),
    sourceSubjectId: subject.id,
    tasks,
  };

  boards.push(newBoard);
  writeBoards(boards);

  return Response.json(newBoard, { status: 201 });
}
