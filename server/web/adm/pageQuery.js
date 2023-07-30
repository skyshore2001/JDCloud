function initPageQuery(pageOpt)
{
	var jpage = $(this);
	var specialFn = null, ctxMenuFor = null;

	jpage.find("#btnQuery").click(btnQuery_click);
	jpage.find("#btnNewTab").click(btnNewTab_click);
	var jdbinst = jpage.find("#cboDbinst");
	jdbinst.mycombobox({
		url: WUI.makeUrl("dbinst"),
		loadFilter: function (data) {
			return $.map(data, function (e) {
				return {name: e};
			});
		}
	});

	var jdivInfo = jpage.find("#divInfo");
	if (pageOpt.sql) {
		jpage.find("#txtQuery").val(pageOpt.sql);
	}
	if (pageOpt.dbinst) {
		jdbinst.val(pageOpt.dbinst);
	}
	if (pageOpt.exec) {
		jpage.find("#btnQuery").click();
	}

	function addDynInfo(html)
	{
		var jo = $("<div class=\"dyninfo\">" + html + "</div>");
		jo.appendTo(jdivInfo);
		jdivInfo.show();
		return jo;
	}

	function cleanDynInfo()
	{
		jdivInfo.find(".dyninfo").remove();
		jdivInfo.hide();
	}

	// 只允许SELECT语句, 缺省禁用其它语句; 如果要用, 必须在语句前加"!".
	function btnQuery_click(ev)
	{
		var query = jpage.find("#txtQuery").val().trim();
		cleanDynInfo();

		if (query[0] == "!") {
			query = query.substr(1).trim();
		}
		else if (/^(select|show) /is.test(query)) {
			var ms = query.match(/^select.* from (\S+)/is);
			if (ms && ms[1][0] != '(')
				addDynInfo("主表: <span id=\"txtMainTable\">" + ms[1] + "</span>");
			/*
			if (query.search(/limit/i) < 0) {
				addDynInfo("<span class=\"status-warning\">只返回前20行.</span>");
				query += " LIMIT 20";
			}
			*/
		}
		else {
			app_alert("不允许SELECT之外的语句.", "w");
			return;
		}

		var tm0 = new Date();
		var dbinst = jdbinst.val();
		var isMultiQuery = /;.*\S/s.test(query);
		callSvr("execSql", {fmt: (isMultiQuery?"":"table"), dbinst:dbinst}, api_execSql, {sql: query}, {noex: 1});

		function api_execSql(data)
		{
			var t2 = (new Date() - tm0) + "ms";
			var t0 = this.xhr_.getResponseHeader("X-ExecSql-Time");
			var t1 = this.xhr_.getResponseHeader("X-Exec-Time");

			var lineCnt = data.d? data.d.length: 1;
			addDynInfo("SQL执行时间: " + t0 + ", 接口执行时间: " + t1 + ", 总时间: " + t2 + ", 行数: " + lineCnt);

			var jtbl = jpage.find("#tblQueryResult");
			jtbl.empty();

			if (data === false) {
				if (this.lastError) {
					var ret = this.lastError;
					data = "Error " + ret[0] + ": " + ret[1];
					if (ret[2]) {
						data += "\n" + ret[2];
					}
				}
			}

			// 不是table格式, 转成table格式
			if (data.h === undefined) {
				data = {h: ["Result"], d: [ [ "<xmp>" + data + "</xmp>"] ] };
			}
			handleSpecial(data);

			// to html table
			var jhead = $("<thead></thead>").appendTo(jtbl);
			var cols = [];
			$.each (data.h, function (i, e) {
					cols.push({useTh: true, html: e});
			});
			jhead.append(row2tr({cols: cols}));

			$.each(data.d, function (i, row) {
				cols = [];
				$.each (row, function (i, e) {
					if (e === null)
						e = "null";
					var col = {
						html: e,
						on: {dblclick: td_dblclick_updateOneField, contextmenu: td_contextmenu}
					};
					cols.push(col);
				});
				jtbl.append(row2tr({cols: cols}));
			});
		}

		function handleSpecial(data) {
			specialFn = null;
			ctxMenuFor = null;
			if (data.d.length == 0)
				return;

			// 对show databases特殊支持, 双击查看表
			if (data.hint == 'db') {
				ctxMenuFor = 'db';
				specialFn = function (jtd, op) {
					var idx = jtd.prop("cellIndex");
					if (idx != 0)
						return;
					var db = jtd.text();
					if (/\W/.test(db) && db[0] != '`')
						db = '`' + db + '`';
					openNewTab({sql: 'show tables from ' + db, exec:1});
				}
				addDynInfo("<span class=\"status-info\">提示: 双击数据库名可查看表</span>");
			}
			// show tables特殊支持, 双击查看数据, ctrl-双击查看字段列表
			else if (data.hint == 'tbl') {
				ctxMenuFor = 'tbl';
				var db = data.db;
				specialFn = function (jtd, op) {
					var idx = jtd.prop("cellIndex");
					if (idx != 0)
						return;
					var tbl = jtd.text();
					if (db) {
						if (/\W/.test(db) && db[0] != '`')
							db = '`' + db + '`';
						tbl = db + '.' + tbl;
					}
					var isCtrl = WUI.isBatchMode();
					if ((op == null && !isCtrl) || op == 'showData') {
						sql = 'select * from ' + tbl + ' limit 20';
					}
					else if (op == 'showDataSortDesc') {
						sql = 'select * from ' + tbl + ' order by id desc limit 20';
					}
					else if ((op == null && isCtrl) || op == 'showFields') {
						sql = '!describe ' + tbl;
					}
					else if (op == 'showIndex') {
						sql = 'show index from ' + tbl;
					}
					openNewTab({sql: sql, exec:1});
				}
				addDynInfo("<span class=\"status-info\">提示: 双击表名可查看数据, Ctrl-双击查看字段</span>");
			}
			else if (data.h.length > 1 && data.h[0] == "id") {
				ctxMenuFor = 'id';
				addDynInfo("<span class=\"status-info\">提示: 双击单元格可更新数据. </span>");
			}
		}

	}

/*
@fn row2tr(row)
@return jquery tr对象
@param row {\@cols}, col: {useTh?=false, html?, \%css?, \%attr?, \%on?}

根据row结构构造jQuery tr对象。
*/
	function row2tr(row)
	{
		var jtr = $("<tr></tr>");
		$.each(row.cols, function (i, col) {
			var jtd = $(col.useTh? "<th></th>": "<td></td>");
			jtd.appendTo(jtr);
			if (col.html != null)
				jtd.html(col.html);
			if (col.css != null)
				jtd.css(col.css);
			if (col.attr != null)
				jtd.attr(col.attr);
			if (col.on != null)
				jtd.on(col.on);
		});
		return jtr;
	}

	function btnNewTab_click(ev) {
		openNewTab();
	}

	function openNewTab(showPageOpt) {
		showPageOpt = $.extend({forceNew:1}, showPageOpt);
		if (showPageOpt.dbinst === undefined)
			showPageOpt.dbinst = jdbinst.val();
		WUI.showPage("pageQuery", showPageOpt);
	}

	function td_dblclick_updateOneField(ev)
	{
		var jtd = $(this);
		handleOp(jtd);
	}

	function handleOp(jtd, op)
	{
		if (specialFn) {
			specialFn(jtd, op);
			return;
		}

		var tbl = jdivInfo.find("#txtMainTable").text();
		if (tbl == "") {
			app_alert("不支持更新!", "e");
			return;
		}

		var jtbl = jtd.closest("table");
		var idCol = jtbl.find("th").filter(function () { return $(this).text() == "id"; }).prop("cellIndex");
		if (idCol === undefined) {
			app_alert("没有id字段, 无法更新!", "e");
			return;
		}
		var idVal = jtd.closest("tr").find("td:eq(" + idCol + ")").text();

		var oldVal = jtd.text();
		var newVal = prompt("将值 \"" + oldVal + "\" 更新为: (可以填写null或empty)", oldVal);
		if (newVal == null)
			return;

		newVal1 = newVal;
		if (newVal == "null") {
		}
		else if (newVal == "empty" || newVal == "''") {
			newVal1 = "''";
		}
		else {
			newVal1 = "'" + newVal.replace(/'/g, "\\'") + "'";
		}

		var colName = jtbl.find("th:eq(" + jtd[0].cellIndex + ")").text();
		var sql = "UPDATE " + tbl + " SET " + colName + "=" + newVal1 + " WHERE id=" + idVal;
		addDynInfo("更新语句: <span class=\"status-warning\">" + sql + "<span>");
		callSvr("execSql", {sql: sql}, function (data) {
				jtd.text(newVal).css({backgroundColor: "yellow"});
				app_show("执行成功, 更新记录数: " + data);
		});
	}
	function td_contextmenu(ev)
	{
		var jtd = $(this);
		var pos = {left: ev.pageX, top: ev.pageY}
		showCtxMenu(pos, jtd, ctxMenuFor);
		ev.preventDefault();
	}
	// type: dblist | tablelist | table
	function showCtxMenu(pos, jtd, ctxMenuFor)
	{
		jmenu = $('<div></div>');
		if (ctxMenuFor == 'db') {
			jmenu.append('<div id="showTable">查看表</div>');
		}
		else if (ctxMenuFor == 'tbl') {
			jmenu.append('<div id="showData">查看数据</div>');
			jmenu.append('<div id="showDataSortDesc">查看数据(倒序)</div>');
			jmenu.append('<div id="showFields">查看字段定义</div>');
			jmenu.append('<div id="showIndex">查看索引</div>');
		}
		else if (ctxMenuFor == 'id') {
			jmenu.append('<div id="setData">修改</div>');
		}
		else {
			return;
		}
		jmenu.menu({
			onClick: function (mnuItem) {
				handleOp(jtd, mnuItem.id);
			}
		});
		jmenu.menu('show', pos);
	}
}
