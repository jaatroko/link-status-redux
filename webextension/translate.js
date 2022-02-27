// i18n replacement rules:
// id =~ /^__/ => replace textContent
// title =~ /^__/ => replace title
// id =~ /^_/ and class=html_replace => replace innerHTML
for (let e of document.querySelectorAll("*[id]")) {
    if (e.id.substr(0, 2) !== "__")
	continue;
    let text = browser.i18n.getMessage(e.id);
    if (text)
	e.textContent = text;
}
for (let e of document.querySelectorAll("*[title]")) {
    if (e.title.substr(0, 2) !== "__")
	continue;
    let text = browser.i18n.getMessage(e.title);
    if (text)
    	e.title = text;
}
for (let e of document.querySelectorAll(".html_replace")) {
    if (e.id.substr(0, 1) !== "_")
	continue;
    let html = browser.i18n.getMessage(e.id);
    if (html)
    	e.innerHTML = html;
}
