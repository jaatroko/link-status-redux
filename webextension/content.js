let overlay_uuid = "e0fe7e79ef044e56993c0a0a6874baed";
let anchor = null;

function create_overlay() {
    let iframe = document.getElementById(overlay_uuid);
    if (iframe === null) {
	iframe = document.createElement("iframe");
	iframe.id = overlay_uuid;
	iframe.frameBorder = 0;
	iframe.scrolling = 0;
	iframe.src = browser.extension.getURL("overlay.html");
	/* Reset CSS style to initial, and then specify our
	 * modifications. All done as !important, so that it cannot be
	 * overridden by document CSS. (Page Javascript can still mess
	 * it up, though.) */
	let css =
	    "all: initial !important;" +
	    "display: block !important;" +
	    "width: 100% !important;" +
	    "height: 100% !important;" +
	    "position: fixed !important;" +
	    "left: 0 !important;" +
	    "bottom: 0 !important;" +
	    "margin: 0 !important;" +
	    "padding: 0 !important;" +
	    "pointer-events: none !important;" +
	    "z-index: 2147483647 !important;";
	iframe.setAttribute("style", css);
	document.body.appendChild(iframe);
    }
}

// If the overlay already exists, it was left by an older version of
// the extension => remove it.
let e = document.getElementById(overlay_uuid);
if (e !== null) e.parentNode.removeChild(e);

if (self === top) {
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
    if (self === top) create_overlay();
    browser.runtime.sendMessage({ url: a.href,
				  x: e.screenX,
				  y: e.screenY });

}, true);
