// app/api/admin/apps/dp-remove/route.ts
import { NextRequest, NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const GITHUB_OWNER = process.env.GITHUB_OWNER!

// middleware.ts estándar del ecosistema — lo que WS commitea en reemplazo del propio
const MIDDLEWARE_ESTANDAR = `// middleware.ts — generado por core-workspace
// No editar a mano. Para cambios, usar el panel de WS.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/auth')

  if (!session && !isAuthRoute) {
    // Redirigir al login del ecosistema (Workspace)
    const wsUrl = process.env.NEXT_PUBLIC_WORKSPACE_URL || 'https://workspace.core.com.uy'
    const loginUrl = new URL('/login', wsUrl)
    loginUrl.searchParams.set('next', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/public).*)'],
}
`

async function ghApi(path: string, method: string, body?: unknown) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res
}

async function getFileSha(repo: string, branch: string, filePath: string): Promise<string | null> {
  const res = await ghApi(
    `/repos/${GITHUB_OWNER}/${repo}/contents/${filePath}?ref=${branch}`,
    'GET'
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.sha || null
}

async function getTreePaths(repo: string, branch: string): Promise<string[]> {
  const res = await ghApi(
    `/repos/${GITHUB_OWNER}/${repo}/git/trees/${branch}?recursive=1`,
    'GET'
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.tree as { path: string; type: string }[])
    .filter(f => f.type === 'blob')
    .map(f => f.path)
}

async function deleteFile(repo: string, branch: string, filePath: string, sha: string, message: string) {
  return ghApi(`/repos/${GITHUB_OWNER}/${repo}/contents/${filePath}`, 'DELETE', {
    message,
    sha,
    branch,
  })
}

async function upsertFile(repo: string, branch: string, filePath: string, content: string, message: string) {
  const sha = await getFileSha(repo, branch, filePath)
  return ghApi(`/repos/${GITHUB_OWNER}/${repo}/contents/${filePath}`, 'PUT', {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  })
}

// Carpetas/archivos que se eliminan al "Quitar DP"
const DP_TO_REMOVE: { path: string; isDir: boolean }[] = [
  { path: 'app/login',            isDir: true },
  { path: 'app/auth/login',       isDir: true },
  { path: 'app/register',         isDir: true },
  { path: 'app/signup',           isDir: true },
  { path: 'app/reset-password',   isDir: true },
  { path: 'app/forgot-password',  isDir: true },
  { path: 'app/reset',            isDir: true },
  { path: 'lib/supabase.ts',      isDir: false },
  { path: 'lib/supabase/index.ts',isDir: false },
  { path: 'utils/supabase.ts',    isDir: false },
  { path: 'lib/theme.ts',         isDir: false },
  { path: 'lib/tokens.ts',        isDir: false },
  { path: 'styles/tokens.css',    isDir: false },
  { path: 'lib/config.ts',        isDir: false },
  { path: 'config/index.ts',      isDir: false },
]

export async function POST(req: NextRequest) {
  const { repo, branch = 'main' } = await req.json()

  if (!repo) return NextResponse.json({ error: 'Falta repo' }, { status: 400 })

  const log: string[] = []
  const errors: string[] = []

  try {
    // 1. Commitear middleware.ts estándar (siempre, pise el propio si existe)
    const mwRes = await upsertFile(
      repo, branch,
      'middleware.ts',
      MIDDLEWARE_ESTANDAR,
      'chore(ws): reemplaza middleware propio por estándar del ecosistema'
    )
    if (mwRes.ok) {
      log.push('✓ middleware.ts estándar commiteado')
    } else {
      const err = await mwRes.json()
      errors.push(`✕ middleware.ts: ${err.message || mwRes.status}`)
    }

    // 2. Eliminar archivos DP detectados
    const allFiles = await getTreePaths(repo, branch)

    for (const dp of DP_TO_REMOVE) {
      if (dp.isDir) {
        // Eliminar todos los archivos dentro de la carpeta
        const dirFiles = allFiles.filter(f => f.startsWith(dp.path + '/'))
        for (const filePath of dirFiles) {
          const sha = await getFileSha(repo, branch, filePath)
          if (!sha) continue
          const res = await deleteFile(
            repo, branch, filePath, sha,
            `chore(ws): elimina DP — ${filePath}`
          )
          if (res.ok) {
            log.push(`✓ eliminado ${filePath}`)
          } else {
            errors.push(`✕ ${filePath}: no se pudo eliminar`)
          }
        }
      } else {
        if (!allFiles.includes(dp.path)) continue
        const sha = await getFileSha(repo, branch, dp.path)
        if (!sha) continue
        const res = await deleteFile(
          repo, branch, dp.path, sha,
          `chore(ws): elimina DP — ${dp.path}`
        )
        if (res.ok) {
          log.push(`✓ eliminado ${dp.path}`)
        } else {
          errors.push(`✕ ${dp.path}: no se pudo eliminar`)
        }
      }
    }

    return NextResponse.json({ ok: true, log, errors })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
