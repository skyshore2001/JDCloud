// ====== global and defines {{{

var OrderStatus = {
	Unpaid: 0, // 未付款
	Paid: 1, // 待服务
	Received: 2, // 已服务
	Rated: 3, // 已评价
	Cancelled: 4, // 已取消
	Started: 5 // 开始服务
};
var OrderStatusStr = ["未付款", "待服务", "已服务", "已评价", "已取消", "正在服务"];

var ActionStrs = {
	CR: "创建",
	PA: "付款",
	RE: "服务完成",
	CA: "取消",
	RA: "评价",
	ST: "开始服务",
	CT: "更改预约时间",
	AS: "派单",
	AC: "接单"
};

var VoucherStatus = {
	Unused: 0, // 未使用
	Used: 1, // 已使用
	Expired: 2 // 已过期
};

var VoucherType = {
    VoucherSvc: "V_SVC",
    VoucherItt: "V_ITT",
    VoucherDiscount: "V_DISCOUNT",
    VoucherFix: "V_FIX",
    VoucherOnsite: "V_ONSITE",
}
    
var VoucherIttType = {
	Promotion:90,
	OnsiteVoucher: 100110, //全场通用
    Wash: 100, //洗车
    Wax: 101, //打蜡
    Tyre: 102, //轮胎
    WheelHub: 103, //轮毂
    ElaborateWash: 104, //内饰精洗
    Film: 105, //贴膜
    AirClean: 106, //光氧净化
	WashWater: 108, //光氧净化
	Wiper: 109,		//更换雨刮器
	NacelleWash: 110,	//发动机舱清洗
	WheelWash:111,	//轮毂清洗
	GlassCoat: 112,	//玻璃镀膜
	AirDuctClean: 113,	//空调管道清洗
	PlatingCrystal: 114,	//空调管道清洗
	ClearWash: 115,	//精致洗车
	StoreWash: 3, //到店洗车
	SprayPaint:75,	//钣金喷漆
	Maintenance: 1,	//小保养
};

var VoucherStatusStr = ["未使用", "已使用", "已过期"];
//var VoucherIttStr = ["上门洗车优惠券", "上门打蜡优惠券", "轮胎保养优惠券", "轮毂保养优惠券", "内饰精洗优惠券", "上门贴膜优惠券", "光氧净化优惠券","到店洗车优惠券"];
var VoucherIttStr = {
	"100110": "全场通用优惠券",
	"100": "上门洗车优惠券", 
	"101": "上门打蜡优惠券", 
	"102": "轮胎保养优惠券", 
	"103": "轮毂保养优惠券", 
	"104": "内饰精洗优惠券", 
	"105": "上门贴膜优惠券", 
	"106": "车内空气净化优惠券",
	"107": "真皮养护优惠券",
	"108": "添加玻璃水优惠券",
	"109": "更换雨刮器优惠券",
	"110": "发动机舱清洗优惠券",
	"111": "轮毂清洗优惠券",
	"112": "玻璃镀膜优惠券",
	"113": "空调管道清洗优惠券",
	"114": "镀晶优惠券",
	"115": "精致洗车优惠券",
	"3": "到店洗车优惠券",
	"75": "钣金喷漆优惠券",
	"1": "小保养优惠券",
	"90": "整车翻新优惠券",
	"91": "全车除尘优惠券",
	"92": "高级养护优惠券",
	"93": "整车镀膜优惠券",
	"94": "儿童座椅优惠券",
	"97": "车内翻新优惠券",
	"98": "整车无痕优惠券",
};
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
function formatSn(sn)
{
	var d = '';
	for (i=0; i<sn.length; i+=4) {
		if (d.length > 0) {
			d += "-";
		}
		d += sn.substr(i, 4);
	}
	return d;
}

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

// optional: dfd, imageViewer
function showOrderList(jlst, orderId, dfd, imageViewer, baiduMapPageId, showCmt2)
{
	jlst.empty();
	callSvr("Ordr.get", {id: orderId}, function (data) {
		// to show map
		if (baiduMapPageId) {
			$("#" + baiduMapPageId).data("pos", data.userPos);
            $("#" + baiduMapPageId).data("showSvcPos", showCmt2);
        }

		var statusStr = OrderStatusStr[data.status] || data.status;

        //showCmt2本来用来表示是不是显示商户备注，实际上也就是客户端和员工端的区别
        //如果是员工端，那么联系方式这一项点击需要可以直接拨号
        var contactPhoneStr = showCmt2 ?
        "<a href=tel:" + data.userPhone + ">联系方式: " +  data.userPhone + "</a>" 
        : "联系方式: " +  data.userPhone;

		var arr = [
			"<h3>" + data.dscr + "</h3>",
			"订单号: " + data.id,
// 				"商户名称: " + data.storeName,
			"金额: " + parseFloat(data.amount) + "元", 
			"预约时间: " + dateStr(data.comeTm) + " " + data.comeSpan,
			"车辆信息: " + [data.carPlateNum, data.carColor, data.brandName, data.seriesName].join(" / "),
			contactPhoneStr,
// 			"用户位置: " + data.userPosDscr,
			baiduMapPageId? "<a href=#" + baiduMapPageId + ">用户位置: " + data.userPosDscr + "</a>"
				: "用户位置: " + data.userPosDscr,
// 				"备注: " + 
// 				"商户地址: " + (data.storeAddr || "无"),
// 				"商户联系方式: " + (data.storeTel || "无"),
		];

		if (data.empName != null && data.empName != "") {
			arr.push("已分派员工: " + data.empName);
		}

        if (showCmt2 == null) {
            var hotlineNum = "4008208913";
            var hotline = "<a href=tel:" + hotlineNum + ">服务热线: " + hotlineNum + "</a>"
			arr.push(hotline);
        }

		if (data.cmt != null && data.cmt != "")
			arr.push("<span style='color:red; font-weight:bold;'>备注: " + data.cmt + "</span>");

		if (data.cmt2 != null && data.cmt2 != "" && showCmt2)
			arr.push("<span style='color:blue; font-weight:bold;'>商户备注: " + data.cmt2 + "</span>");

		if (data.payType != null) {
			arr.push("付款方式: " + (["支付宝", "微信支付", "账户余额", "现金付款", "会员卡付款"][data.payType] || data.payType));
			arr.push("交易号: " + data.payNo);
		}
        
		$.each(arr, function (i, e) {
			var ji = $("<li>" + e + "</li>");
			ji.appendTo(jlst);
		});
		// 长按弹出全文（解决部分安卓系统上无法复制）
		jlst.find("li>a").bind("taphold", function () {
			app_alert($(this).text());
		});

		// order images
		if (data.atts && data.atts.length > 0) {
			var ji = $("<li class='orderAtt'></li>").appendTo(jlst);
			var $div = $("<div style='overflow:auto'></div>").appendTo(ji);

			var urls = [];
			$.each(data.atts, function (i, att) {
				urls.push(makeUrl("att", {thumbId: att.attId}))
			});

			var hasInternal = false;
			$.each(data.atts, function (i, orderAtt) {
				var $img = $("<img>").appendTo($div);
				$img.css("cursor", "pointer")
					.css({
						maxWidth: "100px",
						maxHeight: "100px"
					})
					.attr("src", makeUrl("att", {id: orderAtt.attId}))
					.click(function () {
						if (imageViewer)
							imageViewer.showImage(urls, i);
					});
				orderAtt.forInternal = tobool(orderAtt.forInternal);
				$img.data("opt", orderAtt);
				if (orderAtt.forInternal) {
					$img.css({
						borderStyle: "dashed",
						borderColor: "red"
					});
					hasInternal = true;
				}
			});
			if (hasInternal)
				ji.append("<p>红虚线框内图片为内部使用; 长按图片选择操作.</p>");
		}

		// items
		var div = $("<div><h4>明细</h4></div>").appendTo(jlst);
		var ul_items = $("<ul></ul>").appendTo(div);
		$.each(data.items, function (i, e) {
			var ji = $("<li>" + e.name + "- " + parseFloat(e.price) + "元 x " + parseFloat(e.qty) + 
//					"<p>" + e.dscr + "</p>" +
				"</li>");
			ji.appendTo(ul_items);
		});
		ul_items.listview();
		div.collapsible();

		// order log
		if (data.orderLog) {
			var div = $("<div><h4>订单日志</h4></div>").appendTo(jlst);
			var ul_items = $("<ul></ul>").appendTo(div);

			$.each(data.orderLog, function (i, e) {
				var acstr = ActionStrs[e.action] || e.action;
				var str = "<h3>" + acstr + "</h3>";
				if (e.dscr)
					str += "<p>" + e.dscr + "<p>";
				str += "<p class=\"ui-li-aside\">时间: " + dtStr(e.tm) + "</p>";
				if (e.empName && e.empPhone) {
					str += "<p>操作人: " + e.empName + "/" + 
						"<a href='tel:" + e.empPhone + "'>" + e.empPhone + "</a></p>";
				}
				var ji = $("<li>" + str + "</li>");
				ji.appendTo(ul_items);
			});
			ul_items.listview();
			div.collapsible();
		}

		// vouchers
		if (data.vouchers && data.vouchers.length > 0)
		{
			div = $("<div><h4>优惠券</h4></div>").appendTo(jlst);
			var ul_vouchers = $("<ul></ul>").appendTo(div);
			$.each(data.vouchers, function (i, e) {
				var ji = $("<li>已使用 " + formatSn(e.sn) + " (" + parseFloat(e.amount) + "元)" + 
//					"<p>" + e.dscr + "</p>" +
					"</li>");
				ji.appendTo(ul_vouchers);
			});
			ul_vouchers.listview();
			div.collapsible();
		}

		jlst.listview().listview('refresh');

		if (dfd)
			dfd.resolve(data);
	});
}

