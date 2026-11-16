# devammpatel.github.io

Personal site of Devamm Patel. Plain HTML, CSS and JavaScript: no framework, no build step, no dependencies.

## What is in here

| Path | What it is |
| --- | --- |
| `index.html` | All the content. Edit text here. |
| `assets/css/style.css` | Design. Colours are variables at the top of the file. |
| `assets/js/app.js` | The role lens, the hero animation, the in-page search and the live stream demo. |
| `assets/img/` | Photos. See `assets/img/README.md` for the file names to use. |
| `assets/resume.pdf` | Add this file and the résumé button appears. |

## The four things that are not on a typical portfolio

1. **Role lens.** The "Read as" buttons reorder and re-emphasise the page for Data Engineering, Data Science, Analytics or AI. Each has its own link, for example `https://devammpatel.github.io/?lens=de`, so an application can link to the view that fits the role.
2. **Ask this page** (press `⌘K` or `/`). A BM25 retriever built in the browser over the page's own text. It cites the exact passage and links to it, and refuses when nothing clears its relevance gate. No language model, no server, no API key.
3. **Live stream demo.** Real BTC/USDT trades from Binance's public market-data WebSocket, sampled twice a second and z-scored against a sliding window. If the socket is unreachable it switches to a feed that is labelled as simulated.
4. **Hero figure.** A live drawing of a medallion pipeline: raw events, bronze, silver, gold, one signal out.

## Editing content

- A passage becomes searchable when its element has the `data-p` attribute. Add `data-k="extra keywords"` for words a visitor might type that the passage does not contain.
- An element takes part in the role lens when it has `data-lens="de ds da ai"` (any subset).
- To add a project, copy one `<article class="project">` block in `index.html`.

## Run it locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

## Publish on GitHub Pages

The repository must be named `DevammPatel.github.io` and be public. GitHub then serves it at https://devammpatel.github.io with no further setup.

```bash
git init -b main
git add .
git commit -m "Portfolio site"
gh repo create DevammPatel.github.io --public --source=. --push
```

The same folder deploys unchanged on Vercel or Netlify (framework preset: "Other", no build command) if a custom domain is added later.
