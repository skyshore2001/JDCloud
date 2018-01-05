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
	window.onhashchange = onHashChange;
	if (location.hash) {
		onHashChange();
	}

	function onHashChange() {
		var y = 0;
		var hash = decodeURIComponent(location.hash);
		if (hash.length > 1) {
			var o = document.getElementById(hash.substr(1));
			if (o != null)
				y = o.offsetTop;
		}
		main.scrollTo(0, y);
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