// <button id=btnGenCode>发送验证码<span class=p-prompt></span></button>
function setupGenCodeButton(btnGenCode, txtPhone)
{
	btnGenCode.click(function () {
		var phone = txtPhone.val();
		if (phone == "") {
			app_alert("填写手机号!")
			return;
		}
		callSvr("genCode", {phone: phone});

		var $btn = $(this);
		$btn.attr("disabled", true);

		var n = 60;
		var tv = setInterval(function () {
			var s = "";
			-- n;
			if (n > 0) 
				s = "(" + n + "秒后可用)";
			else {
				clearInterval(tv);
				$btn.attr("disabled", false);
			}
			btnGenCode.find(".p-prompt").text(s);
		}, 1000);
	});
}

// ====== page baidumap {{{

$(document).on("pagecreate", "#baidumap", function () {
	var jpage = $(this);
	var divMapId = "divBaiduMap0619";
	var jdiv = jpage.find("#" + divMapId);
	var map;
	var curPoint;

	var dfd = $.getScriptWithCache("http://api.map.baidu.com/getscript?v=2.0&ak=n8jywKn098BwbP77nUVaQk0L&services=&t=20150514110922");
	dfd.then(function () {
		var height = $(document).height();
		var width = $(document).width();

		jdiv.height(height).width(width);
	// 	jdlg.height(jdiv.height()).width(jdiv.width());

		map = new BMap.Map(divMapId);
	});

	function setPoint(point)
	{
		if (curPoint != null && point.lat == curPoint.lat && point.lng == curPoint.lng)
			return;
		map.clearOverlays();
		var mk = new BMap.Marker(point);
		map.addOverlay(mk);
		curPoint = point;
		map.centerAndZoom(point, 16);
// 		map.setCenter(point);
	}

    function setSvcPoint()
	{
        var svcIcon = new BMap.Icon("http://developer.baidu.com/map/jsdemo/img/fox.gif", new BMap.Size(200,100));

        // [lng, lan, dscr, radius]
        //[121.384493,31.112535, "闵行莘庄商圈", 7], // 7km
        //[121.590393,31.053286, "南郊中华园", 1], // 航头
        //[121.578616,31.14429, "浦东康桥地区", 5], // 中心：周康四村
        //[121.560905,31.21803, "世纪公园/联洋/花木地区", 3.5] // 中心：花木路白杨路
        var svcPostions = new Array()
        svcPostions["闵行莘庄商圈"] = new BMap.Point(121.384493,31.112535);
        svcPostions["南郊中华园"] = new BMap.Point(121.590393,31.053286);
        svcPostions["浦东康桥地区"] = new BMap.Point(121.578616,31.14429);
        svcPostions["世纪公园联洋花木"] = new BMap.Point(121.560905,31.21803);

        //for (var i=0; i<svcPostions.length; i++)
        for (var key in svcPostions)
        {
            var marker = new BMap.Marker(svcPostions[key], {icon:svcIcon});
            map.addOverlay(marker);
            var label = new BMap.Label(key, {offset:new BMap.Size(150, 20)});
            //var label = new BMap.Label(key);
            marker.setLabel(label);
        }
	}

	// pagebeforeshow cannot center the point
	jpage.on("pageshow", function () {
		dfd.then(function () {
			var userPos = jpage.data("pos");
            var showSvcPos = jpage.data("showSvcPos");
			if (userPos) {
				var pos = userPos.split(",");
				var point = new BMap.Point(pos[0], pos[1]);
				if(jpage.data('startPos')!= null){
					map.clearOverlays();
					var p1 = new BMap.Point(jpage.data('startPos').lng,jpage.data('startPos').lat);
					var p2 = new BMap.Point(point.lng,point.lat);
					map.centerAndZoom(point, 16);
					var driving = new BMap.DrivingRoute(map, {renderOptions:{map: map, autoViewport: true}});
					driving.search(p1,p2);
				}else{
					setPoint(point);

					if (showSvcPos) {
						setSvcPoint();
					}
				}
			}
			else {
				alert("找不到地点！");
			}
		});
	});
});
//}}}

