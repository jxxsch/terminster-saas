import { createRoot, Root } from 'react-dom/client'
import { BookingWidget, WidgetConfig } from './BookingWidget'
import { Theme } from './styles'
import { Locale } from './translations'

// Widget instance type
interface WidgetInstance {
  destroy: () => void
  update: (config: Partial<WidgetConfig>) => void
}

// Store active widget instances
const instances = new Map<Element, { root: Root; config: WidgetConfig }>()

// Global widget initialization
export function init(config: WidgetConfig): WidgetInstance | undefined {
  const container =
    document.getElementById('booking-widget') || document.querySelector('[data-terminster-widget]')

  if (!container) {
    console.error('Terminster Widget: No container found. Add id="booking-widget" or data-terminster-widget to your element.')
    return
  }

  // Read config from data attributes if not provided
  const finalConfig: WidgetConfig = {
    tenant_slug: config.tenant_slug || container.getAttribute('data-tenant') || '',
    shop_slug: config.shop_slug || container.getAttribute('data-shop') || undefined,
    api_url: config.api_url || container.getAttribute('data-api-url') || undefined,
    theme: config.theme || (container.getAttribute('data-theme') as Theme) || 'dark',
    primary_color: config.primary_color || container.getAttribute('data-color') || undefined,
    locale: config.locale || (container.getAttribute('data-locale') as Locale) || 'de',
    show_header: config.show_header ?? container.getAttribute('data-header') !== 'false',
    show_shop_selector: config.show_shop_selector ?? container.getAttribute('data-shop-selector') !== 'false',
    allow_any_barber: config.allow_any_barber ?? container.getAttribute('data-any-barber') !== 'false',
    on_success: config.on_success,
    on_error: config.on_error,
  }

  if (!finalConfig.tenant_slug) {
    console.error('Terminster Widget: tenant_slug is required. Use data-tenant attribute or pass it in config.')
    return
  }

  // Clean up existing instance if any
  const existing = instances.get(container)
  if (existing) {
    existing.root.unmount()
    instances.delete(container)
  }

  const root = createRoot(container)
  root.render(<BookingWidget config={finalConfig} />)

  instances.set(container, { root, config: finalConfig })

  return {
    destroy: () => {
      root.unmount()
      instances.delete(container)
    },
    update: (newConfig: Partial<WidgetConfig>) => {
      const updatedConfig = { ...finalConfig, ...newConfig }
      root.render(<BookingWidget config={updatedConfig} />)
      instances.set(container, { root, config: updatedConfig })
    },
  }
}

// Initialize on a specific element
export function initOn(element: Element | string, config: Partial<WidgetConfig> = {}): WidgetInstance | undefined {
  const container = typeof element === 'string' ? document.querySelector(element) : element

  if (!container) {
    console.error('Terminster Widget: Element not found.')
    return
  }

  // Read config from data attributes
  const finalConfig: WidgetConfig = {
    tenant_slug: config.tenant_slug || container.getAttribute('data-tenant') || '',
    shop_slug: config.shop_slug || container.getAttribute('data-shop') || undefined,
    api_url: config.api_url || container.getAttribute('data-api-url') || undefined,
    theme: config.theme || (container.getAttribute('data-theme') as Theme) || 'dark',
    primary_color: config.primary_color || container.getAttribute('data-color') || undefined,
    locale: config.locale || (container.getAttribute('data-locale') as Locale) || 'de',
    show_header: config.show_header ?? container.getAttribute('data-header') !== 'false',
    show_shop_selector: config.show_shop_selector ?? container.getAttribute('data-shop-selector') !== 'false',
    allow_any_barber: config.allow_any_barber ?? container.getAttribute('data-any-barber') !== 'false',
    on_success: config.on_success,
    on_error: config.on_error,
  }

  if (!finalConfig.tenant_slug) {
    console.error('Terminster Widget: tenant_slug is required.')
    return
  }

  // Clean up existing instance
  const existing = instances.get(container)
  if (existing) {
    existing.root.unmount()
    instances.delete(container)
  }

  const root = createRoot(container)
  root.render(<BookingWidget config={finalConfig} />)

  instances.set(container, { root, config: finalConfig })

  return {
    destroy: () => {
      root.unmount()
      instances.delete(container)
    },
    update: (newConfig: Partial<WidgetConfig>) => {
      const updatedConfig = { ...finalConfig, ...newConfig }
      root.render(<BookingWidget config={updatedConfig} />)
      instances.set(container, { root, config: updatedConfig })
    },
  }
}

// Destroy all widget instances
export function destroyAll(): void {
  instances.forEach(({ root }) => root.unmount())
  instances.clear()
}

// Auto-init if script loaded with data-auto-init
if (typeof window !== 'undefined') {
  // Expose to global scope
  const globalApi = {
    init,
    initOn,
    destroyAll,
    version: '2.0.0',
  }

  ;(window as unknown as { TerminsterWidget: typeof globalApi }).TerminsterWidget = globalApi

  // Auto-initialize on DOMContentLoaded
  const autoInit = () => {
    const containers = document.querySelectorAll('[data-terminster-widget][data-auto-init]')
    containers.forEach((container) => {
      const tenant = container.getAttribute('data-tenant')
      if (tenant) {
        initOn(container, { tenant_slug: tenant })
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit)
  } else {
    autoInit()
  }
}

// React component export for direct usage
export { BookingWidget }
export type { WidgetConfig }
