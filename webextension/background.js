let prefs = {};
let generated_css = "";


// Flags
// link is bookmarked:
const BOOKMARKED       = 0x01;
// link has been visited:
const VISITED          = 0x02;
// latest visit time is below limit:
const RECENTLY_VISITED = 0x04;
// latest visit time below limit AND there exists a visit time above
// limit (and it is set to be displayed):
const VISITED2         = 0x08;
// link is currently open in a tab:
const CURRENTLY_OPEN   = 0x10;
// something went wrong with lookups (not currently used anywhere):
const TABS_ERROR       = 0x20;
const BOOKMARK_ERROR   = 0x40;
const HISTORY_ERROR    = 0x80;


/* Note: the regexp objects are stored in an object to ensure
 * that they are compiled only once.
 */
let regex = {
    notvisited_block: /%-\(.*?%-\)/g,
    visited_markers: /%\+[\(\)]/g,
    visited_block: /%\+\(.*?%\+\)/g,
    notvisited_markers: /%-[\(\)]/g,
    notbookmarked_block: /%-\[.*?%-\]/g,
    bookmarked_markers: /%\+[\[\]]/g,
    bookmarked_block: /%\+\[.*?%\+\]/g,
    notbookmarked_markers: /%-[\[\]]/g,
    escaped_char: /%(.)/g,
    precision_escaped_char: /%(\d?)(.)/g,
    notvisited2_block: /%-\{.*?%-\}/g,
    visited2_markers: /%\+[\{\}]/g,
    visited2_block: /%\+\{.*?%\+\}/g,
    notvisited2_markers: /%-[\{\}]/g,
    notcurrentlyopen_block: /%-\<.*?%-\>/g,
    currentlyopen_markers: /%\+[\<\>]/g,
    currentlyopen_block: /%\+\<.*?%\+\>/g,
    notcurrentlyopen_markers: /%-[\<\>]/g,

    // Match ASCII control characters and bidirectional formatting
    // characters (RFC 3987 sections 3.2 and 4.1 paragraph 6) for
    // escaping.
    control_and_bidi: /[\x00-\x1f\u200e\u200f\u202a-\u202e]+/g
};


function generate_css() {
    let css = "";
    // colors
    css += "div { color: " + prefs.colorText + "; background: "
	+ prefs.colorBackground + "; border-color: "
	+ prefs.colorBorder + "; }\n"
	+ "#overflow_begin { background: linear-gradient("
	+ "to right, transparent, " + prefs.colorBackground + "); }\n"
	+ "#overflow_end { background: linear-gradient("
	+ "to left, transparent, " + prefs.colorBackground + "); }\n";
    // max lines for URL
    css += ".multiline #url_begin { max-height: "
	+ (1.3 * prefs.maxLines)
	+ "em; }\n";
    generated_css = css;
}
// tabs.insertCSS replay causes an exception, so keep track of it here:
let css_inserted = {};
function send_css(tab_id, iframe_css) {
    // Insert user-origin CSS to the tab so the style cannot be
    // overridden by a page script changing the style property of the
    // iframe. Requires Firefox 53+. The goal is to not insert the CSS
    // multiple times per tab. This is done by having iframe_css==true
    // only when the overlay script requests CSS (i.e. overlay startup
    // =~ tab startup), and on background script startup when
    // preferences are read and CSS is broadcast to all tabs. This
    // results in 1-2 inserts per tab (per extension startup, e.g. on
    // reload/upgrade), depending on timing.
    if (iframe_css && !css_inserted[tab_id]) {
	css_inserted[tab_id] = true;
	try { // throws on Firefox <53
	    browser.tabs.insertCSS(tab_id,
				   { code: overlay_iframe_css,
				     cssOrigin: "user" });
	} catch(e) {}
    }
    browser.tabs.sendMessage(tab_id,
			     { type: "ovl:css",
                               generated_css: generated_css,
			       user_css: prefs.useCustomCSS ?
			                 prefs.customCSS : "" }).catch(e => {});
}
function broadcast_css(iframe_css) {
    browser.tabs.query({url: "<all_urls>"}, function(tabs) {
	for (let tab of tabs)
	    send_css(tab.id, iframe_css);
    });
}

