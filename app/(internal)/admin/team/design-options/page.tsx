'use client';

import { useState } from 'react';
import Image from 'next/image';

// Demo-Daten für Vorschau
const demoBarber = {
  name: 'Sahir',
  image: '/team/sahir.jpg',
  active: true,
};

export default function DesignOptionsPage() {
  const [activeOption, setActiveOption] = useState<number | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Team Edit - Design Optionen</h1>
          <p className="text-slate-500">Klicke auf eine Option um die Animation zu sehen</p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 gap-8">

          {/* Option 1: Slide-Out Panel (von rechts) */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-gold/20 text-gold font-bold rounded-lg flex items-center justify-center">1</span>
                <div>
                  <h3 className="font-semibold text-slate-900">Slide-Out Panel</h3>
                  <p className="text-xs text-slate-400">Panel gleitet von rechts rein mit Barber-Info als Header</p>
                </div>
              </div>
            </div>
            <div className="p-6 relative min-h-[300px] bg-slate-50">
              {/* Demo Row */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">S</div>
                <span className="font-medium flex-1">Sahir</span>
                <button
                  onClick={() => setActiveOption(activeOption === 1 ? null : 1)}
                  className="px-4 py-2 bg-gold/10 text-gold rounded-xl text-sm font-medium hover:bg-gold/20 transition-colors"
                >
                  Bearbeiten
                </button>
              </div>

              {/* Slide Panel */}
              <div className={`absolute top-0 right-0 h-full w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-out ${activeOption === 1 ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Barber Header im Panel */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl font-bold">S</div>
                    <div>
                      <h3 className="text-xl font-bold">Sahir</h3>
                      <p className="text-slate-400 text-sm">Teammitglied bearbeiten</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Name</label>
                    <input className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl" defaultValue="Sahir" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Bild</label>
                    <div className="w-full h-32 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                      <span className="text-slate-400 text-sm">Bild hochladen</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Card Flip / Expand */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-gold/20 text-gold font-bold rounded-lg flex items-center justify-center">2</span>
                <div>
                  <h3 className="font-semibold text-slate-900">Card Expand</h3>
                  <p className="text-xs text-slate-400">Karte expandiert und zeigt Bearbeitungsfelder mit Barber-Bild als Hintergrund</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50">
              <div
                onClick={() => setExpandedCard(expandedCard === 2 ? null : 2)}
                className={`relative bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer transition-all duration-500 ease-out ${expandedCard === 2 ? 'ring-2 ring-gold' : ''}`}
              >
                {/* Normal State */}
                <div className={`flex items-center gap-4 p-4 transition-opacity duration-300 ${expandedCard === 2 ? 'opacity-0 h-0 p-0' : 'opacity-100'}`}>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">S</div>
                  <span className="font-medium flex-1">Sahir</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-xs font-medium">Aktiv</span>
                </div>

                {/* Expanded State */}
                <div className={`transition-all duration-500 ease-out overflow-hidden ${expandedCard === 2 ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="relative">
                    {/* Decorative Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-amber-100/50 to-orange-100/30" />

                    <div className="relative p-6">
                      {/* Header mit großem Avatar */}
                      <div className="flex items-start gap-5 mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">S</div>
                        <div className="flex-1 pt-2">
                          <input
                            className="text-xl font-bold bg-transparent border-b-2 border-slate-200 focus:border-gold pb-1 w-full focus:outline-none"
                            defaultValue="Sahir"
                            onClick={e => e.stopPropagation()}
                          />
                          <p className="text-slate-400 text-sm mt-1">Teammitglied</p>
                        </div>
                      </div>

                      {/* Form Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/80 backdrop-blur rounded-xl p-3">
                          <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Position</label>
                          <input className="w-full mt-1 bg-transparent focus:outline-none text-sm" defaultValue="50% 50%" onClick={e => e.stopPropagation()} />
                        </div>
                        <div className="bg-white/80 backdrop-blur rounded-xl p-3">
                          <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Skalierung</label>
                          <input className="w-full mt-1 bg-transparent focus:outline-none text-sm" defaultValue="1.0" onClick={e => e.stopPropagation()} />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 mt-4">
                        <button className="px-4 py-2 text-slate-500 text-sm font-medium hover:bg-white/50 rounded-lg" onClick={e => { e.stopPropagation(); setExpandedCard(null); }}>Abbrechen</button>
                        <button className="px-4 py-2 bg-gold text-black text-sm font-semibold rounded-lg" onClick={e => e.stopPropagation()}>Speichern</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Option 3: Modal mit Blur Background + Barber Card */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-gold/20 text-gold font-bold rounded-lg flex items-center justify-center">3</span>
                <div>
                  <h3 className="font-semibold text-slate-900">Floating Card Modal</h3>
                  <p className="text-xs text-slate-400">Schwebendes Modal mit Barber-Profil prominent oben</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 relative min-h-[350px]">
              {/* Demo Row */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">S</div>
                <span className="font-medium flex-1">Sahir</span>
                <button
                  onClick={() => setActiveOption(activeOption === 3 ? null : 3)}
                  className="px-4 py-2 bg-gold/10 text-gold rounded-xl text-sm font-medium hover:bg-gold/20 transition-colors"
                >
                  Bearbeiten
                </button>
              </div>

              {/* Modal Overlay */}
              {activeOption === 3 && (
                <div
                  className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center animate-fadeIn"
                  onClick={() => setActiveOption(null)}
                >
                  <div
                    className="bg-white rounded-3xl shadow-2xl w-[380px] overflow-hidden animate-scaleIn"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Barber Profile Header */}
                    <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center">
                      <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.3), transparent 70%)'}} />
                      <div className="relative">
                        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl mb-4">S</div>
                        <h3 className="text-white text-xl font-bold">Sahir</h3>
                        <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">Aktiv</span>
                      </div>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Name</label>
                        <input className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border-0 focus:ring-2 focus:ring-gold" defaultValue="Sahir" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-500">Position</label>
                          <input className="w-full mt-1 px-3 py-2 bg-slate-50 rounded-xl border-0 text-sm" defaultValue="50% 50%" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Zoom</label>
                          <input className="w-full mt-1 px-3 py-2 bg-slate-50 rounded-xl border-0 text-sm" defaultValue="1.0" />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button className="flex-1 py-3 text-slate-500 font-medium rounded-xl hover:bg-slate-100" onClick={() => setActiveOption(null)}>Abbrechen</button>
                        <button className="flex-1 py-3 bg-gold text-black font-semibold rounded-xl">Speichern</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Option 4: Inline Morph (Zeile transformiert sich) */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-gold/20 text-gold font-bold rounded-lg flex items-center justify-center">4</span>
                <div>
                  <h3 className="font-semibold text-slate-900">Inline Morph</h3>
                  <p className="text-xs text-slate-400">Zeile morpht sanft zu Bearbeitungsansicht - Avatar bleibt als Anker</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50">
              <div className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-500 ${activeOption === 4 ? 'ring-2 ring-gold shadow-lg' : ''}`}>
                {/* Normal Row */}
                <div className={`flex items-center gap-4 p-4 transition-all duration-300 ${activeOption === 4 ? 'border-b border-slate-100' : ''}`}>
                  <div className={`rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold transition-all duration-500 ${activeOption === 4 ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-lg'}`}>S</div>
                  <div className="flex-1">
                    {activeOption === 4 ? (
                      <input className="text-lg font-semibold bg-transparent focus:outline-none border-b-2 border-transparent focus:border-gold w-full" defaultValue="Sahir" />
                    ) : (
                      <span className="font-medium">Sahir</span>
                    )}
                    {activeOption === 4 && <p className="text-xs text-slate-400 mt-0.5">Bearbeiten...</p>}
                  </div>
                  <button
                    onClick={() => setActiveOption(activeOption === 4 ? null : 4)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeOption === 4 ? 'bg-slate-100 text-slate-600' : 'bg-gold/10 text-gold hover:bg-gold/20'}`}
                  >
                    {activeOption === 4 ? 'Schließen' : 'Bearbeiten'}
                  </button>
                </div>

                {/* Expanded Form */}
                <div className={`transition-all duration-500 ease-out overflow-hidden ${activeOption === 4 ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-4 pt-2 bg-gradient-to-b from-white to-slate-50">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-xl p-3 shadow-sm">
                        <label className="text-[10px] font-medium text-slate-400 uppercase">Bild-URL</label>
                        <input className="w-full mt-1 text-sm focus:outline-none truncate" defaultValue="/team/sahir.jpg" />
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm">
                        <label className="text-[10px] font-medium text-slate-400 uppercase">Position</label>
                        <input className="w-full mt-1 text-sm focus:outline-none" defaultValue="50% 50%" />
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm">
                        <label className="text-[10px] font-medium text-slate-400 uppercase">Zoom</label>
                        <input className="w-full mt-1 text-sm focus:outline-none" defaultValue="1.0" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Abbrechen</button>
                      <button className="px-4 py-2 text-sm bg-gold text-black font-semibold rounded-lg">Speichern</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Option 5: Split View / Side-by-Side */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-gold/20 text-gold font-bold rounded-lg flex items-center justify-center">5</span>
                <div>
                  <h3 className="font-semibold text-slate-900">Split View</h3>
                  <p className="text-xs text-slate-400">Zeile teilt sich - links Vorschau, rechts Formular</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50">
              <div className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-500 ${activeOption === 5 ? 'ring-2 ring-gold' : ''}`}>
                {activeOption !== 5 ? (
                  /* Normal Row */
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">S</div>
                    <span className="font-medium flex-1">Sahir</span>
                    <button
                      onClick={() => setActiveOption(5)}
                      className="px-4 py-2 bg-gold/10 text-gold rounded-xl text-sm font-medium hover:bg-gold/20 transition-colors"
                    >
                      Bearbeiten
                    </button>
                  </div>
                ) : (
                  /* Split View */
                  <div className="flex animate-fadeIn">
                    {/* Left: Preview */}
                    <div className="w-1/3 bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl mb-3">S</div>
                      <h4 className="text-white font-bold">Sahir</h4>
                      <span className="text-emerald-400 text-xs mt-1">● Aktiv</span>
                      <p className="text-slate-500 text-[10px] mt-4">Live-Vorschau</p>
                    </div>

                    {/* Right: Form */}
                    <div className="flex-1 p-5">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-slate-500">Name</label>
                          <input className="w-full mt-1 px-3 py-2 bg-slate-50 rounded-xl border-0 focus:ring-2 focus:ring-gold" defaultValue="Sahir" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-500">Position</label>
                            <input className="w-full mt-1 px-3 py-2 bg-slate-50 rounded-xl border-0 text-sm" defaultValue="50% 50%" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500">Zoom</label>
                            <input className="w-full mt-1 px-3 py-2 bg-slate-50 rounded-xl border-0 text-sm" defaultValue="1.0" />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button className="flex-1 py-2 text-slate-500 text-sm font-medium rounded-lg hover:bg-slate-100" onClick={() => setActiveOption(null)}>Abbrechen</button>
                          <button className="flex-1 py-2 bg-gold text-black text-sm font-semibold rounded-lg">Speichern</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <a href="/admin/team" className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-sm text-slate-600 hover:shadow-md transition-shadow">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück zur Team-Verwaltung
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
