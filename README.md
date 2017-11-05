# Link Status Redux

This browser extension can be installed from the [Firefox
Add-ons](https://addons.mozilla.org/en-US/firefox/addon/link-status-redux/)
site. For known issues, see the [issue
tracker](https://github.com/jaatroko/link-status-redux/issues).

Link Status Redux is a Firefox extension that shows an indicator on
the status bar or status popup panel in front of the link address when
the mouse cursor is over a link to a page you have bookmarked or
visited before. It can also show the date you last visited the linked
page.

The indicator prefixes for visited and bookmarked links are arbitrary,
user-configurable text strings. The defaults are a white star (`✩`,
`U+2729`) for visited links and a place of interest sign (`⌘`,
`U+2318`) for bookmarked links. Remember a trailing space if you want
the indicator separated from the address.

For the displayed visit date, you can choose to prefer visit times
that are older than a configurable limit (specified in seconds). This
way you can still see the previous visit time even if you happened to
accidentally click a visited link. If the limit is non-zero and the
link is visited, the latest visit time older than the limit is shown
instead. If such a visit time was not found, the very latest time is
shown. You can also choose to display both the very latest and the
over-the-limit visit times. In this case the latest visit time is
always shown and the older visit time is also shown if it a) exists
and b) is not equal to the latest visit time.

Places to copy-paste UTF-8 symbols from:

 * http://www.fileformat.info/info/unicode/block/dingbats/utf8test.htm
 * http://www.fileformat.info/info/unicode/block/miscellaneous_symbols/utf8test.htm
 * http://www.fileformat.info/info/unicode/block/miscellaneous_technical/utf8test.htm
 * http://www.fileformat.info/info/unicode/block/index.htm

Custom formatting allows expert users to more freely specify the text
that is shown when hovering the mouse over a link (the "link target
text"). The specification is done with _printf_-style substitutions,
and the following are valid for the link target text:

Code | Substitution
-----|-------------
**%u** | The link URL
**%T** | Custom-formatted link latest visit time, see below; empty string if not visited
**%t** | Custom-formatted older visit time, if it exists; empty string if it does not exist
**%V** | The user-defined visited indicator
**%B** | The user-defined bookmarked indicator
**%%** | A literal % character

In addition, the following conditional blocks can be used:

Code | Effect
-----|-------
**%+(** .. **%+)** | Anything between is displayed only when the link is visited
**%-(** .. **%-)** | Anything between is displayed only when the link is **not** visited
**%+[** .. **%+]** | Anything between is displayed only when the link is bookmarked
**%-[** .. **%-]** | Anything between is displayed only when the link is **not** bookmarked
**%+{** .. **%+}** | Anything between is displayed only when the older visit time **%t** is defined
**%-{** .. **%-}** | Anything between is displayed only when the older visit time **%t** is **not** defined

For the visit time(s), several formats can be defined, which are used
when the visit time is more recent than the corresponding time
limit. The following substitutions (a subset of those specified by
_strftime_ plus the "ago" ones) are valid for visit time formatting:

Code | Substitution
-----|-------------
**%c** | Date and time in locale's preferred format
**%x** | Date in locale's preferred format
**%X** | Time in locale's preferred format
**%Y** | 4-digit year
**%y** | 2-digit year 00..99
**%m** | Zero-padded month 01..12
**%b** | Month name from user-defined list
**%a** | Weekday name from user-defined list
**%d** | Zero-padded day of month 01..31
**%e** | Day of month 1..31
**%H** | Zero-padded hour 00..23
**%k** | Hour 0..23
**%I** | Zero-padded hour 01..12
**%l** | Hour 1..12
**%p** | AM/PM
**%P** | am/pm
**%z** | Timezone offset in the form -HHMM or +HHMM
**%M** | Zero-padded minute 00..59
**%S** | Zero-padded second 00..60
**%Ns** | # seconds ago with _N_ decimals
**%Nm** | # minutes ago with _N_ decimals
**%Nh** | # hours ago with _N_ decimals
**%Nd** | # days ago with _N_ decimals
**%Nw** | # weeks ago with _N_ decimals
**%NM** | # months ago with _N_ decimals
**%Ny** | # years ago with _N_ decimals
**%%** | A literal % character

## WebExtension for Firefox 57 and later

The following is only applicable to the WebExtension version (version
3.0 and later) of the extension.

_Coming soon..._

## Legacy version for Firefox 56 and earlier

The following is only applicable to the legacy version (version 2.x)
of the extension, and is mainly included here for completeness.

In Firefox 3.5 or later, you can choose to stop Firefox from rendering
visited links differently. To do so, turn on the "Disable visited link
styling" option in the extension preferences. This can prevent a web
server from abusing this feature of Firefox to probe which pages you
have visited ([See bug
report](https://bugzilla.mozilla.org/show_bug.cgi?id=147777)). This
issue appears to have been fixed in Firefox 4.0 and later and in
Seamonkey 2.1 and later.

This extension is a successor to the [Link Status extension by
_fcp_](https://addons.mozilla.org/en-US/firefox/addon/link-status),
and is based on its code. The main difference is the use of a text
prefix instead of an image as the indicator, and that Link Status
Redux also works with Firefox version 4 and later. It also works with
the
[Status-4-Evar](https://addons.mozilla.org/en-US/firefox/addon/status-4-evar/)
extension.
