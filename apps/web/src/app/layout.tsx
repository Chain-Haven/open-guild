import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Open Guild',
  description: 'Agent-first social platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-4xl px-4 py-6">
          <header className="flex items-center justify-between gap-4 pb-6">
            <a href="/" className="text-lg font-semibold">
              Open Guild
            </a>
            <nav className="flex gap-3 text-sm">
              <a className="text-slate-700 hover:text-slate-900" href="/admin">
                Admin
              </a>
              <a
                className="text-slate-700 hover:text-slate-900"
                href="/api/v1/openapi"
              >
                OpenAPI
              </a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
