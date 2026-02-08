import { useState, useEffect, useMemo, useCallback } from 'react'
import { WidgetApi, Service, TeamMember, TimeSlot, OpeningHours, Shop } from './api'
import { createStyles, globalStyles, Theme } from './styles'
import { t, getDayNames, Locale } from './translations'

export interface WidgetConfig {
  tenant_slug: string
  shop_slug?: string
  api_url?: string
  theme?: Theme
  primary_color?: string
  locale?: Locale
  show_header?: boolean
  show_shop_selector?: boolean
  allow_any_barber?: boolean
  on_success?: (appointment: unknown) => void
  on_error?: (error: Error) => void
}

interface BookingWidgetProps {
  config: WidgetConfig
}

type BookingStep = 'shop' | 'service' | 'barber' | 'date' | 'time' | 'details' | 'success'

interface BookingData {
  shop: Shop | null
  service: Service | null
  barber: TeamMember | null
  anyBarber: boolean
  date: string | null
  time: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
}

interface BookingResult {
  id: string
  date: string
  time: string
  service: string
  barber: string
  price: string
}

export function BookingWidget({ config }: BookingWidgetProps) {
  const locale = (config.locale || 'de') as Locale
  const theme = config.theme || 'dark'
  const allowAnyBarber = config.allow_any_barber !== false

  const [step, setStep] = useState<BookingStep>('service')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data from API
  const [shops, setShops] = useState<Shop[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<TeamMember[]>([])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([])
  const [closedDates, setClosedDates] = useState<string[]>([])
  const [openSundays, setOpenSundays] = useState<string[]>([])
  const [primaryColor, setPrimaryColor] = useState(config.primary_color || '#D4AF37')

  // Booking state
  const [booking, setBooking] = useState<BookingData>({
    shop: null,
    service: null,
    barber: null,
    anyBarber: false,
    date: null,
    time: null,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  })

  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  // Styles
  const styles = useMemo(() => createStyles(primaryColor, theme), [primaryColor, theme])

  // API Client
  const api = useMemo(
    () =>
      new WidgetApi({
        baseUrl: config.api_url || window.location.origin,
        tenantSlug: config.tenant_slug,
        shopSlug: booking.shop?.slug || config.shop_slug,
      }),
    [config.api_url, config.tenant_slug, config.shop_slug, booking.shop?.slug]
  )

  // Inject global styles
  useEffect(() => {
    const styleId = 'terminster-widget-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = globalStyles
      document.head.appendChild(style)
    }
  }, [])

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        const tenantRes = await api.getTenantInfo()

        // Set primary color from tenant
        if (tenantRes.tenant.primaryColor && !config.primary_color) {
          setPrimaryColor(tenantRes.tenant.primaryColor)
        }

        setShops(tenantRes.shops)

        // If multiple shops and no shop specified, show shop selector
        if (tenantRes.shops.length > 1 && !config.shop_slug && config.show_shop_selector !== false) {
          setStep('shop')
          setIsLoading(false)
          return
        }

        // Auto-select shop
        const selectedShop = config.shop_slug
          ? tenantRes.shops.find((s) => s.slug === config.shop_slug) || tenantRes.defaultShop
          : tenantRes.defaultShop

        if (selectedShop) {
          setBooking((prev) => ({ ...prev, shop: selectedShop }))
          await loadShopData(selectedShop)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : t(locale, 'error.loading')
        setError(errorMsg)
        config.on_error?.(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [config.tenant_slug])

  // Load shop-specific data
  const loadShopData = useCallback(
    async (shop: Shop) => {
      try {
        const shopApi = new WidgetApi({
          baseUrl: config.api_url || window.location.origin,
          tenantSlug: config.tenant_slug,
          shopSlug: shop.slug,
        })

        const [servicesRes, teamRes, hoursRes] = await Promise.all([
          shopApi.getServices(),
          shopApi.getTeam(),
          shopApi.getOpeningHours(),
        ])

        setServices(servicesRes.services)
        setBarbers(teamRes.team)
        setOpeningHours(hoursRes.openingHours)
        setClosedDates(hoursRes.closedDates.map((d) => d.date))
        setOpenSundays(hoursRes.openSundays.map((d) => d.date))
      } catch (err) {
        console.error('Failed to load shop data:', err)
      }
    },
    [config.api_url, config.tenant_slug]
  )

  // Load available slots when barber and date are selected
  useEffect(() => {
    async function loadSlots() {
      if (!booking.date || !booking.shop) return
      if (!booking.barber && !booking.anyBarber) return

      try {
        setSlots([])

        if (booking.anyBarber) {
          // Get slots for all barbers and find first available
          const allSlots: TimeSlot[] = []
          for (const barber of barbers) {
            const res = await api.getAvailableSlots(barber.id, booking.date)
            res.slots.forEach((slot) => {
              if (!allSlots.find((s) => s.time === slot.time)) {
                allSlots.push(slot)
              }
            })
          }
          // Sort by time
          allSlots.sort((a, b) => a.time.localeCompare(b.time))
          setSlots(allSlots)
        } else if (booking.barber) {
          const res = await api.getAvailableSlots(booking.barber.id, booking.date)
          setSlots(res.slots)
        }
      } catch (err) {
        console.error('Failed to load slots:', err)
        setSlots([])
      }
    }

    loadSlots()
  }, [api, booking.barber, booking.anyBarber, booking.date, booking.shop, barbers])

  // Find available barber for "any barber" option
  const findAvailableBarber = useCallback(
    async (date: string, time: string): Promise<TeamMember | null> => {
      for (const barber of barbers) {
        try {
          const res = await api.getAvailableSlots(barber.id, date)
          if (res.slots.find((s) => s.time === time)) {
            return barber
          }
        } catch {
          continue
        }
      }
      return null
    },
    [api, barbers]
  )

  // Submit booking
  async function handleSubmit() {
    if (!booking.service || !booking.date || !booking.time || !booking.shop) return
    if (!booking.barber && !booking.anyBarber) return

    try {
      setIsSubmitting(true)
      setError(null)

      let selectedBarber = booking.barber

      // If "any barber", find one that has this slot available
      if (booking.anyBarber && !selectedBarber) {
        selectedBarber = await findAvailableBarber(booking.date, booking.time)
        if (!selectedBarber) {
          throw new Error(t(locale, 'error.booking'))
        }
      }

      if (!selectedBarber) {
        throw new Error(t(locale, 'error.booking'))
      }

      const result = await api.book({
        serviceId: booking.service.id,
        barberId: selectedBarber.id,
        date: booking.date,
        time: booking.time,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail || undefined,
        customerPhone: booking.customerPhone || undefined,
      })

      if (result.success && result.appointment) {
        setBookingResult(result.appointment)
        setStep('success')
        config.on_success?.(result.appointment)
      } else {
        throw new Error(result.error || t(locale, 'error.booking'))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t(locale, 'error.booking')
      setError(errorMsg)
      config.on_error?.(err as Error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset booking
  function handleReset() {
    setBooking({
      shop: booking.shop, // Keep shop
      service: null,
      barber: null,
      anyBarber: false,
      date: null,
      time: null,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
    })
    setBookingResult(null)
    setStep('service')
    setError(null)
  }

  // Get steps based on whether shop selection is needed
  const steps = useMemo(() => {
    const baseSteps: { key: BookingStep; label: string }[] = [
      { key: 'service', label: t(locale, 'step.service') },
      { key: 'barber', label: t(locale, 'step.barber') },
      { key: 'date', label: t(locale, 'step.date') },
      { key: 'time', label: t(locale, 'step.time') },
      { key: 'details', label: t(locale, 'step.details') },
    ]

    if (shops.length > 1 && !config.shop_slug) {
      return [{ key: 'shop' as BookingStep, label: t(locale, 'shop.title') }, ...baseSteps]
    }

    return baseSteps
  }, [shops.length, config.shop_slug, locale])

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  // Generate calendar dates (next 4 weeks)
  const calendarDates = useMemo(() => {
    const dates: Array<{ date: string; dayName: string; dayNum: number; isDisabled: boolean; isToday: boolean; isTomorrow: boolean }> =
      []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayNames = getDayNames(locale)

    for (let i = 0; i < 28; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      const dayOfWeek = date.getDay()
      const dateStr = date.toISOString().split('T')[0]

      // Check if closed
      const hours = openingHours.find((h) => h.dayOfWeek === dayOfWeek)
      let isDisabled = hours?.isClosed || false

      // Check if it's a closed date
      if (closedDates.includes(dateStr)) {
        isDisabled = true
      }

      // Check if it's an open sunday
      if (dayOfWeek === 0 && openSundays.includes(dateStr)) {
        isDisabled = false
      }

      // Check barber's free day (only if specific barber selected)
      if (booking.barber?.freeDay && !booking.anyBarber) {
        const barberFreeDayMapping: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
        if (barberFreeDayMapping[dayOfWeek] === booking.barber.freeDay) {
          isDisabled = true
        }
      }

      dates.push({
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        dayNum: date.getDate(),
        isDisabled,
        isToday: i === 0,
        isTomorrow: i === 1,
      })
    }

    return dates
  }, [openingHours, closedDates, openSundays, booking.barber, booking.anyBarber, locale])

  // Group slots by time of day
  const groupedSlots = useMemo(() => {
    const morning: TimeSlot[] = []
    const afternoon: TimeSlot[] = []

    slots.forEach((slot) => {
      const hour = parseInt(slot.time.split(':')[0])
      if (hour < 12) {
        morning.push(slot)
      } else {
        afternoon.push(slot)
      }
    })

    return { morning, afternoon }
  }, [slots])

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'en' ? 'en-GB' : 'de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer as React.CSSProperties}>
          <div style={styles.spinner(primaryColor)} />
          <p style={styles.loadingText as React.CSSProperties}>{t(locale, 'loading')}</p>
        </div>
      </div>
    )
  }

  // Error state (initial load)
  if (error && !booking.service) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.loadingContainer, color: '#EF4444' } as React.CSSProperties}>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ ...styles.button, ...styles.secondaryButton, marginTop: '16px' }}
          >
            {t(locale, 'button.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      {config.show_header !== false && step !== 'success' && (
        <div style={styles.header}>
          <h2 style={styles.title}>{t(locale, 'booking.title')}</h2>
          <div style={styles.progress}>
            {steps.map((s, i) => (
              <div key={s.key} style={styles.progressBar(i <= currentStepIndex)} />
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Step Content */}
      <div style={{ minHeight: '200px' }}>
        {/* Shop Selection */}
        {step === 'shop' && (
          <div>
            <h3 style={styles.subtitle}>{t(locale, 'shop.title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  style={styles.shopCard(booking.shop?.id === shop.id)}
                  onClick={async () => {
                    setBooking({ ...booking, shop, service: null, barber: null, date: null, time: null })
                    await loadShopData(shop)
                    setStep('service')
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{shop.name}</div>
                  {shop.address && <div style={styles.shopAddress}>{shop.address}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service Selection */}
        {step === 'service' && (
          <div>
            <h3 style={styles.subtitle}>{t(locale, 'service.title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {services.map((service) => (
                <div
                  key={service.id}
                  style={styles.card(booking.service?.id === service.id)}
                  onClick={() => {
                    setBooking({ ...booking, service })
                    setStep('barber')
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={styles.serviceName}>{service.name}</div>
                      <div style={styles.serviceDuration}>{service.durationFormatted}</div>
                    </div>
                    <div style={styles.priceTag}>{service.priceFormatted}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barber Selection */}
        {step === 'barber' && (
          <div>
            <h3 style={styles.subtitle}>{t(locale, 'barber.title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Any Barber Option */}
              {allowAnyBarber && (
                <div
                  style={styles.card(booking.anyBarber)}
                  onClick={() => {
                    setBooking({ ...booking, barber: null, anyBarber: true, date: null, time: null })
                    setStep('date')
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={styles.anyBarberIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{t(locale, 'barber.any')}</div>
                      <div style={{ fontSize: '13px', color: '#A1A1AA' }}>{t(locale, 'barber.anyDescription')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Barbers */}
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  style={styles.card(booking.barber?.id === barber.id)}
                  onClick={() => {
                    setBooking({ ...booking, barber, anyBarber: false, date: null, time: null })
                    setStep('date')
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {barber.image ? (
                      <div style={styles.avatar}>
                        <img src={barber.image} alt={barber.name} style={styles.avatarImage as React.CSSProperties} />
                      </div>
                    ) : (
                      <div style={styles.avatar}>{barber.name[0]}</div>
                    )}
                    <div style={{ fontWeight: 500 }}>{barber.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date Selection */}
        {step === 'date' && (
          <div>
            <h3 style={styles.subtitle}>{t(locale, 'date.title')}</h3>
            <div style={styles.dateGrid}>
              {calendarDates.map((d) => (
                <button
                  key={d.date}
                  style={styles.dateButton(booking.date === d.date, d.isDisabled)}
                  onClick={() => {
                    if (!d.isDisabled) {
                      setBooking({ ...booking, date: d.date, time: null })
                      setStep('time')
                    }
                  }}
                  disabled={d.isDisabled}
                >
                  <div style={styles.dateDayName(booking.date === d.date)}>{d.dayName}</div>
                  <div style={styles.dateDayNum}>{d.dayNum}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time Selection */}
        {step === 'time' && (
          <div>
            <h3 style={styles.subtitle}>
              {t(locale, 'time.title')}
              {booking.date && <span style={{ fontWeight: 400 }}> - {formatDate(booking.date)}</span>}
            </h3>

            {slots.length === 0 ? (
              <p style={{ color: '#A1A1AA', textAlign: 'center', padding: '32px 16px' }}>{t(locale, 'time.noSlots')}</p>
            ) : (
              <div>
                {/* Morning slots */}
                {groupedSlots.morning.length > 0 && (
                  <>
                    <div style={styles.sectionHeader}>{t(locale, 'time.morning')}</div>
                    <div style={styles.timeGrid}>
                      {groupedSlots.morning.map((slot) => (
                        <button
                          key={slot.id}
                          style={styles.slotButton(booking.time === slot.time)}
                          onClick={() => {
                            setBooking({ ...booking, time: slot.time })
                            setStep('details')
                          }}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Afternoon slots */}
                {groupedSlots.afternoon.length > 0 && (
                  <>
                    <div style={{ ...styles.sectionHeader, marginTop: groupedSlots.morning.length > 0 ? '20px' : '0' }}>
                      {t(locale, 'time.afternoon')}
                    </div>
                    <div style={styles.timeGrid}>
                      {groupedSlots.afternoon.map((slot) => (
                        <button
                          key={slot.id}
                          style={styles.slotButton(booking.time === slot.time)}
                          onClick={() => {
                            setBooking({ ...booking, time: slot.time })
                            setStep('details')
                          }}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Customer Details */}
        {step === 'details' && (
          <div>
            <h3 style={styles.subtitle}>{t(locale, 'details.title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.label}>
                  {t(locale, 'details.name')} <span style={{ color: primaryColor }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder={t(locale, 'details.namePlaceholder')}
                  value={booking.customerName}
                  onChange={(e) => setBooking({ ...booking, customerName: e.target.value })}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    ...styles.input,
                    ...(focusedInput === 'name' ? styles.inputFocus : {}),
                  }}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>{t(locale, 'details.email')}</label>
                <input
                  type="email"
                  placeholder={t(locale, 'details.emailPlaceholder')}
                  value={booking.customerEmail}
                  onChange={(e) => setBooking({ ...booking, customerEmail: e.target.value })}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    ...styles.input,
                    ...(focusedInput === 'email' ? styles.inputFocus : {}),
                  }}
                />
              </div>

              <div>
                <label style={styles.label}>{t(locale, 'details.phone')}</label>
                <input
                  type="tel"
                  placeholder={t(locale, 'details.phonePlaceholder')}
                  value={booking.customerPhone}
                  onChange={(e) => setBooking({ ...booking, customerPhone: e.target.value })}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    ...styles.input,
                    ...(focusedInput === 'phone' ? styles.inputFocus : {}),
                  }}
                />
              </div>

              {/* Summary */}
              <div style={styles.summaryBox}>
                <div style={styles.summaryLabel}>{t(locale, 'details.summary')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{booking.service?.name}</span>
                  <span style={styles.priceTag}>{booking.service?.priceFormatted}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
                  {booking.anyBarber ? t(locale, 'barber.any') : booking.barber?.name} ·{' '}
                  {booking.date && formatDate(booking.date)} · {booking.time}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && bookingResult && (
          <div style={styles.successContainer as React.CSSProperties}>
            <div style={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={styles.successTitle}>{t(locale, 'success.title')}</h2>
            <p style={styles.successMessage}>{t(locale, 'success.message')}</p>

            <div style={styles.summaryBox}>
              <div style={{ marginBottom: '8px' }}>
                <strong>{bookingResult.service}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#A1A1AA' }}>{bookingResult.barber}</div>
              <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
                {bookingResult.date} {t(locale, 'success.at')} {bookingResult.time}{' '}
                {t(locale, 'success.clock') && `${t(locale, 'success.clock')}`}
              </div>
              <div style={{ marginTop: '8px', ...styles.priceTag }}>{bookingResult.price}</div>
            </div>

            <button onClick={handleReset} style={{ ...styles.button, ...styles.secondaryButton, marginTop: '20px' }}>
              {t(locale, 'button.newBooking')}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step !== 'success' && (
        <div style={styles.nav}>
          {currentStepIndex > 0 ? (
            <button onClick={() => setStep(steps[currentStepIndex - 1].key)} style={{ ...styles.button, ...styles.secondaryButton }}>
              {t(locale, 'button.back')}
            </button>
          ) : (
            <div />
          )}

          {step === 'details' && (
            <button
              onClick={handleSubmit}
              disabled={!booking.customerName || isSubmitting}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(!booking.customerName || isSubmitting ? styles.primaryButtonDisabled : {}),
              }}
            >
              {isSubmitting ? t(locale, 'button.booking') : t(locale, 'button.book')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
