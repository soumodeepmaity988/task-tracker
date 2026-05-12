import { readSubjects, writeSubjects } from '@/lib/fileStore';

export async function POST(request) {
  try { // [wrapped]
  const body = await request.json();
  const { subjectId, topicId, contentStatuses } = body;

  if (!subjectId || !topicId || !contentStatuses) {
    return Response.json({ error: 'Missing subjectId, topicId, or contentStatuses' }, { status: 400 });
  }

  const subjects = await readSubjects();
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) {
    return Response.json({ error: 'Subject not found' }, { status: 404 });
  }

  const topic = (subject.topics || []).find(t => t.id === topicId);
  if (!topic) {
    return Response.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Update each content's status based on the map { sourceContentId: newStatus }
  if (topic.contents) {
    topic.contents = topic.contents.map(c => {
      if (contentStatuses[c.id] !== undefined) {
        return { ...c, status: contentStatuses[c.id] };
      }
      return c;
    });
  }

  await writeSubjects(subjects);
  return Response.json({ success: true, topic });
  } catch (e) {
    console.error("[POST /tasks/sync]", e);
    return Response.json({ error: String(e?.message || e), where: "POST /tasks/sync" }, { status: 500 });
  }
}
