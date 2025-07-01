# .DEFAULT_GOAL := local
.PHONY: tests venv
SHELL := /bin/bash

# General Commands
help:
	cat Makefile

install:
	npm install

run:
	npm run dev

build:
	npm run build

deploy:
	npm run deploy
	