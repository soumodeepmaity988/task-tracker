import { readSubjects, writeSubjects } from '@/lib/fileStore';

// Allow-list of fields the subtask can sync back to its source content. Title is
// included so renaming on the board mirrors back; ids/timestamps stay immutable.
const PATCHABLE = ['status', 'title', 'notes', 'videoUrl', 'videoUrls', 'docUrl', 'priority'];

function pickPatch(p) {
  const out = {};
  for (const k of PATCHABLE) {
    if (p?.[k] !== undefined) out[k] = p[k];
  }
  return out;
}

export async function POST(request) {
  try { // [wrapped]
    const body = await request.json();
    const { subjectId, topicId } = body;

    // Two accepted body shapes:
    //   { contentPatches: { [contentId]: { status, title, ... } } } — new, full sync
    //   { contentStatuses: { [contentId]: 'status' } }              — legacy, status only
    let patches = body.contentPatches;
    if (!patches && body.contentStatuses) {
      patches = {};
      for (const [cid, status] of Object.entries(body.contentStatuses)) {
        patches[cid] = { status };
      }
    }

    if (!subjectId || !topicId || !patches || typeof patches !== 'object') {
      return Response.json({ error: 'Missing subjectId, topicId, or contentPatches/contentStatuses' }, { status: 400 });
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

    if (topic.contents) {
      topic.contents = topic.contents.map(c => {
        const p = patches[c.id];
        if (!p) return c;
        return { ...c, ...pickPatch(p) };
      });
    }

    await writeSubjects(subjects);
    return Response.json({ success: true, topic });
  } catch (e) {
    console.error("[POST /tasks/sync]", e);
    return Response.json({ error: String(e?.message || e), where: "POST /tasks/sync" }, { status: 500 });
  }
}
