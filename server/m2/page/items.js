function initPageItems()
{
	var jpage = $(this);

	var types_ = null;
	var items_ = null;
	var jlstType = jpage.find(".p-list-type");

	var lstIf = initPageList(jpage, {
		//pageItf: PageItems,
		//navRef: ">.hd .mui-navbar",
		navRef: "",
		listRef: ">.bd .p-list",
		onGetQueryParam: function (jlst, queryParam) {
			queryParam.cond = "storeId=" + g_data.storeId;
		},
		onAddItem: onAddItem,
		onNoItem: onNoItem_default,
		onBeforeLoad: function (jlst, isFirstPage) {
			console.log('beforeload');
			console.log(isFirstPage);
			if (! isFirstPage)
				return;
			types_ = [];
			items_ = [];
			jlstType.empty();
		},
		onLoad: function (jlst, isLastPage) {
			// clean up
			console.log('loaded');
			console.log(isLastPage);
		}
	});

	function onAddItem(jlst, itemData)
	{
		items_.push(itemData);
		var type = itemData.type || '其它';
		if (types_.length > 0 && types_[types_.length-1] == type) {
		}
		else {
			types_.push(type);
			var typeCell = {
				bd: type
			};
			var jtype = createCell(typeCell);
			jtype.appendTo(jlst);

			var jtypeA = createCell(typeCell);
			jtypeA.appendTo(jlstType);
			jtypeA.click(function () {
				jlst.parent()[0].scrollTop = jtype[0].offsetTop;
			});
		}

		itemData.price = parseFloat(itemData.price);
		var cell = {
			hd: '<i class="icon icon-dscr"></i>',
			bd: "<p><b>" + itemData.name + "</b></p>",
			ft: itemData.price + "元 <button class='btnAdd'><i class='icon icon-add' style='margin: 2px 8px'></i></button>"
		};
		var ji = createCell(cell);
		ji.addClass("divItem");
		ji.appendTo(jlst);
		ji.click(li_click);

		ji.data("obj", itemData);
		ji.find(".btnAdd").click(btnAdd_click);
		//ji.on("click", li_click);

	}

	function btnAdd_click()
	{
		var ji = $(this).closest(".divItem");
		var obj = ji.data("obj");
		addItemToGlobal(obj);
		return false;
	}

	function li_click(ev)
	{
		var obj = $(this).data("obj");
		PageItemPic.show(items_, obj);
		return false;
	}
}

