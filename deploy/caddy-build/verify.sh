#!/bin/sh
set -eu
cd -- "$(dirname -- "$0")"
export GOTOOLCHAIN=go1.26.10
export GOPROXY=https://proxy.golang.org
export GOSUMDB=sum.golang.org
export GONOSUMDB=
export GONOPROXY=
export GOPRIVATE=
export GOWORK=off
export GOFLAGS=
export CGO_ENABLED=0
export GOBIN="$PWD/tools"
export GOOS="$(go env GOHOSTOS)"
export GOARCH="$(go env GOHOSTARCH)"
go install golang.org/x/vuln/cmd/govulncheck@v1.9.0
set +e
./tools/govulncheck -mode=binary -show traces caddy-linux-amd64 > govulncheck-binary.txt 2>&1
binary_status=$?
set -e
printf '%s\n' "$binary_status" > govulncheck-binary.exit
case "$binary_status" in
  0) ;;
  3)
    # The full standard build retains x/crypto; the only reviewed module-level
    # advisory is deprecated OpenPGP. Source analysis below must find no call path.
    [ "$(grep -c '^Vulnerability #' govulncheck-binary.txt)" -eq 1 ]
    grep -Fq 'GO-2026-5932' govulncheck-binary.txt
    ;;
  *) cat govulncheck-binary.txt; exit "$binary_status" ;;
esac
export GOOS=linux
export GOARCH=amd64
./tools/govulncheck -mode=source -show verbose ./... > govulncheck-source-verbose.txt 2>&1
printf '%s\n' '0' > govulncheck-source.exit
go list -deps -mod=readonly ./... > linux-package-list.txt
if grep -q '^golang.org/x/crypto/openpgp' linux-package-list.txt; then
  printf '%s\n' 'Unexpected OpenPGP import; review required.' >&2
  exit 1
fi
cat govulncheck-source-verbose.txt
