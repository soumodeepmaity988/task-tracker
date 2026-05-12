import { readBoards, writeBoards } from '@/lib/fileStore';

export async function GET(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const boards = await readBoards();
  const board = boards.find(b => b.id === id);
  if (!board) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(board);
  } catch (e) {
    console.error("[GET /boards/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "GET /boards/[id]" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const body = await request.json();
  const boards = await readBoards();
  const idx = boards.findIndex(b => b.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  boards[idx] = { ...boards[idx], ...body };
  await writeBoards(boards);
  return Response.json(boards[idx]);
  } catch (e) {
    console.error("[PUT /boards/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "PUT /boards/[id]" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try { // [wrapped]
  const { id } = await params;
  const boards = await readBoards();
  const filtered = boards.filter(b => b.id !== id);
  await writeBoards(filtered);
  return Response.json({ success: true });
  } catch (e) {
    console.error("[DELETE /boards/[id]]", e);
    return Response.json({ error: String(e?.message || e), where: "DELETE /boards/[id]" }, { status: 500 });
  }
}
