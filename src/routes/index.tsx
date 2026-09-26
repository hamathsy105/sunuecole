import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck, GraduationCap, MessageCircle, ReceiptText, ShieldCheck } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import schoolHero from "@/assets/senegal-school-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SunuÉcole — Gestion scolaire au Sénégal" },
      { name: "description", content: "SunuÉcole : élèves, paiements et présences pour les écoles du Sénégal." },
      { property: "og:title", content: "SunuÉcole — Gestion scolaire au Sénégal" },
      { property: "og:description", content: "La gestion scolaire simplifiée pour les écoles du Sénégal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

const benefits = [
  {
    icon: BookOpenCheck,
    title: "Sans cahier",
    text: "Retrouvez vos élèves, leurs classes et leurs paiements dans un seul espace.",
  },
  {
    icon: MessageCircle,
    title: "Rappels WhatsApp",
    text: "Relancez les mensualités des parents en un clic, avec un message déjà préparé.",
  },
  {
    icon: ReceiptText,
    title: "Reçus pro",
    text: "Remettez un reçu PDF clair et vérifiable après chaque encaissement.",
  },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-primary-foreground/20 text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <GraduationCap className="h-8 w-8" />
            <span className="text-xl">SunuÉcole</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:inline-flex">
              <Link to="/auth">Se connecter</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/register">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-[88svh] items-end overflow-hidden bg-primary text-primary-foreground">
          <img
            src={schoolHero}
            alt="Directrice et élèves dans la cour d’une école sénégalaise"
            width={1600}
            height={1000}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/30" />
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-36 sm:px-6 sm:pb-20 lg:pb-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 border border-primary-foreground/30 bg-primary/70 px-3 py-2 text-sm font-semibold backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" /> 15 jours gratuits, sans engagement
              </div>
              <h1 className="text-4xl font-black leading-tight sm:text-6xl">Gérez votre école en 1 clic</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
                Élèves, paiements, présences et reçus WhatsApp réunis dans un outil simple, conçu pour les écoles du Sénégal.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" variant="secondary" className="font-bold">
                  <Link to="/register">Commencer gratuitement</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/50 bg-primary/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <Link to="/auth">Se connecter</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <p className="font-bold text-primary">Pensé pour votre quotidien</p>
              <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Moins de papier. Plus de visibilité.</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground">
                    <benefit.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-card-foreground">{benefit.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{benefit.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-secondary py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="font-bold text-primary">Un prix clair</p>
              <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Toute votre école, sans frais cachés.</h2>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">Testez toutes les fonctions pendant 15 jours. Continuez ensuite avec un abonnement mensuel unique.</p>
              <p className="mt-5 font-semibold text-foreground">Paiement Wave : <a className="text-primary underline" href="tel:+221779124434">77 912 44 34</a></p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-card p-7 shadow-lg">
              <p className="font-semibold text-primary">SunuÉcole Premium</p>
              <p className="mt-3 text-4xl font-black text-foreground">10 000 F <span className="text-base font-medium text-muted-foreground">/ mois</span></p>
              <p className="mt-3 text-sm text-muted-foreground">15 jours gratuits à l’inscription.</p>
              <Button asChild size="lg" className="mt-7 w-full font-bold">
                <Link to="/register">Commencer</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
