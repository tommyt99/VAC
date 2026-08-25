# Annotated edition — how to use this

This folder is a **sibling** of `../Tutorial/`, not a replacement. Tommy liked the original pages. They were not edited.

Sit the two folders next to each other:

```
../Tutorial/     ← original essay (untouched)
falcon-landing-annotated/    ← this edition
```

The top link “Original essay →” points at `../Tutorial/index.html`. If you unzipped only this folder, that link 404s. The essay’s portable copy is `TUTORIAL.md` in the original folder.

## What this edition is

Same night-notebook look, same story, same equations. The difference is that every important equation has a **code chip**. Click it. A modal opens with:

1. The function name
2. The exact JavaScript from `sim/index.html` (a verbatim copy of the landing trainer — not a prettier rewrite)
3. A short symbol map (θ → `s.theta`, T → `u*TMAX`, ℓ → `hCom(s.m)`, …)
4. A “View in sim source” link that jumps to `#fn-…` anchors injected **only** in this copy of the sim

Esc, backdrop click, or × closes the modal.

Deep links (open the popout on load):

- `index.html#code-hsb`
- `index.html?code=stepPhysics`
- Aliases such as `h_sb`, `guidance`, `s` also resolve

`file://` works. KaTeX and mermaid load from the same CDNs as the original.

## The sim copy

`sim/index.html` is a copy of `rocket-landing/index.html` plus:

- `/* @anchor fn-… */` comments above the real functions
- A small overlay that opens when you land on `#fn-stepPhysics` (and friends)

The original `rocket-landing/` file was not modified.

## If a section has no 1:1 code

Convex G-FOLD, Merlin pintle, TEA-TEB, 3-to-1, Kalman navigation, the $M_{\mathrm{tip}}$ crush-core free-body — those stay in the essay and are marked **not in the 2D trainer**. The chips refuse to invent a function that is not in the file.
