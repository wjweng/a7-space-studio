#!/bin/sh
# Runs the tests inside a 6 GB memory cgroup where systemd is available. A failing assertion that
# prints a three.js object graph once grew a test to 11 GB and the kernel's OOM killer took down
# the whole WSL session; inside the cgroup only the tests are killed. `ulimit -v` is no use here:
# WebAssembly reserves more address space than any sensible limit.
if command -v systemd-run >/dev/null 2>&1 && systemd-run --user --scope -q -p MemoryMax=6G -p MemorySwapMax=0 true >/dev/null 2>&1; then
  exec systemd-run --user --scope -q -p MemoryMax=6G -p MemorySwapMax=0 node --test "$@" tests/*.test.mjs
fi
exec node --test "$@" tests/*.test.mjs
