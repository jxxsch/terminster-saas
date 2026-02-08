'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

interface Shop {
  id: string
  name: string
  slug: string
  tenant_id: string
  tenant?: {
    name: string
    primary_color: string
  }
}

const Icons = {
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Team: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Services: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  Back: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const shopId = params.shopId as string

  const [isLoading, setIsLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Get locale
  const validLocales = ['de', 'en', 'tr']
  const firstSegment = pathname.split('/')[1]
  const locale = validLocales.includes(firstSegment) ? firstSegment : 'de'
  const linkPrefix = locale === 'de' ? '' : `/${locale}`

  const navItems = [
    { href: `/shop/${shopId}/calendar`, label: 'Kalender', icon: Icons.Calendar },
    { href: `/shop/${shopId}/team`, label: 'Team', icon: Icons.Team },
    { href: `/shop/${shopId}/services`, label: 'Services', icon: Icons.Services },
    { href: `/shop/${shopId}/hours`, label: 'Öffnungszeiten', icon: Icons.Clock },
    { href: `/shop/${shopId}/settings`, label: 'Einstellungen', icon: Icons.Settings },
  ]

  useEffect(() => {
    if (shopId) {
      checkAuthAndLoadShop()
    }
  }, [shopId])

  async function checkAuthAndLoadShop() {
    try {
      const supabase = createBrowserClient()

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push(`${linkPrefix}/login?redirect=/shop/${shopId}/calendar`)
        return
      }

      setUserEmail(user.email || null)

      // Check user role
      const { data: superadmin } = await supabase
        .from('superadmins')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (superadmin) {
        setUserRole('superadmin')
      } else {
        // Check tenant_users
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('role, shop_ids')
          .eq('user_id', user.id)
          .single()

        if (tenantUser) {
          setUserRole(tenantUser.role)
          // TODO: Check if user has access to this shop
        }
      }

      // Load shop data
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*, tenant:tenants(name, primary_color)')
        .eq('id', shopId)
        .single()

      if (shopError || !shopData) {
        console.error('Shop not found:', shopError)
        router.push(`${linkPrefix}/superadmin/tenants`)
        return
      }

      setShop(shopData)
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
          <span className="text-muted">Lade Shop...</span>
        </div>
      </div>
    )
  }

  if (!shop) {
    return null
  }

  const primaryColor = shop.tenant?.primary_color || '#D4AF37'

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
        <span className="ml-4 font-semibold" style={{ color: primaryColor }}>{shop.name}</span>
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
        {/* Logo / Shop Name */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}
            >
              {shop.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ color: primaryColor }}>
                {shop.name}
              </div>
              <div className="text-xs text-muted truncate">
                {shop.tenant?.name}
              </div>
            </div>
          </div>
        </div>

        {/* Back to Superadmin (if superadmin) */}
        {userRole === 'superadmin' && (
          <div className="px-4 py-3 border-b border-border">
            <Link
              href={`${linkPrefix}/superadmin/tenants`}
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <Icons.Back />
              <span>Zurück zur Übersicht</span>
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const fullPath = `${linkPrefix}${item.href}`
            const isActive = pathname === fullPath || pathname.startsWith(fullPath)

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

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="text-sm text-muted mb-2 truncate px-2">
            {userEmail}
            {userRole && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-800">
                {userRole}
              </span>
            )}
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
