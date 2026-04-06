import { Phone, Mail, Clock, MapPin, Camera, Gift, ExternalLink } from 'lucide-react';
import { STORE_CONFIG } from '../lib/config';

const SERVICES = [
  'Custom framing',
  'Photo printing',
  'Canvas prints',
  'Photo restoration',
  'Passport photos',
  'Used cameras & equipment',
  'Camera repairs',
  'Photo scanning',
  'Gift certificates',
];

const HOURS = [
  { day: 'Monday', hours: 'Closed' },
  { day: 'Tuesday', hours: 'Closed' },
  { day: 'Wednesday', hours: '10:00 am – 5:00 pm' },
  { day: 'Thursday', hours: 'Closed' },
  { day: 'Friday', hours: '10:00 am – 5:00 pm' },
  { day: 'Saturday', hours: '10:00 am – 5:00 pm' },
  { day: 'Sunday', hours: 'Closed' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[--color-bg]">
      <div className="bg-gradient-to-br from-[#4A2C17] to-[#8B5E3C] text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-amber-300 text-sm font-semibold tracking-widest uppercase">About the Shop</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Haliburton Framing<br /><span className="text-amber-300">&amp; Photo</span></h1>
          <p className="text-amber-100 text-lg max-w-xl leading-relaxed">Your destination for vintage cameras, custom framing, and photography services in the heart of Haliburton Highlands.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-2xl border border-[--color-border] p-8">
              <h2 className="text-2xl font-bold text-[--color-text] mb-4">Our Story</h2>
              <div className="space-y-4 text-[--color-text] leading-relaxed">
                <p>
                  Haliburton Framing &amp; Photo has been a cornerstone of the Haliburton community for decades, offering professional framing, photography services, and a carefully curated selection of vintage cameras and equipment.
                </p>
                <p>
                  Scott's passion for analogue photography runs deep. Over the years he has assembled one of the most varied collections of vintage cameras, lenses, and accessories in the region — everything from working-condition Nikon and Canon film bodies to rare medium-format gems and classic darkroom accessories.
                </p>
                <p>
                  Every item in the collection has been personally inspected and rated on a 1–10 condition scale, so you know exactly what you're getting. Whether you're a seasoned collector or shooting your first roll of film, there's something here for you.
                </p>
                <p>
                  The shop is located in Haliburton, Ontario and is open Wednesday, Friday, and Saturday. You're always welcome to stop in and have a look — Scott loves to talk cameras.
                </p>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[--color-border] p-8">
              <h2 className="text-2xl font-bold text-[--color-text] mb-6">Our Services</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {SERVICES.map(service => (
                  <div key={service} className="flex items-center gap-3 p-3 bg-[--color-bg] rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-[--color-accent] shrink-0" />
                    <span className="text-[--color-text] text-sm font-medium">{service}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-amber-900 mb-2">Camera Donations Welcome</h2>
                  <p className="text-amber-800 leading-relaxed text-sm">
                    Do you have old cameras or photography equipment gathering dust? We accept donated cameras for resale. Donations help keep the collection fresh and give old equipment a new home with someone who'll actually use it. Drop by the shop or give us a call.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[--color-border] p-6">
              <h3 className="text-lg font-bold text-[--color-text] mb-5">Store Hours</h3>
              <div className="space-y-2">
                {HOURS.map(({ day, hours }) => {
                  const isClosed = hours === 'Closed';
                  const isOpen = !isClosed;
                  return (
                    <div key={day} className="flex items-center justify-between py-1.5 border-b border-[--color-border] last:border-0">
                      <span className={`text-sm font-medium ${isOpen ? 'text-[--color-text]' : 'text-[--color-muted]'}`}>{day}</span>
                      <span className={`text-sm ${isOpen ? 'text-[--color-primary] font-semibold' : 'text-[--color-muted]'}`}>{hours}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 p-3 bg-[--color-bg] rounded-xl">
                <Clock className="w-4 h-4 text-[--color-muted] shrink-0" />
                <p className="text-xs text-[--color-muted]">Hours may vary on holidays. Call ahead if unsure.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[--color-border] p-6 space-y-4">
              <h3 className="text-lg font-bold text-[--color-text]">Get in Touch</h3>
              <a href={`tel:${STORE_CONFIG.phone}`} className="flex items-center gap-3 p-3 bg-[--color-bg] rounded-xl hover:bg-[--color-primary] hover:bg-opacity-5 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-[--color-primary] bg-opacity-10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-[--color-primary]" />
                </div>
                <div>
                  <p className="text-xs text-[--color-muted] font-medium">Phone</p>
                  <p className="text-sm font-semibold text-[--color-text] group-hover:text-[--color-primary] transition-colors">{STORE_CONFIG.phone}</p>
                </div>
              </a>
              <a href={`mailto:${STORE_CONFIG.ownerEmail}`} className="flex items-center gap-3 p-3 bg-[--color-bg] rounded-xl hover:bg-[--color-primary] hover:bg-opacity-5 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-[--color-primary] bg-opacity-10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[--color-primary]" />
                </div>
                <div>
                  <p className="text-xs text-[--color-muted] font-medium">Email</p>
                  <p className="text-sm font-semibold text-[--color-text] group-hover:text-[--color-primary] transition-colors">{STORE_CONFIG.ownerEmail}</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-3 bg-[--color-bg] rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-[--color-primary] bg-opacity-10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[--color-primary]" />
                </div>
                <div>
                  <p className="text-xs text-[--color-muted] font-medium">Location</p>
                  <p className="text-sm font-semibold text-[--color-text]">{STORE_CONFIG.address}</p>
                </div>
              </div>
              <a
                href={STORE_CONFIG.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Get Directions
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
