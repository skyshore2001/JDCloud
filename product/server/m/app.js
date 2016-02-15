// ====== global and defines {{{
//}}}

// ====== app fw {{{

function checkEmptyList(jlst, dscr)
{
	if (dscr == null)
		dscr = "空列表！";
	if (jlst.find("li").size() == 0) {
		jlst.append($("<li><h2 style='text-align:center'>" + dscr + "</h2></li>"));
	}
}

/**
@fn callOnce(obj, fname, params?)

@param fname String. 回调函数名, 它属于对象obj.
@param params? 数组. 回调函数的参数列表, 可以为空.

调用一次对象的回调函数后清除. 
例如, 打开一个页面"选择车系", 且希望在该页面结束时将车系名显示在文本框内:

车系页面中定义公有接口onChooseSeries:

	var PageSeries = {
		onChooseSeries: null; // Function(seriesName)
	};

显示车系页面, 并设置回调:

	PageSeries.onChooseSeries = function (seriesName) {
		jpage.find("#seriesName").val(seriesName);
	};
	$.mobile.changePage("#series");

在选择一个车系后调用:

	var seriesName = "xxx";
	callOnce(PageSeries, "onChooseSeries", [seriesName]);

 */
function callOnce(obj, fname, params)
{
	if (obj[fname]) {
		var fn = obj[fname];
		obj[fname] = null;
		fn.call(obj, params);
	}
}
//}}}

// ====== app shared function {{{
// interface: 
// .showImage(pics, idx)
function ImageViewer(pageId)
{
	var m_urls;
	var m_idx;

	var jpage;

	function showNext()
	{
		if (m_idx < m_urls.length-1) {
			++ m_idx;
		}
		else {
			$.mobile.back();
			return;
		}
		showOneImage(m_idx);
	}
	function showPrev()
	{
		if (m_idx > 0) {
			-- m_idx;
		}
		else {
			$.mobile.back();
			return;
		}
		showOneImage(m_idx);
	}
	function showOneImage(idx)
	{
		enterWaiting();
		jpage.find("img#pic").attr("src", m_urls[idx]).on("load", function(){
			// alert("success");
			// alert($(this).width());
			var h = $(this).height();
			// var w = $(this).width();
			var jpw = jpage.width();
			// var w = $(this).width();
			// if(w >= jpw/2 ){
				$(this).css({
					"width": "100%",
					"position": "absolute",
					"left": "50%", 
					"top": "50%",
					"margin-top": -h/2,
					"margin-left": -jpw/2
				});	
			// }else{
			// 	$(this).css({
			// 		"min-width" : "200px",
					
			// 	});
			// }
			
		}); // will auto trigger popup('open') after img loaded
	}

	this.showImage = function (urls, idx)
	{
		m_urls = urls;
		m_idx = idx;

		jpage = $("#" + pageId);
		jpage.find("img#pic").attr("src", "");
		jpage.data("param", {showNext: showNext, showPrev: showPrev});
		$.mobile.changePage("#" + pageId); 
		showOneImage(m_idx);
	};

	if (ImageViewer.domInited == null) {
		ImageViewer.domInited = [];
	}
	if (ImageViewer.domInited.indexOf(pageId) >= 0)
		return;
	ImageViewer.domInited.push(pageId);

	$(document).on("pagecreate", "#" + pageId, function () {
		var jpage = $(this);
		var $img = jpage.find("img#pic");

		function showNext()
		{
			var param = jpage.data("param");
			param.showNext();
		}
		function showPrev()
		{
			var param = jpage.data("param");
			param.showPrev();
		}
		$img.click(showNext);
		jpage.on("swipeleft", showNext);
		jpage.on("swiperight", showPrev);

		function showOneImage_done()
		{
			leaveWaiting();
		}
		// when set img.src, popup opens.
		$img.load(showOneImage_done);
		$img.error(showOneImage_done);
	});
}
//}}}

// vim: set foldmethod=marker:
