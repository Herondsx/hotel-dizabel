# Hotel Solar D'Izabel: novo site 3D

Proposta de novo site para o **Hotel Solar D'Izabel** (Capivari, Campos do Jordão), com o hotel recriado em 3D no navegador.

Site estático (HTML, CSS e JavaScript puro), sem etapa de build. Roda direto no **GitHub Pages**.

## O que tem

| Seção | Destaque |
|---|---|
| **Hero 3D** | A fachada do hotel modelada em 3D com materiais realistas (reboco, pedra, granito, ardósia, telha colonial, madeira e venezianas), cercada de araucárias, grama que balança com o vento e a Serra da Mantiqueira. |
| Hora do dia | Um controle com a **hora do dia** (06h–22h) muda sol, céu, nuvens, estrelas e sombras. As luzes do hotel acendem ao anoitecer. O botão ▶ mostra o dia passando. |
| Janelas com os quartos reais | À noite, cada janela mostra por dentro a **foto real** do ambiente, com profundidade (paralaxe) e cortinas. **Passe o mouse** numa janela para ver a prévia; **clique** para abrir o tour de fotos. |
| Exploração | Arraste para girar ao redor do prédio. Os pinos na fachada levam aos ambientes (apartamentos, recepção, café, lareira). Ao rolar, a câmera "entra" pela porta. |
| **Maquete interativa** | Ao rolar, o telhado sobe e o prédio se abre em 3 andares mobiliados. Passe o mouse: o ambiente desliza para fora como uma gaveta. Clique: a câmera voa até ele e as **fotos reais** surgem em molduras 3D flutuantes (clique para ampliar). Também há filtro por andar, zoom (botões, pinça ou Ctrl + rolagem) e navegação com ← →. |
| **Acomodações** | Cards com inclinação 3D. Passar o mouse sobre a foto percorre todas as fotos do quarto. |
| **Tour de fotos** | Carrossel 3D (anel) que se arrasta com o mouse ou o dedo, com visualizador em tela cheia. |
| **Café da manhã** | Galeria que rola na horizontal enquanto você rola a página. |
| Demais seções | Diferenciais, galeria com filtros, informações gerais (FAQ), mapa, CTA de reservas, rodapé e botão do WhatsApp. |

### Realismo

- **Texturas PBR** (cor, relevo/normal, oclusão e rugosidade) geradas em alta resolução e sem emendas, em `assets/tex/`.
- Iluminação ambiente calculada a partir do próprio céu, sombras suaves de alta resolução e **bloom** (brilho real das lâmpadas e janelas).
- Vegetação com folhagem texturizada (araucárias, pinheiros, copas e arbustos) e grama com ~90 mil lâminas animadas.
- **Qualidade adaptativa:** se o aparelho não mantiver a fluidez, o site reduz resolução e efeitos sozinho.

Todo o 3D é **procedural**: os modelos são gerados por código. Não há arquivos `.glb` pesados.

## Publicar no GitHub Pages

1. Vá em **Settings → Pages** no repositório.
2. Em **Source**, escolha **Deploy from a branch**.
3. Selecione o branch (por exemplo `main`) e a pasta **`/ (root)`**, depois clique em **Save**.
4. Em cerca de 1 minuto o site fica disponível em `https://<usuario>.github.io/hotel-dizabel/`.

O arquivo `.nojekyll` já está incluído. Como todos os caminhos são relativos, o site funciona em subpasta ou em domínio próprio.

## Rodar localmente

Os módulos ES precisam ser servidos por HTTP (abrir o `index.html` com duplo clique não funciona):

```bash
python3 -m http.server 8080
```

Depois é só abrir http://localhost:8080.

## Estrutura

```
index.html                 página única
assets/css/style.css       estilos (cores e fontes da marca)
assets/js/main.js          interações, scroll, painéis, tour de fotos, hora do dia
assets/js/data.js          textos, quartos, fotos e informações (edite aqui)
assets/js/3d/core.js       materiais PBR, carregamento de texturas, vegetação
assets/js/3d/hotel.js      modelo da fachada e vidro com interiores reais
assets/js/3d/hero.js       cena principal (ciclo do dia, céu, bloom, grama, câmera)
assets/js/3d/furniture.js  mobiliário em miniatura
assets/js/3d/maquete.js    maquete interativa por andar (molduras 3D, zoom)
assets/tex/                texturas PBR e atlas de interiores (fotos reais)
assets/img/                fotos do hotel (otimizadas; /t/ = miniaturas)
assets/fonts/              Cormorant e Josefin Sans (auto-hospedadas)
vendor/                    three.js r187 (+ pós-processamento), GSAP 3.15, Lenis 1.3
```

Para trocar textos, fotos ou a ordem dos quartos, edite `assets/js/data.js`.

## Créditos

- Fotos e textos: site oficial do Hotel Solar D'Izabel (dizabel.com.br).
- Bibliotecas: [three.js](https://threejs.org) (MIT), [GSAP](https://gsap.com) (licença padrão GSAP), [Lenis](https://github.com/darkroomengineering/lenis) (MIT).
- Fontes: Cormorant e Josefin Sans (SIL Open Font License).

A maquete é uma representação ilustrativa. A disposição real dos ambientes pode variar.
