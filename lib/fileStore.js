import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');
const SUBJECTS_FILE = path.join(DATA_DIR, 'subjects.json');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function readBoards() {
  ensureDir();
  if (!existsSync(BOARDS_FILE)) { writeFileSync(BOARDS_FILE, '[]'); return []; }
  return JSON.parse(readFileSync(BOARDS_FILE, 'utf-8'));
}

export function writeBoards(data) {
  ensureDir();
  writeFileSync(BOARDS_FILE, JSON.stringify(data, null, 2));
}

export function readSubjects() {
  ensureDir();
  if (!existsSync(SUBJECTS_FILE)) { writeFileSync(SUBJECTS_FILE, '[]'); return []; }
  return JSON.parse(readFileSync(SUBJECTS_FILE, 'utf-8'));
}

export function writeSubjects(data) {
  ensureDir();
  writeFileSync(SUBJECTS_FILE, JSON.stringify(data, null, 2));
}
