import { readSubjects, writeSubjects } from '@/lib/fileStore';

export async function GET(request, { params }) {
  const { id } = await params;
  const subjects = readSubjects();
  const subject = subjects.find(s => s.id === id);
  if (!subject) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(subject);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const subjects = readSubjects();
  const idx = subjects.findIndex(s => s.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  subjects[idx] = { ...subjects[idx], ...body };
  writeSubjects(subjects);
  return Response.json(subjects[idx]);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const subjects = readSubjects();
  const filtered = subjects.filter(s => s.id !== id);
  writeSubjects(filtered);
  return Response.json({ success: true });
}
