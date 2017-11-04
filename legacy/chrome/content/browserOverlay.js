var linkstatusredux = {};
{
    linkstatusredux.prefs = null;
    linkstatusredux.prefShowLastVisited = true;
    linkstatusredux.prefUseISODate = false;
    linkstatusredux.prefLastVisitedInFront = false;
    linkstatusredux.prefVerboseLog = false;
    linkstatusredux.prefSlowQueriesThreshold = 30; // Report a query of last-visited date as slow if it takes at least this time in milliseconds

    linkstatusredux.overLinkVisited = false;
    linkstatusredux.overLinkBookmarked = false;
    linkstatusredux.statusHistoryState = null;
    linkstatusredux.lastTimeVisited = null;
    linkstatusredux.lastTimeVisitedDate = null;
    linkstatusredux.lastTimeVisitedElapsed = 0;
    linkstatusredux.lastTimeVisitedDate2 = null;
    linkstatusredux.lastTimeVisitedElapsed2 = 0;
    linkstatusredux.formatDate2 = false;
    linkstatusredux.statusLastTimeVisited = null;

    linkstatusredux.prefPrefixVisited = "\u2729 ";
    linkstatusredux.prefPrefixBookmarked = "\u2318 ";

    linkstatusredux.prefS4eWait = 10;
    linkstatusredux.escapeRegex = null;

    linkstatusredux.prefUseCustomFormat = false;
    linkstatusredux.prefCustomOverLink = "%u%T";
    linkstatusredux.prefCustomDateDefault = "  (%c)";
    linkstatusredux.prefCustomLimit = [ 0, 0, 0, 0, 0, 0, 0 ];
    linkstatusredux.prefCustomDate = [ "", "", "", "", "", "", "" ];
    linkstatusredux.prefCustomWeekdayNames = [];
    linkstatusredux.prefCustomMonthNames = [];
    linkstatusredux.customRegex = [ null, null, null, null, null,
				    null, null, null, null, null,
				    null, null, null, null ];

    linkstatusredux.prefLastVisitedOlderThan = 0;
    linkstatusredux.prefLastVisitedQueryLimit = 5;
    linkstatusredux.prefLastVisitedTwoDates = false;


    linkstatusredux.startup = function() {
	this.initialized = true;
	this.strings = document.getElementById('linkstatusredux-strings');

	this.consolesvc = Components.classes['@mozilla.org/consoleservice;1']
            .getService(Components.interfaces.nsIConsoleService);

	Components.utils.import("resource://gre/modules/PluralForm.jsm");
	var pluralRule = Number(this.strings.getString('pluralRule'));
	[this.pluralGet, this.pluralNumForms] = PluralForm.makeGetter(pluralRule);

	this.prefs = Components.classes['@mozilla.org/preferences-service;1']
            .getService(Components.interfaces.nsIPrefService)
            .getBranch('extensions.linkstatusredux.');
	this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
	this.prefs.addObserver('', this, false);

	this.prefShowLastVisited = this.prefs.getBoolPref('showLastVisited');
	this.prefLastVisitedInFront = this.prefs.getBoolPref('lastVisitedInFront');
	this.prefUseISODate = this.prefs.getBoolPref('useISODate');
	this.prefVerboseLog = this.prefs.getBoolPref('verboseLog');
	this.prefPrefixVisited = this.prefs.getComplexValue('prefixVisited', Components.interfaces.nsISupportsString).data;
	this.prefPrefixBookmarked = this.prefs.getComplexValue('prefixBookmarked', Components.interfaces.nsISupportsString).data;
	this.prefS4eWait = this.prefs.getIntPref('s4eWait');

	this.prefUseCustomFormat = this.prefs.getBoolPref('useCustomFormat');
	this.prefCustomOverLink = this.prefs.getComplexValue('customOverLink', Components.interfaces.nsISupportsString).data;
	this.prefCustomDateDefault = this.prefs.getComplexValue('customDateDefault', Components.interfaces.nsISupportsString).data;
	for (var i = 0; i < 7; i++) {
	    this.prefCustomLimit[i] = this.prefs.getIntPref("customLimit"+i);
	    this.prefCustomDate[i] = this.prefs.getComplexValue("customDate"+i, Components.interfaces.nsIPrefLocalizedString).data;
	}
	this.prefCustomWeekdayNames = this.prefs.getComplexValue("customWeekdayNames", Components.interfaces.nsIPrefLocalizedString).data.split(",");
	while (this.prefCustomWeekdayNames.length < 7)
	    this.prefCustomWeekdayNames.push("?");
	this.prefCustomMonthNames = this.prefs.getComplexValue("customMonthNames", Components.interfaces.nsIPrefLocalizedString).data.split(",");
	while (this.prefCustomMonthNames.length < 12)
	    this.prefCustomMonthNames.push("?");

	this.prefLastVisitedOlderThan = this.prefs.getIntPref('lastVisitedOlderThan');
	this.prefLastVisitedQueryLimit = this.prefs.getIntPref('lastVisitedQueryLimit');
	this.prefLastVisitedTwoDates = this.prefs.getBoolPref('lastVisitedTwoDates');

	this.setOverLinkOrig = XULBrowserWindow.setOverLink;
	// S4E complains if we try this change when it is running:
	if (!this.s4e_detect()) {
	    XULBrowserWindow.setOverLink = function(link, b) {
		linkstatusredux.beforeSetOverLink(link);
		link = linkstatusredux.decorateLink(link);
		linkstatusredux.setOverLinkOrig.call(this, link, b);
	    };
	    if (this.prefVerboseLog)
		this.consolesvc.logStringMessage('linkstatusredux.startup: normal hook installed');
	}
	
	this.s4e_install();
    };

    linkstatusredux.s4e_detect = function() {
	return (('caligon' in window)
		&& ('status4evar' in window.caligon)
		&& ('statusService' in window.caligon.status4evar));
    };

    linkstatusredux.s4e_install = function() {
	// This is quite a kludge, as I couldn't figure out how to
	// force the addon to load after status4evar:
	if (!this.s4e_detect()) {
	    if (this.prefS4eWait) {
		this.prefS4eWait--;
		// Retry after a second:
		setTimeout(function (self) { self.s4e_install(); }, 1000, this);
		if (this.prefVerboseLog)
		    this.consolesvc.logStringMessage('linkstatusredux.startup: S4E not yet detected, ' + this.prefS4eWait + ' tries left');
	    }
	} else {
	    this.s4e_setOverLinkInternalOrig
		= caligon.status4evar.statusService.setOverLinkInternal;
	    caligon.status4evar.statusService.setOverLinkInternal
		= function(link, b) 
	    {
		linkstatusredux.beforeSetOverLink(link);
		link = linkstatusredux.decorateLink(link);
		linkstatusredux.s4e_setOverLinkInternalOrig.call(this, link, b);
	    };
	    if (this.prefVerboseLog)
		this.consolesvc.logStringMessage('linkstatusredux.startup: S4E hook installed');
	}
    };

    linkstatusredux.shutdown = function() {
	this.prefs.removeObserver('', this);
    };

    linkstatusredux.customDecorateLink = function(link) {
	/* printf/strftime-style formatting, supported replacements
	 * for visit time:

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
	   %t    Second visit time formatted as above ("" if none)
	   %u    Link URL
	   %V    Visited indicator
	   %B    Bookmarked indicator

	   %%    Literal % character

	   Conditional blocks for:

	   %+( .. %+)  Display only when visited
	   %-( .. %-)  Display only when not visited
	   %+[ .. %+]  Display only when bookmarked
	   %-[ .. %-]  Display only when not bookmarked
	   %+{ .. %+}  Display only when there is a second visit time
	   %-{ .. %-}  Display only when there is not a second visit time
	   
	 */
	var customvisited = this.prefCustomDateDefault;
	var customvisited2 = this.prefCustomDateDefault;
	var customformat = this.prefCustomOverLink;

	for (var i = 0; i < 7; i++)
	    if (this.lastTimeVisitedElapsed < this.prefCustomLimit[i]) {
		customvisited = this.prefCustomDate[i];
		break;
	    }
	for (var i = 0; i < 7; i++)
	    if (this.lastTimeVisitedElapsed2 < this.prefCustomLimit[i]) {
		customvisited2 = this.prefCustomDate[i];
		break;
	    }

	/* Note: the regexp objects are stored in an array to ensure
	 * that they are compiled only once.
	 */

	// handle conditional blocks (non-greedy matches)
	if (this.lastTimeVisited) {
	    if (!this.customRegex[0])
		this.customRegex[0] = /%-\(.*?%-\)/g;
	    if (!this.customRegex[1])
		this.customRegex[1] = /%\+[\(\)]/g;
	    customformat = customformat.replace(this.customRegex[0], "");
	    customformat = customformat.replace(this.customRegex[1], "");
	} else {
	    if (!this.customRegex[2])
		this.customRegex[2] = /%\+\(.*?%\+\)/g;
	    if (!this.customRegex[3])
		this.customRegex[3] = /%-[\(\)]/g;
	    customformat = customformat.replace(this.customRegex[2], "");
	    customformat = customformat.replace(this.customRegex[3], "");
	}
	if (this.overLinkBookmarked) {
	    if (!this.customRegex[4])
		this.customRegex[4] = /%-\[.*?%-\]/g;
	    if (!this.customRegex[5])
		this.customRegex[5] = /%\+[\[\]]/g;
	    customformat = customformat.replace(this.customRegex[4], "");
	    customformat = customformat.replace(this.customRegex[5], "");
	} else {
	    if (!this.customRegex[6])
		this.customRegex[6] = /%\+\[.*?%\+\]/g;
	    if (!this.customRegex[7])
		this.customRegex[7] = /%-[\[\]]/g;
	    customformat = customformat.replace(this.customRegex[6], "");
	    customformat = customformat.replace(this.customRegex[7], "");
	}
	if (this.lastTimeVisitedDate2) {
	    if (!this.customRegex[10])
		this.customRegex[10] = /%-\{.*?%-\}/g;
	    if (!this.customRegex[11])
		this.customRegex[11] = /%\+[\{\}]/g;
	    customformat = customformat.replace(this.customRegex[10], "");
	    customformat = customformat.replace(this.customRegex[11], "");
	} else {
	    if (!this.customRegex[12])
		this.customRegex[12] = /%\+\{.*?%\+\}/g;
	    if (!this.customRegex[13])
		this.customRegex[13] = /%-[\{\}]/g;
	    customformat = customformat.replace(this.customRegex[12], "");
	    customformat = customformat.replace(this.customRegex[13], "");
	}

	if (!this.customRegex[8])
	    this.customRegex[8] = /%(.)/g;
	if (!this.customRegex[9])
	    this.customRegex[9] = /%(\d?)(.)/g;
	customformat = customformat.replace(this.customRegex[8], function(m, p1) {
	    switch(p1) {
	    case 'u': return link;
	    case 'V': return linkstatusredux.prefPrefixVisited;
	    case 'B': return linkstatusredux.prefPrefixBookmarked;
	    case '%': return "%";
	    case 'T':
	    case 't':
		var s = customvisited;
		/* Couldn't come up with a more elegant way to do
		 * this, but this works too as variables in
		 * linkstatusredux are not reentrant anyway.
		 */
		linkstatusredux.formatDate2 = false;
		if (p1 == 'T') {
		    if (!linkstatusredux.lastTimeVisited)
			return "";
		} else { // 't'
		    if (!linkstatusredux.lastTimeVisitedDate2)
			return "";
		    s = customvisited2;
		    linkstatusredux.formatDate2 = true;
		}

		return s.replace(linkstatusredux.customRegex[9], function(m, p1, p2) {
		    var mnames = linkstatusredux.prefCustomMonthNames;
		    var dnames = linkstatusredux.prefCustomWeekdayNames;
		    
		    if (p1 == "") { // date element
			var d = linkstatusredux.lastTimeVisitedDate;
			if (linkstatusredux.formatDate2)
			    d = linkstatusredux.lastTimeVisitedDate2;
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
			case 'l':
			    var h = d.getHours();
			    if (h == 0)
				h = 12;
			    else if (h > 12)
				h -= 12;
			    if (p2 == 'I')
				h = pad(h);
			    return h;
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
			case 'z':
			    var s = "-";
			    var t = d.getTimezoneOffset();
			    if (t <= 0) {
				t = -t;
				s = "+";
			    }
			    return s + pad((t/60).toFixed(0)) + pad(t%60);
			case 'M': return pad(d.getMinutes());
			case 'S': return pad(d.getSeconds());
			case '%': return "%";
			}
		    } else { // "ago" element
			var s = linkstatusredux.lastTimeVisitedElapsed;
			if (linkstatusredux.formatDate2)
			    s = linkstatusredux.lastTimeVisitedElapsed2;
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
	    default:
		return "";
	    }
	});

	return customformat;
    };

    linkstatusredux.decorateLink = function(link) {
	if (link) {
	    if (this.prefUseCustomFormat)
		return this.customDecorateLink(link);

	    if (this.lastTimeVisited) {
		if (this.prefLastVisitedInFront)
		    link = this.lastTimeVisited + "  " + link;
		else
		    link += "  " + this.lastTimeVisited;
	    }
	    if (this.overLinkBookmarked)
		link = this.prefPrefixBookmarked + link;
	    else if (this.overLinkVisited)
		link = this.prefPrefixVisited + link;
	    //link = "~" + link + "~"; // debug
	}
	return link;
    };

    linkstatusredux.observe = function(subject, topic, data) {
	if (topic != "nsPref:changed")
	    return;
	
	if (data.substr(0, 11) == "customLimit") {
	    var n = data.substr(11, 1);
	    this.prefCustomLimit[n] = this.prefs.getIntPref('customLimit'+n);
	    return;
	}
	if (data.substr(0, 10) == "customDate") {
	    if (data.substr(10) == "Default") {
		this.prefCustomDateDefault = this.prefs.getComplexValue("customDateDefault", Components.interfaces.nsISupportsString).data;
		return;
	    }
	    var n = data.substr(10, 1);
	    this.prefCustomDate[n] = this.prefs.getComplexValue("customDate"+n, Components.interfaces.nsIPrefLocalizedString).data;
	    return;
	}

	switch(data)
	{
	case 'customWeekdayNames':
	    this.prefCustomWeekdayNames = this.prefs.getComplexValue("customWeekdayNames", Components.interfaces.nsIPrefLocalizedString).data.split(",");
	    while (this.prefCustomWeekdayNames.length < 7)
		this.prefCustomWeekdayNames.push("?");
	    break;
	case 'customMonthNames':
	    this.prefCustomMonthNames = this.prefs.getComplexValue("customMonthNames", Components.interfaces.nsIPrefLocalizedString).data.split(",");
	    while (this.prefCustomMonthNames.length < 12)
		this.prefCustomMonthNames.push("?");
	    break;
	case 'useCustomFormat':
            this.prefUseCustomFormat = this.prefs.getBoolPref('useCustomFormat');
	    break;
	case 'customOverLink':
	    this.prefCustomOverLink = this.prefs.getComplexValue("customOverLink", Components.interfaces.nsISupportsString).data;
	    break;
	case 'showLastVisited':
            this.prefShowLastVisited = this.prefs.getBoolPref('showLastVisited');
            break;
	case 'verboseLog':
            this.prefVerboseLog = this.prefs.getBoolPref('verboseLog');
            break;
	case 'prefixVisited':
            this.prefPrefixVisited = this.prefs.getComplexValue('prefixVisited', Components.interfaces.nsISupportsString).data;
	    break;
	case 'prefixBookmarked':
            this.prefPrefixBookmarked = this.prefs.getComplexValue('prefixBookmarked', Components.interfaces.nsISupportsString).data;
            break;
	case 'lastVisitedInFront':
            this.prefLastVisitedInFront = this.prefs.getBoolPref('lastVisitedInFront');
	    break;
	case 'useISODate':
	    this.prefUseISODate = this.prefs.getBoolPref('useISODate');
	    break;
	case 'lastVisitedOlderThan':
	    this.prefLastVisitedOlderThan = this.prefs.getIntPref('lastVisitedOlderThan');
	    break;
	case 'lastVisitedQueryLimit':
	    this.prefLastVisitedQueryLimit = this.prefs.getIntPref('lastVisitedQueryLimit');
	    break;
	case 'lastVisitedTwoDates':
	    this.prefLastVisitedTwoDates = this.prefs.getBoolPref('lastVisitedTwoDates');
	    break;
	}
    };

    linkstatusredux.beforeSetOverLink = function(link) {
	this.overLinkVisited = false;
	this.overLinkBookmarked = false;
	this.lastTimeVisited = null;
	this.lastTimeVisitedElapsed = 0;
	this.lastTimeVisitedDate = null;
	this.lastTimeVisitedElapsed2 = 0;
	this.lastTimeVisitedDate2 = null;
	if (link)
	{
	    var uri1;
	    var uri2 = null;
	    var iosvc = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

	    try {
		uri1 = iosvc.newURI(link, null, null);
	    }
	    catch (e if e.result == Components.results.NS_ERROR_MALFORMED_URI) {
		uri1 = null;
	    }

	    /* Partial workaround for bug #817374: if a link in a page
	     * is already escaped with lowercase characters
	     * (e.g. %7e), the history search won't match. This is
	     * because <link> is in unescaped form, and when it is
	     * escaped again when creating <uri1> the escapes will be
	     * uppercase => won't match the lowercase escapes in
	     * history. The workaround is to make a second URI with
	     * lowecase escapes. However, this won't help if the
	     * original link was only partially escaped or contained
	     * escapes in both lower and upper case.
	     *
	     * There is no proper fix for this, as the original URI
	     * from the page is not accessible from javascript (the
	     * caller for setOverLink is null) i.e. we only get the
	     * prettyfied unescaped URI, from which we cannot
	     * determine the original URI which is what is stored in
	     * the history DB.
	     */
	    if (uri1 && uri1.asciiSpec.indexOf('%') >= 0) {
		var s = uri1.asciiSpec;
		if (!this.escapeRegex)
		    this.escapeRegex = /(%[0-9A-F][0-9A-F])/g;
		s = s.replace(this.escapeRegex,
			      function(m, p1) {
				  return p1.toLowerCase()
			      });
		try {
		    uri2 = iosvc.newURI(s, null, null);
		}
		catch (e if e.result == Components.results.NS_ERROR_MALFORMED_URI) {
		    uri2 = null;
		}
	    }

	    if (uri1)
	    {
		var checktime = Date.now();

		var queryLastVisited = function(link_uri) {
		    var query = PlacesUtils.history.getNewQuery();
		    query.uri = link_uri;
		    var queryOptions = PlacesUtils.history.getNewQueryOptions();
		    queryOptions.includeHidden = true;
		    queryOptions.maxResults = 1;
		    queryOptions.resultType = queryOptions.RESULTS_AS_VISIT;
		    queryOptions.sortingMode = queryOptions.SORT_BY_DATE_DESCENDING;
		    if (linkstatusredux.prefLastVisitedOlderThan > 0) {
			/* Note: apparently the query
			 * attributes beginTime and endTime
			 * affect only the URI object
			 * containing all visits, so we cannot
			 * search for visits that fall into a
			 * specified range. The workaround is
			 * to get multiple results and hope
			 * that the latest visit outside the
			 * exclusion time is in there.
			 */
			queryOptions.maxResults = linkstatusredux.prefLastVisitedQueryLimit;
		    }
		    return PlacesUtils.history.executeQuery(query, queryOptions).root;
		};

		/* check whether the link is visited: */
		var results = queryLastVisited(uri1);
		results.containerOpen = true;
		if (!results.hasChildren && uri2) {
		    results.containerOpen = false;
		    results = queryLastVisited(uri2);
		    results.containerOpen = true;
		}
		this.overLinkVisited = results.hasChildren;

		if (this.overLinkVisited && this.prefShowLastVisited) {
		    var vtime = 0;
		    var vtime2 = 0;
		    vtime = results.getChild(0).time;
		    var reftime = Date.now()*1000;
		    for (var i = 0; i < results.childCount; i++) {
			var v = results.getChild(i);
			if ((reftime - v.time)/1000000
			    >= this.prefLastVisitedOlderThan) {
			    vtime2 = v.time;
			    break;
			}
		    }
		    if (vtime == vtime2)
			vtime2 = 0;
		    /* Note: vtime2 can be non-zero only
		     * if two dates are to be
		     * displayed. In such case vtime is
		     * the latest visit and vtime2 the
		     * limited-latest. If only one date is
		     * to be displayed vtime will be the
		     * limited-latest, or the latest if
		     * there is no limited-latest.
		     */
		    if (vtime2 && !this.prefLastVisitedTwoDates) {
			vtime = vtime2;
			vtime2 = 0;
		    }
		    this.lastTimeVisitedElapsed =
			(reftime - vtime) / 1000000; /* seconds */
		    this.lastTimeVisitedDate = new Date(vtime/1000);
		    if (vtime2) {
			this.lastTimeVisitedElapsed2 =
			    (reftime - vtime2) / 1000000; /* seconds */
			this.lastTimeVisitedDate2 = new Date(vtime2/1000);
			linkstatusredux.lastTimeVisited = '(' + linkstatusredux.beautifyDate(vtime / 1000) +'; '+  linkstatusredux.beautifyDate(vtime2 / 1000) + ')';
		    } else
			linkstatusredux.lastTimeVisited = '(' + linkstatusredux.beautifyDate(vtime / 1000) + ')';
		}
		results.containerOpen = false;

		/* check whether the link is bookmarked: */
		this.overLinkBookmarked = PlacesUtils.bookmarks.isBookmarked(uri1);
		if (!this.overLinkBookmarked && uri2)
		    this.overLinkBookmarked =  PlacesUtils.bookmarks.isBookmarked(uri2);

		checktime = Date.now() - checktime;
		if (this.prefVerboseLog)
		    this.consolesvc.logStringMessage('linkstatusredux: U='+link+' V='+this.overLinkVisited+' B='+this.overLinkBookmarked+' T='+checktime+'ms');
	    } // if uri1
	}
    };


    linkstatusredux.beautifyDate = function(date) {
	var elapsed = (Date.now() - date) / 1000; // in seconds
	if (elapsed < 60 * 60)
	{
	    var minutes = Math.round(elapsed / 60);
	    var minutesAgo = this.strings.getString('minutesAgo');
	    return this.pluralGet(minutes, minutesAgo).replace('#1', minutes);
	}
	else if (elapsed < 60 * 60 * 24)
	{
	    var hours = Math.round(elapsed / (60 * 60));
	    var hoursAgo = this.strings.getString('hoursAgo');
	    return this.pluralGet(hours, hoursAgo).replace('#1', hours);
	}
	else if (elapsed < 60 * 60 * 24 * 7.5)
	{
	    var days = Math.round(elapsed / (60 * 60 * 24));
	    var daysAgo = this.strings.getString('daysAgo');
	    return this.pluralGet(days, daysAgo).replace('#1', days);
	}
	else if (this.prefUseISODate)
	{
	    var d = new Date(date);
	    function pad(n) { return n < 10 ? '0' + n : n; }
	    return d.getFullYear() + '-'
		+ pad(d.getMonth() + 1) + '-'
		+ pad(d.getDate());
	}
	else
	{
	    // XXX: This returns the date in the browser's current locale,
	    // which may not be the same as the extension's locale
	    // (when the extension is not localized to the browser's locale).
	    // However, I am not sure if it is desirable to use FormatDate
	    // of the service @mozilla.org/intl/scriptabledateformat;1,
	    // because it sometimes returns something funny
	    // ('October-31-09' for 'en-CA' locale;
	    //  is this format with two-digit year and long month
	    //  really used in Canada?).
	    return (new Date(date)).toLocaleDateString();
	}
    };

    // In the following statements, "function(event) {
    // linkstatusredux.startup(event); }" etc. cannot be replaced by
    // "linkstatusredux.startup" because it changes "this".
    window.addEventListener('load', function(event) { linkstatusredux.startup(event); }, false);
    window.addEventListener('unload', function(event) { linkstatusredux.shutdown(event); }, false);

}
