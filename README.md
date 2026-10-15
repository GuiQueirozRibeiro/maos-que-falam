# Mãos que Falam

Tradutor educativo de **Libras** que roda inteiro no navegador. Nenhuma imagem sai do aparelho.

| Modo | O que faz |
|---|---|
| **Sinais → Voz** | Você soletra com o alfabeto manual na câmera, o texto vai se formando e é falado em pt-BR |
| **Português → Libras** | Você digita uma frase e vê um tutorial animado, letra a letra (datilologia), mais o avatar oficial **VLibras** para frases com gramática de Libras |
| **Aprender** | Alfabeto ilustrado com as 27 letras, prática com medidor de acerto, modo desafio e calibração pessoal |

## Rodar

```bash
npm install
npm run dev      # http://localhost:3001
npm test         # classificador × poses sintéticas
npm run build
```

## Arquitetura

```
src/vision/      MediaPipe HandLandmarker (vem do gesture-synth-weld) + loop da câmera
src/libras/
  alphabet.ts    FONTE ÚNICA: traços de cada letra (dedos, polegar, direção, movimento)
  poses.ts       traços → 21 pontos 3D (desenha o tutorial e gera dados de teste)
  features.ts    worldLandmarks → traços medidos (invariantes a rotação, escala e mão)
  classifier.ts  regras suaves + kNN da calibração pessoal
  motion.ts      letras com movimento (H J K X Z Ç) pela trajetória
  speller.ts     fluxo de detecções → letras confirmadas → palavras
src/speech/      Web Speech API (pt-BR)
```

A especificação de cada letra em `alphabet.ts` alimenta o reconhecimento, o desenho e os testes.
Para corrigir uma letra, mude esse arquivo: o teste `classifier.test.ts` confere se a pose
desenhada continua sendo reconhecida como ela mesma.

## Limitações (honestas)

- O reconhecimento é por regras sobre a geometria da mão. Funciona melhor com boa luz e a mão
  inteira no quadro. Use **Aprender → "Ensine a ela"** para gravar a sua versão de uma letra.
- O par F/T (o polegar fica por fora ou por dentro do indicador) é o mais difícil para a câmera.
- Existem variações regionais. A referência é o [Dicionário de Libras do INES](https://www.ines.gov.br/dicionario-de-libras/).
- Datilologia não é Libras completa. Frases usam sinais e gramática próprios, e para isso existe o VLibras.

## Modelo MediaPipe

`public/v1.0.1/` foi copiado do gesture-synth-weld e tem cache immutable de 1 ano. Ao atualizar,
crie `public/vX.Y.Z/` novo e mude o caminho em `src/vision/handTracker.ts`. Nunca sobrescreva o diretório antigo.
