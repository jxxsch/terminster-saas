'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

interface Tenant {
  id: string
  name: string
  slug: string
  primary_color: string
}

interface Shop {
  id: string
  name: string
  slug: string
}

const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Shops: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Store: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Code: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const tenantId = params.tenantId as string

  const [isLoading, setIsLoading] = useState(true)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Get locale
  const validLocales = ['de', 'en', 'tr']
  const firstSegment = pathname.split('/')[1]
  const locale = validLocales.includes(firstSegment) ? firstSegment : 'de'
  const linkPrefix = locale === 'de' ? '' : `/${locale}`

  const navItems = [
    { href: `/tenant/${tenantId}`, label: 'Dashboard', icon: Icons.Dashboard, exact: true },
    { href: `/tenant/${tenantId}/shops`, label: 'Shops', icon: Icons.Shops },
    { href: `/tenant/${tenantId}/users`, label: 'Benutzer', icon: Icons.Users },
    { href: `/tenant/${tenantId}/embed`, label: 'Widget Codes', icon: Icons.Code },
    { href: `/tenant/${tenantId}/settings`, label: 'Einstellungen', icon: Icons.Settings },
  ]

  useEffect(() => {
    if (tenantId) {
      // TODO: Re-enable auth check before going live
      // checkAuthAndLoadTenant()

      // DEV MODE: Skip auth, just load tenant data
      loadTenantData()
    }
  }, [tenantId])

  async function loadTenantData() {
    try {
      const supabase = createBrowserClient()
      setUserEmail('dev@terminster.com')

      // Load tenant data
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (tenantError || !tenantData) {
        console.error('Tenant not found:', tenantError)
        router.push(`${linkPrefix}/`)
        return
      }

      setTenant(tenantData)

      // Load shops
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name, slug')
        .eq('tenant_id', tenantId)
        .order('name')

      setShops(shopsData || [])
    } catch (error) {
      console.error('Failed to load tenant:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function checkAuthAndLoadTenant() {
    try {
      const supabase = createBrowserClient()

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push(`${linkPrefix}/login?redirect=/tenant/${tenantId}`)
        return
      }

      setUserEmail(user?.email || null)

      // Load tenant data
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (tenantError || !tenantData) {
        console.error('Tenant not found:', tenantError)
        router.push(`${linkPrefix}/`)
        return
      }

      setTenant(tenantData)

      // Load shops
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name, slug')
        .eq('tenant_id', tenantId)
        .order('name')

      setShops(shopsData || [])
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push(`${linkPrefix}/login`)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade...</span>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return null
  }

  const primaryColor = tenant.primary_color || '#D4AF37'

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-border z-50 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-zinc-800 rounded-lg"
        >
          <Icons.Menu />
        </button>
        <span className="ml-4 font-semibold" style={{ color: primaryColor }}>{tenant.name}</span>
      </header>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-zinc-900 border-r border-border z-40
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo / Tenant Name */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}
            >
              {tenant.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ color: primaryColor }}>
                {tenant.name}
              </div>
              <div className="text-xs text-muted">Owner Dashboard</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const fullPath = `${linkPrefix}${item.href}`
            const isActive = item.exact
              ? pathname === fullPath
              : pathname.startsWith(fullPath)

            return (
              <Link
                key={item.href}
                href={fullPath}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive
                    ? 'text-white'
                    : 'text-muted hover:bg-zinc-800 hover:text-foreground'
                  }
                `}
                style={isActive ? { backgroundColor: `${primaryColor}33`, color: primaryColor } : {}}
              >
                <item.icon />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Quick Shop Access */}
        {shops.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <div className="text-xs text-muted uppercase tracking-wide px-4 py-2">
              Schnellzugriff Shops
            </div>
            <div className="space-y-1">
              {shops.slice(0, 5).map((shop) => (
                <Link
                  key={shop.id}
                  href={`${linkPrefix}/shop/${shop.id}/calendar`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Icons.Store />
                  <span className="truncate">{shop.name}</span>
                </Link>
              ))}
              {shops.length > 5 && (
                <Link
                  href={`${linkPrefix}/tenant/${tenantId}/shops`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:underline"
                >
                  +{shops.length - 5} weitere
                </Link>
              )}
            </div>
          </div>
        )}

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="text-sm text-muted mb-2 truncate px-2">
            {userEmail}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-muted hover:bg-zinc-800 hover:text-foreground transition-colors"
          >
            <Icons.Logout />
            <span>Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
