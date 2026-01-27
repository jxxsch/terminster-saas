import { Header } from '@/components/layout';
import { Hero } from '@/components/sections/Hero';
import { Services } from '@/components/sections/Services';
import { About } from '@/components/sections/About';
import { Team } from '@/components/sections/Team';
import { Products } from '@/components/sections/Products';
import { Gallery } from '@/components/sections/Gallery';
import { Contact } from '@/components/sections/Contact';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { AuthErrorHandler } from '@/components/sections/AuthErrorHandler';
import { CancellationConfirmHandler } from '@/components/sections/CancellationConfirmHandler';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Team />
        <Products />
        <Gallery />
        <Contact />
      </main>
      <ScrollToTop />
      <AuthErrorHandler />
      <CancellationConfirmHandler />
    </>
  );
}