function hourToSpan(n)
{
	return n + ":00-" + (n+1) + ":00";
}

// fromWeb 从链接中进入浏览器
function fromWeb(){
	return window.location.search.indexOf("fromweb")>=0;
}

// 地图插件
function mapPlugin(dfd){
	window.locationService.getCurrentPosition(function(pos){
		dfd.resolve(pos.coords.longitude+","+pos.coords.latitude);
		window.locationService.stop(noop,noop);
	},function(e){
		alert(e);
		alert(JSON.stringify(e));
		window.locationService.stop(noop,noop);
	});
}
//}}}


// ====== 图片压缩与上传 {{{
	
/**@class CompressPic() 图片压缩*/
function CompressPic($btn, cb){
	var self = this;
	var $comUpload = $btn; // 上传组件
	var imageViewer = new ImageViewer("imageViewer");
	self.imageData = []; // 所有压缩后的图片

	if (! (g_cordova && navigator.camera)){
		$comUpload.on("change", uploadPicViaHtml);  // 使用HTML5上传
	}else {
		$comUpload.hide();
		$comUpload.parent().click(uploadPicViaCordova);
	}

	/**@fn uploadPicViaCordova() #使用Cordova插件*/
	function uploadPicViaCordova(){
		navigator.camera.getPicture(onSuccess, onFail, {
			quality: 50,
			destinationType: Camera.DestinationType.DATA_URL,
			sourceType: Camera.PictureSourceType.PHOTOLIBRARY,//useCamera? Camera.PictureSourceType.CAMERA:
			allowEdit: false,
			targetWidth: 1280,
			targetHeight: 1280
		});

		function onSuccess(rst) {
			var data = "data:image/jpeg;base64," + rst;
			self.imageData.push(data);
			if(cb)
				cb(data);
		}

		function onFail(msg) {}
	}

	/**@fn uploadPicViaHtml() #使用Html*/
	function uploadPicViaHtml(){
		var fileList = $comUpload[0].files;
		$.each(fileList, function(i, e){
			lrz(e, {width: 1280, height: 1280,quality: 0.5,before: function () {},fail: onFail,always: function () {},done: onSuccess});
		});

		function onSuccess(rst){
			self.imageData.push(rst.base64);
			if(cb)
				cb(rst.base64);
		}
		function onFail(msg){ app_alert(msg, "e"); }
	}
}

/**@fn upload() */
function upload(images, cb){
	var attIds = []; // 所有图片id
	if(images.length == 0 && cb) { cb(attIds); return; }
	var param = {fmt: "raw_b64", genThumb: 1, f: "1.jpg", autoResize: 0};
	var count = 0;
	$.each(images, function(i, e){
		callSvr("upload", param, function(data){
			count ++;
			attIds.push(data[0].thumbId);
			if(count == images.length && cb){cb(attIds)}
		}, e.split("base64,")[1]);
	});
}
//}}}

/**@fn upload() */
var onsiteSvcsId = [];
function isOnsiteSvc(svcId){
	if(onsiteSvcsId == null || onsiteSvcsId == ""){
		callSvrSync("queryAStore",function(data){
			$.each(data[0].items,function(i, v){
				onsiteSvcsId.push(v.ittId);
			});
		});
	}
	return onsiteSvcsId.indexOf(svcId) >= 0;
}
//}}}

/**@fn isNullObj() #对象是否为空*/
function isNullObj(obj){
	for(var i in obj){
		if(obj.hasOwnProperty(i)){
			return false;
		}
	}
	return true;
}


// vim: set foldmethod=marker:
