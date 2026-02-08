// Widget translations

export type Locale = 'de' | 'en' | 'tr'

export const translations: Record<Locale, Record<string, string>> = {
  de: {
    // Header
    'booking.title': 'Termin buchen',

    // Steps
    'step.service': 'Leistung',
    'step.barber': 'Mitarbeiter',
    'step.date': 'Datum',
    'step.time': 'Uhrzeit',
    'step.details': 'Daten',

    // Service selection
    'service.title': 'Wähle eine Leistung',

    // Barber selection
    'barber.title': 'Wähle einen Mitarbeiter',
    'barber.any': 'Egal wer',
    'barber.anyDescription': 'Nächster verfügbarer Termin',

    // Shop selection
    'shop.title': 'Wähle einen Standort',

    // Date selection
    'date.title': 'Wähle ein Datum',
    'date.today': 'Heute',
    'date.tomorrow': 'Morgen',

    // Time selection
    'time.title': 'Wähle eine Uhrzeit',
    'time.noSlots': 'Keine verfügbaren Zeiten an diesem Tag',
    'time.morning': 'Vormittag',
    'time.afternoon': 'Nachmittag',

    // Details
    'details.title': 'Deine Daten',
    'details.name': 'Name',
    'details.email': 'E-Mail',
    'details.phone': 'Telefon',
    'details.namePlaceholder': 'Dein Name',
    'details.emailPlaceholder': 'deine@email.de',
    'details.phonePlaceholder': '+49 123 456789',
    'details.required': 'Pflichtfeld',
    'details.summary': 'Zusammenfassung',

    // Buttons
    'button.back': 'Zurück',
    'button.book': 'Jetzt buchen',
    'button.booking': 'Buche...',
    'button.retry': 'Erneut versuchen',
    'button.newBooking': 'Weiteren Termin buchen',

    // Success
    'success.title': 'Termin gebucht!',
    'success.message': 'Wir freuen uns auf deinen Besuch.',
    'success.at': 'um',
    'success.clock': 'Uhr',

    // Errors
    'error.loading': 'Fehler beim Laden',
    'error.booking': 'Buchung fehlgeschlagen',
    'error.nameRequired': 'Bitte gib deinen Namen ein',

    // Loading
    'loading': 'Laden...',

    // Days
    'day.sun': 'So',
    'day.mon': 'Mo',
    'day.tue': 'Di',
    'day.wed': 'Mi',
    'day.thu': 'Do',
    'day.fri': 'Fr',
    'day.sat': 'Sa',
  },

  en: {
    // Header
    'booking.title': 'Book Appointment',

    // Steps
    'step.service': 'Service',
    'step.barber': 'Barber',
    'step.date': 'Date',
    'step.time': 'Time',
    'step.details': 'Details',

    // Service selection
    'service.title': 'Choose a service',

    // Barber selection
    'barber.title': 'Choose a barber',
    'barber.any': 'Any barber',
    'barber.anyDescription': 'Next available appointment',

    // Shop selection
    'shop.title': 'Choose a location',

    // Date selection
    'date.title': 'Choose a date',
    'date.today': 'Today',
    'date.tomorrow': 'Tomorrow',

    // Time selection
    'time.title': 'Choose a time',
    'time.noSlots': 'No available times on this day',
    'time.morning': 'Morning',
    'time.afternoon': 'Afternoon',

    // Details
    'details.title': 'Your details',
    'details.name': 'Name',
    'details.email': 'Email',
    'details.phone': 'Phone',
    'details.namePlaceholder': 'Your name',
    'details.emailPlaceholder': 'your@email.com',
    'details.phonePlaceholder': '+1 234 567890',
    'details.required': 'Required',
    'details.summary': 'Summary',

    // Buttons
    'button.back': 'Back',
    'button.book': 'Book now',
    'button.booking': 'Booking...',
    'button.retry': 'Try again',
    'button.newBooking': 'Book another appointment',

    // Success
    'success.title': 'Appointment booked!',
    'success.message': 'We look forward to seeing you.',
    'success.at': 'at',
    'success.clock': '',

    // Errors
    'error.loading': 'Error loading',
    'error.booking': 'Booking failed',
    'error.nameRequired': 'Please enter your name',

    // Loading
    'loading': 'Loading...',

    // Days
    'day.sun': 'Sun',
    'day.mon': 'Mon',
    'day.tue': 'Tue',
    'day.wed': 'Wed',
    'day.thu': 'Thu',
    'day.fri': 'Fri',
    'day.sat': 'Sat',
  },

  tr: {
    // Header
    'booking.title': 'Randevu Al',

    // Steps
    'step.service': 'Hizmet',
    'step.barber': 'Berber',
    'step.date': 'Tarih',
    'step.time': 'Saat',
    'step.details': 'Bilgiler',

    // Service selection
    'service.title': 'Bir hizmet seçin',

    // Barber selection
    'barber.title': 'Bir berber seçin',
    'barber.any': 'Farketmez',
    'barber.anyDescription': 'İlk müsait randevu',

    // Shop selection
    'shop.title': 'Bir konum seçin',

    // Date selection
    'date.title': 'Bir tarih seçin',
    'date.today': 'Bugün',
    'date.tomorrow': 'Yarın',

    // Time selection
    'time.title': 'Bir saat seçin',
    'time.noSlots': 'Bu gün için müsait saat yok',
    'time.morning': 'Sabah',
    'time.afternoon': 'Öğleden sonra',

    // Details
    'details.title': 'Bilgileriniz',
    'details.name': 'İsim',
    'details.email': 'E-posta',
    'details.phone': 'Telefon',
    'details.namePlaceholder': 'İsminiz',
    'details.emailPlaceholder': 'email@adresiniz.com',
    'details.phonePlaceholder': '+90 555 123 4567',
    'details.required': 'Zorunlu',
    'details.summary': 'Özet',

    // Buttons
    'button.back': 'Geri',
    'button.book': 'Randevu Al',
    'button.booking': 'Kaydediliyor...',
    'button.retry': 'Tekrar dene',
    'button.newBooking': 'Başka randevu al',

    // Success
    'success.title': 'Randevu alındı!',
    'success.message': 'Sizi görmek için sabırsızlanıyoruz.',
    'success.at': 'saat',
    'success.clock': '',

    // Errors
    'error.loading': 'Yükleme hatası',
    'error.booking': 'Randevu başarısız',
    'error.nameRequired': 'Lütfen isminizi girin',

    // Loading
    'loading': 'Yükleniyor...',

    // Days
    'day.sun': 'Paz',
    'day.mon': 'Pzt',
    'day.tue': 'Sal',
    'day.wed': 'Çar',
    'day.thu': 'Per',
    'day.fri': 'Cum',
    'day.sat': 'Cmt',
  },
}

export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] || translations.de[key] || key
}

export function getDayNames(locale: Locale): string[] {
  return [
    t(locale, 'day.sun'),
    t(locale, 'day.mon'),
    t(locale, 'day.tue'),
    t(locale, 'day.wed'),
    t(locale, 'day.thu'),
    t(locale, 'day.fri'),
    t(locale, 'day.sat'),
  ]
}
