# Link Status Redux

This browser extension can be installed from the [Firefox
Add-ons](https://addons.mozilla.org/en-US/firefox/addon/link-status-redux/)
site. For known issues, see the [issue
tracker](https://github.com/jaatroko/link-status-redux/issues).

Link Status Redux is a Firefox extension that shows an indicator on a
status popup panel next to the link address when the mouse cursor is
over a link to a page you have bookmarked or visited before, or
(disabled by default) if the link is currently open in a browser
tab. It can also show the date you last visited the linked page.

The indicator prefixes for visited and bookmarked links are arbitrary,
user-configurable text strings. The defaults are a white star (`✩`,
`U+2729`) for visited links, a place of interest sign (`⌘`, `U+2318`)
for bookmarked links, and the open folder symbol (`🗁`, `U+1F5C1`) for
currently open links. Remember a trailing space if you want the
indicator separated from the other text.

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
and the following are valid for the link target text
(prefix/URL/postfix):

Code | Substitution
-----|-------------
**%u** | The link URL
**%T** | Custom-formatted link latest visit time, see below; empty string if not visited
**%t** | Custom-formatted older visit time, if it exists; empty string if it does not exist
**%V** | The user-defined visited indicator
**%B** | The user-defined bookmarked indicator
**%O** | The user-defined currently open indicator
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
**%+<** .. **%+>** | Anything between is displayed only when the link is currently open
**%-<** .. **%->** | Anything between is displayed only when the link is **not** currently open

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


There are also several appearance customization options. You can:

* Choose where the overlink popup is shown: bottom-left corner (see
  caveat below), above the browser's native popup, or offset from the
  mouse pointer (warning: may make page mouseover popups
  difficult/impossible to see).
* Choose to how many lines a very long link URL is wrapped.
* Choose the colors of the overlink popup.
* Write your own CSS rules to style the overlink popup.

The WebExtension API does not allow creating proper UI elements or
changing existing ones. This means that the browser's native overlink
popup cannot be modified or hidden by the extension. For this reason,
the default mode is to show an additional popup above the browser's
native one, that shows only the visited/bookmarked indicators and
visit time(s). You can configure the extension popup to contain the
link URL and show "normally" at the bottom-left corner, but you will
then have to hide the browser's native popup by editing your
[userChrome.css](http://kb.mozillazine.org/index.php?title=UserChrome.css). In
addition to this, there are other
[issues](https://github.com/jaatroko/link-status-redux/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3Awebextension%20label%3A%22known%20issue%22)
which make the WebExtension version lacking in functionality in some
areas compared to the legacy version (2.x).
