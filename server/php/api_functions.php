<?php

function api_sendSms()
{
	checkAuth(AUTH_EMP);

	$phone = mparam("phone");
	$content = mparam("content");
	$channel = param("channel", 0);

	sendSms($phone, $content, $channel, true);
}

function api_hello($env)
{
	var_export([
		"get" => $env->_GET(),
		"post" => $env->_POST(),
		"header" => $env->header()
	]);
	$log1 = $env->queryOne("SELECT * FROM ApiLog ORDER BY id DESC LIMIT 1");
	$log2 = queryOne("SELECT * FROM ApiLog ORDER BY id DESC LIMIT 1");
	$id = $env->param("id");
	$id2 = param("id");
	return ["id"=>$id, "id2"=>$id2, "hello"=>"world", "log"=>$log1, "log2"=>$log2];
}
// vi: foldmethod=marker