browser.storage.local.get(null, function(result) {
    prefs = result;
    for (let key of Object.keys(defaults)) {
	if (!prefs.hasOwnProperty(key)) {
	    prefs[key] = defaults[key];
	}
    }
    generate_css();
    // initial broadcast of CSS to all tabs => also insert iframe CSS
    broadcast_css(true);

    // Now that we have loaded the preferences, check whether we need
    // to show the news page. The news page is only shown when a new
    // (major) feature is added, indicated by the feature level
    // preference value. As the feature level value we will use
    // 10000*major+minor of the version number where the latest
    // feature was added. It is saved negated so that it won't get
    // removed from storage due to being equal to the default value.
    let user_featureLevel = prefs.featureLevel; // negative if not new install
    let addon_featureLevel = defaults.featureLevel; // positive
    if (user_featureLevel < 0) {
        // non-default value => possible upgrade => check if changed
        if (-user_featureLevel < addon_featureLevel) {
            browser.tabs.create({url: browser.runtime.getURL("news.html")});
            prefs.featureLevel = -addon_featureLevel;
            browser.storage.local.set({ "featureLevel": prefs.featureLevel });
        }
    } else {
        // default value => new install => do not show news
        prefs.featureLevel = -addon_featureLevel;
        browser.storage.local.set({ "featureLevel": prefs.featureLevel });
    }
});
browser.storage.onChanged.addListener(function(changes, area) {
    for (let key of Object.keys(changes)) {
	if ("newValue" in changes[key]) {
	    prefs[key] = changes[key].newValue;
	} else if ("oldValue" in changes[key]) {
	    prefs[key] = defaults[key];
	}
    }
    generate_css();
    broadcast_css(false);
});



function formatURL(url) {
    try {
	url = decodeURI(url);
    } catch (e) {
	// url must have included an invalid UTF-8 sequence.
	return "!" + url;
    }
    return url.replace(regex.control_and_bidi, encodeURIComponent);
}

function formatTime(date) {
    let elapsed = (Date.now() - date) / 1000; // in seconds
    if (elapsed < 60 * 60) {
        let minutes = Math.round(elapsed / 60);
        return i18n_plural("minutesAgo", minutes);
    } else if (elapsed < 60 * 60 * 24) {
        let hours = Math.round(elapsed / (60 * 60));
        return i18n_plural("hoursAgo", hours);
    } else if (elapsed < 60 * 60 * 24 * 7.5) {
        let days = Math.round(elapsed / (60 * 60 * 24));
        return i18n_plural("daysAgo", days);
    } else if (prefs.useISODate) {
        let d = new Date(date);
        function pad(n) { return n < 10 ? '0' + n : n; }
        return d.getFullYear() + '-'
            + pad(d.getMonth() + 1) + '-'
            + pad(d.getDate());
    } else {
        // XXX: This returns the date in the browser's current locale,
        // which may not be the same as the extension's locale
        // (when the extension is not localized to the browser's locale).
        return (new Date(date)).toLocaleDateString();
    }
}





