<?php

function api_hello($env)
{
	addLog([
		"get" => $env->_GET(),
		"post" => $env->_POST(),
		"header" => $env->header(),
		"session" => $env->_SESSION(),
	]);
	// return ["id"=>100, "hello"=>"world"];
	$id = $env->param("id");
	$hello = $env->queryOne("SELECT * FROM ApiLog ORDER BY id DESC LIMIT 1");

	$cnt = ++ $env->_SESSION["cnt"];
	return ["id"=>$id, "hello"=>$hello, "cnt"=>$cnt];
}

class AC_Test extends JDApiBase
{
	function api_hello() {
		return callSvcInt("hello");
	}
}
class AC_ApiLog extends AccessControl
{
}
