'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

const navItems = [
  { href: '/superadmin', label: 'Dashboard', icon: 'grid_view' },
  { href: '/superadmin/tenants', label: 'Kunden', icon: 'people_alt' },
  { href: '/superadmin/shops', label: 'Alle Shops', icon: 'storefront' },
  { href: '/superadmin/settings', label: 'Einstellungen', icon: 'settings' },
]

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('Admin')

  useEffect(() => {
    // TODO: Re-enable auth check before going live
    // checkAuth()

    // DEV MODE: Skip auth check
    setIsSuperadmin(true)
    setUserEmail('dev@terminster.com')
    setUserName('2brands media')
    setIsLoading(false)
  }, [])

  async function checkAuth() {
    try {
      const supabase = createBrowserClient()

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/superadmin')
        return
      }

      setUserEmail(user.email || null)

      // Check if user is superadmin
      const { data: superadmin } = await supabase
        .from('superadmins')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (!superadmin) {
        router.push('/')
        return
      }

      setIsSuperadmin(true)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login?redirect=/superadmin')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-[var(--font-plus-jakarta)]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500">Lade...</span>
        </div>
      </div>
    )
  }

  if (!isSuperadmin) {
    return null
  }

  // Get locale from pathname
  const validLocales = ['de', 'en', 'tr']
  const firstSegment = pathname.split('/')[1]
  const locale = validLocales.includes(firstSegment) ? firstSegment : 'de'
  const linkPrefix = locale === 'de' ? '' : `/${locale}`

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-[var(--font-plus-jakarta)]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-xl"
        >
          <span className="material-icons-round text-slate-700">menu</span>
        </button>
        <div className="flex items-center gap-3 ml-4">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="material-icons-round text-white text-sm">calendar_today</span>
          </div>
          <span className="font-bold tracking-tight">Terminster</span>
          <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Admin</span>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-40 flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
              <span className="material-icons-round text-white">calendar_today</span>
            </div>
            <span className="text-xl font-bold tracking-tight">
              Terminster
              <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-2 uppercase">Admin</span>
            </span>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
              <span className="material-symbols-outlined text-slate-600">account_circle</span>
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-sm truncate">{userName}</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-4">Overview</p>
          {navItems.map((item) => {
            const fullPath = `${linkPrefix}${item.href}`
            const isActive = pathname === fullPath ||
              (item.href !== '/superadmin' && pathname.startsWith(fullPath))

            return (
              <Link
                key={item.href}
                href={fullPath}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                  ${isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50'
                  }
                `}
              >
                <span className="material-icons-round">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="p-6 mt-auto border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full"
          >
            <span className="material-icons-round">logout</span>
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}