function formatCustom(customformat, url, flags, visit_time, visit2_time) {
    /* printf/strftime-style formatting, supported replacements
       For visit time (expanded from %T or %t):
       
       %c    Value of Date.toLocaleString();
       %x    Value of Date.toLocaleDateString();
       %X    Value of Date.toLocaleTimeString();
       %Y    Year (4 digits)
         %y  Year, no century (00..99)
       %m    Month (01..12)
         %b  Month name from user-defined list
       %a    Weekday name from user-defined list
       %d    Day of month (01..31)
         %e  Day of month (1..31)
       %H    Hour (00..23)
         %k  Hour (0..23)
         %I  Hour (01..12)
         %l  Hour (1..12)
         %p  AM/PM
         %P  am/pm
         %z  Timezone hour offset (e.g. +0200)
       %M    Minute (00..59)
       %S    Second (00..60)
       
       %0s   N seconds ago, prefixed with decimal places to use [0-9]
       %0m   same as above, but minutes (60)
       %0h   same as above, but hours (60*60)
       %0d   same as above, but days (60*60*24)
       %0w   same as above, but weeks (60*60*24*7)
       %0M   same as above, but months (60*60*24*30.436875)
       %0y   same as above, but years (60*60*24*365.2425)
       
       %%    Literal % character

       For custom overlink text:

       %T    Visit time formatted as above ("" if not visited)
       %t    Older visit time formatted as above ("" if none)
       %u    Link URL
       %V    Visited indicator
       %B    Bookmarked indicator
       %O    Currently open indicator
       
       %%    Literal % character
       
       Conditional blocks for:
       
       %+( .. %+)  Display only when visited
       %-( .. %-)  Display only when not visited
       %+[ .. %+]  Display only when bookmarked
       %-[ .. %-]  Display only when not bookmarked
       %+{ .. %+}  Display only when there is an older visit time
       %-{ .. %-}  Display only when there is not an older visit time
       %+< .. %+>  Display only when currently open
       %-< .. %->  Display only when not currently open
    */

    let customvisited = prefs.customDateDefault;
    let customvisited2 = prefs.customDateDefault;

    let now = Date.now();
    let elapsed = (now - visit_time) / 1000;
    for (let i = 0; i < 7; i++)
        if (elapsed < prefs["customLimit"+i]) {
            customvisited = prefs["customDate"+i];
            break;
        }
    elapsed = (now - visit2_time) / 1000;
    for (let i = 0; i < 7; i++)
        if (elapsed < prefs["customLimit"+i]) {
            customvisited2 = prefs["customDate"+i];
            break;
        }

    // handle conditional blocks (non-greedy matches)
    if (flags & VISITED) {
        customformat = customformat.replace(regex.notvisited_block, "");
        customformat = customformat.replace(regex.visited_markers, "");
    } else {
        customformat = customformat.replace(regex.visited_block, "");
        customformat = customformat.replace(regex.notvisited_markers, "");
    }
    if (flags & BOOKMARKED) {
        customformat = customformat.replace(regex.notbookmarked_block, "");
        customformat = customformat.replace(regex.bookmarked_markers, "");
    } else {
        customformat = customformat.replace(regex.bookmarked_block, "");
        customformat = customformat.replace(regex.notbookmarked_markers, "");
    }
    if (flags & VISITED2) {
        customformat = customformat.replace(regex.notvisited2_block, "");
        customformat = customformat.replace(regex.visited2_markers, "");
    } else {
        customformat = customformat.replace(regex.visited2_block, "");
        customformat = customformat.replace(regex.notvisited2_markers, "");
    }
    if (flags & CURRENTLY_OPEN) {
        customformat = customformat.replace(regex.notcurrentlyopen_block, "");
        customformat = customformat.replace(regex.currentlyopen_markers, "");
    } else {
        customformat = customformat.replace(regex.currentlyopen_block, "");
        customformat = customformat.replace(regex.notcurrentlyopen_markers, "");
    }
    customformat = customformat.replace(regex.escaped_char, function(m, p1) {
	switch(p1) {
	case 'u': return url;
	case 'V': return prefs.prefixVisited;
	case 'B': return prefs.prefixBookmarked;
	case 'O': return prefs.prefixCurrentlyOpen;
	case '%': return "%";
	case 'T':
	case 't': {
	    let vt = visit_time;
            let s = customvisited;
            if (p1 == 'T') {
                if (!(flags & VISITED))
                    return "";
            } else { // 't'
                if (!(flags & VISITED2))
                    return "";
		vt = visit2_time;
                s = customvisited2;
            }
	    let d = new Date(vt);
            let mnames = prefs.customMonthNames.split(",");
            let dnames = prefs.customWeekdayNames.split(",");
	    
            return s.replace(regex.precision_escaped_char, function(m, p1, p2) {
                if (p1 == "") { // date element
                    function pad(n) { return n < 10 ? '0' + n : n; }
		    
                    switch(p2) {
                    case 'c': return d.toLocaleString();
                    case 'x': return d.toLocaleDateString();
                    case 'X': return d.toLocaleTimeString();
                    case 'Y': return d.getFullYear();
                    case 'y': return pad(d.getFullYear() % 100);
                    case 'm': return pad(d.getMonth() + 1);
                    case 'b': return mnames[d.getMonth()];
                    case 'a': return dnames[d.getDay()];
                    case 'd': return pad(d.getDate());
                    case 'e': return d.getDate(); 
                    case 'H': return pad(d.getHours());
                    case 'k': return d.getHours();
                    case 'I':
                    case 'l': {
                        let h = d.getHours();
                        if (h == 0)
                            h = 12;
                        else if (h > 12)
                            h -= 12;
                        if (p2 == 'I')
                            h = pad(h);
                        return h;
		    }
                    case 'p':
                        if (d.getHours() < 12)
                            return "AM";
                        else
                            return "PM";
                    case 'P':
                        if (d.getHours() < 12)
                            return "am";
                        else
                            return "pm";
                    case 'z': {
                        let s = "-";
                        let t = d.getTimezoneOffset();
                        if (t <= 0) {
                            t = -t;
                            s = "+";
                        }
                        return s + pad((t/60).toFixed(0)) + pad(t%60);
		    }
                    case 'M': return pad(d.getMinutes());
                    case 'S': return pad(d.getSeconds());
                    case '%': return "%";
                    }
                } else { // "ago" element
		    let s = (now - vt) / 1000;
                    switch(p2) {
                    case 's': return s.toFixed(p1);
                    case 'm': return (s / 60).toFixed(p1);
                    case 'h': return (s / 3600).toFixed(p1);
                    case 'd': return (s / 86400).toFixed(p1);
                    case 'w': return (s / 604800).toFixed(p1);
                    case 'M': return (s / 2629746).toFixed(p1);
                    case 'y': return (s / 31556952).toFixed(p1);
                    }
                }
                return "";
            });
	}
	default:
	    return "";
	}
    });

    return customformat;
}


// Tab zoom factor (default 1), maps tabId => float
let zoom_factor = {};
function get_zoom(tabId) {
    return zoom_factor[tabId] ? zoom_factor[tabId] : 1;
}
// Maps tabId => true/untrue, based on whether the overlay has
// finished loading (indicated by the reception of the need_css
// message)
let overlay_ready = {};
// Storage for latest message sent to non-ready overlays, maps tabId => Object
let deferred_message = {};
// innerHeight of main/top window, maps tabId => int
let window_height = {};
// Send a (show/hide) message to overlay in a tab, and also defer it
// if the overlay is not yet ready so it will be resent when the
// overlay becomes ready. Sending the message regardless of readiness
// prevents a situation where no messages are ever sent to the overlay
// due to a race condition with messages.
function send_to_overlay(id, msg) {
    if (!overlay_ready[id]) {
	deferred_message[id] = msg;
    }
    if (window_height[id]) // add latest known height
	msg.mainwindow_height = window_height[id];
    browser.tabs.sendMessage(id, msg).catch(e => {});
}


async function set_overlink(msg, sender) {
    let bookmark_query;
    /* https://bugzilla.mozilla.org/show_bug.cgi?id=1352835
       we could use a string as the search query, but that would
       also match descriptions and longer URLs, i.e. it would not
       be exact => no bookmark search at all for file: URLs.
    */
    if (msg.url.substr(0, 5) === "file:") {
        bookmark_query = Promise.reject(new Error("invalid bookmark URL"));
    } else {
        try {
	    bookmark_query = browser.bookmarks.search({ url: msg.url });
        } catch(e) {
            bookmark_query =
                Promise.reject(new Error("bookmark search failed"));
        }
    }

    let visited_query = browser.history.getVisits({ url: msg.url });

    /* Note: using <all_urls> as match pattern here, as using msg.url
       as the match pattern won't match non-standard ports or fragment
       identifiers. This is theoretically inefficient (and potentially
       slow) but it shouldn't matter in practice.
    */
    let tabs_query = browser.tabs.query({url: "<all_urls>"});

    const queries = [ bookmark_query, visited_query, tabs_query ];
    const results = await Promise.allSettled(queries);

    let flags = 0;
    let visit_time = 0;
    let visit2_time = 0;

    // bookmark query:
    if (results[0].status === "fulfilled") {
        if (results[0].value.length > 0)
            flags |= BOOKMARKED;
    } else {
        flags |= BOOKMARK_ERROR;
    }

    // visited query:
    if (results[1].status === "fulfilled") {
        let result = results[1].value;
	if (result.length > 0) {
	    flags |= VISITED;
	    visit_time = result[0].visitTime;;
	    let now = Date.now();
	    let limit = prefs.lastVisitedOlderThan*1000;
	    if (limit >= 1000 && now - result[0].visitTime < limit) {
		flags |= RECENTLY_VISITED;
		for (let i = 1; i < result.length; i++) {
		    if (now - result[i].visitTime >= limit) {
			visit2_time = result[i].visitTime;
			flags |= VISITED2;
			break;
		    }
		}
	    }
	}
    } else {
        flags |= HISTORY_ERROR;
    }

    // tabs query:
    if (results[2].status === "fulfilled") {
        let tabs = results[2].value;
        for (let tab of tabs) {
            if (tab.url === msg.url) {
                flags |= CURRENTLY_OPEN;
                break;
            }
        }
    } else {
        flags |= TABS_ERROR;
    }


    let prefix = "";
    let postfix = "";
    let url = "";
    let pretty_url = formatURL(msg.url);
    if (prefs.useCustomFormat) {
	prefix = formatCustom(prefs.customPrefix, pretty_url,
			      flags, visit_time, visit2_time);
	url = formatCustom(prefs.customURL, pretty_url,
			   flags, visit_time, visit2_time);
	postfix = formatCustom(prefs.customPostfix, pretty_url,
			       flags, visit_time, visit2_time);
	if (prefix === "" && url === "" && postfix === "") {
	    // all elements empty => hide panel
	    send_to_overlay(sender.tab.id, { type: "ovl:hide" });
	    return;
	}
    } else {
        let currently_open =
            prefs.showCurrentlyOpen && (flags & CURRENTLY_OPEN);
	let timestr = "";
	let spaces = "";
	if (prefs.mode !== "left") {
	    spaces = "  ";
	    url = pretty_url;
	} else if (!(flags & (VISITED | BOOKMARKED)) && !currently_open) {
	    // don't show empty panel (the URL part is hidden)
	    send_to_overlay(sender.tab.id, { type: "ovl:hide" });
	    return;
	}
        if (currently_open) {
            // This *should* be redundant as CURRENTLY_OPEN implies
            // VISITED, which is handled below, but handle it here
            // just in case. (Possible scenarios(?): 1) tab is
            // unloaded (after session restore) but visits are erased
            // from history. 2) tab is open but not finished loading.)
            prefix = prefs.prefixCurrentlyOpen;
        }
	if (flags & VISITED) {
            // CURRENTLY_OPEN implies VISITED => only show one prefix:
            if (currently_open)
                prefix = prefs.prefixCurrentlyOpen;
            else
                prefix = prefs.prefixVisited;
	    let dt = new Date(visit_time);
	    timestr = formatTime(dt); // latest time
	    if (flags & VISITED2) {
		dt = new Date(visit2_time); // older time
		if (prefs.lastVisitedTwoDates)
		    timestr += "; " + formatTime(dt);
		else
		    timestr = formatTime(dt);
	    }
	    timestr = "(" + timestr + ")";
	    if (prefs.showLastVisited) {
		if (prefs.lastVisitedInFront) {
		    prefix += timestr + spaces;
		} else {
		    postfix = spaces + timestr;
		}
	    }
	}
	if (flags & BOOKMARKED) {
	    prefix = prefs.prefixBookmarked;
            // CURRENTLY_OPEN does not imply BOOKMARKED or vice versa
            // => show both prefixes
            if (currently_open)
                prefix = prefs.prefixCurrentlyOpen + prefix;
	    if (prefs.showLastVisited
		&& prefs.lastVisitedInFront
		&& (flags & VISITED))
		prefix += timestr + spaces;
	}
    }
    let bottom = 0;
    if (prefs.mode === "left")
	bottom = prefs.bottomOffset;
    send_to_overlay(sender.tab.id,
		    { type: "ovl:show",
		      mode: prefs.mode,
		      visited: flags & VISITED,
		      recently_visited: flags & RECENTLY_VISITED,
		      two_visit_times: flags & VISITED2,
		      bookmarked: flags & BOOKMARKED,
                      currently_open: flags & CURRENTLY_OPEN,
		      prefix: prefix,
		      url: url,
		      multiline: prefs.maxLines > 1,
		      postfix: postfix,
		      bottom: bottom,
		      mousex: msg.x,
		      mousey: msg.y,
		      offsetx: prefs.mouseOffsetX,
		      offsety: prefs.mouseOffsetY,
		      origin: prefs.mouseOrigin,
                      zoom: get_zoom(sender.tab.id) });
}

