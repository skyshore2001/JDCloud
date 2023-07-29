function initPageQuery(pageOpt)
{
	var jpage = $(this);
	var specialFn = null;

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
			query = query.substr(1);
		}
		else {
			var ms = query.match(/^select\s+.*?(?:from\s+(\S+))?|^show /is);
			if (ms) {
				if (ms[1] && ms[1][0] != '(')
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
						on: {dblclick: td_dblclick_updateOneField}
					};
					cols.push(col);
				});
				jtbl.append(row2tr({cols: cols}));
			});
		}

		function handleSpecial(data) {
			specialFn = null;
			if (data.d.length == 0)
				return;

			// 对show databases特殊支持, 双击查看表
			if (data.hint == 'db') {
				specialFn = function (jtd) {
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
				var db = data.db;
				specialFn = function (jtd) {
					var idx = jtd.prop("cellIndex");
					if (idx != 0)
						return;
					var tbl = jtd.text();
					if (db) {
						if (/\W/.test(db) && db[0] != '`')
							db = '`' + db + '`';
						tbl = db + '.' + tbl;
					}
					var sql = !WUI.isBatchMode()? ('select * from ' + tbl + ' limit 20'): ('!describe ' + tbl);
					openNewTab({sql: sql, exec:1});
				}
				addDynInfo("<span class=\"status-info\">提示: 双击表名可查看数据, Ctrl-双击查看字段</span>");
			}
			else if (data.h.length > 1 && data.h[0] == "id") {
				addDynInfo("<span class=\"status-info\">提示: 双击单元格可更新数据. </span>");
			}
		}

		function td_dblclick_updateOneField(ev)
		{
			var jtd = $(this);
			var jtbl = jtd.closest("table");

			if (specialFn) {
				specialFn(jtd);
				return;
			}

			var tbl = jdivInfo.find("#txtMainTable").text();
			if (tbl == "")
				return;

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
}
