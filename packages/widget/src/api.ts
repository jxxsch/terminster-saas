// Widget API Client

export interface WidgetApiConfig {
  baseUrl: string
  tenantSlug: string
  shopSlug?: string
}

export interface TenantInfo {
  id: string
  name: string
  slug: string
  primaryColor: string
  logoUrl: string | null
}

export interface Shop {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  timezone?: string
  bundesland?: string
}

export interface Service {
  id: string
  name: string
  price: number
  priceFormatted: string
  duration: number
  durationFormatted: string
}

export interface TeamMember {
  id: string
  name: string
  image: string | null
  freeDay: number | null
}

export interface TimeSlot {
  id: string
  time: string
}

export interface OpeningHours {
  dayOfWeek: number
  dayName: string
  openTime: string
  closeTime: string
  isClosed: boolean
}

export interface BookingResult {
  success: boolean
  appointment?: {
    id: string
    date: string
    time: string
    service: string
    barber: string
    price: string
  }
  message: string
  error?: string
}

export class WidgetApi {
  private baseUrl: string
  private tenantSlug: string
  private shopSlug?: string

  constructor(config: WidgetApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.tenantSlug = config.tenantSlug
    this.shopSlug = config.shopSlug
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api/widget/${this.tenantSlug}${endpoint}`
    const shopParam = this.shopSlug ? `shop=${this.shopSlug}` : ''
    const separator = endpoint.includes('?') ? '&' : '?'
    const finalUrl = shopParam ? `${url}${separator}${shopParam}` : url

    const response = await fetch(finalUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  }

  async getTenantInfo(): Promise<{ tenant: TenantInfo; shops: Shop[]; defaultShop: Shop | null }> {
    return this.fetch('')
  }

  async getServices(): Promise<{ services: Service[] }> {
    return this.fetch('/services')
  }

  async getTeam(): Promise<{ team: TeamMember[] }> {
    return this.fetch('/team')
  }

  async getOpeningHours(): Promise<{
    openingHours: OpeningHours[]
    closedDates: Array<{ date: string; reason: string | null }>
    openSundays: Array<{ date: string; openTime: string; closeTime: string }>
  }> {
    return this.fetch('/hours')
  }

  async getAvailableSlots(barberId: string, date: string): Promise<{ slots: TimeSlot[]; message?: string }> {
    return this.fetch(`/slots?barber=${barberId}&date=${date}`)
  }

  async book(data: {
    serviceId: string
    barberId: string
    date: string
    time: string
    customerName: string
    customerEmail?: string
    customerPhone?: string
  }): Promise<BookingResult> {
    return this.fetch('/book', {
      method: 'POST',
      body: JSON.stringify({
        shop: this.shopSlug,
        ...data,
      }),
    })
  }
}
