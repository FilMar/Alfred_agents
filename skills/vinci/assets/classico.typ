// ============================================================
//  CV — variante CLASSICO (serif sobrio, intestazione centrata)
//  Modifica SOLO il blocco DATI. Il LAYOUT sotto raramente si tocca.
// ============================================================

// ---------- DATI ----------
#let nome = "Mario Rossi"
#let ruolo = "Software Engineer"
#let contatti = (
  "mario.rossi@email.com",
  "+39 333 1234567",
  "Milano, Italia",
)
#let profilo = "Ingegnere del software con solida esperienza in backend e sistemi distribuiti. Orientato alla qualità del codice e alla collaborazione."

#let esperienze = (
  (
    ruolo: "Senior Backend Engineer",
    ente: "Acme S.p.A., Milano",
    periodo: "2021 — oggi",
    punti: (
      "Progettazione e manutenzione di microservizi ad alta affidabilità.",
      "Guida tecnica di un team di quattro sviluppatori.",
    ),
  ),
  (
    ruolo: "Backend Engineer",
    ente: "Startup Srl, Torino",
    periodo: "2018 — 2021",
    punti: (
      "Sviluppo di API REST e pipeline dati.",
    ),
  ),
)

#let formazione = (
  (titolo: "Laurea Magistrale in Informatica", ente: "Politecnico di Milano", periodo: "2016 — 2018"),
  (titolo: "Laurea Triennale in Informatica", ente: "Università di Bologna", periodo: "2013 — 2016"),
)

#let competenze = ("Go", "Python", "PostgreSQL", "Docker", "Linux")
#let lingue = ("Italiano — madrelingua", "Inglese — C1")

// ---------- LAYOUT ----------
#set page(paper: "a4", margin: (x: 2.2cm, y: 1.8cm))
#set text(font: "Libertinus Serif", size: 10.5pt, lang: "it")
#set par(justify: true, leading: 0.65em)

#let sezione(titolo) = {
  v(9pt)
  text(size: 12pt, weight: "bold", tracking: 0.5pt)[#smallcaps(titolo)]
  v(1pt)
  line(length: 100%, stroke: 0.4pt)
  v(3pt)
}

#let voce(titolo, periodo) = grid(
  columns: (1fr, auto),
  text(weight: "bold")[#titolo],
  emph[#periodo],
)

// intestazione centrata
#align(center)[
  #text(size: 24pt, weight: "bold")[#nome] \
  #v(-2pt)
  #text(size: 12pt, style: "italic")[#ruolo] \
  #v(2pt)
  #text(size: 9.5pt)[#contatti.join("  |  ")]
]

#sezione("Profilo")
#profilo

#sezione("Esperienza")
#for e in esperienze {
  voce([#e.ruolo, #e.ente], e.periodo)
  for p in e.punti {
    list(p)
  }
  v(3pt)
}

#sezione("Formazione")
#for f in formazione {
  voce([#f.titolo, #f.ente], f.periodo)
  v(2pt)
}

#sezione("Competenze")
#competenze.join("  ·  ")

#sezione("Lingue")
#lingue.join("  ·  ")
