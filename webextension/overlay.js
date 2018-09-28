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
let user_css = document.getElementById("user_css");

let initial_css = false;


wrapper.style.display = "none";

browser.runtime.onMessage.addListener(function(msg) {
    if (msg.hasOwnProperty("generated_css")) {
	generated_css.textContent = msg.generated_css;
	initial_css = true;
    }
    if (msg.hasOwnProperty("user_css")) {
	user_css.textContent = msg.user_css;	
	initial_css = true;
    }
    if (msg.hasOwnProperty("generated_css") || msg.hasOwnProperty("user_css")) {
	// CSS messages do not contain any show commands
	return;
    }
    if (!initial_css)
	browser.runtime.sendMessage({ overlay_need_css: true });

    if (!msg.show) {
	wrapper.style.display = "none";
	return;
    }
    /* transform to document-relative coordinates: */
    msg.mousex -= window.mozInnerScreenX;
    msg.mousey -= window.mozInnerScreenY;
    
    wrapper.style.display = "";
    let floating = msg.mode === "float";

    let classes = msg.mode;
    classes += msg.multiline ? " multiline" : " oneline";
    if (msg.visited) classes += " visited";
    if (msg.recently_visited) classes += " recently_visited";
    if (msg.two_visit_times) classes += " two_visit_times";
    if (msg.bookmarked) classes += " bookmarked";
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
    if (msg.mainwindow_height > win_h)
	msg.bottom -= (msg.mainwindow_height - win_h);
    if (msg.bottom < 0) msg.bottom = 0;

    // floating coordinates:
    let fx = 0;
    let fy = 0;
    if (floating) {
	fx = msg.mousex + msg.offsetx;
	fy = msg.mousey + msg.offsety;
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
    let w = panel.offsetWidth;
    let h = panel.offsetHeight;
    if (floating) {
	if (msg.offsety >= 0) {
	    if (fy + h >= win_h) {
		fy = msg.mousey - 20 - h;
		evaded = true;
	    }
	} else {
	    if (fy < h) {
		fy = msg.mousey + 30;
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
	let margin = 5;
	if (msg.mousex < w + margin
	    && msg.mousey < win_h - msg.bottom + margin
	    && msg.mousey > win_h - msg.bottom - h - margin)
	{
	    panel.style.bottom = win_h - msg.mousey + 20 + "px";
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
browser.runtime.sendMessage({ overlay_need_css: true });
