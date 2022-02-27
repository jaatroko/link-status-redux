// save preference to storage.local when changed
for (let input of document.querySelectorAll("*[id]")) {
    if (input.tagName !== "INPUT"
	&& input.tagName !== "SELECT"
	&& input.tagName !== "TEXTAREA")
	continue;
    input.addEventListener("change", function(e) {
	if (!e.target.validity.valid) {
	    return;
	}
	let key = e.target.id;
	let value;
	if (e.target.tagName === "INPUT") {
	    switch (e.target.type) {
	    case "text":
	    case "color":
		value = e.target.value;
		break;
	    case "number":
		value = e.target.valueAsNumber;
		break;
	    case "checkbox":
		value = e.target.checked;
		break;
	    case "radio":
		key = e.target.name;
		for (let radio of document.getElementsByName(e.target.name))
		    if (radio.checked) {
			value = radio.value;
			break;
		    }
		break;
	    default:
		return;
	    }
	} else if (e.target.tagName === "TEXTAREA") {
	    value = e.target.value;
	} else if (e.target.tagName === "SELECT") {
	    value = 1*e.target.value;
	} else
	    return;
	if (value == defaults[key]) {
	    browser.storage.local.remove(key);
	    return;
	}
	let pref = {};
	pref[key] = value;
	browser.storage.local.set(pref);
    });
}

// load preferences from storage.local
browser.storage.local.get(null, function(prefs) {
    for (let key of Object.keys(defaults)) {
	let value = defaults[key];
	if (prefs.hasOwnProperty(key)) {
	    value = prefs[key];
	}
	let input = document.getElementById(key);
	if (input === null) {
	    let found = false;
	    for (let radio of document.getElementsByName(key))
		if (radio.value === value) {
		    radio.checked = true;
		    found = true;
		    break;
		}
	    if (found && value != defaults[key]) {
		delete prefs[key];
	    }
	    continue;
	}
	if (input.tagName === "INPUT") {
	    switch (input.type) {
	    case "text":
	    case "color":
		input.value = value;
		break;
	    case "number":
		input.valueAsNumber = value;
		break;
	    case "checkbox":
		input.checked = value;
		break;
	    default:
		continue;
	    }
	} else if (input.tagName === "TEXTAREA") {
	    input.value = value;
	} else if (input.tagName === "SELECT") {
	    input.value = value;
	} else
	    continue;
	if (value != defaults[key]) {
	    delete prefs[key];
	}
    }
    let removedKeys = Object.keys(prefs);
    if (removedKeys.length > 0) {
	browser.storage.local.remove(removedKeys);
    }
});
