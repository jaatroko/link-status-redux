VERSION := $(shell egrep '^\s*<em:version>' install.rdf |sed 's/^.*version>\([^<]*\)<.*$$/\1/')
FILES := $(shell cat FILES)
XPI := ../linkstatusredux-$(VERSION)-unsigned.xpi

$(XPI): $(FILES)
	rm -f $(XPI)
	zip -r $(XPI) . -i $(FILES)
