// ====== global and defines {{{
/*
如果服务端接口兼容业务查询协议(BQP)，可定义 MUI.options.serverUrl 指向服务端接口地址。
否则应定义MUI.callSvrExt适配接口。
*/
$.extend(MUI.options, {
	serverUrl: "../jdcloud/api.php"
	// serverUrlAc: "ac"
});

// 模拟接口返回数据
MUI.loadScript("mockdata.js", {async: false, cache: false});
//}}}

// ====== app fw {{{
//}}}

// ====== app shared function {{{
//}}}

// vim: set foldmethod=marker:
