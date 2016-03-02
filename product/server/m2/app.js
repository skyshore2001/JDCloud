// ====== global and defines {{{
//}}}

// ====== app fw {{{
// opt: {onLoadItem, onHint, threshold?=200, maxMargin?=50}
// onLoadItem: function(isRefresh). 下拉刷新和上拉加载操作。isRefresh=true表示刷新。this为obj对象。
// onHint: function(msg, value). 提供动画效果. msg: 提示信息; value:[0,100]; 当msg为null时去除动画。
function initPullList(obj, opt)
{
	var m_touchev = null; // {ac, x0, y0}
	var m_mouseMoved = false;

	if (opt.threshold == null)
		opt.threshold = 200;
	if (opt.maxMargin == null)
		opt.maxMargin = 50;
	if (opt.onHint == null)
		opt.onHint = onHint;

	if ("ontouchstart" in window) {
		obj.addEventListener("touchstart", touchStart);
		obj.addEventListener("touchmove", touchMove);
		obj.addEventListener("touchend", touchEnd);
		obj.addEventListener("touchcancel", touchCancel);
	}
	else {
		obj.addEventListener("mousedown", mouseDown);
	}

	function getPos(ev)
	{
		var t = ev;
		if (ev.changedTouches) {
			t = ev.changedTouches[0];
		}
		return [t.pageX, t.pageY];
	}

	var jo;
	function onHint(msg, value, ac)
	{
		if (jo == null) {
			jo = $("<div style='overflow:hidden;text-align:center;vertical-align:middle'></div>");
		}
		if (msg == null) {
			jo.height(0).remove();
			return;
		}
		jo.html(msg);
		var value2 = value * opt.maxMargin / 100;
		jo.height(value2).css("lineHeight", value2 + "px");
		if (ac == "D") {
			jo.prependTo(obj);
		}
		else if (ac == "U") {
			jo.appendTo(obj);
			// 滚动到底
			obj.scrollTop = obj.scrollHeight - obj.clientHeight;
		}
	}

	function updateHint(ac, dy)
	{
		var msg, value;
		if (ac == null || dy == 0) {
			msg = null;
			value = 0;
		}
		else {
			dy = Math.abs(dy);
			value = Math.ceil(Math.min(dy *100 / opt.threshold, 100));
			if (ac == "U") {
				msg = value == 100? "松开加载...": "上拉加载...";
			}
			else if (ac == "D") {
				msg = value == 100? "松开刷新...": "下拉刷新...";
			}
		}
		opt.onHint.call(this, msg, value, ac);
	}

	function touchStart(ev)
	{
		var p = getPos(ev);
		m_touchev = {
			ac: null,
			top0: obj.scrollTop,
			x0: p[0],
			y0: p[1],
			dx: 0,
			dy: 0
		};
		//ev.preventDefault(); // 防止click等事件无法触发
	}

	function mouseDown(ev)
	{
		m_mouseMoved = false;
		touchStart(ev);
		// setCapture
		window.addEventListener("mousemove", mouseMove, true);
		window.addEventListener("mouseup", mouseUp, true);
		window.addEventListener("click", click, true);
	}

	// 防止拖动后误触发click事件
	function click(ev)
	{
		window.removeEventListener("click", click, true);
		if (m_mouseMoved)
		{
			ev.stopPropagation();
			ev.preventDefault();
		}
	}

	function mouseMove(ev)
	{
		if (m_touchev == null)
			return;

		touchMove(ev);
		if (m_touchev.dx != 0 || m_touchev.dy != 0)
			m_mouseMoved = true;
		ev.stopPropagation();
		ev.preventDefault();
	}

	function mouseUp(ev)
	{
		touchEnd(ev);
		window.removeEventListener("mousemove", mouseMove, true);
		window.removeEventListener("mouseup", mouseUp, true);
		ev.stopPropagation();
		ev.preventDefault();
	}

	function touchMove(ev)
	{
		var p = getPos(ev);

		m_touchev.dx = p[0] - m_touchev.x0;
		m_touchev.dy = p[1] - m_touchev.y0;

		obj.scrollTop = m_touchev.top0 - m_touchev.dy;
		var dy = m_touchev.dy + (obj.scrollTop - m_touchev.top0);
		m_touchev.pully = dy;

		if (obj.scrollTop <= 0 && dy > 0) {
			m_touchev.ac = "D";
		}
		else if (dy < 0 && obj.scrollTop >= obj.scrollHeight - obj.clientHeight) {
			m_touchev.ac = "U";
		}
		updateHint(m_touchev.ac, dy);
		ev.preventDefault();
	}

	function touchCancel(ev)
	{
		m_touchev = null;
		updateHint(null, 0);
	}

	function touchEnd(ev)
	{
		updateHint(null, 0);
		if (m_touchev == null || m_touchev.ac == null || Math.abs(m_touchev.pully) < opt.threshold)
		{
			m_touchev = null;
			return;
		}
		console.log(m_touchev);
		// pulldown
		if (m_touchev.ac == "D") {
			console.log("refresh");
			opt.onLoadItem.call(obj, true);
		}
		else {
			console.log("loaditem");
			opt.onLoadItem.call(obj, false);
		}
		m_touchev = null;
	}
}

//}}}

// ====== app shared function {{{
//}}}

// vim: set foldmethod=marker:
