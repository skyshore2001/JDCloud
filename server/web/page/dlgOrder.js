function initDlgOrder()
{
	var jdlg = $(this);
	jdlg.on("beforeshow", onBeforeShow)
	
	function onBeforeShow(ev, formMode, opt)
	{
		var forFind = formMode == FormMode.forFind;
		var forSet = formMode == FormMode.forSet;
		jdlg.find(".forFind").toggle(forFind);
		jdlg.find(".forSet").toggle(forSet);

		setTimeout(onShow);
		function onShow() {
			// 对字段或表格的设置应放在onShow里
			if (forSet) {
				jdlg.find("#tblOrderLog").datagrid({
					data: opt.data.orderLog || []
				});
			}
		}
	}
}
