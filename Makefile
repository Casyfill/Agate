# Agate developer shortcuts. Everything here wraps npm scripts; see README.md for the loop.
# Usage: make help

.DEFAULT_GOAL := help
SHELL := /bin/bash

VERSION ?=
BRANCH  := $(shell git rev-parse --abbrev-ref HEAD)

.PHONY: help install dev build check typecheck lint test test-watch install-local demo extras clean preflight release

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

install: ## Install dependencies (Node 22+, see .nvmrc)
	npm install

dev: ## esbuild in watch mode -> main.js
	npm run dev

build: ## Typecheck and produce a minified main.js (prints the size)
	npm run build

check: ## Typecheck, lint, tests: what CI runs
	npm run check

typecheck: ## tsc over src/ and test/
	npm run typecheck

lint: ## eslint with the Obsidian plugin ruleset
	npm run lint

test: ## vitest, one pass
	npm test

test-watch: ## vitest in watch mode
	npm run test:watch

install-local: ## Symlink the build into demo-vault (or AGATE_VAULT=/path make install-local)
	npm run install:local

demo: ## Regenerate demo-vault notes and data, build, and link the plugin into it
	node scripts/demo-vault.mjs
	npm run build
	npm run install:local

# Downloaded, not committed: themes and plugins keep their own licences (AnuPpuccin is GPL-3.0).
THEMES  := AnuPpuccin=anubisnekhet/AnuPpuccin Tufte=pleiadesm/TufteObsidian Minimal=kepano/obsidian-minimal
PLUGINS := tufte-suite=pleiadesm/tufte-suite side-notes=cparsell/sidenotes obsidian-minimal-settings=kepano/obsidian-minimal-settings
extras: ## Download the demo vault's themes (AnuPpuccin, Tufte, Minimal) and plugins (Tufte Suite, Side-Notes, Minimal Settings)
	@for t in $(THEMES); do \
	  dir=demo-vault/.obsidian/themes/$${t%%=*}; mkdir -p $$dir; \
	  for f in manifest.json theme.css; do \
	    curl -fsSL https://github.com/$${t#*=}/releases/latest/download/$$f -o $$dir/$$f || exit 1; \
	  done; echo "installed $$dir"; \
	done
	@for p in $(PLUGINS); do \
	  dir=demo-vault/.obsidian/plugins/$${p%%=*}; mkdir -p $$dir; \
	  for f in manifest.json main.js; do \
	    curl -fsSL https://github.com/$${p#*=}/releases/latest/download/$$f -o $$dir/$$f || exit 1; \
	  done; \
	  curl -fsSL https://github.com/$${p#*=}/releases/latest/download/styles.css -o $$dir/styles.css 2>/dev/null || true; \
	  echo "installed $$dir"; \
	done

clean: ## Remove build output and dependencies
	rm -rf main.js node_modules

preflight: ## Everything that must be true before tagging a release
	@test -z "$$(git status --porcelain)" || { echo "working tree is not clean"; exit 1; }
	@test "$(BRANCH)" = "main" || { echo "release from main (currently on $(BRANCH))"; exit 1; }
	@git fetch -q origin main && test "$$(git rev-parse HEAD)" = "$$(git rev-parse origin/main)" || { echo "main is not in sync with origin/main"; exit 1; }
	@test -f LICENSE || { echo "LICENSE is missing"; exit 1; }
	@test -f CHANGELOG.md || { echo "CHANGELOG.md is missing"; exit 1; }
	npm run check
	node esbuild.config.mjs production
	@echo "preflight ok"

release: ## Tag and push a release: make release VERSION=0.1.0
	@test -n "$(VERSION)" || { echo "usage: make release VERSION=x.y.z"; exit 1; }
	@echo "$(VERSION)" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$$' || { echo "VERSION must be x.y.z"; exit 1; }
	@grep -q "## \[$(VERSION)\]" CHANGELOG.md || { echo "CHANGELOG.md has no '## [$(VERSION)]' section"; exit 1; }
	$(MAKE) preflight
	npm version $(VERSION) -m "release %s"
	git push --follow-tags origin main
	@echo "Tag $(VERSION) pushed. GitHub Actions (release.yml) builds and drafts the release; review and publish it on GitHub."
