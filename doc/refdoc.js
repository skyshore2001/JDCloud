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
