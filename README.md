# IQFlow — versão web

Jogo de encaixe e deslizamento executado diretamente no navegador, feito somente com HTML, CSS e JavaScript. Não precisa instalar Python, Pygame ou dependências.

Depois de ativar o GitHub Pages, o endereço será:

**https://pnferreira.github.io/iqflow/**

## Como jogar

- Arraste as peças em tamanho normal na zona de montagem.
- Solte uma peça nas cinco linhas superiores para encaixá-la no quadrado de planejamento 5×5.
- No celular, use a área livre 5×7 abaixo do quadrado para deixar todas as peças fora da montagem principal.
- No computador, as peças começam distribuídas fora do quadrado: três à esquerda, três à direita e duas abaixo.
- Clique com o botão direito, pressione `R` ou use **Girar peça** enquanto ela estiver fora do tabuleiro.
- Arraste uma peça até uma entrada destacada para inseri-la.
- Dentro do tabuleiro, a peça desliza somente no eixo indicado pelas ondas.
- As setas também movem a peça selecionada.
- **Reiniciar** devolve todas as peças à zona de montagem.

### No celular

- Role a página normalmente para ir das peças ao tabuleiro e voltar.
- Toque numa peça para selecioná-la e depois toque numa entrada destacada para inseri-la.
- No celular, tocar numa área vazia não desloca a peça; todo movimento usa os controles fixos.
- Use os controles fixos **Esq.**, **Dir.**, **Cima** e **Baixo** para mover a peça selecionada.
- Na zona de montagem, as peças podem ficar umas sobre as outras, como na versão para computador.
- Dentro do tabuleiro, os mesmos controles respeitam a direção permitida pelas ondas.
- Use o botão fixo **Girar** para mudar a orientação da peça selecionada.

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

### Requisitos

- Python 3.11 ou superior.
- Pygame 2.5 ou superior.
- `pip` ou Anaconda/Miniconda.

### Baixar o projeto

```bash
git clone https://github.com/pnferreira/iqflow.git
cd iqflow/python
```

Também é possível baixar o repositório pelo botão **Code → Download ZIP**, descompactar e abrir a pasta `python` no Terminal.

### Opção 1: ambiente virtual no macOS ou Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

Para sair do ambiente:

```bash
deactivate
```

### Opção 2: ambiente virtual no Windows

No Prompt de Comando ou PowerShell:

```powershell
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python main.py
```

### Opção 3: Anaconda ou Miniconda

```bash
conda create -n iqflow python=3.11 -y
conda activate iqflow
python -m pip install -r requirements.txt
python main.py
```

Nas próximas vezes, abra o Terminal na pasta `python` e execute:

```bash
conda activate iqflow
python main.py
```

Para sair do ambiente Conda:

```bash
conda deactivate
```

### Controles da versão Python

- Arraste uma peça livre até uma entrada destacada.
- Arraste uma peça inserida no sentido das ondas.
- Clique com o botão direito ou pressione `R` para girar uma peça fora do tabuleiro.
- Use as setas para mover a peça selecionada.
- Use **Reiniciar** para devolver todas as peças à zona de montagem.
- Pressione `Esc` para fechar.

### Executar os testes

Com o ambiente ativado e dentro da pasta `python`:

```bash
pytest
```

### Problemas comuns

Se aparecer `ModuleNotFoundError: No module named 'pygame'`, confirme que o ambiente está ativado e reinstale as dependências:

```bash
python -m pip install -r requirements.txt
```

Se o comando `python` não existir no macOS ou Linux, tente:

```bash
python3 main.py
```

### Organização da versão Python

- `python/main.py`: janela e loop principal.
- `python/pieces.py`: formas, cores, rotações e ondas.
- `python/board.py`: tabuleiro, entradas e canaletas.
- `python/movement.py`: movimentação e colisões.
- `python/renderer.py`: desenho do tabuleiro e das peças.
- `python/input_handler.py`: mouse e teclado.
- `python/tests/`: testes automatizados.

Este é um projeto independente de estudo e não é afiliado à SmartGames.
