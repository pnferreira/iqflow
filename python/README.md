# IQFlow — versão Python/Pygame

Esta pasta contém a versão desktop do jogo. Ela é independente da versão web localizada na raiz do repositório e não interfere no GitHub Pages.

## Executar com ambiente virtual

```bash
cd python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

No Windows, ative o ambiente com:

```powershell
.venv\Scripts\activate
```

## Executar com Anaconda

```bash
conda create -n iqflow python=3.11 -y
conda activate iqflow
cd python
python -m pip install -r requirements.txt
python main.py
```

## Testes

```bash
pytest
```

## Controles

- Arraste uma peça livre até uma entrada destacada.
- Arraste uma peça inserida no eixo das ondas.
- Use o botão direito ou `R` para girar uma peça fora do tabuleiro.
- Use as setas para mover uma peça inserida.
- **Reiniciar** devolve as peças à zona de montagem.
