# Relire un ticket

`code-review` relit le diff entre `HEAD` et un point fixe, avec des sous-agents bornés à 400 mots. Sur une branche d'intégration de plusieurs tickets, ils n'en lisent qu'un échantillon : la revue unique de #87 (206 fichiers, 15 tickets) a laissé passer des écarts qu'elle avait sous les yeux. Une relecture porte donc sur un ticket : son diff contre sa base.

## Un ticket et sa base

- **Ticket sur sa branche, pas encore fusionné** : `HEAD` est sa branche, le point fixe celle qu'il vise (la branche d'intégration, ou `origin/main`).
- **Ticket fusionné dans une branche d'intégration** : `HEAD` est son commit de fusion, le point fixe le premier parent de ce commit. Le diff est ce que le ticket apporte, résolutions de conflits comprises, et `git log <fusion>^1..<fusion>` porte ses commits et son numéro, d'où `code-review` tire la spec :

  ```sh
  git worktree add --detach .claude/worktrees/relecture-<n> <fusion>
  # puis code-review, point fixe <fusion>^1
  ```

Les fusions d'une branche d'intégration se lisent sur son premier parent :

```sh
git log --first-parent --merges --format='%h %s' origin/main..origin/<intégration>
```

Une fois la PR fusionnée, la branche d'intégration est le second parent du commit de fusion de la PR : `<fusion-PR>^1..<fusion-PR>^2`. Pour #87, `8e6739c^1..8e6739c^2` liste ses 24 fusions ; `7a22776 Le popover pinyin (#84)` se relit au point fixe `7a22776^1`, 12 fichiers.

Chaque fusion se relit, une branche de correction comme un ticket du plan : cinq des sept écarts relevés sur #87 venaient de corrections fusionnées sans relecture. Seule une fusion d'`origin/main` dans la branche d'intégration n'apporte aucun ticket, et se passe.

## La PR entière

Quand chaque ticket est relu, la revue de la PR entière, au point fixe `origin/main`, ne cherche plus que la cohérence entre tickets : une même chose écrite deux fois, deux noms pour une même chose, un même fait calculé en deux endroits. Dis-le dans la demande à `code-review`. C'est ainsi que se fait la revue de la branche d'intégration que demande `implement-spec`.
