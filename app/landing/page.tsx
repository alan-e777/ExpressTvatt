'use client';

import { IconLeaf, IconCalendarEvent, IconSparkles, IconHome } from '@tabler/icons-react';
import ServiceAnimCard from '@/components/ServiceAnimCard';
import { motion } from 'framer-motion';

// ── How it works data ─────────────────────────────────────────────────────────

const HOW_STEPS = [
  { number: '01', StepIcon: IconCalendarEvent, title: 'Du väljer datum & tid',       desc: 'Boka upphämtning när det passar dig — morgon, lunch eller kväll. Vi hämtar direkt vid din dörr, utan krångel.' },
  { number: '02', StepIcon: IconSparkles,      title: 'Premium-rengöring med omsorg', desc: 'Dina plagg och mattor behandlas med miljövänliga metoder och professionell utrustning. Vi förlänger livslängden på det du älskar.' },
  { number: '03', StepIcon: IconHome,          title: 'Hemleverans när du vill',      desc: 'Rent, pressat och klart — levererat tillbaka hem till dig. Alltid i tid, alltid med ett leende.' },
];

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay } }),
};

const fadeUpCard = {
  hidden:  { opacity: 0, y: 30 },
  visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay } }),
};

const fadeRight = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="landing-page">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="landing-hero-wrap">
        <div className="home-hero landing-hero-full">
          <div className="landing-hero-inner">

            {/* Left — text card */}
            <div className="landing-hero-text-card">
              <div className="landing-hero-text">
                <div className="home-hero-title">
                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>Kemtvätt.</motion.div>
                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.1} variants={fadeUp} className="home-hero-title-accent">Hämtning.</motion.div>
                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2} variants={fadeUp}>Hemleverans.</motion.div>
                </div>

                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.35} variants={fadeUp} className="home-hero-tagline" style={{ marginTop: 16 }}>
                  <IconLeaf size={10} stroke={1.5} />
                  <span>Miljövänliga metoder sedan 1987</span>
                </motion.div>

                <motion.a href="/#services" className="home-hero-cta" style={{ marginTop: 24, display: 'inline-block' }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}>
                  BOKA UPPHÄMTNING
                </motion.a>

                <motion.p className="landing-hero-desc" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.45 }}>
                  Professionell kemtvätt med miljövänliga metoder. Vi hämtar din tvätt, tvättar den med omsorg, och levererar den direkt hem till din dörr. Snabbt, enkelt och tillförlitligt sedan 1987.
                </motion.p>
              </div>
            </div>

            {/* Right — image card */}
            <motion.div className="landing-hero-image-card" initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}></motion.div>

          </div>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="landing-howitworks">
        <div className="landing-howitworks-inner">

          <motion.div className="landing-howitworks-card-col" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeRight}>
            <ServiceAnimCard />
          </motion.div>

          <div className="landing-howitworks-steps">
            <motion.div className="landing-testimonials-kicker" initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>
              SÅ HÄR FUNGERAR DET
            </motion.div>
            <motion.div className="landing-howitworks-heading" initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.15} variants={fadeUp}>
              Tre enkla steg från smutsigt till rent
            </motion.div>

            <div className="landing-howitworks-list">
              {HOW_STEPS.map(({ number, StepIcon, title, desc }, i) => (
                <motion.div key={number} className="landing-howitworks-step" initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2 + i * 0.1} variants={fadeUpCard}>
                  <div className="landing-howitworks-step-num">{number}</div>
                  <div className="landing-howitworks-step-body">
                    <div className="landing-howitworks-step-icon"><StepIcon size={16} stroke={1.75} /></div>
                    <div>
                      <div className="landing-howitworks-step-title">{title}</div>
                      <div className="landing-howitworks-step-desc">{desc}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
