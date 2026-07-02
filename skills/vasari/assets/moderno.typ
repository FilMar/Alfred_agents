// ============================================================
//  CV — variante MODERNO (sans, accento colorato, compatto)
//  Modifica SOLO il blocco DATI. Il LAYOUT sotto raramente si tocca.
//  Font: cambia `font` in #set text se vuoi un'altra famiglia.
// ============================================================

// ---------- DATI ----------
#let nome = "Mario Rossi"
#let ruolo = "Software Engineer"
#let contatti = (
  "mario.rossi@email.com",
  "+39 333 1234567",
  "Milano, Italia",
  "github.com/mrossi",
)
#let profilo = "Ingegnere del software con 6 anni di esperienza in sistemi distribuiti e backend ad alta affidabilità. Cerco un ruolo dove possa unire progettazione di sistemi e mentoring."

#let esperienze = (
  (
    ruolo: "Senior Backend Engineer",
    ente: "Acme S.p.A.",
    periodo: "2021 — oggi",
    punti: (
      "Progettazione di microservizi in Go che servono 2M richieste/giorno.",
      "Riduzione della latenza p99 del 40% tramite caching e profiling.",
    ),
  ),
  (
    ruolo: "Backend Engineer",
    ente: "Startup Srl",
    periodo: "2018 — 2021",
    punti: (
      "Sviluppo di API REST e pipeline dati in Python.",
    ),
  ),
)

#let formazione = (
  (titolo: "Laurea Magistrale in Informatica", ente: "Politecnico di Milano", periodo: "2016 — 2018"),
)

#let competenze = ("Go", "Python", "Kubernetes", "PostgreSQL", "gRPC", "Terraform")
#let lingue = ("Italiano — madrelingua", "Inglese — C1")

// ---------- LAYOUT ----------
#let accento = rgb("#2b6cb0")
#let grigio = rgb("#4a5568")

#set page(paper: "a4", margin: (x: 1.8cm, top: 1.6cm, bottom: 1.6cm))
#set text(font: "DejaVu Sans", size: 9.5pt, fill: rgb("#1a202c"), lang: "it")
#set par(justify: true, leading: 0.62em)

#let sezione(titolo) = {
  v(7pt)
  text(size: 10.5pt, weight: "bold", fill: accento)[#upper(titolo)]
  v(-3pt)
  line(length: 100%, stroke: 0.6pt + accento)
  v(2pt)
}

#let voce(titolo, periodo) = grid(
  columns: (1fr, auto),
  text(weight: "bold")[#titolo],
  text(fill: grigio)[#periodo],
)

// intestazione
#text(size: 22pt, weight: "bold")[#nome]
#v(-7pt)
#text(size: 12pt, fill: accento)[#ruolo]
#v(1pt)
#block(text(size: 8.5pt, fill: grigio)[#contatti.join("  ·  ")])

#sezione("Profilo")
#profilo

#sezione("Esperienza")
#for e in esperienze {
  voce([#e.ruolo — #e.ente], e.periodo)
  for p in e.punti {
    list(marker: text(fill: accento)[•], p)
  }
  v(3pt)
}

#sezione("Formazione")
#for f in formazione {
  voce([#f.titolo — #f.ente], f.periodo)
}

#sezione("Competenze")
#competenze.join("  ·  ")

#sezione("Lingue")
#lingue.join("  ·  ")
