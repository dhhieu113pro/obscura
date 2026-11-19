# Obscura — Termux (Android arm64) fork

Fork of [h4ckf0r0day/obscura](https://github.com/h4ckf0r0day/obscura) that ships a
prebuilt, pre-patched **Android/Termux aarch64** binary.

Obscura is a headless browser engine in Rust: real V8 JavaScript, Chrome DevTools
Protocol, and a drop-in replacement for headless Chrome with Puppeteer/Playwright.
See [upstream](https://github.com/h4ckf0r0day/obscura) for docs and features.

## Why a fork

Android uses bionic libc. The stock glibc build dies on Termux with
`libc.musl-aarch64.so.1: cannot open shared object file`, because Termux exports
`LD_LIBRARY_PATH=$PREFIX/lib` (contains a musl-built `libgcc_s.so.1`) and
`LD_PRELOAD=libresolvefix.so` ([upstream #193](https://github.com/h4ckf0r0day/obscura/issues/193)).

[`.github/workflows/termux.yml`](.github/workflows/termux.yml) builds the arm64
binaries and applies two ELF edits:

```bash
patchelf --set-interpreter $PREFIX/glibc/lib/ld-linux-aarch64.so.1 \
         --force-rpath --set-rpath $PREFIX/glibc/lib obscura obscura-worker
```

`--force-rpath` is required: RPATH is searched **before** `LD_LIBRARY_PATH`,
RUNPATH after it. No `grun`, no env workarounds.

## Install

```bash
pkg install -y glibc-repo glibc
mkdir -p ~/obscura-bin && cd ~/obscura-bin
curl -LO https://github.com/dhhieu113pro/obscura/releases/latest/download/obscura-aarch64-termux.tar.gz
tar xzf obscura-aarch64-termux.tar.gz && chmod +x obscura obscura-worker
ln -sf ~/obscura-bin/obscura "$PREFIX/bin/obscura"

obscura fetch https://example.com --eval "document.title"
```

Keep both binaries in the same directory — `obscura` looks for `obscura-worker`
next to itself. Don't run them through `grun`.

## Verified on device

Termux on aarch64, `glibc 2.44`, installed from the `termux-latest` release
with the commands above:

| Check | Result |
|---|---|
| `obscura fetch https://example.com --eval "document.title"` | `Example Domain` |
| `obscura serve --port 9222 --stealth` | CDP responds, `Chrome/145.0.0.0` |
| `obscura scrape <2 urls> --concurrency 2` | both fetched, worker spawned |
| `obscura fetch https://bot.sannysoft.com --stealth` | WebDriver missing/passed, Chrome passed, plugins 5 |
| `obscura fetch https://example.com --screenshot s.png` | PNG written |
| JS-heavy site (`news.ycombinator.com`) | 30 `.titleline` nodes |

No `grun`, no `LD_LIBRARY_PATH` overrides, no `SSL_CERT_FILE`.

## Limits

- V8 has no musl aarch64 prebuilt, so a fully static build isn't possible;
  `glibc` from Termux is required.
- No PDF export upstream — only `--screenshot`.
- No hardware-accelerated capture.
- Built from upstream `main` with `render,stealth`. Re-run the patchelf line if
  you replace the binaries yourself.

## Build locally

```bash
cargo build --profile release-dist -p obscura-cli --bins --features render,stealth
# then patchelf as above
```
