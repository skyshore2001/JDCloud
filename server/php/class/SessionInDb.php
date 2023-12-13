<?php
/*
@class SessionInDb

支持将会话存在数据库表Session中。在多机部署应用服务时，有时不方便用文件保存会话，这时可以切换为用数据库保存。
先在DESIGN.md中声明表并使用upgrade工具创建表:

	@Session: id, name, value(t), tm

然后在conf.php或conf.user.php中添加：

	// 使用数据库保存会话
	session_set_save_handler(new SessionInDb(), true);
	// ini_set("session.gc_maxlifetime", "1440"); // 配置会话超时时间，默认24分钟

注意：无须配置`ini_set("session.save_handler", "user");`，在调用session_set_save_handler之后该配置项的值会自动变成"user"
*/
class SessionInDb implements SessionHandlerInterface
{
	private $id;
	private $value = "";
	function open($savePath, $sesName) {
		// logit(['open', $savePath, $sesName]);
		return true;
	}
	function close() {
		// logit('close');
		return true;
	}
	function read($key) {
		// logit(['read', $key]);
		// 此时db已连接，且不在事务中
		$rv = queryOne("SELECT id, value, tm FROM Session WHERE name=" . Q($key), true);
		if ($rv !== false) {
			$sec = ini_get("session.gc_maxlifetime");
			// 由于gc时间不定，这里直接检查过期更精确
			if (time() - strtotime($rv["tm"]) <= $sec) {
				$this->id = $rv["id"];
				$this->value = $rv["value"];
			}
			else {
				execOne("DELETE FROM Session WHERE id=" . $rv["id"]);
			}
		}
		return $this->value;
	}
	function write($key, $value) {
		// 此时db不在事务中，接口的事务已commit/rollback过
		// logit(['write', $key, $value]);
		if ($this->id) {
			$data = [
				"tm" => date(FMT_DT),
			];
			if ($value != $this->value) {
				$data["value"] = $value;
			}
			dbUpdate("Session", $data, $this->id);
		}
		else if ($value) {
			dbInsert("Session", [
				"name" => $key,
				"tm" => date(FMT_DT),
				"value" => $value
			]);
		}
		else {
			// logit("skip write");
		}
		return true;
	}
	function destroy($key) {
		// logit(['destroy', $key]);
		if ($this->id) {
			execOne("DELETE FROM Session WHERE id=" . $this->id);
		}
		return true;
	}
	// maxLifeTime就是session.gc_maxlifetime配置值
	function gc($maxLifeTime) {
		// 注意: 观察日志后发现gc在read和write之间回调
		// logit(['gc', $maxLifeTime]);
		$tm = date(FMT_DT, time() - $maxLifeTime);
		execOne("DELETE FROM Session WHERE tm<'$tm'");
		return true;
	}
}
