var port = browser.runtime.connect({name: "linkstatusredux"});

port.onMessage.addListener(function(msg) {
    if (msg.prefs) {
	if ("customOverLink" in msg.prefs) {
	    msg.prefs["customURL"] = msg.prefs["customOverLink"];
	    msg.prefs["customPrefix"] = "";
	    msg.prefs["customPostfix"] = "";
	    msg.prefs["maxLines"] = 1;
	    delete msg.prefs["customOverLink"];
	}
	for (let key of Object.keys(msg.prefs)) {
	    console.log("linkstatusredux::migration: "+key+" := "+msg.prefs[key]);
	}
	browser.storage.local.set(msg.prefs);
    }
});

// Request legacy code to send non-default preferences on startup:
port.postMessage({ send_prefs: true });
