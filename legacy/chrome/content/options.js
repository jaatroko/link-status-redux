function startup()
{
  var strings = document.getElementById('options-strings');

  // Set the title of the prefwindow.  This title depends on which OS
  // we are running on in some languages including English
  // ("Options" on Windows and "Preferences" on Mac and Unix).
  //
  // I do not know the "right" way to detect whether we should use
  // "Options" or "Preferences."
  // * It seems that the built-in menus and dialog boxes simply use
  //   "#ifdef XP_WIN" (e.g.
  //     http://hg.mozilla.org/releases/mozilla-1.9.1/annotate/a5a46d63b38b/toolkit/mozapps/extensions/content/extensions.xul#l127
  //   ), which is not available to chrome XUL or chrome scripts.  :(
  // * window.navigator looks archaic, and it is indeed provided for
  //   backward compatibility (see
  //     http://hg.mozilla.org/releases/mozilla-1.9.1/annotate/63d510563b10/dom/src/base/nsGlobalWindow.cpp#l9106
  //   ), but it does the right job.
  // * nsIXULRuntime.OS (see
  //     https://developer.mozilla.org/en/nsIXULRuntime
  //   and
  //     http://hg.mozilla.org/releases/mozilla-1.9.1/annotate/ccf51d9623b3/toolkit/xre/nsAppRunner.cpp#l716
  //   ) sounds like the right way, but it is too precise.
  //   We just want to distinguish among Windows, Mac and Unix
  //   (which means the X Window System in the Mozilla terminology),
  //   but nsIXULRuntime.OS gives something like WINNT, WIN95, WINCE,
  //   Linux, BSD_OS, FreeBSD, Darwin and so on.
  //   One possible way is test whether nsIXULRuntime.OS begins with "WIN".
  // * OS-specific chrome registration does not seem the right way here
  //   because the words also depends on the locale.
  //
  // To make the matter worse, in Firefox 3.0.x,
  // setting the title attribute of the prefwindow object in the script
  // does not change the actual title.
  // So we cannot drop the default title in the XUL file
  // (using the entity reference &prefwindow.title; defined in the DTD).
  var title;
  if (navigator.platform == 'Win32')
    title = strings.getString('prefwindowWinTitle');
  else
    title = strings.getString('prefwindowMacUnixTitle');
  document.getElementById('linkstatusreduxPreferences').setAttribute('title', title);
  document.getElementById('pane1').label = title;  // just in case it is ever used

  var appInfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
  var geckoVersion = appInfo.platformVersion;
  var versionChecker = Components.classes['@mozilla.org/xpcom/version-comparator;1'].getService(Components.interfaces.nsIVersionComparator);
  if (versionChecker.compare(geckoVersion, '1.9.0.*') <= 0) {
    // layout.css.visited_links_enabled is not supported
    // by this version of Gecko.
    document.getElementById('visited-links-disabled').readonly = true;
    var checkbox = document.getElementById('check-visited-links-disabled');
    checkbox.checked = false;
    checkbox.disabled = true;
  }
}

window.addEventListener('load', startup, false);
