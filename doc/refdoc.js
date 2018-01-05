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

// for jdcloud-gendoc
function initLayout() 
{
	var menu = document.getElementById("menu");
	if (menu == null || menu.querySelector("p") == null)
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

window.onload = initLayout;
