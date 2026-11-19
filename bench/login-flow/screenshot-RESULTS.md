# Screenshot capture benchmark

One-shot page capture, obscura vs pwterm. No login flow, no interaction: just
load `https://example.com` and write a PNG.

```bash
obscura fetch https://example.com --screenshot out.png
pwterm shot https://example.com out.png
```

## Method

- Same device and builds as [login-flow](../login-flow/RESULTS.md).
- 5 rounds, interleaved (obscura, then pwterm), wall time measured with
  `date +%s%N` around the whole command, fresh output file each round.
- Image validity checked by PNG signature, IHDR dimensions, and an 8×8
  downscale diff between the two engines' output (ffmpeg).

## Results

| Round | obscura | pwterm shot |
|---|---|---|
| 1 | 579 ms | 2232 ms |
| 2 | 609 ms | 2427 ms |
| 3 | 603 ms | 2326 ms |
| 4 | 599 ms | 2357 ms |
| 5 | 594 ms | 2328 ms |
| **median** | **599 ms** | **2328 ms** |

~3.9x faster. Both wrote valid `1280x720` PNGs: obscura 63715 bytes, pwterm
71315 bytes in every round.

## Are the images actually the same page?

An 8×8 grayscale downscale diff between the two outputs shows values of 0 in
almost every cell, with a few cells at 5–7/255 — text antialiasing and font
rasterization, not missing content. Both images are predominantly white with
the same block positions, which matches the example.com layout.

Note: this was verified by pixel statistics, not by viewing the images (the
model has no image input). The login-flow screenshots were additionally backed
by a DOM assertion (`h1 == "Logged In Successfully"`) before capture.

## Why pwterm is slower here

`pwterm shot` pays Node startup plus a full Chromium launch (300–600 ms of
`launch` alone, ~1.7 GB RSS at peak). `obscura fetch` is a single short-lived
native process. The login-flow benchmark showed the same split: Chromium's
per-page navigation is actually faster (`goto` 1238 ms vs 1500 ms), but its
process startup is the cost.

## Reproduce

```bash
for i in 1 2 3 4 5; do
  obscura fetch https://example.com --screenshot "o$i.png" -q
  pwterm shot https://example.com "p$i.png"
done
```

Time each command with `date +%s%N` before and after if you want the numbers,
and point `SCREENSHOT` at a path that exists — Termux has no `/tmp`.
