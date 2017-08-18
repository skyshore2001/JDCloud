function each(a, fn)
{
	for (var i=0; i<a.length; ++i) {
		if (fn(i, a[i]) === false)
			return;
	}
}

function initLayout() 
{
	var menu = document.getElementsByClassName("toc")[0];
	if (menu == null || menu.querySelectorAll("ul li").length == 0)
		return;
	menu.id = "menu";
	menu.remove();

	var main = document.createElement("div");
	main.id = "main";

	document.body.id="layout";
	var html = document.body.parentElement;
	html.style.height ="100%";
	html.style.overflow ="hidden"; //html

	var arr = [];
	each(document.body.children, function (i, e) {
		arr.push(e);
	});
	each(arr, function (i, e) {
		main.appendChild(e);
	});

	document.body.appendChild(menu);
	document.body.appendChild(main);
}

function applyLayout()
{
	if (! document.head)
		return;
	if (! document.head.style.hasOwnProperty("flex"))
		return;

	window.onload = initLayout;
}
applyLayout();
