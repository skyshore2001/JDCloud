<?php
// 注意: Syslog与系统已有类重名
class AC0_SyslogV extends AccessControl
{
	protected $allowedAc = ["query", "get"];
	protected $table = "Syslog";
	protected $defaultSort = "t0.id DESC";
	protected $defaultRes = "t0.*,addr,ua,app,ses,userId,ver,serverRev";
	protected $vcolDefs = [
		[
			"res" => ["a.addr", "a.ua", "a.app", "a.ses", "a.userId", "a.ver", "a.serverRev"],
			"join" => "LEFT JOIN ApiLog a ON a.id=t0.apiLogId",
			"default" => true
		]
	];
}

class AC2_SyslogV extends AC0_SyslogV
{
	protected function onInit() {
		checkAuth(PERM_MGR);
	}
}
