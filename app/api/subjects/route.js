import { readSubjects, writeSubjects } from '@/lib/fileStore';

export async function GET() {
  try { // [wrapped]
  const subjects = await readSubjects();
  return Response.json(subjects);
  } catch (e) {
    console.error("[GET /subjects]", e);
    return Response.json({ error: String(e?.message || e), where: "GET /subjects" }, { status: 500 });
  }
}

export async function POST(request) {
  try { // [wrapped]
  const body = await request.json();
  const subjects = await readSubjects();
  const newSubject = {
    id: `s-${Date.now()}`,
    name: body.name || 'Untitled Subject',
    icon: body.icon || '📚',
    color: body.color || '#4f8ef7',
    description: body.description || '',
    createdAt: Date.now(),
    topics: body.topics || [],
  };
  subjects.push(newSubject);
  await writeSubjects(subjects);
  return Response.json(newSubject, { status: 201 });
  } catch (e) {
    console.error("[POST /subjects]", e);
    return Response.json({ error: String(e?.message || e), where: "POST /subjects" }, { status: 500 });
  }
}
