import { NextResponse } from 'next/server'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-dynamic'

const DATA_DIR = path.join(process.cwd(), 'data', 'sessions')
const cleanToken = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120)
const fileFor = (token: string) => path.join(DATA_DIR, `${cleanToken(token)}.json`)

async function readSession(token: string) {
  try {
    const raw = await readFile(fileFor(token), 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ content: {} })
  return NextResponse.json({ content: await readSession(token) })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.token || typeof body.token !== 'string') return NextResponse.json({ error: 'token required' }, { status: 400 })
    if (!body.content || typeof body.content !== 'object') return NextResponse.json({ error: 'content required' }, { status: 400 })
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(fileFor(body.token), JSON.stringify(body.content, null, 2), 'utf8')
    return NextResponse.json({ ok: true, persistent: true })
  } catch {
    return NextResponse.json({ error: 'could not persist content' }, { status: 500 })
  }
}
