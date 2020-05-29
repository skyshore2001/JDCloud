# 前端系统日志

## 概要设计

收集客户端的出错信息、调试信息等。

## 数据库设计

@Syslog: id, module(s), pri(3), tm, content(t), apiLogId

module
: 模块名. "fw" - 前端框架; "core" - 前端主应用逻辑; "page" - 页面切换日志。

pri
: 优先级. Enum(ERR|WAR|INF|DBG)

apiLogId
: 链接ApiLog.id，便于查看请求信息

## 交互接口

### 添加信息

	Syslog.add()(module, pri, content) -> id

- 只允许add, 不允许其它对象操作。
- 自动补全Message.tm字段。

## 前端应用接口

（无）
