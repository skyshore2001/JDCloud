function initPageQuery(pageOpt)
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblQueryResult");

	var lastData = {}; // 特殊处理: hint=db|tbl, db:show databases, tbl:show tables
	jpage.find("#btnQuery").click(btnQuery_click);
	jpage.find("#btnQuerySel").click({doSel: true}, btnQuery_click);
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

	jpage.on("dblclick", "td", td_dblclick);
	jpage.on("contextmenu", page_contextmenu);

	var jdivInfo = jpage.find("#divInfo");
	if (pageOpt.sql) {
		jpage.find("#txtQuery").val(pageOpt.sql);
	}
	if (pageOpt.dbinst) {
		jdbinst.val(pageOpt.dbinst);
	}
	if (pageOpt.exec) {
		execSql();
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
		var o = jpage.find("#txtQuery")[0];
		var query;
		if (ev && ev.data && ev.data.doSel) {
			query = o.value.substring(o.selectionStart, o.selectionEnd).trim();
		}
		else {
			query = o.value.trim();
		}
		if (!query)
			return;
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
			lastData = data;
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
					};
					cols.push(col);
				});
				jtbl.append(row2tr({cols: cols}));
			});
		}

		function handleSpecial(data) {
			if (data.d.length == 0)
				return;

			// 对show databases特殊支持, 双击查看表
			if (data.hint == 'db') {
				addDynInfo("<span class=\"status-info\">提示: 双击数据库名可查看表</span>");
			}
			// show tables特殊支持, 双击查看数据, ctrl-双击查看字段列表
			else if (data.hint == 'tbl') {
				addDynInfo("<span class=\"status-info\">提示: 双击表名可查看数据, Ctrl-双击查看字段</span>");
			}
			else if (getIdCol() >= 0) {
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

	function execSql(sql, showInNewTab) {
		if (showInNewTab) {
			openNewTab({sql: sql, exec:1});
			return;
		}
		if (sql)
			jpage.find("#txtQuery").val(sql);
		btnQuery_click();
	}

	function openNewTab(showPageOpt) {
		showPageOpt = $.extend({forceNew:1}, showPageOpt);
		if (showPageOpt.dbinst === undefined)
			showPageOpt.dbinst = jdbinst.val();
		WUI.showPage("pageQuery", showPageOpt);
	}

	function td_dblclick(ev)
	{
		var jtd = $(ev.target);
		var op = "setData";
		if (lastData.hint == "db") {
			op = "showTable";
		}
		else if (lastData.hint == "tbl") {
			var isCtrl = WUI.isBatchMode();
			op = isCtrl? "showFields": "showData";
		}
		handleOp(jtd, op);
	}

	// jtd是右键或双击时所在td位置，也可能为null，表示在非td上操作
	function handleOp(jtd, op)
	{
		if (op == "showTable") {
			if (lastData.hint == 'db' && jtd) {
				var idx = jtd.prop("cellIndex");
				if (idx != 0)
					return;
				var db = jtd.text();
				if (/\W/.test(db) && db[0] != '`')
					db = '`' + db + '`';
				execSql('show tables from ' + db, true);
			}
			else {
				execSql('show tables');
			}
			return;
		}

		var tbl = getOpTable(jtd);
		if (!tbl) {
			app_alert("没有表信息，不支持操作!", "e");
			return;
		}
		var sql = null;
		if (op == 'showData') {
			sql = 'select * from ' + tbl + ' limit 20';
			execSql(sql, lastData.hint=='tbl');
			return;
		}
		if (op == 'showDataSortDesc') {
			sql = 'select * from ' + tbl + ' order by id desc limit 20';
			execSql(sql, lastData.hint=='tbl');
			return;
		}
		if (op == 'showFields') {
			sql = '!describe ' + tbl;
			execSql(sql, true);
			return;
		}
		if (op == 'showIndex') {
			sql = 'show index from ' + tbl;
			execSql(sql, true);
			return;
		}
		if (op == 'genSelect' || op == 'genUpdate' || op == 'genIndex' || op == 'genDelete') {
			var val = jtd.text();
			var colName = jtbl.find("th:eq(" + jtd[0].cellIndex + ")").text();
			var cond = colName + "=" + Q(val);
			if (op == 'genSelect') {
				sql = 'select * from ' + tbl + ' where ' + cond + " limit 20";
			}
			else if (op == 'genUpdate') {
				sql = 'update ' + tbl + ' set ' + cond + ' where ' + cond;
			}
			else if (op == 'genDelete') {
				sql = 'delete from ' + tbl + ' where ' + cond;
			}
			else if (op == 'genIndex') {
				sql = 'create index idx_' + colName + ' on ' + tbl + '(' + colName + ')';
			}
			if (sql) {
				openNewTab({sql: sql});
				// jpage.find("#txtQuery").val(sql);
			}
			return;
		}

		var idCol = getIdCol();
		if (idCol < 0) {
			app_alert("没有id字段, 无法操作!", "e");
			return;
		}

		if (op == 'showNextPage' && lastData.d.length > 0) {
			var lastId = lastData.d[lastData.d.length-1][idCol];
			sql = jpage.find("#txtQuery").val();
			var isDesc = /\bdesc\b/i.test(sql);
			var cond = "id" + (isDesc? "<": ">") + lastId;
			sql = sql.replace(/(\bfrom \S+).*$/i, function (m0, from) {
				return from + " where " + cond + " order by id" + (isDesc? " desc": "") + " limit 20";
			});
			execSql(sql);
			return;
		}

		if (op == 'setData') {
			var idVal = jtd.closest("tr").find("td:eq(" + idCol + ")").text();

			var oldVal = jtd.text();
			var newVal = prompt("将值 \"" + oldVal + "\" 更新为: (可以填写null或empty)", oldVal);
			if (newVal == null)
				return;

			var newVal1 = newVal;
			if (newVal == "null") {
			}
			else if (newVal == "empty" || newVal == "''") {
				newVal1 = "''";
			}
			else {
				newVal1 = Q(newVal);
			}

			var dbinst = jdbinst.val();
			var colName = jtbl.find("th:eq(" + jtd[0].cellIndex + ")").text();
			sql = "UPDATE " + tbl + " SET " + colName + "=" + newVal1 + " WHERE id=" + Q(idVal);
			addDynInfo("更新语句: <span class=\"status-warning\">" + sql + "<span>");
			callSvr("execSql", function (data) {
				jtd.text(newVal).css({backgroundColor: "yellow"});
				addDynInfo("执行成功, 更新记录数: " + data);
			}, {sql: sql, dbinst: dbinst});
			return;
		}
	}
	function page_contextmenu(ev)
	{
		var jtd = $(ev.target).closest("td");
		if (jtd.size() == 0)
			jtd = null;
		var pos = {left: ev.pageX, top: ev.pageY}
		showCtxMenu(pos, jtd);
		return false;
	}
	// 返回id字段的index(>=0), 找不到id字段返回-1
	function getIdCol() {
		var idCol = -1;
		if (lastData.h && lastData.h.length > 1) {
			idCol = lastData.h.indexOf("id");
		}
		return idCol;
	}
	function getOpTable(jtd) {
		if (lastData.hint == 'tbl' && jtd) {
			var db = lastData.db;
			var idx = jtd.prop("cellIndex");
			if (idx != 0)
				return;
			var tbl = jtd.text();
			if (db) {
				if (/\W/.test(db) && db[0] != '`')
					db = '`' + db + '`';
				tbl = db + '.' + tbl;
			}
			return tbl;
		}

		var tbl = jdivInfo.find("#txtMainTable").text();
		return tbl;
	}
	// type: dblist | tablelist | table
	function showCtxMenu(pos, jtd)
	{
		var menuArr = [];
		if (getIdCol() >= 0 && jtd) {
			menuArr.push('<div id="setData">修改</div>');
			menuArr.push('<div>SQL <div><div id="genSelect">SELECT</div> <div id="genUpdate">UPDATE</div> <div id="genDelete">DELETE</div> <div id="genIndex">CREATE INDEX</div></div> </div>');
		}
		if (getOpTable(jtd)) {
			menuArr.push('<div id="showNextPage">下一页</div>');
			menuArr.push('<div id="showData">查看数据</div>');
			menuArr.push('<div id="showDataSortDesc">查看数据(倒序)</div>');
			menuArr.push('<div id="showFields">查看表结构</div>');
			menuArr.push('<div id="showIndex">查看索引</div>');
		}
		menuArr.push('<div id="showTable">查看所有表</div>');
		var jmenu = $('<div></div>');
		menuArr.forEach(function (e) {
			jmenu.append(e);
		});
		jmenu.menu({
			onClick: function (mnuItem) {
				handleOp(jtd, mnuItem.id);
			}
		});
		jmenu.menu('show', pos);
	}
}
