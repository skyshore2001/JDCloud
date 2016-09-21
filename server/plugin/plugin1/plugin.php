<?php

// 实现插件定义的交互接口
function api_svrinfo()
{
	return [
		"serverSoftware" => @$_SERVER['SERVER_SOFTWARE'] ?: 'unknown',
		"tm" => strftime("%Y-%m-%d %H:%M:%S", $_SERVER['REQUEST_TIME']) ?: 'unknown',
		"clientAddr" => @$_SERVER['REMOTE_ADDR'] ?: 'unknown'
	];
}

// 可选，返回插件配置
/*
return [
	"js" => "m2/plugin.js" // 前端需要包含的文件
];
 */
