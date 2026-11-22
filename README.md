# IQFlow — versão web

Jogo de encaixe e deslizamento executado diretamente no navegador, feito somente com HTML, CSS e JavaScript. Não precisa instalar Python, Pygame ou dependências.

Depois de ativar o GitHub Pages, o endereço será:

**https://pnferreira.github.io/iqflow/**

## Como jogar

- Arraste as peças em tamanho normal na zona de montagem.
- Solte uma peça nas cinco linhas superiores para encaixá-la no quadrado de planejamento 5×5.
- Use as duas linhas inferiores como área de apoio.
- Clique com o botão direito, pressione `R` ou use **Girar peça** enquanto ela estiver fora do tabuleiro.
- Arraste uma peça até uma entrada destacada para inseri-la.
- Dentro do tabuleiro, a peça desliza somente no eixo indicado pelas ondas.
- As setas também movem a peça selecionada.
- **Reiniciar** devolve todas as peças à zona de montagem.

## Abrir localmente

Você pode abrir `index.html` diretamente no navegador. Outra opção é iniciar um servidor local simples:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Publicar no GitHub Pages

1. Envie os arquivos para a branch `main` do repositório `pnferreira/iqflow`.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Escolha a branch `main` e a pasta `/ (root)`.
5. Clique em **Save**.

## Arquivos web

- `index.html`: estrutura da página e controles.
- `styles.css`: aparência e adaptação para celular e desktop.
- `app.js`: desenho, peças, entradas, rotação, colisões e movimentação.

Os arquivos Python foram mantidos como versão legada e não são usados pelo GitHub Pages.

Este é um projeto independente de estudo e não é afiliado à SmartGames.
