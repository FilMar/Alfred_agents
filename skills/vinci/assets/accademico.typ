// ============================================================
//  CV — variante ACCADEMICO (denso, focus su ricerca e pubblicazioni)
//  Modifica SOLO il blocco DATI. Il LAYOUT sotto raramente si tocca.
// ============================================================

// ---------- DATI ----------
#let nome = "Maria Bianchi"
#let ruolo = "Ricercatrice — Machine Learning"
#let contatti = (
  "maria.bianchi@uni.it",
  "+39 333 7654321",
  "Dipartimento di Informatica, Università di Bologna",
  "orcid.org/0000-0000-0000-0000",
)

#let formazione = (
  (titolo: "Dottorato di Ricerca in Informatica", ente: "Università di Bologna", periodo: "2019 — 2023",
   nota: "Tesi: «Apprendimento auto-supervisionato per dati eterogenei». Relatore: Prof. Verdi."),
  (titolo: "Laurea Magistrale in Matematica", ente: "Università di Pisa", periodo: "2016 — 2019", nota: none),
)

#let esperienze = (
  (ruolo: "Assegnista di ricerca", ente: "Università di Bologna", periodo: "2023 — oggi",
   nota: "Reti neurali per l'analisi di segnali biomedici."),
  (ruolo: "Visiting researcher", ente: "ETH Zürich", periodo: "2022 (6 mesi)",
   nota: "Metodi di regolarizzazione per modelli generativi."),
)

#let pubblicazioni = (
  "M. Bianchi, A. Verdi. «Self-supervised learning on heterogeneous graphs». NeurIPS, 2023.",
  "M. Bianchi et al. «Robust generative priors for biomedical signals». ICML, 2022.",
  "M. Bianchi, L. Neri. «A survey on contrastive methods». ACM Computing Surveys, 2021.",
)

#let didattica = (
  "Esercitazioni di «Algoritmi e strutture dati» (2021—2023).",
  "Correlatrice di 5 tesi di laurea magistrale.",
)

#let competenze = ("PyTorch", "JAX", "Python", "C++", "LaTeX")
#let lingue = ("Italiano — madrelingua", "Inglese — C1", "Tedesco — B1")

// ---------- LAYOUT ----------
#set page(paper: "a4", margin: (x: 2cm, y: 1.7cm), numbering: "1")
#set text(font: "Libertinus Serif", size: 10pt, lang: "it")
#set par(justify: true, leading: 0.6em)

#let sezione(titolo) = {
  v(8pt)
  text(size: 11.5pt, weight: "bold")[#titolo]
  v(1pt)
  line(length: 100%, stroke: 0.5pt)
  v(3pt)
}

#let voce(titolo, periodo) = grid(
  columns: (1fr, auto),
  text(weight: "bold")[#titolo],
  emph[#periodo],
)

// intestazione
#text(size: 20pt, weight: "bold")[#nome]
#v(-6pt)
#text(size: 11pt, style: "italic")[#ruolo]
#v(2pt)
#text(size: 9pt)[#contatti.join("  ·  ")]

#sezione("Formazione")
#for f in formazione {
  voce(f.titolo, f.periodo)
  text(size: 9.5pt)[#f.ente]
  if f.nota != none {
    parbreak()
    text(size: 9pt, fill: rgb("#444444"))[#f.nota]
  }
  v(3pt)
}

#sezione("Esperienza di ricerca")
#for e in esperienze {
  voce([#e.ruolo, #e.ente], e.periodo)
  text(size: 9pt, fill: rgb("#444444"))[#e.nota]
  v(3pt)
}

#sezione("Pubblicazioni")
#enum(..pubblicazioni)

#sezione("Didattica")
#list(..didattica)

#sezione("Competenze")
#competenze.join("  ·  ")

#sezione("Lingue")
#lingue.join("  ·  ")
