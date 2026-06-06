#!/usr/bin/env bash
# Crea un membro temporaneo neutro per il cappello specificato.
# Uso: ./default.sh <cappello-core>
# Es:  ./default.sh black-core

set -e

HAT="${1:?Uso: $0 <cappello-core>}"
NAME="${HAT%-core}-tmp"

th member create "$NAME" \
  --hat "$HAT" \
  --role "Membro neutro temporaneo. Applica il protocollo del cappello $HAT al task ricevuto." \
  --tools read,bash \
  --tmp

echo "$NAME"
