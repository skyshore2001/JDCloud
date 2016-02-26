function initPageHome()
{
	var jpage = $(this);
	var dlgUserInit = jpage.find("#dlgUserInit");

	// ==== function {{{
	function refreshOrderList()
	{
		PageHome.refresh = false;
		jpage.find(".p-list").empty();
		showCurrentList(true);
	}

	// force?=false
	function showCurrentList(force)
	{
		var activeTab = jpage.find(".mui-navbar .active").attr("mui-linkto");
		var jlst = jpage.find(activeTab);
		if (! force && jlst.children().size() > 0) {
			return;
		}
		var cond = jlst.data("cond");
		showOrderList(jlst, cond);
	}

	// cond?
	// nextkey?: true to append more records;
	function showOrderList(jlst, cond, nextkey)
	{
		var param = {};
		param._pagesz = g_cfg.PAGE_SZ; // for test, default 20.
// 		var cond = "status<>'CA'";
		if (cond)
			param.cond = cond;
		param.orderby = "id desc";

		if (nextkey == null)
			jlst.empty();
		else {
			param._pagekey = nextkey;
			jlst.find(".nextpage").remove();
		}
		callSvr("Ordr.query", param, api_OrdrQuery);
		
		function api_OrdrQuery(data) 
		{
			var jp = jlst.children(":first");
			if (jp.size() == 0) {
				jp = $('<div class="weui_cells weui_cells_access"></div>').appendTo(jlst);
				$("<div style='height:40px'></div>").appendTo(jlst); // 让出按钮区域
			}
			$.each(rs2Array(data), function (i, e) {
				var cell = {
					bd: "<p><b>" + e.dscr + "</b></p><p>订单号: " + e.id + "</p>",
					ft: StatusStr[e.status]
				};
				var ji = createCell(cell);
				ji.appendTo(jp);

				ji.click(function () {
					PageOrder.id = e.id;
					MUI.showPage("#order");
					return false;
				});
			});
			if (data.nextkey) {
				ji = createCell({bd:"点击查看更多..."}).addClass("nextpage").appendTo(jp);
				ji.click(function() {
					showOrderList(jlst, cond, data.nextkey);
				});
			}
			else {
				checkEmptyList(jlst);
			}
		}
	}

	function page_show()
	{
		if (PageHome.userInit)
		{
			MUI.showDialog(dlgUserInit);
			PageHome.userInit = false;
		}
		if (PageHome.refresh) {
			refreshOrderList();
		}
	}

	// ====== dialog dlgUserInit {{{
	function initDlgUserInit()
	{
		var jdlg = this;
		var jf = jdlg.find("form");
		MUI.setFormSubmit(jf, api_UserSet);

		function api_UserSet(data)
		{
			callSvr("User.get", function (data) {
				g_data.userInfo = data;
			});
			MUI.closeDialog(jdlg);
		}
	}
	// }}}
	
	// }}}
	
	jpage.find("#btnRefreshList").click(refreshOrderList);
	jpage.find(".hd .mui-navbar a").click(function () {
		// 让系统先选中tab页再操作
		setTimeout(showCurrentList);
	});
	showCurrentList();

	MUI.setupDialog(dlgUserInit, initDlgUserInit);
	jpage.on("pageshow", page_show);

	PageHome.show = function (reload) {
		MUI.showPage("#home");
		if (reload)
			refreshOrderList();
	}
}

