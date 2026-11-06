# Hotel Solar D'Izabel: novo site 3D

Proposta de novo site para o **Hotel Solar D'Izabel** (Capivari, Campos do Jordão), com o hotel recriado em 3D no navegador.

Site estático (HTML, CSS e JavaScript puro), sem etapa de build. Roda direto no **GitHub Pages**.

## O que tem

| Seção | Destaque |
|---|---|
| **Hero 3D** | A fachada do hotel modelada em 3D (empenas, cunhais de pedra, venezianas verdes, varanda envidraçada, cordões de luz e guirlandas), cercada de araucárias e da Serra da Mantiqueira. A câmera segue o mouse, há um botão **Dia / Noite** e, ao rolar a página, a câmera "entra" pela porta do hotel. |
| **Maquete interativa** | Ao rolar, o telhado sobe e o prédio se abre em 3 andares. Cada quarto está mobiliado (camas, hidromassagem, lareira acesa, buffet do café, playground). **Passe o mouse:** o ambiente desliza para fora como uma gaveta e o painel mostra as fotos reais. **Clique:** a câmera voa até o ambiente. Também dá para filtrar por andar e arrastar para girar. |
| **Acomodações** | Cards com inclinação 3D. Passar o mouse sobre a foto percorre todas as fotos do quarto. |
| **Tour de fotos** | Carrossel 3D (anel) que se arrasta com o mouse ou o dedo, com visualizador em tela cheia. |
| **Café da manhã** | Galeria que rola na horizontal enquanto você rola a página. |
| Demais seções | Diferenciais, galeria com filtros, informações gerais (FAQ), mapa, CTA de reservas, rodapé e botão do WhatsApp. |

Todo o 3D é **procedural**: os modelos são gerados por código e as texturas são desenhadas em `<canvas>`. Não há arquivos `.glb` pesados.

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
assets/js/main.js          interações, scroll, painéis, tour de fotos
assets/js/data.js          textos, quartos, fotos e informações (edite aqui)
assets/js/3d/core.js       texturas procedurais, materiais, árvores
assets/js/3d/hotel.js      modelo da fachada
assets/js/3d/hero.js       cena principal (dia/noite, câmera)
assets/js/3d/furniture.js  mobiliário em miniatura
assets/js/3d/maquete.js    maquete interativa por andar
assets/img/                fotos do hotel (otimizadas; /t/ = miniaturas)
assets/fonts/              Cormorant e Josefin Sans (auto-hospedadas)
vendor/                    three.js r187, GSAP 3.15, Lenis 1.3
```

Para trocar textos, fotos ou a ordem dos quartos, edite `assets/js/data.js`.

## Créditos

- Fotos e textos: site oficial do Hotel Solar D'Izabel (dizabel.com.br).
- Bibliotecas: [three.js](https://threejs.org) (MIT), [GSAP](https://gsap.com) (licença padrão GSAP), [Lenis](https://github.com/darkroomengineering/lenis) (MIT).
- Fontes: Cormorant e Josefin Sans (SIL Open Font License).

A maquete é uma representação ilustrativa. A disposição real dos ambientes pode variar.
