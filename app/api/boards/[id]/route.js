import { readBoards, writeBoards } from '@/lib/fileStore';

export async function GET(request, { params }) {
  const { id } = await params;
  const boards = readBoards();
  const board = boards.find(b => b.id === id);
  if (!board) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(board);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const boards = readBoards();
  const idx = boards.findIndex(b => b.id === id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  boards[idx] = { ...boards[idx], ...body };
  writeBoards(boards);
  return Response.json(boards[idx]);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const boards = readBoards();
  const filtered = boards.filter(b => b.id !== id);
  writeBoards(filtered);
  return Response.json({ success: true });
}
