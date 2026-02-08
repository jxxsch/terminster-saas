'use client'

import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'

// Diese Seite ist nur in der Entwicklung sichtbar
const isDev = process.env.NODE_ENV === 'development'

const TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const PIN_CODE = '1904' // 4-stellige PIN

const defaultRoutes = [
  { id: '1', label: 'Homepage', path: '/', description: 'Öffentliche Startseite' },
  { id: '2', label: 'Dashboard', path: '/dashboard', description: 'Kalender-Ansicht' },
  { id: '3', label: 'Superadmin', path: '/superadmin', description: 'Plattform-Verwaltung' },
  { id: '4', label: 'Tenant Dashboard', path: `/tenant/${TENANT_ID}`, description: 'Beban Barber Shop' },
  { id: '5', label: 'Tenant Settings', path: `/tenant/${TENANT_ID}/settings`, description: 'Tenant-Einstellungen' },
  { id: '6', label: 'Tenant Users', path: `/tenant/${TENANT_ID}/users`, description: 'Benutzer-Verwaltung' },
  { id: '7', label: 'Tenant Shops', path: `/tenant/${TENANT_ID}/shops`, description: 'Shop-Verwaltung' },
]

interface Route {
  id: string
  label: string
  path: string
  description: string
}

export default function DevPage() {
  const [port, setPort] = useState('3001')
  const [routes, setRoutes] = useState<Route[]>(defaultRoutes)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // PIN Protection
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  // Add Route Form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRoute, setNewRoute] = useState({ label: '', path: '', description: '' })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if already authenticated in this session
      const authenticated = sessionStorage.getItem('dev-authenticated') === 'true'
      setIsAuthenticated(authenticated)

      // Port aus aktueller URL ermitteln
      const currentPort = window.location.port || '3000'
      setPort(currentPort)

      // Gespeicherte Routes laden
      const savedRoutes = localStorage.getItem('dev-routes')
      if (savedRoutes) {
        try {
          const parsed = JSON.parse(savedRoutes) as Route[]
          setRoutes(parsed)
        } catch {
          setRoutes(defaultRoutes)
        }
      }
    }
  }, [])

  // Routes speichern
  const saveRoutes = (newRoutes: Route[]) => {
    localStorage.setItem('dev-routes', JSON.stringify(newRoutes))
  }

  // PIN Check
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput === PIN_CODE) {
      setIsAuthenticated(true)
      sessionStorage.setItem('dev-authenticated', 'true')
      setPinError(false)
    } else {
      setPinError(true)
      setPinInput('')
    }
  }

  // Route löschen
  const handleDelete = (id: string) => {
    const newRoutes = routes.filter(r => r.id !== id)
    setRoutes(newRoutes)
    saveRoutes(newRoutes)
  }

  // Route hinzufügen
  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoute.label || !newRoute.path) return

    const newId = String(Date.now())
    const route: Route = {
      id: newId,
      label: newRoute.label,
      path: newRoute.path.startsWith('/') ? newRoute.path : `/${newRoute.path}`,
      description: newRoute.description || ''
    }

    const newRoutes = [...routes, route]
    setRoutes(newRoutes)
    saveRoutes(newRoutes)
    setNewRoute({ label: '', path: '', description: '' })
    setShowAddForm(false)
  }

  // In Production nicht anzeigen
  if (!isDev) {
    redirect('/')
  }

  // PIN Login Screen
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <form onSubmit={handlePinSubmit} style={{
          backgroundColor: '#18181b',
          padding: '40px',
          borderRadius: '16px',
          border: '1px solid #27272a',
          textAlign: 'center',
          width: '320px'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#d4a853',
            marginBottom: '8px'
          }}>
            Dev Navigation
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            marginBottom: '24px'
          }}>
            4-stellige PIN eingeben
          </p>

          <input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value.replace(/\D/g, ''))
              setPinError(false)
            }}
            placeholder="••••"
            autoFocus
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '24px',
              textAlign: 'center',
              letterSpacing: '8px',
              backgroundColor: '#27272a',
              border: pinError ? '2px solid #ef4444' : '1px solid #3f3f46',
              borderRadius: '8px',
              color: '#fff',
              outline: 'none',
              marginBottom: '16px'
            }}
          />

          {pinError && (
            <p style={{
              fontSize: '12px',
              color: '#ef4444',
              marginBottom: '16px'
            }}>
              Falsche PIN
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#d4a853',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Entsperren
          </button>
        </form>
      </div>
    )
  }

  const localhost = `http://localhost:${port}`
  const production = 'https://terminster.com'

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== draggedId) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const draggedIndex = routes.findIndex(r => r.id === draggedId)
    const targetIndex = routes.findIndex(r => r.id === targetId)

    const newRoutes = [...routes]
    const [removed] = newRoutes.splice(draggedIndex, 1)
    newRoutes.splice(targetIndex, 0, removed)

    setRoutes(newRoutes)
    saveRoutes(newRoutes)
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '8px',
          color: '#d4a853'
        }}>
          Dev Navigation
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
          Schnellzugriff auf alle wichtigen Seiten • Drag & Drop zum Sortieren
        </p>

        {/* Add Route Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            marginBottom: '24px',
            padding: '10px 16px',
            backgroundColor: showAddForm ? '#27272a' : '#d4a853',
            color: showAddForm ? '#fff' : '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {showAddForm ? '✕ Abbrechen' : '+ Seite hinzufügen'}
        </button>

        {/* Add Route Form */}
        {showAddForm && (
          <form onSubmit={handleAddRoute} style={{
            backgroundColor: '#18181b',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #d4a853',
            marginBottom: '24px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <input
              type="text"
              placeholder="Label (z.B. API Docs)"
              value={newRoute.label}
              onChange={(e) => setNewRoute({ ...newRoute, label: e.target.value })}
              required
              style={{
                padding: '10px 12px',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Pfad (z.B. /api/docs)"
              value={newRoute.path}
              onChange={(e) => setNewRoute({ ...newRoute, path: e.target.value })}
              required
              style={{
                padding: '10px 12px',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Beschreibung (optional)"
              value={newRoute.description}
              onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
              style={{
                padding: '10px 12px',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 12px',
                backgroundColor: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Hinzufügen
            </button>
          </form>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          {routes.map((route) => (
            <div
              key={route.id}
              draggable
              onDragStart={(e) => handleDragStart(e, route.id)}
              onDragOver={(e) => handleDragOver(e, route.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, route.id)}
              onDragEnd={handleDragEnd}
              style={{
                backgroundColor: dragOverId === route.id ? '#27272a' : '#18181b',
                borderRadius: '12px',
                padding: '16px',
                border: dragOverId === route.id ? '2px dashed #d4a853' : '1px solid #27272a',
                cursor: 'grab',
                opacity: draggedId === route.id ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  color: '#4b5563',
                  cursor: 'grab',
                  fontSize: '14px'
                }}>
                  ⋮⋮
                </span>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#fff'
                }}>
                  {route.label}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  flex: 1
                }}>
                  {route.description}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`"${route.label}" löschen?`)) {
                      handleDelete(route.id)
                    }
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: 'transparent',
                    border: '1px solid #3f3f46',
                    borderRadius: '4px',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#ef4444'
                    e.currentTarget.style.color = '#ef4444'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#3f3f46'
                    e.currentTarget.style.color = '#6b7280'
                  }}
                  title="Löschen"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`${localhost}${route.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#27272a',
                    color: '#a1a1aa',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#3f3f46'
                    e.currentTarget.style.color = '#22c55e'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#27272a'
                    e.currentTarget.style.color = '#a1a1aa'
                  }}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e'
                  }} />
                  localhost
                </a>

                <a
                  href={`${production}${route.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#27272a',
                    color: '#a1a1aa',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#3f3f46'
                    e.currentTarget.style.color = '#3b82f6'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#27272a'
                    e.currentTarget.style.color = '#a1a1aa'
                  }}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6'
                  }} />
                  production
                </a>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '32px',
          padding: '12px 16px',
          backgroundColor: '#18181b',
          borderRadius: '8px',
          border: '1px solid #27272a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              marginRight: '6px'
            }} />
            Localhost
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              marginLeft: '16px',
              marginRight: '6px'
            }} />
            Production
          </p>
          <button
            onClick={() => {
              if (confirm('Alle Änderungen zurücksetzen?')) {
                setRoutes(defaultRoutes)
                localStorage.removeItem('dev-routes')
              }
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #27272a',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#d4a853'
              e.currentTarget.style.color = '#d4a853'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#27272a'
              e.currentTarget.style.color = '#6b7280'
            }}
          >
            Reihenfolge zurücksetzen
          </button>
        </div>
      </div>
    </div>
  )
}
