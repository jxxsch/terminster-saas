'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

interface Shop {
  id: string
  name: string
  slug: string
  primary_color: string
}

interface BarberInfo {
  id: string
  name: string
  image: string | null
}

const Icons = {
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Profile: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
}

export default function BarberLayout({
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
  const [barber, setBarber] = useState<BarberInfo | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Get locale
  const validLocales = ['de', 'en', 'tr']
  const firstSegment = pathname.split('/')[1]
  const locale = validLocales.includes(firstSegment) ? firstSegment : 'de'
  const linkPrefix = locale === 'de' ? '' : `/${locale}`

  const navItems = [
    { href: `/barber/${shopId}`, label: 'Mein Kalender', icon: Icons.Calendar, exact: true },
    { href: `/barber/${shopId}/profile`, label: 'Mein Profil', icon: Icons.Profile },
  ]

  useEffect(() => {
    if (shopId) {
      checkAuthAndLoadData()
    }
  }, [shopId])

  async function checkAuthAndLoadData() {
    try {
      const supabase = createBrowserClient()

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push(`${linkPrefix}/login?redirect=/barber/${shopId}`)
        return
      }

      setUserEmail(user.email || null)

      // Load shop data
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('id, name, slug, tenant:tenants(primary_color)')
        .eq('id', shopId)
        .single() as { data: { id: string; name: string; slug: string; tenant: { primary_color: string } | null } | null; error: unknown }

      if (shopError || !shopData) {
        console.error('Shop not found:', shopError)
        router.push(`${linkPrefix}/`)
        return
      }

      const tenantData = shopData.tenant
      setShop({
        id: shopData.id,
        name: shopData.name,
        slug: shopData.slug,
        primary_color: tenantData?.primary_color || '#D4AF37',
      })

      // Check if user is a barber in this shop
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('role, shop_ids')
        .eq('user_id', user.id)
        .single()

      if (!tenantUser) {
        console.error('User not found in tenant_users')
        router.push(`${linkPrefix}/`)
        return
      }

      // Find barber record linked to this user
      // For now, we'll try to match by email or look for a linked barber
      const { data: barberData } = await supabase
        .from('team')
        .select('id, name, image')
        .eq('shop_id', shopId)
        .eq('email', user.email || '')
        .single() as { data: BarberInfo | null; error: unknown }

      if (barberData) {
        setBarber(barberData)
      } else {
        // If no direct email match, show first barber (for demo purposes)
        // In production, this should be properly linked
        const { data: anyBarber } = await supabase
          .from('team')
          .select('id, name, image')
          .eq('shop_id', shopId)
          .eq('active', true)
          .limit(1)
          .single() as { data: BarberInfo | null; error: unknown }

        if (anyBarber) {
          setBarber(anyBarber)
        }
      }
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

  if (!shop) {
    return null
  }

  const primaryColor = shop.primary_color || '#D4AF37'

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
        <span className="ml-4 font-semibold" style={{ color: primaryColor }}>
          {barber?.name || 'Barber'}
        </span>
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
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {barber?.image ? (
              <img
                src={barber.image}
                alt={barber.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}
              >
                {barber?.name?.charAt(0) || 'B'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ color: primaryColor }}>
                {barber?.name || 'Barber'}
              </div>
              <div className="text-xs text-muted truncate">{shop.name}</div>
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
