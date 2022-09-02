# JDCloud - 筋斗云敏捷开发平台

筋斗云是用于前后端分离架构产品的快速开发解决方案。可以开发各类移动端（如安卓、苹果平台）或桌面端（如Windows等桌面系统）的Web应用和原生应用。

筋斗云的架构符合[DACA规范](https://github.com/skyshore2001/daca)（DACA: Distributed Access and Control Architecture，分布式访问和控制架构），严格区分前端应用与后端应用服务器，两者之间通过BQP协议（BQP: Business Query Protocol，业务查询协议）交互。其前端提供移动风格和桌面风格两种Web应用框架，以Html5为核心技术，并对移动端或桌面端原生应用给予良好支持，移动Web应用框架可以用于制作安卓或苹果原生应用、微信公众号等应用平台上的轻应用，桌面Web应用框架常用于创建桌面风格的管理端应用程序，形式上也可以是Web应用或Windows/Linux应用程序等，覆盖全平台。后端应用服务器仅提供业务数据查询，不掺杂视图等其它数据，统一服务各种前端应用。筋斗云的前后端均可独立使用。

筋斗云前端开发使用POM开发模型（POM: Page object model，页面对象模型），以逻辑页做为基本开发单元。

筋斗云后端注重设计文档，以严谨而简约的方式描述数据模型及业务接口，进而自动创建或更新数据库（称为“一站式数据模型部署”），以及进行接口API声明或测试。后端框架以php编程语言实现了DACA规范，可以很方便扩展业务接口和实行访问控制，还支持各种后端应用（如定期任务，服务器维护工具等）。

## 框架功能回归测试

使用项目 [jdcloud-rtest](https://github.com/skyshore2001/jdcloud-rtest) 对框架进行功能测试。
回归测试时，应在plugin/index.php中设置只加载rtest插件：

	Plugins::add("rtest");

然后在chrome中运行jdcloud-rtest项目下的rtest.html。

