// ====== global and defines {{{
/*
如果服务端接口兼容业务查询协议(BQP)，可定义 MUI.options.serverUrl 指向服务端接口地址。
否则应定义MUI.callSvrExt适配接口。
*/
$.extend(MUI.options, {
	serverUrl: "../api.php"
	// serverUrlAc: "ac"
});

// 模拟接口返回数据
// MUI.loadScript("mockdata.js", {async: false, cache: false});
//}}}

// ====== app fw {{{
//}}}

// ====== app shared function {{{
var dfdStatLib_;
function loadStatLib()
{
	if (dfdStatLib_ == null) {
		dfdStatLib_ = $.when(
			MUI.loadScript("../web/lib/echarts.min.js"),
			MUI.loadScript("../web/lib/jdcloud-wui-stat.js")
		);
	}
	return dfdStatLib_;
}

var dfdUploadLib_;
function loadUploadLib()
{
	if (dfdUploadLib_ == null) {
		dfdUploadLib_ = MUI.loadScript("./lib/jdcloud-uploadpic.js");
	}
	return dfdUploadLib_;
}
//}}}

// vim: set foldmethod=marker:
