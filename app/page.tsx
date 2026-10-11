import Image from "next/image";
import { BedDouble, Music2, Plane } from "lucide-react";
import { CelebrationCoupleIcon, Fleur, Ornament, RingsIcon, TempleIcon } from "@/components/ornaments";
import { RsvpForm } from "@/components/rsvp-form";
import { RsvpStatusCard } from "@/components/rsvp-status";
import mandap from "@/public/images/wedding-mandap.png";
import kolam from "@/public/images/floral-kolam.png";
import bottomKolam from "@/public/images/floral-kolam-bottom.png";

const events = [
  { date: "WED, 31 MARCH 2027", name: "SANGEET", time: "EVENING", Icon: Music2 },
  { date: "THU, 1 APRIL 2027", name: "WEDDING CEREMONY", time: "MORNING", Icon: RingsIcon },
  { date: "THU, 1 APRIL 2027", name: "RECEPTION", time: "EVENING", Icon: CelebrationCoupleIcon },
];
const travel = [
  { title: "Flights & Visas", text: "Travel details will be shared here soon.", Icon: Plane },
  { title: "Accommodations", text: "Our recommendations are on their way.", Icon: BedDouble },
  { title: "Explore Chennai", text: "A few of our favourite places, coming soon.", Icon: TempleIcon },
];

export default function Home() {
  return (
    <main className="invitation">
      <div className="border-flourish border-flourish-top"><Fleur className="h-8 w-8 text-gold" /></div>
      <div className="border-flourish border-flourish-bottom"><Fleur className="h-8 w-8 text-gold" /></div>
      {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => (
        <Image key={corner} src={corner.startsWith("bottom") ? bottomKolam : kolam} alt="" aria-hidden="true" loading="eager" sizes="(max-width: 640px) 60px, 110px" className={`floral-corner floral-${corner}`} />
      ))}
      <section aria-labelledby="couple-names" className="hero text-center">
        <Image src={mandap} alt="Nikhila and Klaas beneath a jasmine and marigold wedding arch, with banana leaves and brass lamps" sizes="(max-width: 640px) calc(100vw - 68px), 680px" loading="eager" fetchPriority="high" className="hero-art mx-auto mb-7 h-auto w-full" />
        <p className="font-serif text-sm tracking-[0.3em] text-forest sm:text-lg sm:tracking-[0.4em]">SAVE THE DATE</p>
        <h1 id="couple-names" className="couple-names mt-5 font-serif text-crimson">NIKHILA &amp; KLAAS</h1>
        <p className="mx-auto mt-5 max-w-xl text-xs leading-6 tracking-[0.15em] text-forest sm:text-sm sm:tracking-[0.22em]">31 MARCH - 1 APRIL 2027 • CHENNAI, INDIA</p>
      </section>

      <section aria-labelledby="celebrations-title" className="celebrations mx-auto text-center">
        <Ornament />
        <h2 id="celebrations-title" className="mb-8 mt-6 font-serif text-3xl text-forest sm:text-4xl">The celebrations</h2>
        <div className="grid divide-y divide-gold md:grid-cols-3 md:divide-x md:divide-y-0">
          {events.map(({ date, name, time, Icon }) => (
            <article key={name} className="flex flex-col items-center px-3 py-7 md:py-2">
              <Icon className="mb-5 h-11 w-11 text-gold" strokeWidth={1.4} aria-hidden="true" />
              <p className="text-xs tracking-[0.1em] text-forest">{date}</p>
              <h3 className="mt-3 font-serif text-lg tracking-[0.035em] text-crimson sm:text-xl">{name}</h3>
              <p className="mt-2 text-xs tracking-[0.16em] text-forest">({time})</p>
            </article>
          ))}
        </div>
      </section>

      <section id="rsvp" aria-labelledby="rsvp-title" className="rsvp-section mx-auto max-w-[620px]">
        <RsvpForm />
      </section>

      <section aria-labelledby="travel-title" className="travel-section mx-auto text-center">
        <Ornament short />
        <h2 id="travel-title" className="mb-7 mt-5 font-serif text-[26px] leading-snug text-forest sm:text-3xl">A little help for your journey</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {travel.map(({ title, text, Icon }) => (
            <article key={title} className="travel-card rounded-sm border border-gold/70 px-5 py-6">
              <Icon className="mx-auto mb-3 h-9 w-9 text-gold" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-serif text-xl text-forest">{title}</h3>
              <p className="mx-auto mt-2 max-w-[225px] text-sm leading-6">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="status-title" className="mx-auto mt-10 max-w-[620px] sm:mt-12">
        <RsvpStatusCard />
      </section>

      <footer className="invitation-footer mx-auto text-center">
        <p className="font-serif text-base leading-7 text-crimson sm:text-lg">We look forward to celebrating with you!</p>
        <p className="mt-2 text-sm">Formal invitation to follow.</p>
      </footer>
    </main>
  );
}
