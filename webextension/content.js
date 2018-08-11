let anchor = null;

function create_overlay() {
    let iframe = document.getElementById(overlay_uuid);
    if (iframe === null) {
	iframe = document.createElement("iframe");
	iframe.id = overlay_uuid;
	iframe.frameBorder = 0;
	iframe.scrolling = 0;
	iframe.setAttribute("style", overlay_iframe_css_rules);
	iframe.src = "moz-extension://none/";
	document.documentElement.appendChild(iframe);
	iframe.contentWindow.location = browser.extension.getURL("overlay.html");
    }
}

// If the overlay already exists, it was left by an older version of
// the extension => remove it.
let e = document.getElementById(overlay_uuid);
if (e !== null) e.parentNode.removeChild(e);

if (self === top && document instanceof HTMLDocument) {
    create_overlay();
    browser.runtime.sendMessage({});
}


document.addEventListener("mouseover", function(e) {
    let a;
    for (a = e.target; a !== null; a = a.parentElement) {
	if (a.tagName === "A") {
	    break;
	}
    }
    if (a === null) {
	browser.runtime.sendMessage({});
	anchor = null;
	return;
    }
    if (a === anchor) {
	return;
    }
    anchor = a;
    if (self === top && document instanceof HTMLDocument)
	create_overlay();
    browser.runtime.sendMessage({ url: a.href,
				  x: e.screenX,
				  y: e.screenY });

}, true);
