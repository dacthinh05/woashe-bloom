---
title: Align flower card divider lines
date: 2026-09-30
summary: Add min-height and line-height to .mean p so divider lines on small align evenly
---

# Align flower card divider lines

## Problem
In `hoa-theo-mua.html`, the horizontal divider line (`border-top: 1px solid var(--line)` on `.mean small`) was misaligned across cards in the same row. Cards with 1 line of meaning copy (`.mean p`) placed the divider ~25px higher than cards with 2 lines of copy, creating an uneven sawtooth pattern.

## Root Cause
`.mean article` uses normal document block flow. `<small>` directly succeeds `<p>`, so variations in paragraph height directly shift the top border position of `<small>`.

## Fix
In `assets/style.css`:
- Added `line-height: 1.5; min-height: 3em; margin: 0 0 10px;` to `.mean p` to normalize 2-line baseline height on desktop and tablet.
- Added `min-height: 6em;` to `.mean p` under `@media (max-width: 620px)` to maintain baseline parity on narrow mobile screens (375px) where text wraps to up to 4 lines.

## Verification
Automated browser tests across 10 viewports (375px, 480px, 620px, 768px, 900px, 1024px, 1060px, 1280px, 1440px, 1920px) confirmed `0px` delta between dividers in each row. Visual inspection screenshot confirmed level alignment.
