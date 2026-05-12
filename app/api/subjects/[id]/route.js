import { readSubjects, writeSubjects } from '@/lib/fileStore';

export async function GET(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const subjects = await readSubjects();
  const subject = subjects.find(s => s.id === id);
  if (!subject) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(subject);
  } catch (e) {
    console.error("[GET /subjects/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "GET /subjects/[id]" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const body = await request.json();
  const subjects = await readSubjects();
  const idx = subjects.findIndex(s => s.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  subjects[idx] = { ...subjects[idx], ...body };
  await writeSubjects(subjects);
  return Response.json(subjects[idx]);
  } catch (e) {
    console.error("[PUT /subjects/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "PUT /subjects/[id]" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const subjects = await readSubjects();
  const filtered = subjects.filter(s => s.id !== id);
  await writeSubjects(filtered);
  return Response.json({ success: true });
  } catch (e) {
    console.error("[DELETE /subjects/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "DELETE /subjects/[id]" }, { status: 500 });
  }
}
