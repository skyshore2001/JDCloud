// ====== global and defines {{{
//}}}

// ====== app fw {{{
/**
@fn initPullList(obj, opt)

为列表添加下拉刷新和上拉加载功能。

例：页面元素如下：

<div mui-initfn="initPageOrders" mui-script="orders.js">
	<div class="bd">
		<div class="p-list"></div>
	</div>
</div>

设置下拉列表的示例代码如下：

	var pullListOpt = {
		onLoadItem: showOrderList
	};
	var container = jpage.find(".bd")[0];
	initPullList(container, pullListOpt);

	var nextkey;
	function showOrderList(isRefresh)
	{
		var jlst = jpage.find(".p-list");
		var param = {res: "id desc", cond: "status=1"};
		if (nextkey == null)
			isRefresh = true;
		if (isRefresh)
			jlst.empty();
		param._pagekey = nextkey;

		callSvr("Ordr.query", param, function (data) {
			// create items and append to jlst
			// ....
			if (data.nextkey)
				nextkey = data.nextkey;
		});
	}

注意：

- 由于page body的高度自动由框架设定，所以可以作为带滚动条的容器；如果是其它容器，一定要确保它有限定的宽度，以便可以必要时出现滚动条。

@param obj 容器，它的高度应该是限定的，因而当内部内容过长时才可出现滚动条
@param opt {onLoadItem, autoLoadMore?=true, threshold?=100, onHint?}

@param onLoadItem function(isRefresh)

在合适的时机，它调用 onLoadItem(true) 来刷新列表，调用 onLoadItem(false) 来加载列表的下一页。在该回调中this为obj对象（即容器）。实现该函数时应当自行管理当前的页号(pagekey)

@param autoLoadMore 当滑动到页面下方时（距离底部TRIGGER_AUTOLOAD=30px以内）自动加载更多项目。

@param threshold 像素值。

手指最少下划或上划这些像素后才会触发实际加载动作。

@param onHint function(ac, dy, threshold)

	ac  动作。"D"表示下拉(down), "U"表示上拉(up), 为null时应清除提示效果.
	dy,threshold  用户移动偏移及临界值。dy>threshold时，认为触发加载动作。

提供提示用户刷新或加载的动画效果. 缺省实现是下拉或上拉时显示提示信息。

*/
function initPullList(obj, opt)
{
	var m_touchev = null; // {ac, x0, y0}
	var m_mouseMoved = false;
	var SAMPLE_INTERVAL = 200; // ms
	var TRIGGER_AUTOLOAD = 30; // px

	window.requestAnimationFrame = window.requestAnimationFrame || function (fn) {
		setTimeout(fn, 1000/60);
	};

	if (opt.threshold == null)
		opt.threshold = 100;
	if (opt.onHint == null)
		opt.onHint = onHint;
	if (opt.autoLoadMore == null)
		opt.autoLoadMore = true;

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
	function onHint(ac, dy, threshold)
	{
		var msg = null;
		if (jo == null) {
			jo = $("<div style='overflow:hidden;text-align:center;vertical-align:middle'></div>");
		}

		if (ac == "U") {
			msg = dy >= threshold? "松开加载~~~": "上拉加载...";
		}
		else if (ac == "D") {
			msg = dy >= threshold? "松开刷新~~~": "下拉刷新...";
		}

		if (msg == null) {
			jo.height(0).remove();
			return;
		}
		jo.html(msg);
		jo.height(dy).css("lineHeight", dy + "px");
		if (ac == "D") {
			jo.prependTo(obj);
		}
		else if (ac == "U") {
			jo.appendTo(obj);
		}
	}

	// ac为null时，应清除提示效果
	function updateHint(ac, dy)
	{
		if (ac == null || dy == 0 || (opt.autoLoadMore && ac == 'U')) {
			ac = null;
		}
		else {
			dy = Math.abs(dy);
		}
		opt.onHint.call(this, ac, dy, opt.threshold);
	}

	function touchStart(ev)
	{
		var p = getPos(ev);
		m_touchev = {
			ac: null,
			// 原始top位置
			top0: obj.scrollTop,
			// 原始光标位置
			x0: p[0],
			y0: p[1],
			// 总移动位移
			dx: 0,
			dy: 0,

			// 用于惯性滚动: 每SAMPLE_INTERVAL取样时最后一次时间及光标位置(用于计算初速度)
			momentum: {
				x0: p[0],
				y0: p[1],
				startTime: new Date()
			}
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
		var m = m_touchev.momentum;
		if (m) {
			var now = new Date();
			if ( now - m.startTime > SAMPLE_INTERVAL ) {
				m.startTime = now;
				m.x0 = p[0];
				m.y0 = p[1];
			}
		}

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

	function momentumScroll(ev, onScrollEnd)
	{
		if (m_touchev == null || m_touchev.momentum == null)
			return;

		// 惯性滚动
		var m = m_touchev.momentum;
		var dt = new Date();
		var duration = dt - m.startTime;
		if (duration > SAMPLE_INTERVAL) {
			onScrollEnd && onScrollEnd();
			return;
		}

		var p = getPos(ev);
		var v0 = (p[1]-m.y0) / duration;
		if (v0 == 0) {
			onScrollEnd && onScrollEnd();
			return;
		}

		v0 *= 2.5;
		var deceleration = 0.0005;

		window.requestAnimationFrame(moveNext);
		function moveNext() 
		{
			// 用户有新的点击，则取消动画
			if (m_touchev != null)
				return;

			var dt1 = new Date();
			var t = dt1 - dt;
			dt = dt1;
			var s = v0 * t / 2;
			var dir = v0<0? -1: 1;
			v0 -= deceleration * t * dir;
			// 变加速运动
			deceleration *= 1.1;

			var top = obj.scrollTop;
			obj.scrollTop = top - s;
			if (v0 * dir > 0 && top != obj.scrollTop) {
				window.requestAnimationFrame(moveNext);
			}
			else {
				onScrollEnd && onScrollEnd();
			}
		}
	}

	function touchEnd(ev)
	{
		updateHint(null, 0);
		if (m_touchev == null || m_touchev.ac == null || Math.abs(m_touchev.pully) < opt.threshold)
		{
			momentumScroll(ev, onScrollEnd);
			m_touchev = null;
			return;
		}
		console.log(m_touchev);
		doAction(m_touchev.ac);
		m_touchev = null;

		function doAction(ac)
		{
			// pulldown
			if (ac == "D") {
				console.log("refresh");
				opt.onLoadItem.call(obj, true);
			}
			else if (ac == "U") {
				console.log("loaditem");
				opt.onLoadItem.call(obj, false);
			}
		}

		function onScrollEnd()
		{
			if (opt.autoLoadMore) {
				var distanceToBottom = obj.scrollHeight - obj.clientHeight - obj.scrollTop;
				if (distanceToBottom <= TRIGGER_AUTOLOAD) {
					doAction("U");
				}
			}
		}
	}
}

/**
@fn initNavbarAndList(jpage, opt)

对一个导航栏(class="mui-navbar")加若干列表(class="p-list")的典型页面进行逻辑封装，包括以下功能：

1. 首次进入页面时加载默认列表
2. 任一列表支持下拉刷新，上拉加载（自动管理刷新和分页）
3. 点击导航栏自动切换列表，仅当首次显示列表时刷新数据
4. 支持强制刷新所有列表的控制，一般定义在page接口中，如 PageOrders.refresh

基本页面结构如下：

	<div mui-initfn="initPageOrders" mui-script="orders.js">
		<div class="hd">
			<h2>订单列表</h2>
			<div class="mui-navbar">
				<a href="javascript:;" class="active" mui-linkto="#lst1">待服务</a>
				<a href="javascript:;" mui-linkto="#lst2">已完成</a>
			</div>
		</div>

		<div class="bd">
			<div id="lst1" class="p-list"></div>
			<div id="lst2" class="p-list" style="display:none"></div>
		</div>
	</div>

上面页面应注意：
- navbar在header中，不随着滚动条移动而改变位置
- mui-navbar在点击一项时，会在被点击的<a>按钮上以及它对应的(mui-linkto标识)组件上添加class="active"

js调用逻辑示例：

	initNavbarAndList(jpage, {
		pageItf: PageOrders,
		onGetQueryParam: function (jlst, callParam) {
			callParam.ac = "Ordr.query";
			var param = callParam.queryParam;
			param.orderby = "id desc";
			param.cond = "status=1";
		},
		onAddItem: function (jlst, itemData) {
			var ji = $("<li>" + itemData.title + "</li>");
			ji.appendTo(jlst);
		},
		onNoItem: function (jlst) {
			var ji = $("<li>没有订单</li>");
			ji.appendTo(jlst);
		}
	});

框架基本原理是在合适的时机，自动调用类似这样的逻辑：

	var callParam = {ac: "Ordr.query", queryParam: {} };
	opt.onGetQueryParam(jlst, callParam);
	callSvr(callParam.ac, callParam.queryParam, function (data) {
		$.each(rs2Array(data), function (i, itemData) {
			opt.onAddItem(jlst, itemData);
		});
		if (data.d.length == 0)
			opt.onNoItem(jlst);
	});

@param opt {onGetQueryParam, onAddItem, onNoItem?, pageItf?, navRef?=">.hd .mui-navbar", listRef=">.bd .p-list"}

@param onGetQueryParam (jlst, callParam/o)

	@param callParam {ac?="Ordr.query", queryParam?={} }

框架在调用callSvr之前获取参数，jlst为当前list组件，一般应设置 callParam.ac 及 callParam.queryParam 参数(如 queryParam.res/orderby/cond等)。
框架将自动管理 queryParam._pagekey/_pagesz 参数。

@param onAddItem (jlst, itemData)

框架调用callSvr之后，处理每条返回数据时，通过调用该函数将itemData转换为DOM item并添加到jlst中。

@param onNoItem (jlst)

当没有任何数据时，可以插入提示信息。

@param pageItf - page interface {refresh?/io}

在订单页面(PageOrder)修改订单后，如果想进入列表页面(PageOrders)时自动刷新所有列表，可以设置 PageOrders.refresh = true。
设置opt.pageItf=PageOrders, 框架可自动检查和管理refresh变量。
 */
function initNavbarAndList(jpage, opt)
{
	var opt_ = opt;
	var listRef = opt_.listRef || ">.bd .p-list";
	var navRef = opt_.navRef || ">.hd .mui-navbar";
	var jallList_ = jpage.find(listRef);
	var jnav_ = jpage.find(navRef);
	var firstShow_ = true;

	init();

	function init()
	{
		jpage.on("pagebeforeshow", function () {
			if (opt_.pageItf && opt_.pageItf.refresh) {
				jallList_.data("nextkey_", null);
				opt_.pageItf.refresh = false;
				firstShow_ = true;
			}
			if (firstShow_ ) {
				firstShow_ = false;
				showOrderList(false, false);
			}
		});

		jnav_.find("a").click(function (ev) {
			// 让系统先选中tab页再操作
			setTimeout(function () {
				showOrderList(false, true);
			});
		});

		var pullListOpt = {
			onLoadItem: showOrderList,
			//onHint: $.noop
		};
		var container = jallList_[0].parentNode;
		initPullList(container, pullListOpt);
	}

	// (isRefresh?=false, skipIfLoaded?=false)
	function showOrderList(isRefresh, skipIfLoaded)
	{
		// nextkey=null: 新开始或刷新
		// nextkey=-1: 列表完成
		var jlst = jallList_.filter(".active");
		var nextkey = jlst.data("nextkey_");
		if (isRefresh) {
			nextkey = null;
		}
		if (nextkey == null) {
			jlst.empty();
		}
		else if (nextkey === -1)
			return;

		if (skipIfLoaded && nextkey != null)
			return;

		var queryParam = {};
		var callParam = {ac: "Ordr.query", queryParam: queryParam };
		opt_.onGetQueryParam(jlst, callParam);

		queryParam._pagesz = g_cfg.PAGE_SZ; // for test, default 20.
		if (nextkey) {
			queryParam._pagekey = nextkey;
		}
		callSvr(callParam.ac, callParam.queryParam, api_OrdrQuery);

		function api_OrdrQuery(data)
		{
			$.each(rs2Array(data), function (i, itemData) {
				opt_.onAddItem(jlst, itemData);
			});
			if (data.nextkey)
				jlst.data("nextkey_", data.nextkey);
			else {
				if (jlst[0].children.length == 0) {
					opt_.onNoItem && opt_.onNoItem(jlst);
				}
				jlst.data("nextkey_", -1);
			}
		}
	}
}

//}}}

// ====== app shared function {{{
//}}}

// vim: set foldmethod=marker:
