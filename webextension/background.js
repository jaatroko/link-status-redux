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
// something went worng with lookup (not currently used anywhere):
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
	+ (1.2 * prefs.maxLines)
	+ "em; }\n";
    generated_css = css;
}
function send_css(tab_id) {
    browser.tabs.sendMessage(tab_id,
			     { generated_css: generated_css,
			       user_css: prefs.useCustomCSS ?
			                 prefs.customCSS : "" });
}
function broadcast_css() {
    browser.tabs.query({}, function(tabs) {
	for (let tab of tabs)
	    send_css(tab.id);
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
    broadcast_css();
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
    broadcast_css();
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
        let minutesAgo =
	    browser.i18n.getMessage("minutesAgo", minutes).split(";");
	return minutes == 1 ? minutesAgo[0] : minutesAgo[1];
    } else if (elapsed < 60 * 60 * 24) {
        let hours = Math.round(elapsed / (60 * 60));
        let hoursAgo =
	    browser.i18n.getMessage("hoursAgo", hours).split(";");
	return hours == 1 ? hoursAgo[0] : hoursAgo[1];
    } else if (elapsed < 60 * 60 * 24 * 7.5) {
        let days = Math.round(elapsed / (60 * 60 * 24));
        let daysAgo =
	    browser.i18n.getMessage("daysAgo", days).split(";");
	return days == 1 ? daysAgo[0] : daysAgo[1];
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
       
       %%    Literal % character
       
       Conditional blocks for:
       
       %+( .. %+)  Display only when visited
       %-( .. %-)  Display only when not visited
       %+[ .. %+]  Display only when bookmarked
       %-[ .. %-]  Display only when not bookmarked
       %+{ .. %+}  Display only when there is an older visit time
       %-{ .. %-}  Display only when there is not an older visit time
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
    customformat = customformat.replace(regex.escaped_char, function(m, p1) {
	switch(p1) {
	case 'u': return url;
	case 'V': return prefs.prefixVisited;
	case 'B': return prefs.prefixBookmarked;
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



browser.runtime.onMessage.addListener(function(msg, sender) {
    // content script requesting CSS data:
    if (msg.overlay_need_css) {
	send_css(sender.tab.id);
	return;
    }

    // mouseout event:
    if (!msg.url) {
	browser.tabs.sendMessage(sender.tab.id, { show: false });
	return;
    }

    // otherwise it's mousover event:

    function set_overlink(flags, visit_time, visit2_time) {
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
	} else {
	    let timestr = "";
	    let spaces = "";
	    if (prefs.mode !== "left") {
		spaces = "  ";
		url = pretty_url;
	    } else if (!(flags & (VISITED | BOOKMARKED))) {
		// don't show empty panel (the URL part is hidden)
		browser.tabs.sendMessage(sender.tab.id, { show: false });
		return;
	    }
	    if (flags & VISITED) {
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
		if (prefs.showLastVisited
		    && prefs.lastVisitedInFront
		    && (flags & VISITED))
		    prefix += timestr + spaces;
	    }
	}
	let bottom = 0;
	if (prefs.mode === "left")
	    bottom = prefs.bottomOffset;
    	browser.tabs.sendMessage(sender.tab.id,
				 { show: true,
				   mode: prefs.mode,
				   visited: flags & VISITED,
				   recently_visited: flags & RECENTLY_VISITED,
				   two_visit_times: flags & VISITED2,
				   bookmarked: flags & BOOKMARKED,
				   prefix: prefix,
				   url: url,
				   multiline: prefs.maxLines > 1,
				   postfix: postfix,
				   bottom: bottom,
				   mousex: msg.x,
				   mousey: msg.y,
				   offsetx: prefs.mouseOffsetX,
				   offsety: prefs.mouseOffsetY,
				   origin: prefs.mouseOrigin });
    }

    function check_visited(flags) {
	let query = browser.history.getVisits({ url: msg.url });
	query.then(
	    function(result) {
		let newflags = 0;
		let t = 0;
		let t2 = 0;
		if (result.length > 0) {
		    newflags = VISITED;
		    t = result[0].visitTime;;
		    let now = Date.now();
		    let limit = prefs.lastVisitedOlderThan*1000;
		    if (limit >= 1000
			&& now - result[0].visitTime < limit) {
			newflags |= RECENTLY_VISITED;
			for (let i = 1; i < result.length; i++) {
			    if (now - result[i].visitTime >= limit) {
				t2 = result[i].visitTime;
				newflags |= VISITED2;
				break;
			    }
			}
		    }
		}
		set_overlink(flags | newflags, t, t2);
	    },
	    function(error) {
		set_overlink(flags | HISTORY_ERROR, 0, 0);
	    }
	);
    }

    try {
	/* https://bugzilla.mozilla.org/show_bug.cgi?id=1352835
	   we could use a string as the search query, but that would
	   also match descriptions and longer URLs, i.e. it would not
	   be exact => no bookmark search at all for file: URLs.
	 */
	if (msg.url.substr(0, 5) === "file:")
	    check_visited(BOOKMARK_ERROR);
	else {
	    let query = browser.bookmarks.search({ url: msg.url });
	    query.then(
		function(result) {
		    check_visited(result.length > 0 ? BOOKMARKED : 0);
		},
		function(error) {
		    check_visited(BOOKMARK_ERROR);
		}
	    );
	}
    } catch(e) {
	check_visited(BOOKMARK_ERROR);
    }
    
});
