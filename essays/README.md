# Essays

A static, editorial reading theme inspired by the design language of
[europe2031.ai](https://europe2031.ai) — PT Serif body + Geist Mono labels, a
warm paper/ink palette, a single blue accent, dark mode, and a self-tracking
timeline rail. All code here is original; the fonts are loaded from Google Fonts.

## Files

```
index.html       landing page — the list of essays
essay.html       the essay template (duplicate this per essay)
assets/styles.css  the whole design system (CSS variables at the top)
assets/app.js      theme toggle, wordmark reveal, scroll-spy rail
```

## Run it locally

It's plain HTML — just open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Publish a new essay

1. Copy `essay.html` → `my-new-essay.html`.
2. Edit the `<title>`, the `.hero` block (kicker, title, standfirst, author),
   and the body.
3. Each section is:

   ```html
   <section class="chapter" id="unique-id" data-chapter data-label="Rail label">
     <div class="chapter-num">II</div>
     <h2>Section heading</h2>
     <p>…</p>
   </section>
   ```

   The left **timeline rail builds itself** from these — `data-label` is the
   dot's name, and it highlights as the reader scrolls. No manual TOC.
4. Add a card to the `.essay-list` in `index.html`.

## Building blocks

| What you want            | How                                          |
|--------------------------|----------------------------------------------|
| Lead paragraph           | `<p class="lede">`                           |
| Pull-quote (accent rule) | `<p class="pull">`                           |
| Tinted quote / dialogue  | `<blockquote><p>…</p></blockquote>`          |
| Image with caption       | `<figure><img><figcaption>…</figcaption>`    |
| Section divider          | `<hr class="rule">`                          |
| Cover image              | replace `.hero-image--placeholder` with `<img class="hero-image">` |

## Theming

All design tokens live in `:root` (and `html.dark`) at the top of
`assets/styles.css` — change `--blue-700` to re-accent the whole site, or
`--measure` to widen/narrow the reading column.

## Deploy

Drop the folder on any static host — GitHub Pages, Netlify, Cloudflare Pages,
or Railway. No build step.
