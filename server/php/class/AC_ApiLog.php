<?php
class AC0_ApiLog extends AccessControl
{
	protected $allowedAc = ["query", "get"];
	protected $defaultSort = "t0.id DESC";

	protected $vcolDefs = [
		[
			"res" => ["a1.id id1", "a1.req req1", "a1.ac ac1"],
			"join" => "LEFT JOIN ApiLog1 a1 on a1.apiLogId=t0.id",
			// "default" => true
		],
		[
			"res" => ["emp.name empName", "emp.phone empPhone"],
			"join" => "LEFT JOIN Employee emp ON t0.userId=emp.id AND t0.app LIKE 'emp%'",
			"default" => true
		]
	];
	protected $subobj = [
		"log1" => ["obj"=>"ApiLog1", "AC"=>"AccessControl", "cond"=>"apiLogId={id}"],
	];
	protected function onInit() {
		$this->vcolDefs[] = [ "res" => tmCols() ];
	}
}

class AC2_ApiLog extends AC0_ApiLog
{
	protected function onInit() {
		checkAuth(PERM_MGR);
		parent::onInit();
	}
}
