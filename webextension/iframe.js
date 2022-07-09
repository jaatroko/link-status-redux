// Overlay iframe id and CSS style specifications, used in content.js
// and background.js

let overlay_uuid = "e0fe7e79ef044e56993c0a0a6874baed";

// Reset CSS style to initial, and then specify our modifications. All
// done as !important, so that it cannot be overridden by document
// CSS. (Page Javascript can still mess it up, though.) In firefox 53+
// we insert the same CSS rules as user-origin, in which case even
// Javascript can no longer override it.
let overlay_iframe_css_rules =
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
    "color-scheme: light only !important;" +
    "z-index: 2147483647 !important;";

let overlay_iframe_css = "#" + overlay_uuid
    + " { " + overlay_iframe_css_rules + " }"; 
