# Les polices du modèle

Les 體 dans lesquels s'écrit le modèle des grilles (ADR 0003). Chaque fichier est la police d'origine, telle que téléchargée ; une grille n'en embarque que les caractères de sa pièce. Le site emprunte TW-Kai, réduite aux caractères publiés (ADR 0005), et 霞鶩文楷 TC comme police de secours pour ceux que TW-Kai ne dessine pas (ADR 0006) : ne les déplacez pas sans `packages/site-font`.

| 體 | Fichier | Police | Licence |
| --- | --- | --- | --- |
| 楷 standard | `TW-Kai-98_1.ttf` | 全字庫正楷體 (TW-Kai) | OFL 1.1 — `TW-Kai.OFL.txt` |
| 顏體 | `wt064.ttf` | 王漢宗顏楷體 (HanWangYanKai) | GPL v2 — `wt064.COPYING` |
| 文楷 | `LXGWWenKaiTC-Regular.ttf` | 霞鶩文楷 TC v1.530 | OFL 1.1 — `LXGWWenKaiTC.OFL.txt` |

## Provenance

- **TW-Kai** : `https://data.cns11643.gov.tw/opendata/Fonts_Kai.zip` (sha256 `50fdfafabb40a382b74e7f6cf813bcd036a446b7700be0099de8372fee9c9e38`), le fichier `TW-Kai-98_1.ttf` de l'archive. Le jeu de données (data.gov.tw/dataset/5961) se prend au choix sous la licence open data du gouvernement taïwanais ou sous l'OFL 1.1 : on retient l'OFL.
- **王漢宗顏楷體** : `https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/wangfonts/wangfonts-1.3.0.tar.gz` (sha256 `76449c671ba9f7e56518b3db5810c5033a3ae9fef386a6c8b6eb5e15591a53e7`), le fichier `wangfonts/wt064.ttf`. Le texte de la GPL vient du même projet.
- **霞鶩文楷 TC** : `https://github.com/lxgw/LxgwWenkaiTC/releases/download/v1.530/LXGWWenKaiTC-Regular.ttf`.

| Fichier                    | sha256                                                             |
| -------------------------- | ------------------------------------------------------------------ |
| `TW-Kai-98_1.ttf`          | `d5e8d7d8743c5cf816bdeb393a443f65105a8130266a04c19560e1d3401b28f0` |
| `wt064.ttf`                | `5567cc7ae20d11fd972a83daa0d364baba6867014a25a91b4aedcb0dbbdf1e55` |
| `LXGWWenKaiTC-Regular.ttf` | `6662480a3f95b4a90c80b189c679617a48adce3a505118a6af63ce5a482b83fa` |
