let wrapper = document.getElementById("wrapper");
let panel = document.getElementById("panel");
let prefix = document.getElementById("prefix");
let url_begin = document.getElementById("url_begin");
let url_end = document.getElementById("url_end");
let url_begin_wrapper = document.getElementById("url_begin_wrapper");
let url_end_wrapper = document.getElementById("url_end_wrapper");
let overflow_begin = document.getElementById("overflow_begin");
let overflow_end = document.getElementById("overflow_end");
let postfix = document.getElementById("postfix");
let generated_css = document.getElementById("generated_css");
let zoom_css = document.getElementById("zoom_css");
let user_css = document.getElementById("user_css");

let initial_css = false;
let scale = 1;


wrapper.style.display = "none";

browser.runtime.onMessage.addListener(function(msg) {
    if (msg.type === "ovl:css") {
        if (msg.hasOwnProperty("generated_css")) {
	    generated_css.textContent = msg.generated_css;
	    initial_css = true;
        }
        if (msg.hasOwnProperty("user_css")) {
	    user_css.textContent = msg.user_css;
	    initial_css = true;
        }
        return;

    } else if (msg.type === "top:create_overlay") {
        // If we "overhear" this message, it (probably) means that the
        // background script does not know we exists, so let it know:
        browser.runtime.sendMessage({ type: "ovl:hello" });
        return;
    }

    if (!initial_css)
	browser.runtime.sendMessage({ type: "ovl:need_css" });

    if (msg.type === "ovl:hide") {
        wrapper.style.display = "none";
        return;
    } else if (msg.type !== "ovl:show")
        return;

    let floating = msg.mode === "float";

    let new_scale = 1 / msg.zoom;
    if (new_scale !== scale) {
        scale = new_scale;
        if (scale === 1) {
            zoom_css.textContent = "";
        } else {
            let refx = "left";
            let refy = "bottom";
            if (floating) {
                refy = "top";
            }
            zoom_css.textContent =
                "#panel { transform: scale(" + scale
                + "); transform-origin: " + refx + " " + refy + " 0; }";
        }
    }

    /* scale to CSS pixels: */
    msg.mousex *= scale;
    msg.mousey *= scale;
    /* transform to document-relative coordinates: */
    msg.mousex -= window.mozInnerScreenX;
    msg.mousey -= window.mozInnerScreenY;
    
    wrapper.style.display = "";

    let classes = msg.mode;
    classes += msg.multiline ? " multiline" : " oneline";
    if (msg.visited) classes += " visited";
    if (msg.recently_visited) classes += " recently_visited";
    if (msg.two_visit_times) classes += " two_visit_times";
    if (msg.bookmarked) classes += " bookmarked";
    if (msg.currently_open) classes += " currently_open";
    wrapper.className = classes;

    // Compensate for the height of the horizontal scrollbar in the
    // bottom offset. According to the documentation of
    // window.innerHeight it should not include anything other than
    // scrollbar and the page area, so this should always work. (As
    // long as the innerHeight is taken in the content script which
    // has access to the top/main window; here it is the iframe window
    // which has the height of win_h, and the unprivileged iframe has
    // no access to window.top.innerHeight.)
    let win_w = document.documentElement.clientWidth;
    let win_h = document.documentElement.clientHeight;
    // Compensate for zoom; scrollbar adjustment is not compensated:
    msg.bottom *= scale;
    if (msg.mainwindow_height > win_h)
	msg.bottom -= (msg.mainwindow_height - win_h);
    if (msg.bottom < 0) msg.bottom = 0;

    // floating coordinates:
    let fx = 0;
    let fy = 0;
    if (floating) {
	fx = msg.mousex + scale * msg.offsetx;
	fy = msg.mousey + scale * msg.offsety;
	panel.style.left = "0px";
	panel.style.top = "0px";
	panel.style.bottom = "";
    } else {
	panel.style.left = "";
	panel.style.top = "";
	panel.style.bottom = msg.bottom + "px";
    }

    overflow_begin.style.display = "none";
    overflow_end.style.display = "none";
    url_end.style.display = "none";

    url_begin.textContent = msg.url;
    url_end.textContent = msg.url;
    prefix.textContent = msg.prefix;
    postfix.textContent = msg.postfix;
    
    if (url_begin.offsetHeight + 2 < url_begin.scrollHeight // too many lines
       || url_begin.offsetWidth < url_begin.scrollWidth) // or too wide
    {
	overflow_begin.style.display = "";
	overflow_end.style.display = "";
	url_end.style.display = "";
    }

    // move panel away from under the mouse pointer
    let evaded = false;
    let rect = panel.getBoundingClientRect();
    let w = rect.width;
    let h = rect.height;
    if (floating) {
	if (msg.offsety >= 0) {
	    if (fy + h >= win_h) {
		fy = msg.mousey - 20*scale - h;
		evaded = true;
	    }
	} else {
	    if (fy < h) {
		fy = msg.mousey + 30*scale;
		evaded = true;
	    } else
		fy -= h;
	}

	if (msg.origin === 2) //right
	    fx -= w;
	if (msg.origin === 1) //center
	    fx -= 0.5*w;
	if (fx < 0)
	    fx = 0;
	if (fx + w >= win_w)
	    fx = win_w - w;

	panel.style.left = fx + "px";
	panel.style.top = fy + "px";
    } else {
	let margin = 5*scale;
	if (msg.mousex < w + margin
	    && msg.mousey < win_h - msg.bottom + margin
	    && msg.mousey > win_h - msg.bottom - h - margin)
	{
	    panel.style.bottom = win_h - msg.mousey + 20*scale + "px";
	    evaded = true;
	}
    }

    // Note: If the evaded class affects the size of the div, adding
    // it at this point may cause undesired effects. Solution: do not
    // specify evaded class a (significantly) different size than the
    // normal.
    if (evaded)
	wrapper.className += " evaded";
});

// this might not get there, mostly on add-on load time, that's why we
// have the initial_css variable:
browser.runtime.sendMessage({ type: "ovl:need_css" });
