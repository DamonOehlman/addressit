SHELL := /bin/bash

build:
	@interleave src --package

test:
	@mocha --reporter spec

.PHONY: test