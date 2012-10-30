SHELL := /bin/bash

build:
	@interleave --output ./

test:
	@mocha --reporter spec

.PHONY: test