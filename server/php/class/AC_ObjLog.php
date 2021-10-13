<?php

class AC2_ObjLog extends AccessControl
{
	protected $allowedAc = ['query', 'get'];

	protected $vcolDefs = [
		[
			"res" => ["a.tm", "ifnull(a1.ac,a.ac) ac", "ifnull(a1.req,a.req) req", "a.userId", "a.addr", "a.ac ac0", "a1.ac ac1"],
			"join" => "LEFT JOIN ApiLog a ON t0.apiLogId=a.id
LEFT JOIN ApiLog1 a1 on t0.apiLog1Id=a1.id",
			"default" => true
		],
		[
			"res" => ["emp.name empName", "emp.phone empPhone"],
			"join" => "LEFT JOIN Employee emp ON a.userId=emp.id",
			"require" => "userId",
			"default" => true
		]
	];
}
