# obscura vs pwterm — login flow benchmark

Compares [obscura](https://github.com/dhhieu113pro/obscura) against
[pwterm](https://github.com/dhhieu113pro/pwterm) (Playwright + system Chromium)
on the same nine-step flow as `pwterm/examples/login.yaml`: goto test page,
check title, fill username/password, submit, wait for URL, check `h1`, wait for
the Log out link, screenshot.

## Why not the identical harness

pwterm reads YAML; obscura has no YAML runner. Both scripts therefore drive the
*same steps* through playwright-core, one over obscura's CDP endpoint
(`obscura-login.cjs`) and one through pwterm's own launch path with system
Chromium (`pwterm-login.cjs`). That keeps the step logic identical and isolates
the engine.

## Device and method

- Termux on Android, aarch64, `glibc 2.44`, 8 GB RAM phone.
- obscura 0.1.0-dev+e55989b (this repo's `termux-latest` build), `serve --stealth`.
- pwterm's bundled playwright-core, system `chromium-browser`.
- Rounds run **interleaved** (pwterm, then obscura) so device thermal drift hits
  both. Network-bound: the test page is a real HTTPS site.
- RAM is peak **total RSS of all processes** matched by name, sampled every
  200 ms for the duration of the run.

## Results (3 rounds, `./compare.sh 3`)

| Round | pwterm total | pwterm goto | pwterm peak RAM | obscura total | obscura goto | obscura peak RAM |
|---|---|---|---|---|---|---|
| 1 | 5197 ms | 1342 ms | 1867 MB | 4412 ms | 1585 ms | 185 MB |
| 2 | 4983 ms | 1281 ms | 1833 MB | 4296 ms | 1439 ms | 202 MB |
| 3 | 5074 ms | 1821 ms | 1443 MB | 4118 ms | 1453 ms | 193 MB |

Earlier 5-round interleaved run of the page steps only (no RAM sampling):

| Round | pwterm | obscura |
|---|---|---|
| 1 | 4326 ms | 4357 ms |
| 2 | 4452 ms | 4213 ms |
| 3 | 4292 ms | 4227 ms |
| 4 | 4529 ms | 4305 ms |
| 5 | 4501 ms | 3795 ms |
| median | 4452 ms | 4227 ms |

## Takeaways

- **Wall clock: roughly a tie.** obscura is ~5–15% faster overall, mostly from
  cheaper process setup and DOM interaction; Chromium navigates a page faster
  (1238 ms vs 1500 ms median goto).
- **Memory: obscura wins by ~8–10x.** ~190 MB vs ~1700 MB peak. This is the
  number that matters on a phone.
- **Cold start:** obscura `serve` answers CDP in 62–74 ms. A one-shot
  `obscura fetch` costs 381–567 ms end to end. Chromium launch was 337–598 ms
  on top of Node startup.
- **Stealth:** pwterm applies JS hardening; obscura adds TLS impersonation and
  tracker blocking on top (verified against `bot.sannysoft.com`: WebDriver
  missing, Chrome present, plugins 5).

## Caveats

- Single sample per cell; one page; timings dominated by network.
- Chromium peak RSS sampled at 200 ms — a lower bound.
- pwterm's `pwterm run login.yaml --quiet` measured 5092/5180/5561 ms end to
  end; that includes YAML parsing and Node CLI startup, so it is not used as
  the comparison number.

## Reproduce

```bash
# terminal 1
obscura serve --port 9222 --stealth

# terminal 2
PWTERM_DIR=$HOME/pwterm ./compare.sh 5
```

Needs a pwterm checkout with `node_modules` (for playwright-core) and system
Chromium. `CDP_URL` overrides the obscura endpoint.
