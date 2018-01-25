function addClass(o, c)
{
	if (o.classList) {
		o.classList.add(c);
	}
	else {
		var c0 = o.getAttribute("class");
		if (c0)
			o.setAttribute("class", c0 + " " + c);
		else
			o.setAttribute("class", c);
	}
}

function initLayout() 
{
	// for pandoc(markdown) or vimwiki
	var menu = document.querySelector(".toc");
	if (menu == null || menu.querySelector("ul li") == null)
		return;

	if (document.querySelector("meta[name=viewport]") == null) {
		var o = document.createElement("meta");
		o.setAttribute("name", "viewport");
		o.setAttribute("content", "width=device-width, initial-scale=1");
		var head = document.querySelector("head");
		head.appendChild(o);
	}
	addClass(menu, "jd-menu");
	addClass(document.body, "jd-layout");
}

function onReady(fn)
{
	if (document.addEventListener) {
		document.addEventListener( "DOMContentLoaded", fn);
	}
	else if (document.attachEvent) {
		document.attachEvent('onreadystatechange', function () {
			if (document.readyState=='complete') {
				fn();
			}
		});
	}
}

onReady(initLayout);

