function initPageQuery() 
{
	var jpage = $(this);

	jpage.find("#btnQuery").click(btnQuery_click);

	var jdivInfo = jpage.find("#divInfo");
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
		var query = jpage.find("#txtQuery").val();
		cleanDynInfo();

		var ms = query.match(/select\s+.*?from\s+(\S+)/);
		if (ms) {
			addDynInfo("主表: <span id=\"txtMainTable\">" + ms[1] + "</span>");
			if (query.search(/limit/i) < 0) {
				addDynInfo("<span class=\"status-warning\">只返回前20行.</span>");
				query += " LIMIT 20";
			}
		}
		else {
			if (query[0] != "!") {
				app_alert("不允许SELECT之外的语句.", "w");
				return;
			}
			query = query.substr(1);
		}

		callSvr("execSql", {fmt: "table"}, api_execSql, {sql: query}, {noex: 1});

		function api_execSql(data)
		{
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

		function td_dblclick_updateOneField(ev)
		{
			var jtd = $(this);
			var jtbl = jtd.closest("table");

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
}
