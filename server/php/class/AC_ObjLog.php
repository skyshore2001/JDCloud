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

	protected function onQuery() {
		$cond = $_GET["cond"];
		@$obj = $cond["obj"];
		@$objFilter = $_GET["objFilter"];
		if ($objFilter && $obj) {
			$acObj = $this->env->createAC($obj, "query");
			$rv = $this->env->tmpEnv($objFilter, null, function () use ($acObj) {
				return $acObj->genCondSql(false);
			});
			$condSql = "SELECT t0.id FROM " . $rv["tblSql"];
			if ($rv["condSql"])
				$condSql .= " WHERE " . $rv['condSql'];
			$this->addJoin("JOIN ($condSql) t1 ON t1.id=t0.objId");
		}
	}
}
