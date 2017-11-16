function each(a, fn)
{
	for (var i=0; i<a.length; ++i) {
		if (fn(i, a[i]) === false)
			return;
	}
}

// for jdcloud-gendoc
function initLayout() 
{
	document.body.id="layout";
	var html = document.body.parentElement;
	html.style.height ="100%";
	html.style.overflow ="hidden";

	var main = document.createElement("div");
	main.id = "main";

	var menu = document.getElementById("menu");

	var arr = [];
	each(document.body.children, function (i, e) {
		if (e.id == "menu")
			return;
		arr.push(e);
	});
	each(arr, function (i, e) {
		main.appendChild(e);
	});

	document.body.appendChild(main);
	if (location.hash) {
		var h = location.hash;
		location.hash = "";
		location.hash = h; // 强制跳转下
	}
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
