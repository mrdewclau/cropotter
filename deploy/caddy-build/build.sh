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
export GOOS=linux
export GOARCH=amd64
export GOAMD64=v1

go version | grep -F 'go1.26.10 '
[ "$(go list -m -f '{{.Version}}' github.com/caddyserver/caddy/v2)" = 'v2.11.7' ]
[ "$(go list -m -f '{{.Version}}' golang.org/x/net)" = 'v0.60.0' ]
go mod download
go mod verify
go build -mod=readonly -trimpath -buildvcs=false -ldflags='-s -w' -o caddy-linux-amd64 .
go version -m caddy-linux-amd64 > binary-build-info.txt
go list -m -json all > module-manifest.json
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum caddy-linux-amd64 main.go go.mod go.sum build.sh > SHA256SUMS
else
  shasum -a 256 caddy-linux-amd64 main.go go.mod go.sum build.sh > SHA256SUMS
fi
