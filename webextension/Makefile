VERSION := $(shell egrep '^\s*"version"\s*:' manifest.json |sed 's/^\s*"version"\s*:\s*"\([^"]*\)".*$$/\1/')
FILES := $(shell cat FILES)
XPI := ../linkstatusredux-$(VERSION)-unsigned.xpi

$(XPI): $(FILES)
	rm -f $(XPI)
	zip -r $(XPI) . -i $(FILES)
