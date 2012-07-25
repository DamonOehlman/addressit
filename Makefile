SHELL := /bin/bash

build:
	@interleave build --wrap

test:
	@mocha --reporter spec

.PHONY: test