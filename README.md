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

### No celular

- Use **Peças** e **Tabuleiro** para navegar rapidamente entre as duas áreas.
- Toque numa peça para selecioná-la e depois toque numa entrada destacada para inseri-la.
- Toque numa posição vazia da zona de montagem para mover a peça selecionada até lá.
- Use os botões **Esq.**, **Cima**, **Baixo** e **Dir.** para deslizar uma peça inserida.
- O arraste por toque continua disponível; a navegação por toque evita precisar arrastar por toda a página.

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

## Versão Python

A pasta [`python/`](python/) contém a versão desktop completa em Pygame. Ela não interfere no GitHub Pages, que utiliza somente o `index.html` e os arquivos web da raiz.

```bash
cd python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

Este é um projeto independente de estudo e não é afiliado à SmartGames.