browser.runtime.onMessage.addListener(function(msg, sender) {
    // For readability, the prefix of msg.type identifies the other
    // party (either sender or recipient):
    //   top: content.js, top-level frame of the tab
    //   tab: content.js, any frame in the tab
    //   ovl: overlay.js in the tab
    if (msg.type === "top:hello") {
	window_height[sender.tab.id] = msg.win_h;

    } else if (msg.type === "top:resize") {
	window_height[sender.tab.id] = msg.win_h;

    } else if (msg.type === "tab:mouseover") {
        if (!overlay_ready[sender.tab.id])
            browser.tabs.sendMessage(sender.tab.id,
                                     { type: "top:create_overlay" }
                                    ).catch(e => {});
        set_overlink(msg, sender);

    } else if (msg.type === "tab:mouseout") {
	send_to_overlay(sender.tab.id, { type: "ovl:hide" });

    } else if (msg.type === "ovl:hello") {
	overlay_ready[sender.tab.id] = true;

    } else if (msg.type === "ovl:need_css") {
	// Content script requesting CSS data == no CSS sent to the
	// tab yet (barring race conditions) => also insert iframe CSS.
	// Reception of this message also means that the overlay has
	// finished loading i.e. is ready.
	overlay_ready[sender.tab.id] = true;
	send_css(sender.tab.id, true);
	if (deferred_message[sender.tab.id]) {
	    let msg = deferred_message[sender.tab.id];
	    delete deferred_message[sender.tab.id];
	    if (window_height[sender.tab.id]) // add latest known height
		msg.mainwindow_height = window_height[sender.tab.id];
	    browser.tabs.sendMessage(sender.tab.id, msg).catch(e => {});
	}
	return;
    }
});


browser.tabs.onZoomChange.addListener(function(zoom) {
    zoom_factor[zoom.tabId] = zoom.newZoomFactor;
    // Reacting to zoom changes immediately is non-trivial with the
    // current structure of overlay.js, so we are content to send the
    // new zoom factor with the next "show" message.
});

browser.tabs.onUpdated.addListener(function(id, changeinfo, tab) {
    // reset overlay readiness and tab CSS status on page (re)load
    if (changeinfo.hasOwnProperty("status") && changeinfo.status === "loading")
    {
	css_inserted[id] = false;
	overlay_ready[id] = false;
    }
});

browser.tabs.onRemoved.addListener(function(removedTabId) {
    // delete from overlay readiness, tab CSS status and window_height
    delete css_inserted[removedTabId];
    delete overlay_ready[removedTabId];
    delete window_height[removedTabId];
    delete zoom_factor[removedTabId];
});
