let anchor = null;
let overlay_enabled = false;

function create_overlay() {
    let overlay = document.getElementById(overlay_uuid);
    if (overlay === null) {
        let iframe = document.createElement("iframe");
	iframe.id = overlay_uuid;
	iframe.frameBorder = 0;
	iframe.scrolling = 0;
	iframe.setAttribute("style", overlay_iframe_css_rules);
	iframe.src = "moz-extension://none/";
        // Encapsulate the iframe in a shadow DOM if shadow DOMs are
        // supported:
        if (document.documentElement.attachShadow) {
            let div = document.createElement("div");
            let shadowroot = div.attachShadow({ mode: "closed" });
            // The UUID is mainly for preventing accidental ID
            // clashes, not obfuscation, thus not needed inside a
            // shadow DOM; make the iframe ID descriptive for people
            // using the browser's inspector:
            iframe.id = "link_status_redux_popup_overlay";
            // The "special" src value causes error messages in web
            // console and is not needed with shadow DOM:
            iframe.src = "";
            div.id = overlay_uuid;
            div.setAttribute("style", overlay_iframe_css_rules);
            shadowroot.appendChild(iframe);
            document.documentElement.appendChild(div);
        } else {
            document.documentElement.appendChild(iframe);
        }
	iframe.contentWindow.location = browser.runtime.getURL("overlay.html");
    }
}

function destroy_overlay() {
    let overlay = document.getElementById(overlay_uuid);
    if (overlay !== null)
        overlay.parentNode.removeChild(overlay);
}


// If the overlay already exists, it was left by an older version of
// the extension => remove it.
destroy_overlay();

if (self === top && document instanceof HTMLDocument) {
    browser.runtime.onMessage.addListener(function(msg, sender) {
        if (msg.type === "top:create_overlay") {
            create_overlay();
            overlay_enabled = true;
        } else if (msg.type === "top:destroy_overlay") {
            destroy_overlay();
            overlay_enabled = false;
        }
    });

    self.addEventListener("resize", function(e) {
	browser.runtime.sendMessage({ type: "top:resize",
                                      win_h: self.innerHeight }).catch(e => {});
    }, true);
    browser.runtime.sendMessage({ type: "top:hello",
                                  win_h: self.innerHeight }).catch(e => {});
}


document.addEventListener("mouseover", function(e) {
    let a;
    for (a = e.target; a !== null; a = a.parentElement) {
	if (a.tagName === "A" || a.tagName === "AREA") {
	    break;
	}
    }
    if (a === anchor) {
	return;
    }
    anchor = a;
    if (a === null) {
        browser.runtime.sendMessage({ type: "tab:mouseout" }).catch(e => {});
        return;
    }
    if (self === top && document instanceof HTMLDocument && overlay_enabled)
	create_overlay();
    let win_h = 0;
    if (self === top)
	win_h = self.innerHeight;
    browser.runtime.sendMessage({ type: "tab:mouseover",
                                  url: a.href,
				  x: e.screenX,
				  y: e.screenY,
				  win_h: win_h }).catch(e => {});

}, true);
