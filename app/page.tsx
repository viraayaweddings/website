import { aboutViraayaWeddingsArticleMarkup } from "./homepage-shell";

export const dynamic = "force-static";

const stats = [
  ["1,000+", "weddings planned"],
  ["4.8/5", "client rating"],
  ["28,000+", "venue partners"]
];

const services = [
  {
    title: "Venue Selection",
    text: "Shortlist banquet halls, hotels, resorts, farmhouses, palaces, and destination venues by city, capacity, style, and budget.",
    href: "/wedding-venues"
  },
  {
    title: "Decor & Styling",
    text: "Design mandaps, stages, floral installations, and themed functions with creative decor partners.",
    href: "/wedding-decorators"
  },
  {
    title: "Photography",
    text: "Find candid photographers, cinematographers, drone teams, and storytellers who match your wedding style.",
    href: "/wedding-photography"
  },
  {
    title: "End-to-End Planning",
    text: "Coordinate vendors, hospitality, timelines, logistics, and family requirements from first call to final farewell.",
    href: "/wedding-services"
  }
];

const cities = ["Delhi", "Gurugram", "Noida", "Jaipur", "Udaipur"];

const inspiration = [
  ["Lehenga", "/twc-assets/ideabook/lehenga.webp"],
  ["Decor", "/twc-assets/ideabook/decor.webp"],
  ["Makeup", "/twc-assets/ideabook/makeup.webp"],
  ["Mehendi", "/twc-assets/ideabook/mehendi.webp"],
  ["Hairstyles", "/twc-assets/ideabook/hairstyles.webp"],
  ["Photography", "/twc-assets/ideabook/photography.webp"]
];

const faqs = [
  [
    "Can Viraaya Weddings plan destination weddings?",
    "Yes. We help plan luxury and destination weddings across India with venue selection, vendors, decor, hospitality, and on-ground coordination."
  ],
  [
    "Can you work with our budget?",
    "Yes. Our specialists recommend venues and services around your budget, priorities, guest count, and event style."
  ],
  [
    "Do you help with individual services?",
    "Yes. You can book venue selection, decor, photography, bridal beauty, catering, hospitality, or complete wedding planning support."
  ]
];

export default function Home() {
  return (
    <main className="vw-home">
      <section className="vw-home-hero">
        <img
          className="vw-home-hero-image"
          src="/gcpimages/weddings/assets/HeroSectionBackgroundImageoptimised.webp"
          alt=""
          width="1280"
          height="720"
          fetchPriority="high"
        />
        <div className="vw-home-hero-shade" />
        <div className="vw-home-hero-content">
          <p className="vw-home-kicker">Luxury wedding planning across India</p>
          <h1>Crafting Memorable Weddings</h1>
          <p>
            From intimate ceremonies to grand destination celebrations, Viraaya Weddings
            brings venues, decor, photography, hospitality, and planning together in one
            seamless experience.
          </p>
          <div className="vw-home-actions">
            <a className="vw-home-primary" href="#end_to_end_services_section">
              Start planning
            </a>
            <a className="vw-home-secondary" href="https://wa.me/918130222141">
              WhatsApp us
            </a>
          </div>
          <div className="vw-home-stats">
            {stats.map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="vw-home-section vw-home-services" id="end_to_end_services_section">
        <div className="vw-home-section-head">
          <p className="vw-home-kicker">Our Wedding Planning Services</p>
          <h2>Everything your celebration needs, handled with care</h2>
        </div>
        <div className="vw-home-service-grid">
          {services.map((service) => (
            <a className="vw-home-service" href={service.href} key={service.title}>
              <span>{service.title}</span>
              <p>{service.text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="vw-home-section vw-home-venues">
        <div className="vw-home-section-head">
          <p className="vw-home-kicker">Wedding Venues</p>
          <h2>Find the right place for every function</h2>
          <p>
            Browse curated venues by city, guest count, budget, and celebration style.
          </p>
        </div>
        <div className="vw-home-city-grid">
          {cities.map((city) => (
            <a href={`/wedding-venues/${city.toLowerCase()}`} key={city}>
              Wedding Venues in {city}
            </a>
          ))}
        </div>
      </section>

      <section className="vw-home-band">
        <div>
          <p className="vw-home-kicker">How it works</p>
          <h2>Plan your wedding in three simple steps</h2>
        </div>
        <ol>
          <li>
            <strong>Share your requirements</strong>
            <span>Tell us your dates, location, guest count, budget, and preferences.</span>
          </li>
          <li>
            <strong>Get a personalized proposal</strong>
            <span>Review suitable venues, vendors, decor ideas, and planning options.</span>
          </li>
          <li>
            <strong>Confirm and celebrate</strong>
            <span>Our team coordinates details so your family can enjoy the occasion.</span>
          </li>
        </ol>
      </section>

      <section className="vw-home-section">
        <div className="vw-home-section-head">
          <p className="vw-home-kicker">Wedding Inspiration</p>
          <h2>Ideas for the wedding you have imagined</h2>
        </div>
        <div className="vw-home-inspiration">
          {inspiration.map(([label, src]) => (
            <a href="/wedding-ideas" key={label}>
              <img src={src} alt="" width="160" height="160" loading="lazy" />
              <span>{label}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="vw-home-quote">
        <div>
          <p className="vw-home-kicker">Talk to a wedding specialist</p>
          <h2>Ready to start planning?</h2>
          <p>
            Call us at <a href="tel:+918130222141">+91 81302 22141</a> or share your
            requirements on WhatsApp.
          </p>
        </div>
        <a href="https://wa.me/918130222141">Get free quote</a>
      </section>

      <section className="vw-home-section vw-home-faq">
        <div className="vw-home-section-head">
          <p className="vw-home-kicker">FAQs</p>
          <h2>Common planning questions</h2>
        </div>
        <div className="vw-home-faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="vw-home-section vw-home-about">
        <div
          className="vw-home-about-copy"
          dangerouslySetInnerHTML={{ __html: aboutViraayaWeddingsArticleMarkup }}
        />
      </section>
    </main>
  );
}
